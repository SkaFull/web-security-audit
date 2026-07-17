# 步骤 21：WordPress 深度安全扫描

## 🔌 必须输出的文件

| 文件 | 必须 | 说明 |
|------|------|------|
| wordpress-scan.json | ✅ | WordPress 扫描结果（JSON） |
| wordpress-scan.md | ✅ | WordPress 扫描报告（Markdown） |

---

## 目标

对所有检测到的 WordPress 站点进行深度安全扫描，包括已知漏洞 CVE 匹配、插件枚举、配置缺陷等。

> **前提条件**：此步骤依赖步骤 9（CMS 指纹识别）的 WordPress 检测结果。如果步骤 9 未检测到 WordPress，则跳过此步骤（输出空报告）。

---

## 数据

从步骤 9 的 CMS 指纹识别结果中读取 WordPress 站点：

```powers
$cmsResults = Get-Content "audits/<domain>/step-09-cms-fingerprint/cms-fingerprint.json" | ConvertFrom-Json
$wpDomains = $cmsResults.sites | ? { $_.cms -eq "WordPress" } | % { $_.url }
```

---

## 执行流程

### 1. WordPress 版本检测

```powers
foreach ($d in $wpDomains) {
  # 方法1：meta generator 标签
  try {
    $html = (Invoke-WebRequest -Uri $d -SkipCertificateCheck).Content
    if ($html -match '<meta name="generator" content="WordPress ([^"]+)"') {
      "WP VERSION (meta): $d -> $($Matches[1])"
    }
  } catch {}

  # 方法2：readme.html
  try {
    $readme = (Invoke-WebRequest -Uri "$d/readme.html" -SkipCertificateCheck).Content
    if ($readme -match "Version (\d+\.\d+\.?\d*)") {
      "WP VERSION (readme): $d -> $($Matches[1])"
    }
  } catch {}

  # 方法3：feed RSS
  try {
    $feed = (Invoke-WebRequest -Uri "$d/feed/" -SkipCertificateCheck).Content
    if ($feed -match '<generator>https://wordpress.org/\?v=([^<]+)</generator>') {
      "WP VERSION (feed): $d -> $($Matches[1])"
    }
  } catch {}
}
```

### 2. 已知漏洞 CVE 匹配

```powers
# 检查版本是否在已知漏洞列表中
$knownVulnerableVersions = @{
  "6.4" = @("CVE-2023-xxx", "XSS via shortcode")
  "6.3" = @("CVE-2023-xxx", "RCE via plugin upload")
  "6.2" = @("CVE-2023-xxx", "SQL Injection in query")
  "6.0" = @("CVE-2022-xxx", "Auth bypass")
  "5.9" = @("CVE-2022-xxx", "XSS")
  "5.8" = @("CVE-2021-xxx", "SSRF")
  "5.7" = @("CVE-2021-xxx", "Unauthenticated SQLi")
}

foreach ($d in $wpDomains) {
  $version = "<detected_version>"
  foreach ($kv in $knownVulnerableVersions.GetEnumerator()) {
    if ($version -match $kv.Key) {
      "WP VULNERABLE: $d version $version has known CVEs: $($kv.Value -join ', ')"
    }
  }
}
```

### 3. 插件枚举

