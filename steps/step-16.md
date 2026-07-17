# 步骤 16：响应体深度信息提取

## 🔴 必须输出的文件

| 文件 | 必须 | 说明 |
|------|------|------|
| response-body-analysis.json | ✅ | 响应体分析结果（JSON） |
| response-body-analysis.md | ✅ | 响应体分析报告（Markdown） |

---

## 目标

从所有已审计域名的响应体中深度提取信息泄露漏洞。Link 响应头、CSP 策略、HTML 源码、JS Bundle 中泄露了大量内部域名和技术信息。

---

## 输入数据

从步骤 0 的子域名枚举结果中读取所有可访问子域名：

```powershell
$subdomains = Get-Content "audits/<domain>/step-00-subdomain-discovery/subdomains.json" | ConvertFrom-Json
$targetDomains = $subdomains.subdomains | ? { $_.https_accessible -eq $true } | % { "https://$($_.domain)" }
$baseDomain = "<domain>"  # 从用户输入中提取的根域名
```

---

## 执行流程

### 1. Link 响应头解析

```powershell
foreach ($d in $targetDomains) {
  try {
    $r = Invoke-WebRequest -Uri $d -SkipCertificateCheck
    $linkHeader = $r.Headers["Link"]
    if ($linkHeader) {
      # 解析 dns-prefetch, preconnect, preload
      $linkHeader -split ",\s*" | % {
        if ($_ -match '<([^>]+)>;\s*rel="([^"]+)"') {
          $url = $Matches[1]
          $rel = $Matches[2]
          $linkDomain = ([uri]$url).Host
          # 检查是否为内部域名（非公开域名）
          if ($linkDomain -notmatch [regex]::Escape($baseDomain) -and 
              $linkDomain -match "internal|nucleus|sandbox|staging|dev|test|local|private|intranet") {
            "INFO LEAK: Internal domain '$linkDomain' exposed via Link header ($rel) on $d"
          }
        }
      }
    }
  } catch {}
}
```

### 2. CSP 策略域名提取

从所有已收集的 CSP 头中提取域名并分类：

```powershell
# 提取 CSP 头中的域名
foreach ($d in $targetDomains) {
  try {
    $r = Invoke-WebRequest -Uri $d -SkipCertificateCheck
    $csp = $r.Headers["Content-Security-Policy"]
    if (-not $csp) { $csp = $r.Headers["Content-Security-Policy-Report-Only"] }
    if ($csp) {
      # 提取所有 https?:// 域名
      $cspDomains = [regex]::Matches($csp, "https?://([^/\s'""]+)") | % { $_.Groups[1].Value } | Sort-Object -Unique
      foreach ($cd in $cspDomains) {
        # 分类：内部域名（匹配目标域名体系）、CDN、第三方
        if ($cd -match [regex]::Escape($baseDomain)) { "INTERNAL: $cd (from $d CSP)" }
        elseif ($cd -match "cdn\.|cloudfront\.|cloudflare\.|akamai\.|fastly\.") { "CDN: $cd (from $d CSP)" }
        elseif ($cd -match "google\.|facebook\.|tiktok\.|linkedin\.|twitter\.|analytics") { "THIRD-PARTY: $cd (from $d CSP)" }
        else { "EXTERNAL: $cd (from $d CSP)" }
      }
    }
  } catch {}
}
```

### 3. HTML 源码分析

```powershell
foreach ($d in $targetDomains) {
  try {
    $html = (Invoke-WebRequest -Uri $d -SkipCertificateCheck).Content

    # 提取 script src 域名
    $scriptUrls = [regex]::Matches($html, '<script[^>]+src="([^"]+)"') | % { $_.Groups[1].Value }
    "SCRIPT URLS on $d : $($scriptUrls -join ', ')"

    # 提取 link href 域名
    $linkUrls = [regex]::Matches($html, '<link[^>]+href="([^"]+)"') | % { $_.Groups[1].Value }
    "LINK URLS on $d : $($linkUrls -join ', ')"

    # 提取 iframe src
    $iframeUrls = [regex]::Matches($html, '<iframe[^>]+src="([^"]+)"') | % { $_.Groups[1].Value }
    "IFRAME URLS on $d : $($iframeUrls -join ', ')"

    # 提取 meta 标签
    $metaContent = [regex]::Matches($html, '<meta[^>]+content="([^"]+)"') | % { $_.Groups[1].Value }
    "META TAGS on $d : $($metaContent -join ', ')"

    # 提取 HTML 注释
    $comments = [regex]::Matches($html, '<!--(.*?)-->', 'Singleline') | % { $_.Groups[1].Value.Trim() }
    foreach ($c in $comments) {
      if ($c -match "TODO|FIXME|HACK|TEMP|DEBUG|PASSWORD|SECRET|API_KEY|TOKEN|internal") {
        "HTML COMMENT LEAK on $d: $c"
      }
    }

    # 提取 data-* 属性
    [regex]::Matches($html, 'data-(\w+)="([^"]+)"') | % { "data-$($_.Groups[1].Value)=$($_.Groups[2].Value) on $d" }
  } catch {}
}
```

### 4. JS Bundle 分析

