# 步骤 18：速率限制与暴力破解防护测试

## 🔒 必须输出的文件

| 文件 | 必须 | 说明 |
|------|------|------|
| rate-limit-test.json | ✅ | 速率限制测试结果（JSON） |
| rate-limit-test.md | ✅ | 速率限制测试报告（Markdown） |

---

## 目标

测试所有认证接口的速率限制和暴力破解防护机制。缺少速率限制的接口可被攻击者用于暴力破解密码、OT 和 API Key。

---

## 数据

从步骤 0 的子域名枚举结果中读取所有可访问子域名：

```powers
$subdomains = Get-Content "audits/<domain>/step-00-subdomain-discovery/subdomains.json" | ConvertFrom-Json
$targetDomains = $subdomains.subdomains | ? { $_.https_accessible -eq $true } | % { "https://$($_.domain)" }
```

---

## 执行流程

### 1. 登录接口速率限制测试

```powers
# 登录端点
$loginEndpoints = @("/signin", "/login", "/auth/login", "/api/login", "/api/auth/login", "/api/v1/login")

foreach ($d in $targetDomains) {
  foreach ($ep in $loginEndpoints) {
    $results = @()
    $start = Get-Date

    for ($i = 1; $i -le 20; $i++) {
      $body = @{email="admin@example.com"; password="wrong$i"} | ConvertTo-Json
      try {
        $r = Invoke-WebRequest -Uri "$d$ep" -Method POST -Body $body `
          -ContentType "application/json" -SkipCertificateCheck
        $results += [PSCustomObject]@{
          request = $i
          status = $r.StatusCode
          body = $r.Content.Substring(0, [Math]::Min(200, $r.Content.Length))
          time = (Get-Date)
        }
      } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $results += [PSCustomObject]@{
          request = $i
          status = $status
          body = $_.Exception.Message
          time = (Get-Date)
        }
        if ($status -eq 429) {
          "RATE LIMIT: $d$ep 在第 $i 次请求返回 429 (Too Many Requests)"
          break
        }
      }
    }

    $end = Get-Date
    $duration = ($end - $start).TotalSeconds
    if ($results.Count -ge 20 -and $duration -lt 10) {
      "NO RATE LIMIT: $d$ep 在 $duration 秒内完成 20 次请求，无速率限制"
    }
  }
}
```

### 2. 密码重置接口速率限制

```powers
$resetEndpoints = @("/forgot-password", "/reset-password", "/password-reset", "/api/auth/reset", "/api/v1/reset-password")

foreach ($d in $targetDomains) {
  foreach ($ep in $resetEndpoints) {
    for ($i = 1; $i -le 15; $i++) {
      try {
        $r = Invoke-WebRequest -Uri "$d$ep" -Method POST `
          -Body '{"email":"admin@example.com"}' `
          -ContentType "application/json" -SkipCertificateCheck
        Start-Sleep -Milliseconds 100
        if ($r.StatusCode -eq 429) {
          "RATE LIMIT: $d$ep 返回 429 at request $i"
          break
        }
      } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 429) {
          "RATE LIMIT: $d$ep 返回 429 at request $i"
          break
        }
      }
    }
  }
}
```

### 3. API 端点速率限制

```powers
$apiEndpoints = @("/api/", "/api/v1/", "/graphql")

foreach ($d in $targetDomains) {
  foreach ($ep in $apiEndpoints) {
    $start = Get-Date

    for ($i = 1; $i -le 30; $i++) {
      try {
        Invoke-WebRequest -Uri "$d$ep" -SkipCertificateCheck -TimeoutSec 3 | Out-Null
      } catch {}
    }

    $end = Get-Date
    $duration = ($end - $start).TotalSeconds
    if ($duration -lt 5) {
      "NO API RATE LIMIT: $d$ep 在 $duration 秒内完成 30 次请求"
    }
  }
}
```

### 4. 速率限制头分析

```powers
$rateLimitHeaders = @(
  "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset",
  "Retry-After", "X-Rate-Limit-Limit", "X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"
)

