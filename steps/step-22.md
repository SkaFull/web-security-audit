# 步骤 22：子域名枚举增强与攻击面扩展

## 🔍 必须输出的文件

| 文件 | 必须 | 说明 |
|------|------|------|
| subdomain-enum-plus.json | ✅ | 增强子域名枚举结果（JSON） |
| subdomain-enum-plus.md | ✅ | 增强子域名枚举报告（Markdown） |

---

## 目标

在步骤 0 的基础上，使用多种技术进行更深度的子域名发现，最大化攻击面覆盖。包括 DNS 爆破、证书透明度日志、搜索引擎、被动 DNS 等。

---

## 数据

从步骤 0 的子域名枚举结果中读取基础域名：

```powers
$subdomains = Get-Content "audits/<domain>/step-00-subdomain-discovery/subdomains.json" | ConvertFrom-Json
$baseDomains = $subdomains.base_domains  # 从步骤 0 获取的基础域名列表
$existingDomains = $subdomains.subdomains | % { $_.domain }

# 将所有已发现的子域名也加入待扫描列表
$allDomains = $subdomains.subdomains | ? { $_.https_accessible -eq $true } | % { "https://$($_.domain)" }
```

---

## 执行流程

### 1. DNS 子域名爆破

```powers
# 使用常见子域名字典进行爆破
$subdomainWordlist = @(
  "www", "mail", "ftp", "localhost", "webmail", "smtp", "pop", "ns1", "webdisk",
  "ns2", "cpanel", "whm", "autodiscover", "autoconfig", "m", "mobile", "mob",
  "api", "dev", "develop", "developer", "developers", "test", "testing",
  "stage", "staging", "prod", "production", "uat", "qa", "demo", "demo2",
  "beta", "alpha", "sandbox", "internal", "intranet", "private", "vpn",
  "remote", "gateway", "portal", "admin", "administrator", "root", "manager",
  "secure", "security", "auth", "sso", "idp", "login", "signin", "signup",
  "account", "accounts", "my", "profile", "dashboard", "app", "apps",
  "store", "shop", "buy", "cart", "checkout", "pay", "payment", "billing",
  "cdn", "cdn1", "cdn2", "static", "static1", "static2", "assets", "media",
  "images", "img", "css", "js", "files", "download", "downloads", "upload",
  "docs", "doc", "documentation", "wiki", "help", "support", "status",
  "blog", "news", "press", "about", "contact", "jobs", "career", "investor",
  "partner", "partners", "affiliate", "affiliates", "reseller", "resellers",
  "cloud", "host", "hosting", "server", "servers", "cluster", "node",
  "db", "database", "sql", "mysql", "mongo", "redis", "elastic", "kibana",
  "grafana", "prometheus", "jenkins", "git", "gitlab", "github", "bitbucket",
  "docker", "k8s", "kubernetes", "swarm", "rancher", "traefik",
  "monitor", "monitoring", "metrics", "logs", "log", "sentry", "elk",
  "chat", "slack", "jira", "confluence", "trello", "asana",
  "stg", "stg1", "stg2", "pre", "preprod", "dr", "backup", "bcp",
  "bastion", "jump", "jumpbox", "proxy", "lb", "lb1", "lb2", "haproxy"
)

foreach ($base in $baseDomains) {
  foreach ($sub in $subdomainWordlist) {
    try {
      $domain = "$sub.$base"
      $ips = [System.Net.Dns]::GetHostAddresses($domain)
      if ($ips) {
        "DNS FOUND: $domain -> $($ips[0].IPAddressToString)"
        if ($domain -notin $existingDomains) {
          "NEW SUBDOMAIN: $domain"
        }
      }
    } catch {}
  }
}
```

### 2. 证书透明度（CT）日志查询

```powers
# 通过 crt.sh 查询 SSL 证书透明度日志
foreach ($base in $baseDomains) {
  try {
    $url = "https://crt.sh/?q=%25.$base&output=json"
    $certs = Invoke-RestMethod -Uri $url -TimeoutSec 10
    $ctDomains = $certs | % { $_.name_value } | Sort-Object -Unique

    foreach ($d in $ctDomains) {
      if ($d -match "^[^*]") {
        "CT LOG: $d"
        if ($d -notin $existingDomains) {
          "NEW CT SUBDOMAIN: $d"
        }
      }
    }
  } catch {
    "CT LOG FAILED: $base - $($_.Exception.Message)"
  }
}
```

### 3. 搜索引擎子域名发现

```powers
# 使用 Google/Bing 等搜索引擎 Dork 发现子域名
# 注意：实际执行时需遵守搜索引擎使用条款，可能需使用 API

$searchQueries = @(
  "site:$domain -www",
  "site:*.$domain",
  "site:$domain inurl:admin",
  "site:$domain inurl:login",
  "site:$domain inurl:dev",
  "site:$domain inurl:staging",
  "site:$domain inurl:api",
  "site:$domain intitle:'index of'"
)
```

### 4. 域名拓展变体发现