```powershell
foreach ($d in $targetDomains) {
  try {
    $html = (Invoke-WebRequest -Uri $d -SkipCertificateCheck).Content
    $jsUrls = [regex]::Matches($html, '<script[^>]+src="([^"]+\.js)"') | % { $_.Groups[1].Value }

    foreach ($jsUrl in $jsUrls | Select-Object -First 5) {
      $fullUrl = if ($jsUrl -match "^https?://") { $jsUrl } else { "$d$jsUrl" }
      try {
        $js = (Invoke-WebRequest -Uri $fullUrl -SkipCertificateCheck).Content

        # 提取 API 端点
        $apiEndpoints = [regex]::Matches($js, '"(/api/v[^"]*)"|'"'"'(/api/v[^'"'"']*)'"'"'') | % { $_.Groups[1].Value + $_.Groups[2].Value }
        "API ENDPOINTS in $fullUrl : $($apiEndpoints -join ', ')"

        # 提取内部域名
        $internalPattern = "https?://([a-zA-Z0-9.-]+\.(internal|nucleus|sandbox|staging|dev|test|local|private)\.[a-zA-Z]+)"
        $internalDomains = [regex]::Matches($js, $internalPattern) | % { $_.Groups[1].Value }
        foreach ($id in $internalDomains) {
          "INFO LEAK: Internal domain '$id' found in JS bundle $fullUrl"
        }

        # 提取 WebSocket 地址
        $wsUrls = [regex]::Matches($js, 'wss?://[^"'"'"'`\s]+') | % { $_.Value }
        "WS URLS in $fullUrl : $($wsUrls -join ', ')"

        # 提取配置信息
        $configPatterns = @(
          '(apiKey|apiUrl|baseUrl|endpoint|authUrl|sentryDsn|dsn)\s*[:=]\s*["'"'"']([^"'"'"']+)',
          '(SENTRY_DSN|API_KEY|REACT_APP_|VITE_|NEXT_PUBLIC_)\w*\s*[:=]\s*["'"'"']([^"'"'"']+)'
        )
        foreach ($pattern in $configPatterns) {
          [regex]::Matches($js, $pattern) | % { "CONFIG LEAK: $($_.Groups[1].Value)=$($_.Groups[2].Value) in $fullUrl" }
        }
      } catch {}
    }
  } catch {}
}
```

### 5. 错误页面分析

```powershell
$errorPaths = @("/nonexistent", "/.env", "/wp-admin", "/api/v1/nonexistent", "/admin")
foreach ($d in $targetDomains) {
  foreach ($p in $errorPaths) {
    try {
      $r = Invoke-WebRequest -Uri "$d$p" -SkipCertificateCheck -TimeoutSec 5
      # 记录状态码、响应头、响应体前 500 字符
      $preview = $r.Content.Substring(0, [Math]::Min(500, $r.Content.Length))
      $sensitivePatterns = @("stack trace", "exception", "debug", "version", "server at", "Apache", "nginx", "PHP")
      foreach ($sp in $sensitivePatterns) {
        if ($preview -match $sp) {
          "ERROR PAGE LEAK on $d$p : '$sp' found in error response"
        }
      }
    } catch {}
  }
}
```

### 6. 技术栈指纹识别

```
检测来源及方法：
- Server 头：nginx/1.18.0, Apache/2.4.41, cloudflare, Microsoft-IIS
- X-Powered-By 头：PHP/7.4, Express, Next.js, ASP.NET
- X-Generator 头：Drupal, WordPress, Joomla
- HTML meta generator：<meta name="generator" content="WordPress 6.2">
- JS 文件路径：/_next/static/ → Next.js, /static/js/main.xxx.js → React CRA, /__nuxt/ → Nuxt.js
- Cookie 名称：AWSALB → AWS ALB, PHPSESSID → PHP, CF_ → Cloudflare
- 特定响应头：X-Drupal-Cache, X-Drupal-Dynamic-Cache, X-WordPress-*
```

---

## 漏洞记录格式

```json
{
  "id": "INFO-001",
  "domain": "<target>",
  "title": "Link响应头暴露内部域名",
  "severity": "medium",
  "cvss_score": 4.3,
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
  "cwe": "CWE-200",
  "owasp": "A05:2021 - Security Misconfiguration",
  "description": "响应头中通过Link头暴露了内部域名...",
  "evidence": {
    "header": "Link",
    "value": "<https://internal.example.com>; rel=dns-prefetch",
    "domain": "internal.example.com",
    "category": "internal"
  }
}
```

---

## ☑️ 执行检查清单

- [ ] 1. 解析所有子域名的 Link 响应头
- [ ] 2. 提取并分类 CSP 策略中的域名
- [ ] 3. 分析 HTML 源码中的 script/link/iframe 域名
- [ ] 4. 提取 HTML 注释中的敏感信息
- [ ] 5. 分析 JS Bundle 中的 API 端点和域名
- [ ] 6. 分析 JS Bundle 中的配置信息（API Key、DSN 等）
- [ ] 7. 分析 JS Bundle 中的 WebSocket 地址
- [ ] 8. 测试 404/403/500 错误页面信息泄露
- [ ] 9. 识别技术栈指纹（Server/X-Powered-By/HTML/Cookie）
- [ ] 10. 提取 meta 标签中的配置信息
- [ ] 11. 识别 data-* 属性中的敏感信息
- [ ] 12. 记录所有信息泄露漏洞
- [ ] 13. 记录所有发现的内部域名
- [ ] 14. 生成 response-body-analysis.json
- [ ] 15. 生成 response-body-analysis.md

---

## 🚪 关口验证

```powershell
$dir = "audits/<domain>/step-16-response-body-analysis"
@("response-body-analysis.json","response-body-analysis.md") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
```