```powers
$pluginPaths = @(
  "/wp-content/plugins/",
  "/wp-content/plugins/akismet/",
  "/wp-content/plugins/contact-form-7/",
  "/wp-content/plugins/woocommerce/",
  "/wp-content/plugins/wordfence/",
  "/wp-content/plugins/wordpress-seo/",
  "/wp-content/plugins/elementor/",
  "/wp-content/plugins/jetpack/",
  "/wp-content/plugins/wp-rocket/",
  "/wp-content/plugins/w3-total-cache/",
  "/wp-content/plugins/updraftplus/",
  "/wp-content/plugins/duplicator/",
  "/wp-content/plugins/revslider/",
  "/wp-content/plugins/visual-composer/",
  "/wp-content/plugins/all-in-one-wp-migration/",
  "/wp-content/plugins/really-simple-ssl/",
  "/wp-content/plugins/wordfence/",
  "/wp-content/plugins/limit-login-attempts-reloaded/",
  "/wp-content/plugins/wp-file-manager/",
  "/wp-content/plugins/sucuri-scanner/",
  "/wp-content/plugins/backupbuddy/",
  "/wp-content/plugins/gravityforms/",
  "/wp-content/plugins/wpforms/",
  "/wp-content/plugins/ninja-forms/"
)

foreach ($d in $wpDomains) {
  foreach ($pp in $pluginPaths) {
    try {
      $r = Invoke-WebRequest -Uri "$d$pp" -SkipCertificateCheck -TimeoutSec 5
      if ($r.StatusCode -eq 200 -or $r.StatusCode -eq 403) {
        $readme = "$d$pp/readme.txt"
        try {
          $rd = (Invoke-WebRequest -Uri $readme -SkipCertificateCheck).Content
          if ($rd -match "Stable tag: ([^\n]+)") {
            "WP PLUGIN: $d -> $pp (version: $($Matches[1]))"
          } else {
            "WP PLUGIN: $d -> $pp (version unknown)"
          }
        } catch {
          "WP PLUGIN: $d -> $pp (403 Forbidden - exists but denied)"
        }
      }
    } catch {}
  }
}
```

### 4. 主题枚举

```powers
$themePaths = @(
  "/wp-content/themes/",
  "/wp-content/themes/twentytwentyfour/",
  "/wp-content/themes/twentytwentythree/",
  "/wp-content/themes/twentytwentytwo/",
  "/wp-content/themes/twentytwentyone/",
  "/wp-content/themes/twentytwenty/",
  "/wp-content/themes/astra/",
  "/wp-content/themes/divi/",
  "/wp-content/themes/avada/",
  "/wp-content/themes/oceanwp/",
  "/wp-content/themes/generatepress/",
  "/wp-content/themes/hello-elementor/"
)

foreach ($d in $wpDomains) {
  foreach ($tp in $themePaths) {
    try {
      $r = Invoke-WebRequest -Uri "$d$tp" -SkipCertificateCheck -TimeoutSec 5
      if ($r.StatusCode -eq 200) {
        "WP THEME: $d -> $tp"
      }
    } catch {}
  }

  # 通过 style.css 检测当前主题
  try {
    $html = (Invoke-WebRequest -Uri $d -SkipCertificateCheck).Content
    if ($html -match '/wp-content/themes/([^/]+)/style.css\?ver=([^"''&]+)') {
      "WP ACTIVE THEME: $d -> $($Matches[1]) (version: $($Matches[2]))"
    }
  } catch {}
}
```

### 5. 敏感文件泄露检查

```powers
$sensitivePaths = @(
  "/wp-config.php",
  "/wp-config.php.bak",
  "/wp-config.php~",
  "/wp-config.php.old",
  "/wp-config.php.swp",
  "/wp-config.php.save",
  "/.wp-config.php.swp",
  "/wp-content/debug.log",
  "/wp-content/upgrade/",
  "/wp-content/backups/",
  "/wp-content/backup-db/",
  "/wp-content/uploads/",
  "/wp-content/uploads/woocommerce_uploads/",
  "/wp-json/",
  "/wp-json/wp/v2/users",
  "/wp-json/wp/v2/posts",
  "/wp-json/wp/v2/pages",
  "/wp-json/wp/v2/media",
  "/wp-json/wp/v2/comments",
  "/wp-json/wp/v2/settings",
  "/wp-json/wp/v2/taxonomies",
  "/wp-json/wp/v2/types",
  "/wp-json/wp/v2/statuses",
  "/wp-json/wp/v2/plugins",
  "/wp-json/wp/v2/themes",
  "/wp-json/wp/v2/block-directory",
  "/wp-json/wp/v2/block-patterns"
)

foreach ($d in $wpDomains) {
  foreach ($sp in $sensitivePaths) {
    try {
      $r = Invoke-WebRequest -Uri "$d$sp" -SkipCertificateCheck -TimeoutSec 5
      if ($r.StatusCode -eq 200) {
        "WP SENSITIVE FILE: $d$sp is accessible (200 OK)"
      }
    } catch {
      if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        "WP SENSITIVE FILE (403): $d$sp exists but forbidden"
      }
    }
  }
}
```