```powers
# 检查常见前缀/后缀变体
$prefixes = @(
  "dev-", "test-", "stage-", "staging-", "prod-", "uat-", "qa-",
  "api-", "admin-", "portal-", "app-", "m-", "mobile-", "cdn-",
  "static-", "assets-", "media-", "files-", "download-", "docs-",
  "help-", "support-", "status-", "blog-", "news-", "shop-",
  "store-", "pay-", "payment-", "auth-", "sso-", "login-",
  "monitor-", "metrics-", "logs-", "chat-", "internal-",
  "corp-", "enterprise-", "pro-", "lite-", "beta-", "alpha-"
)

$suffixes = @(
  "-dev", "-test", "-stage", "-staging", "-prod", "-uat", "-qa",
  "-api", "-admin", "-portal", "-app", "-mobile", "-cdn",
  "-static", "-assets", "-media", "-files", "-docs",
  "-help", "-support", "-status", "-blog", "-news",
  "-shop", "-store", "-pay", "-auth", "-sso", "-login",
  "-monitor", "-metrics", "-logs", "-internal", "-corp",
  "-enterprise", "-pro", "-lite", "-beta", "-alpha"
)

foreach ($base in $baseDomains) {
  # 提取根域名部分
  $parts = $base -split '\.'
  if ($parts.Count -ge 2) {
    $root = "$($parts[0]).$($parts[1])"

    foreach ($pfx in $prefixes) {
      $variant = "$pfx$root"
      try {
        $ips = [System.Net.Dns]::GetHostAddresses($variant)
        if ($ips) { "VARIANT PREFIX: $variant -> $($ips[0].IPAddressToString)" }
      } catch {}
    }
  }
}
```

### 5. 被动 DNS 与第三方数据源

```powers
# 从 SecurityTrails / VirusTotal / AlienVault OTX 等 API 获取
# 注意：实际执行时需配置 API Key

# VirusTotal API
$vtApiKey = ""
if ($vtApiKey) {
  foreach ($base in $baseDomains) {
    try {
      $r = Invoke-RestMethod -Uri "https://www.virustotal.com/api/v3/domains/$base/subdomains" `
        -Headers @{"x-apikey"=$vtApiKey} -TimeoutSec 10
      foreach ($sd in $r.data) {
        "VT SUBDOMAIN: $($sd.id)"
      }
    } catch {}
  }
}

# AlienVault OTX
foreach ($base in $baseDomains) {
  try {
    $r = Invoke-RestMethod -Uri "https://otx.alienvault.com/api/v1/indicators/domain/$base/passive_dns" `
      -TimeoutSec 10
    foreach ($pd in $r.passive_dns) {
      "OTX SUBDOMAIN: $($pd.hostname)"
    }
  } catch {}
}
```

### 6. 新发现子域名验证

```powers
# 对所有新发现的子域名进行 HTTP/HTTPS 可达性验证
$newDomains = @()  # 填充新发现的子域名

foreach ($d in $newDomains) {
  $result = @{
    domain = $d
    http_accessible = $false
    https_accessible = $false
    http_status = $null
    https_status = $null
    https_redirect = $null
    title = $null
  }

  try {
    $r = Invoke-WebRequest -Uri "https://$d" -SkipCertificateCheck -TimeoutSec 5
    $result.https_accessible = $true
    $result.https_status = $r.StatusCode
    if ($r.Content -match '<title>([^<]+)</title>') {
      $result.title = $Matches[1]
    }
  } catch {
    $result.https_status = $_.Exception.Response.StatusCode.value__
  }

  try {
    $r = Invoke-WebRequest -Uri "http://$d" -SkipCertificateCheck -TimeoutSec 5
    $result.http_accessible = $true
    $result.http_status = $r.StatusCode
  } catch {
    $result.http_status = $_.Exception.Response.StatusCode.value__
  }

  "NEW DOMAIN VERIFIED: $($result | ConvertTo-Json)"
}
```

---

## 漏洞记录格式

```json
{
  "id": "SD-001",
  "domain": "<target>",
  "title": "发现未公开的内部子域名",
  "severity": "medium",
  "cvss_score": 4.3,
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
  "cwe": "CWE-200",
  "owasp": "A01:2021 - Broken Access Control",
  "description": "通过证书透明度日志/DNS爆破发现多个未公开的子域名",
  "evidence": {
    "discovery_method": "Certificate Transparency",
    "new_domains": ["dev.example.com", "staging.example.com", "internal.example.com"],
    "total_new": 3
  }
}
```

---

## ☑️ 执行检查清单

- [ ] 1. DNS 子域名爆破（100+ 常见前缀）
- [ ] 2. 证书透明度日志查询（crt.sh）
- [ ] 3. 搜索引擎 Dork 子域名发现（Google/Bing）
- [ ] 4. 域名前缀变体发现（dev-/test-/stage-）
- [ ] 5. 域名后缀变体发现（-api/-admin/-portal）
- [ ] 6. 被动 DNS 数据源查询（VirusTotal）
- [ ] 7. OTX 被动 DNS 查询（AlienVault）
- [ ] 8. 新发现子域名 HTTP/HTTPS 可达性验证
- [ ] 9. 新发现子域名页面标题提取
- [ ] 10. 新发现子域名证书信息提取
- [ ] 11. 对比步骤 0 结果，标注新增子域名
- [ ] 12. 记录所有新发现的子域名
- [ ] 13. 生成 subdomain-enum-plus.json
- [ ] 14. 生成 subdomain-enum-plus.md

---

## 🚪 关口验证

```powers
$dir = "audits/<domain>/step-22-subdomain-enum-plus"
@("subdomain-enum-plus.json","subdomain-enum-plus.md") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
```