foreach ($d in $targetDomains) {
  foreach ($ep in $loginEndpoints + $resetEndpoints) {
    try {
      $r = Invoke-WebRequest -Uri "$d$ep" -SkipCertificateCheck
      foreach ($h in $rateLimitHeaders) {
        if ($r.Headers[$h]) {
          "RATE LIMIT HEADER: $d$ep -> $h = $($r.Headers[$h])"
        }
      }
    } catch {}
  }
}
```

### 5. WordPress 登录暴力破解防护

```powers
# 使用步骤 9 的 WordPress 检测结果
$wpDomains = @()  # 从步骤 9 结果中填充

foreach ($d in $wpDomains) {
  $wpLogin = "$d/wp-login.php"
  $start = Get-Date

  for ($i = 1; $i -le 15; $i++) {
    try {
      $body = "log=admin&pwd=wrong$i&wp-submit=Log+In"
      $r = Invoke-WebRequest -Uri $wpLogin -Method POST -Body $body `
        -ContentType "application/x-www-form-urlencoded" -SkipCertificateCheck
      if ($r.Content -match "Too many|rate limit|blocked|locked out|CAPTCHA") {
        "WP RATE LIMIT: $wpLogin 在第 $i 次请求触发防护"
        break
      }
    } catch {}
  }
  $end = Get-Date
  if (($end - $start).TotalSeconds -lt 5) {
    "NO WP RATE LIMIT: $wpLogin"
  }
}
```

### 6. 速率限制绕过测试

```powers
# 测试常见绕过方法：X-Forwarded-For / X-Real-IP 头伪造

foreach ($d in $targetDomains) {
  $ep = "$d/signin"
  for ($i = 1; $i -le 10; $i++) {
    try {
      $headers = @{"X-Forwarded-For" = "192.168.1.$i"}
      Invoke-WebRequest -Uri $ep -Method POST `
        -Body '{"email":"admin@example.com","password":"wrong"}' `
        -ContentType "application/json" -Headers $headers -SkipCertificateCheck | Out-Null
    } catch {}
  }
}
```

---

## 漏洞记录格式

```json
{
  "id": "RL-001",
  "domain": "<target>",
  "endpoint": "https://<target>/signin",
  "title": "登录接口缺少速率限制",
  "severity": "high",
  "cvss_score": 7.5,
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
  "cwe": "CWE-307",
  "owasp": "A07:2021 - Identification and Authentication Failures",
  "description": "登录接口在X秒内完成20次请求，未检测到速率限制（429状态码或速率限制响应头）",
  "evidence": {
    "requests_sent": 20,
    "duration_seconds": 3.2,
    "rate_limit_header": null,
    "status_429_received": false
  }
}
```

---

## ☑️ 执行检查清单

- [ ] 1. 测试登录接口速率限制（20次请求）
- [ ] 2. 测试密码重置接口速率限制（15次请求）
- [ ] 3. 测试 API 端点速率限制（30次请求）
- [ ] 4. 测试 WordPress 登录速率限制
- [ ] 5. 分析速率限制响应头（X-RateLimit-*）
- [ ] 6. 测试 429 状态码响应
- [ ] 7. 测试 Retry-After 头
- [ ] 8. 测试 X-Forwarded-For 绕过
- [ ] 9. 测试 X-Real-IP 绕过
- [ ] 10. 测试不同 User-Agent 绕过
- [ ] 11. 测试 OTP 验证接口速率限制
- [ ] 12. 记录所有速率限制漏洞
- [ ] 13. 生成 rate-limit-test.json
- [ ] 14. 生成 rate-limit-test.md

---

## 🚪 关口验证

```powers
$dir = "audits/<domain>/step-18-rate-limit-test"
@("rate-limit-test.json","rate-limit-test.md") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
```