### 6. REST API 安全检查

```powers
foreach ($d in $wpDomains) {
  # 检查 REST API 是否暴露用户信息
  try {
    $r = Invoke-WebRequest -Uri "$d/wp-json/wp/v2/users" -SkipCertificateCheck
    $users = $r.Content | ConvertFrom-Json
    foreach ($u in $users) {
      "WP REST API USER: id=$($u.id) name=$($u.name) slug=$($u.slug) link=$($u.link)"
    }
  } catch {}

  # 检查 REST API 是否暴露管理员信息
  try {
    $r = Invoke-WebRequest -Uri "$d/wp-json/wp/v2/users/1" -SkipCertificateCheck
    $admin = $r.Content | ConvertFrom-Json
    "WP REST API ADMIN: $($admin | ConvertTo-Json)"
  } catch {}
}
```

### 7. XML-RPC 安全检查

```powers
foreach ($d in $wpDomains) {
  try {
    $r = Invoke-WebRequest -Uri "$d/xmlrpc.php" -SkipCertificateCheck
    if ($r.StatusCode -eq 200) {
      "WP XML-RPC: $d/xmlrpc.php is accessible"

      # 测试 system.listMethods
      $body = @"
<?xml version="1.0"?>
<methodCall>
  <methodName>system.listMethods</methodName>
</methodCall>
"@
      try {
        $r2 = Invoke-WebRequest -Uri "$d/xmlrpc.php" -Method POST `
          -Body $body -ContentType "text/xml" -SkipCertificateCheck
        if ($r2.Content -match "pingback\.ping|wp\.getUsersBlogs|demo\.sayHello") {
          "WP XML-RPC METHODS: enabled and returning method list"
        }
      } catch {}
    }
  } catch {}
}
```

---

## 漏洞记录格式

```json
{
  "id": "WP-001",
  "domain": "<target>",
  "title": "WordPress 版本过旧 - 已知 CVE 漏洞",
  "severity": "critical",
  "cvss_score": 9.8,
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
  "cwe": "CWE-1104",
  "owasp": "A06:2021 - Vulnerable and Outdated Components",
  "description": "WordPress 版本 X.X 存在已知的远程代码执行漏洞",
  "remediation": "升级到最新版本",
  "evidence": {
    "version": "5.8",
    "detection_method": "meta generator",
    "known_cves": ["CVE-2021-xxx"],
    "patch_status": "vulnerable"
  }
}
```

---

## ☑️ 执行检查清单

- [ ] 1. 检测 WordPress 版本（meta/readme/feed）
- [ ] 2. 匹配已知 CVE 漏洞
- [ ] 3. 枚举已安装插件（readme.txt 版本检测）
- [ ] 4. 枚举已安装主题
- [ ] 5. 检查 wp-config.php 备份文件泄露
- [ ] 6. 检查 debug.log 泄露
- [ ] 7. 检查 wp-content/backups/ 访问
- [ ] 8. 检查 uploads 目录浏览
- [ ] 9. 检查 wp-json 目录浏览
- [ ] 10. 检查 REST API 用户信息泄露
- [ ] 11. 检查 XML-RPC 是否启用
- [ ] 12. 检查 XML-RPC method 枚举
- [ ] 13. 检查 wp-cron.php 访问
- [ ] 14. 检查 .htaccess 访问
- [ ] 15. 记录所有 WordPress 漏洞
- [ ] 16. 生成 wordpress-scan.json
- [ ] 17. 生成 wordpress-scan.md

---

## 🚪 关口验证

```powers
$dir = "audits/<domain>/step-21-wordpress-scan"
@("wordpress-scan.json","wordpress-scan.md") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
```