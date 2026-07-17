# 步骤 15：逐域名 CORS 深度测试

## 🔴 必须输出的文件

| 文件 | 必须 | 说明 |
|------|------|------|
| cors-deep-test.json | ✅ | CORS 深度测试结果（JSON） |
| cors-deep-test.md | ✅ | CORS 深度测试报告（Markdown） |

---

## 目标

对每个可访问子域名执行 CORS 深度测试，发现 CORS 配置不当漏洞。CORS 配置不当（尤其 Allow-Credentials + 通配符）可导致跨域数据窃取。

---

## 输入数据

从步骤 0 的子域名枚举结果中读取所有可访问子域名：

```powershell
$subdomains = Get-Content "audits/<domain>/step-00-subdomain-discovery/subdomains.json" | ConvertFrom-Json
$targetDomains = $subdomains.subdomains | ? { $_.https_accessible -eq $true } | % { "https://$($_.domain)" }
```

---

## 执行流程

### 1. 基础 CORS 头检测（每个子域名）

对每个可访问子域名发送 OPTIONS 预检请求，检查 CORS 响应头：

```powershell
# 对各域名路径发送 OPTIONS + Origin 头
foreach ($d in $targetDomains) {
  $testPaths = @("/api/v1/", "/api/", "/graphql/", "/")
  foreach ($path in $testPaths) {
    try {
      $r = Invoke-WebRequest -Uri "$d$path" -Method OPTIONS -Headers @{
        "Origin" = "https://evil.com"
        "Access-Control-Request-Method" = "GET"
      } -SkipCertificateCheck
      $r.Headers["Access-Control-Allow-Origin"]
      $r.Headers["Access-Control-Allow-Credentials"]
      $r.Headers["Access-Control-Allow-Headers"]
      $r.Headers["Access-Control-Allow-Methods"]
      $r.Headers["Access-Control-Expose-Headers"]
      $r.Headers["Access-Control-Max-Age"]
    } catch {}
  }
}
```

**检测项**：
- `Access-Control-Allow-Origin` 值（`*`、空、反射 Origin、固定域名）
- `Access-Control-Allow-Credentials` 值（`true`/`false`）
- `Access-Control-Allow-Headers` 值（`*`、具体头列表）
- `Access-Control-Allow-Methods` 值（`*`、具体方法列表）
- `Access-Control-Expose-Headers` 值
- `Access-Control-Max-Age` 值

### 2. CORS 危险组合检测

| 危险组合 | 风险等级 | CVSS 评分 |
|---------|---------|----------|
| Allow-Credentials=true + Allow-Origin=* | 严重 | 9.1 |
| Allow-Credentials=true + Origin 反射 | 严重 | 8.6 |
| Allow-Headers=* + Allow-Credentials=true | 高危 | 7.5 |
| Allow-Methods=* | 中危 | 5.3 |
| 通配符 Origin + 敏感 API 端点 | 高危 | 7.5 |

**检测方法**：
```powershell
$origin = "https://evil.com"
$r = Invoke-WebRequest -Uri "https://<target>/api/" -Method OPTIONS `
  -Headers @{"Origin"=$origin; "Access-Control-Request-Method"="GET"} `
  -SkipCertificateCheck
$acao = $r.Headers["Access-Control-Allow-Origin"]
$acac = $r.Headers["Access-Control-Allow-Credentials"]

# 危险组合检测
if ($acac -eq "true" -and $acao -eq "*") {
  "CRITICAL: Allow-Credentials=true + Allow-Origin=*"
}
if ($acac -eq "true" -and $acao -eq $origin) {
  "CRITICAL: Allow-Credentials=true + Origin反射"
}
```

### 3. 跨域资源泄露测试

对每个有 CORS 配置的端点，发送伪造 Origin 的 GET 请求，检查是否返回敏感数据：

```powershell
$r = Invoke-WebRequest -Uri "https://<target>/api/user/profile" `
  -Headers @{"Origin"="https://evil.com"} `
  -SkipCertificateCheck
# 检查响应体是否包含敏感数据
$r.Content | Select-String "token|secret|password|key|credential"
```

### 4. 子域名间 CORS 信任链分析

检查是否存在通配符子域名 Origin 配置（如 `*.example.com`），分析测试环境是否可访问生产 API。

```powershell
# 检测通配符子域名 Origin
$origin = "https://<subdomain>.<target>"
$r = Invoke-WebRequest -Uri "https://<target>/api/" -Method OPTIONS `
  -Headers @{"Origin"=$origin; "Access-Control-Request-Method"="GET"} `
  -SkipCertificateCheck
if ($r.Headers["Access-Control-Allow-Origin"] -eq $origin) {
  "SUBDOMAIN TRUST: 允许子域名 $origin 跨域访问"
}
```

### 5. CORS 配置一致性检查

对比同一域名不同路径的 CORS 配置：
- `/api/v1/` vs `/static/` vs `/`
- 同一路径不同 HTTP 方法的 CORS 响应

---

## 漏洞记录格式

```json
{
  "id": "CORS-001",
  "domain": "<target>",
  "endpoint": "https://<target>/api/v1/",
  "title": "CORS Allow-Credentials + Origin Reflection",
  "severity": "critical",
  "cvss_score": 8.6,
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N",
  "cwe": "CWE-942",
  "owasp": "A05:2021 - Security Misconfiguration",
  "description": "CORS配置允许凭证传输且反射Origin头...",
  "remediation": "将Access-Control-Allow-Origin设置为固定的受信任域名白名单",
  "evidence": {
    "request_origin": "https://evil.com",
    "response_acao": "https://evil.com",
    "response_acac": "true"
  }
}
```

---

## ☑️ 执行检查清单

- [ ] 1. 对所有子域名发送 OPTIONS 预检请求
- [ ] 2. 检测 Access-Control-Allow-Origin 值
- [ ] 3. 检测 Access-Control-Allow-Credentials 值
- [ ] 4. 检测 Access-Control-Allow-Headers 值
- [ ] 5. 检测 Access-Control-Allow-Methods 值
- [ ] 6. 检测危险组合（Credentials+Wildcard/Reflection）
- [ ] 7. 测试跨域资源泄露（伪造Origin获取敏感数据）
- [ ] 8. 测试 null Origin 沙箱攻击
- [ ] 9. 分析子域名间 CORS 信任链
- [ ] 10. 对比不同路径 CORS 配置一致性
- [ ] 11. 检查 Allow-Headers: * 漏洞
- [ ] 12. 检查 Allow-Methods: * 漏洞
- [ ] 13. 检查 Expose-Headers 泄露内部头
- [ ] 14. 记录所有 CORS 漏洞到 cors-deep-test.json
- [ ] 15. 生成 cors-deep-test.md

---

## 🚪 关口验证

```powershell
$dir = "audits/<domain>/step-15-cors-deep-test"
@("cors-deep-test.json","cors-deep-test.md") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
```