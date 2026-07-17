# 步骤 19：Cookie 安全深度审计

## 🍪 必须输出的文件

| 文件 | 必须 | 说明 |
|------|------|------|
| cookie-security.json | ✅ | Cookie 安全审计结果（JSON） |
| cookie-security.md | ✅ | Cookie 安全审计报告（Markdown） |

---

## 目标

对所有子域名的 Cookie 安全属性进行深度审计。Cookie 配置不当可导致会话劫持、XSS 窃取、CSRF 攻击等。

---

## 数据

从步骤 0 的子域名枚举结果中读取所有可访问子域名：

```powers
$subdomains = Get-Content "audits/<domain>/step-00-subdomain-discovery/subdomains.json" | ConvertFrom-Json
$targetDomains = $subdomains.subdomains | ? { $_.https_accessible -eq $true } | % { "https://$($_.domain)" }
$baseDomain = "<domain>"
```

---

## 执行流程

### 1. 全域名 Cookie 收集

```powers
$allCookies = @()

foreach ($d in $targetDomains) {
  try {
    $r = Invoke-WebRequest -Uri $d -SkipCertificateCheck
    $cookies = $r.Headers["Set-Cookie"]
    if ($cookies) {
      foreach ($c in $cookies) {
        $cookieName = ($c -split '=')[0]
        $flags = @{
          name = $cookieName
          domain = $d
          Secure = $c -match "Secure"
          HttpOnly = $c -match "HttpOnly"
          SameSite = if ($c -match "SameSite=(\w+)") { $Matches[1] } else { "None" }
          Domain = if ($c -match "Domain=([^;]+)") { $Matches[1] } else { "unset" }
          Path = if ($c -match "Path=([^;]+)") { $Matches[1] } else { "/" }
          MaxAge = if ($c -match "Max-Age=([^;]+)") { $Matches[1] } else { "Session" }
          Expires = if ($c -match "Expires=([^;]+)") { $Matches[1] } else { "Session" }
        }
        $allCookies += $flags
        "COOKIE: $d | $cookieName | Secure=$($flags.Secure) | HttpOnly=$($flags.HttpOnly) | SameSite=$($flags.SameSite) | Domain=$($flags.Domain)"
      }
    }
  } catch {}
}
```

### 2. 安全属性缺失检测

```powers
foreach ($c in $allCookies) {
  $issues = @()

  if (-not $c.Secure) {
    $issues += "Missing Secure flag - Cookie可被MITM攻击截获"
  }
  if (-not $c.HttpOnly) {
    $issues += "Missing HttpOnly flag - Cookie可被XSS攻击窃取"
  }
  if ($c.SameSite -eq "None" -and -not $c.Secure) {
    $issues += "SameSite=None without Secure - Chrome将拒绝"
  }
  if ($c.SameSite -eq "None") {
    $issues += "SameSite=None - 允许跨站请求携带Cookie"
  }
  if ($c.Domain -and $c.Domain -ne "unset") {
    if ($c.Domain -match "^\.?${baseDomain}$") {
      $issues += "Domain set to root domain - 所有子域名共享Cookie"
    }
  }
  if ($c.Path -eq "/") {
    $issues += "Path=/ - 全站路径Cookie"
  }
  if ($c.MaxAge -ne "Session" -or $c.Expires -ne "Session") {
    $issues += "Persistent Cookie - 持久化存储"
  }

  if ($issues.Count -gt 0) {
    "COOKIE ISSUES: $($c.name) on $($c.domain) -> $($issues -join '; ')"
  }
}
```

### 3. 跨子域名 Cookie 测试

```powers
foreach ($d in $targetDomains) {
  try {
    $r = Invoke-WebRequest -Uri $d -SkipCertificateCheck
    $cookies = $r.Headers["Set-Cookie"]
    if ($cookies) {
      foreach ($c in $cookies) {
        if ($c -match "Domain=\.?${baseDomain}") {
          "CROSS-SUBDOMAIN COOKIE: $c on $d has Domain=$baseDomain"
        }
        if (-not ($c -match "Domain=")) {
          "HOST-ONLY COOKIE: $c on $d (no Domain attribute)"
        }
      }
    }
  } catch {}
}
```

### 4. 第三方 Cookie 检测

```powers
$thirdPartyPatterns = @(
  "google\.com", "facebook\.com", "doubleclick\.net",
  "twitter\.com", "linkedin\.com", "tiktok\.com",
  "analytics", "tracking", "pixel", "beacon",
  "ads\.", "adnxs\.", "criteo\.", "taboola\."
)

foreach ($d in $targetDomains) {
  try {
    $html = (Invoke-WebRequest -Uri $d -SkipCertificateCheck).Content
    $scriptUrls = [regex]::Matches($html, 'src="([^"]+\.js)"') | % { $_.Groups[1].Value }
    foreach ($url in $scriptUrls) {
      foreach ($pattern in $thirdPartyPatterns) {
        if ($url -match $pattern) {
          "THIRD-PARTY SCRIPT: $url on $d"
        }
      }
    }
  } catch {}
}
```

### 5. 会话管理安全分析

```powers
$sessionCookieNames = @("session", "sid", "JSESSIONID", "PHPSESSID", "ASPSESSIONID", "connect.sid", "auth", "token", "jwt")

foreach ($c in $allCookies) {
  foreach ($name in $sessionCookieNames) {
    if ($c.name -match $name) {
      $analysis = @{
        cookie_name = $c.name
        domain = $c.domain
        secure = $c.Secure
        httpOnly = $c.HttpOnly
        sameSite = $c.SameSite
        isSession = ($c.MaxAge -eq "Session")
        isPersistent = ($c.MaxAge -ne "Session")
      }
      "SESSION COOKIE ANALYSIS: $($analysis | ConvertTo-Json)"
    }
  }
}
```

---

## 漏洞记录格式

```json
{
  "id": "COOKIE-001",
  "domain": "<target>",
  "cookie_name": "session_id",
  "title": "Session Cookie缺少Secure和HttpOnly标志",
  "severity": "high",
  "cvss_score": 7.1,
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:L/A:N",
  "cwe": "CWE-614",
  "owasp": "A07:2021 - Identification and Authentication Failures",
  "description": "会话Cookie缺少Secure标志（可被MITM窃取）和HttpOnly标志（可被XSS窃取）",
  "evidence": {
    "set_cookie_header": "session_id=abc123; Path=/; Domain=.example.com",
    "secure": false,
    "httpOnly": false,
    "sameSite": "Lax"
  }
}
```

---

## ☑️ 执行检查清单

- [ ] 1. 收集所有子域名的 Set-Cookie 头
- [ ] 2. 检查每个 Cookie 的 Secure 标志
- [ ] 3. 检查每个 Cookie 的 HttpOnly 标志
- [ ] 4. 检查每个 Cookie 的 SameSite 属性
- [ ] 5. 检查 SameSite=None 是否搭配 Secure
- [ ] 6. 检查 Cookie Domain 属性是否过于宽泛
- [ ] 7. 检查 Cookie Path 属性
- [ ] 8. 检查 Cookie 过期时间/Max-Age
- [ ] 9. 测试跨子域名 Cookie 共享范围
- [ ] 10. 检测第三方跟踪 Cookie/脚本
- [ ] 11. 分析会话 Cookie 安全属性
- [ ] 12. 检查 Cookie 值熵（是否可预测）
- [ ] 13. 检查 Cookie Prefixes（__Secure- / __Host-）
- [ ] 14. 记录所有 Cookie 安全漏洞
- [ ] 15. 生成 cookie-security.json
- [ ] 16. 生成 cookie-security.md

---

## 🚪 关口验证

```powers
$dir = "audits/<domain>/step-19-cookie-security"
@("cookie-security.json","cookie-security.md") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
```