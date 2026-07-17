# 执行流程（关口驱动版）

## 🔴 强制完整执行（MANDATORY FULL EXECUTION）

**此 Skill 总共 23 个步骤（步骤 0-22），全部强制执行，严禁跳过任何步骤。**

### 执行顺序

**步骤 22（最终报告）是审计的最后一步，在所有其他步骤完成后才执行。**

```
提取目标域名 → 步骤0（子域名+关联域名发现）→ 关口0 →
步骤1 → 关口1 → 步骤2 → 关口2 → 步骤3 → 关口3 →
步骤4 → 关口4 → 步骤5 → 关口5 → 步骤6 → 关口6 →
步骤7 → 关口7 → 步骤8 → 关口8 → 步骤9 → 关口9 →
步骤10 → 关口10 → 步骤11 → 关口11 → 步骤12 → 关口12 →
步骤13 → 关口13 → 步骤14 → 关口14 → 步骤15 → 关口15 →
步骤16 → 关口16 → 步骤17 → 关口17 → 步骤18 → 关口18 →
步骤19 → 关口19 → 步骤20 → 关口20 → 步骤21 → 关口21 →
步骤22（最终报告）→ 关口22 → 完整性验证
```

### 🔴 绝对禁止

| 禁止行为 | 说明 |
|---------|------|
| **跳过任何步骤** | 23 个步骤全部强制执行 |
| **只测试主域名** | 所有步骤必须对全部可访问子域名+关联域名执行 |
| **在步骤 21 之前就跳到步骤 22** | 步骤 22 是最终报告，必须在所有步骤完成后才执行 |
| **标记 NOT_APPLICABLE 而不执行 HTTP 探测** | 必须通过代理发送真实 HTTP 请求验证，根据响应码判断 |
| **生成假数据** | 所有数据必须来自真实 HTTP 请求 |
| **关口验证仅做形式检查** | 关口验证必须通过 RunCommand 实际执行 PowerShell |

### 🔴 强制要求

- **每个步骤必须对全部可访问子域名执行**，不得只测主域名
- **每个步骤必须通过代理发送真实 HTTP 请求**，产出真实数据
- **每个步骤必须通过关口验证才能进入下一步**
- **关口验证失败 = 补充缺失内容后重新验证，直到通过**
- **步骤 0 必须发现所有关联域名**（不仅限于主域名的子域名，还包括组织关联的其他域名体系）
- **步骤 6 必须对每个可访问子域名执行完整审计**（步骤 1-5 的全部测试项）
- **每个步骤必须产出 `logs/execution.log`**（记录所有 HTTP 请求）和 `step-commit.json`
- **每个漏洞必须包含真实 curl 命令 + 完整 HTTP 响应 + 证据文件路径 + 复现步骤**

### 🔴 步骤 22 最终报告规则

**步骤 22 是审计的最后一步，仅在步骤 0-21 全部完成后执行一次。**

**最终报告必须包含**：
- 所有 22 个审计步骤（0-21）的完整测试结果表格（含每个步骤的测试数、通过数、失败数、漏洞数）
- 所有步骤中发现的所有漏洞（含 CVSS 评分、CWE 编号、OWASP 分类、证据引用）
- 按域名系统分组的漏洞分布矩阵
- 基础设施概览（所有发现的子域名、关联域名、第三方服务、技术栈）
- 按严重程度排序的修复建议（含代码示例）
- 审计方法论说明（覆盖全部审计步骤）

### 🔴 执行完成后完整性验证

```powershell
$base = "audits/<domain>"
$required = @("logs/execution.log", "step-commit.json", "progress.json", "coverage.json", "vulnerabilities.json")
$total = 0; $pass = 0
foreach ($s in 0..22) {
    $d = Get-ChildItem "$base" -Directory | Where-Object { $_.Name -match "^step-$(if($s -lt 10){'0'})$s[^0-9]" } | Select-Object -First 1
    $total++
    if (-not $d) { Write-Host "[FAIL] Step $s : no directory" -ForegroundColor Red; continue }
    $missing = @()
    foreach ($f in $required) { if (-not (Test-Path "$($d.FullName)/$f")) { $missing += $f } }
    if ($missing.Count -eq 0) { Write-Host "[PASS] Step $($s.ToString().PadLeft(2,'0')) - $($d.Name)" -ForegroundColor Green; $pass++ }
    else { Write-Host "[FAIL] Step $($s.ToString().PadLeft(2,'0')) - $($d.Name) missing: $($missing -join ',')" -ForegroundColor Red }
}
Write-Host "`n=== INTEGRITY CHECK: $pass/$total steps PASS ===" -ForegroundColor Cyan
if ($pass -ne 23) { Write-Host "❌ AUDIT INCOMPLETE: $pass/23 steps passed. Re-run missing steps." -ForegroundColor Red }
else { Write-Host "✅ AUDIT COMPLETE: All 23/23 steps passed." -ForegroundColor Green }
```

---

## 目录结构

```
audits/<domain>/
├── audit-progress.json
├── step-00-subdomain-discovery/
│   ├── subdomains.json
│   ├── subdomains.md
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   └── step-commit.json
├── step-01-basic-security/
│   ├── basic-security.json
│   ├── basic-security.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-02-advanced-security/
│   ├── advanced-security.json
│   ├── advanced-security.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-03-specialized/
│   ├── specialized.json
│   ├── specialized.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-04-open-redirect/
│   ├── open-redirect.json
│   ├── open-redirect.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-05-http-methods/
│   ├── http-methods.json
│   ├── http-methods.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-06-subdomain-audit/
│   ├── subdomain-audit.json
│   ├── subdomain-audit.md
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── subdomains/
│       └── <subdomain>/
│           ├── audit-report.json
│           └── coverage.json
├── step-07-app-layer/
│   ├── app-layer.json
│   ├── app-layer.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-08-cms/
│   ├── cms-audit.json
│   ├── cms-audit.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-09-trading/
│   ├── trading-audit.json
│   ├── trading-audit.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-10-supply-chain/
│   ├── supply-chain.json
│   ├── supply-chain.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-11-csp-internal/
│   ├── csp-internal.json
│   ├── csp-internal.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-12-wordpress/
│   ├── wordpress.json
│   ├── wordpress.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-13-false-positive/
│   ├── false-positive.json
│   ├── false-positive.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-14-cors/
│   ├── cors.json
│   ├── cors.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-15-body-extract/
│   ├── body-extract.json
│   ├── body-extract.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-16-auth-enum/
│   ├── auth-enum.json
│   ├── auth-enum.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-17-rate-limit/
│   ├── rate-limit.json
│   ├── rate-limit.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-18-cookie/
│   ├── cookie.json
│   ├── cookie.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-19-websocket/
│   ├── websocket.json
│   ├── websocket.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-20-wp-deep/
│   ├── wp-deep.json
│   ├── wp-deep.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-21-sub-enhance/
│   ├── sub-enhance.json
│   ├── sub-enhance.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   ├── step-commit.json
│   └── evidence/
├── step-22-final-report/
│   ├── final-report.json
│   ├── final-report.md
│   ├── vulnerabilities.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/
│   └── step-commit.json
```

---

## 步骤 0：子域名 + 关联域名枚举（20+ 种方法）

**目标**：发现所有子域名、关联域名体系、第三方服务域名，评估可访问性

**核心原则**：不仅限于主域名的子域名，还要发现组织关联的其他域名体系（例如从主域名 *.a.com 发现关联域名 b.com, c.net 等）。

### 必须覆盖的方法（20+ 种）：

**DNS 层面（5 种）**：
1. 证书透明度日志（crt.sh）查询 - 提取所有证书中的 DNS 名称
2. DNS 暴力枚举 - 使用通用子域名字典（至少 5000 词）
3. DNS 区域传输尝试（AXFR）
4. NS/MX 记录查询 - 发现邮件服务器域名
5. CNAME 记录追踪 - 发现第三方服务域名

**搜索引擎层面（3 种）**：
6. Google/Bing 搜索 `site:*.domain`
7. 搜索组织名称关联域名的公开页面
8. 搜索 `"domain" ext:js` 等语法发现关联域名

**被动信息收集（5 种）**：
9. SecurityTrails / AlienVault OTX 等被动 DNS 数据源
10. Wayback Machine (archive.org) 历史 URL 发现
11. VirusTotal 域名关联查询
12. Shodan 组织名称搜索
13. GitHub 代码搜索 - 发现配置文件中的域名

**主动探测（5 种）**：
14. 主站 HTML/JS 源码域名提取（正则匹配域名模式）
15. Link 响应头域名提取
16. CSP 策略域名提取（connect-src, script-src, img-src 等）
17. CORS 头域名提取（Access-Control-Allow-Origin）
18. 重定向链域名发现

**关联域名发现（3 种）**：
19. WHOIS 信息关联 - 根据注册组织发现其他域名
20. SSL 证书 SAN 扩展 - 发现同一证书覆盖的其他域名
21. 邮件 MX 记录关联 - 发现同邮件服务商的其他域名

### 输出要求

- 每个发现的域名标记可访问性状态（accessible / inaccessible / redirect-only / timeout）
- 对可访问域名执行 HTTP 探测，记录响应码、响应头、技术栈指纹
- 对 redirect-only 域名，追踪重定向链，记录最终目标
- 对不可访问域名，记录失败原因（DNS 解析失败 / 连接超时 / 连接拒绝）
- 将域名分类为主域名子域名 / 关联域名 / 第三方服务域名

### 关口0验证

```powershell
$dir = "audits/<domain>/step-00-subdomain-discovery"
@("subdomains.json","subdomains.md","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
# 验证子域名数量
$subs = Get-Content "$dir/subdomains.json" | ConvertFrom-Json
Write-Host "子域名总数: $($subs.subdomains.Count)"
Write-Host "可访问: $($subs.accessible_count)"
Write-Host "关联域名体系: $($subs.related_domains.Count)"
if ($subs.subdomains.Count -lt 10) { "⚠️ WARNING: 子域名少于10个，可能枚举不完整" }
```

---

## 步骤 1：基础安全检查（100+ 项 / 域名）

**目标**：对所有可访问子域名 + 关联域名执行基础安全检查

**必须对步骤 0 发现的每一个可访问子域名执行以下测试**：

### 测试项分类（100+ 项）：

**安全响应头（25 项）**：
- Content-Security-Policy 存在性、unsafe-inline、unsafe-eval、通配符使用
- Strict-Transport-Security 存在性、max-age 值、includeSubDomains、preload
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-Embedder-Policy
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy
- Cache-Control 配置
- Pragma 头
- Expires 头
- Clear-Site-Data

**SSL/TLS 配置（15 项）**：
- 证书有效性、过期时间、颁发者
- TLS 版本支持（TLS 1.0/1.1/1.2/1.3）
- 加密套件强度
- HSTS preload 状态
- 证书链完整性
- 证书 SAN 扩展

**信息泄露（20 项）**：
- Server 头泄露（版本号）
- X-Powered-By 头
- X-AspNet-Version 头
- X-Generator 头
- 技术栈指纹识别（响应头模式匹配）
- 目录列表启用检测
- 错误页面信息泄露
- 调试模式检测
- robots.txt 敏感路径暴露
- sitemap.xml 敏感路径暴露
- /.git/ 目录访问
- /.env 文件访问
- /backup/ 目录访问
- /.DS_Store 访问
- /wp-config.php.bak 等备份文件探测

**Cookie 安全（15 项）**：
- HttpOnly 标志
- Secure 标志
- SameSite 属性
- Domain 属性范围
- Path 属性
- Expires/Max-Age 配置
- 会话 Cookie 安全
- 第三方 Cookie 检测

**HTTP 安全配置（15 项）**：
- HTTPS 强制重定向
- HSTS 配置
- 安全头缺失计数
- 响应头顺序分析
- 内容类型正确性
- 字符编码声明

**邮件安全（10 项，对域名根执行）**：
- SPF 记录存在性
- SPF 记录宽松度（~all vs -all）
- DMARC 记录存在性
- DMARC 策略（p=none/reject/quarantine）
- DKIM 记录存在性
- MX 记录安全
- 邮件服务器证书

### 关口1验证

```powershell
$dir = "audits/<domain>/step-01-basic-security"
@("basic-security.json","basic-security.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
if ((Get-ChildItem "$dir/evidence" -Filter "*.json" | Measure-Object).Count -gt 0) { "✅ evidence/ has files" } else { "❌ MISSING: evidence files" }
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 2：高级安全检查（60+ 项 / 域名）

**目标**：对所有可访问子域名执行高级安全漏洞检测

### 测试项分类（60+ 项）：

**认证与授权（15 项）**：
- 登录页面发现与探测
- 注册页面发现与探测
- 密码重置页面发现与探测
- 管理后台路径探测（/admin, /console, /dashboard, /manage, /wp-admin, /administrator 等）
- 默认凭据检测
- 认证绕过尝试
- 会话固定检测
- JWT 令牌分析（alg=none, 过期时间, 签名算法等）
- 多因素认证状态检测
- 账户锁定机制检测

**API 端点发现（15 项）**：
- 常见 API 路径探测（/api, /v1, /v2, /graphql, /swagger, /openapi 等）
- Swagger UI / OpenAPI 文档暴露
- GraphQL 端点暴露 + introspection 查询
- REST API 端点枚举
- API 版本信息泄露
- API 响应格式分析
- 内部 API 端点发现（从 JS 提取）

**基础设施端点（15 项）**：
- /actuator 端点暴露（Spring Boot）
- /health, /info, /metrics, /env, /mappings 等 Actuator 子端点
- /prometheus 指标暴露
- /metrics 指标暴露
- /status 状态页面
- /phpinfo.php 信息泄露
- /server-status (Apache)
- /nginx-status
- /_status (各种框架)
- /debug 端点
- /trace 端点
- /heapdump 端点

**文件上传与包含（10 项）**：
- 文件上传端点发现
- 文件包含漏洞检测
- 路径遍历尝试
- 敏感文件路径探测（/etc/passwd, /proc/self/environ 等）

**第三方服务指纹（5 项）**：
- 识别 CDN / WAF 提供商
- 识别第三方认证服务（OAuth, SAML）
- 识别第三方监控服务
- 识别第三方支付服务
- 识别第三方分析服务

### 关口2验证

```powershell
$dir = "audits/<domain>/step-02-advanced-security"
@("advanced-security.json","advanced-security.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
if ((Get-ChildItem "$dir/evidence" -Filter "*.json" | Measure-Object).Count -gt 0) { "✅ evidence/ has files" } else { "❌ MISSING: evidence files" }
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 3：专项安全测试（50+ 项 / 域名）

**目标**：对所有可访问子域名执行专项安全测试

### 测试项分类（50+ 项）：

**SQL 注入检测（10 项）**：
- 基本 SQL 注入 payload 测试（', ", 1=1, 1=2 等）
- 时间盲注测试
- 布尔盲注测试
- 错误注入测试
- URL 参数注入点探测
- POST 参数注入点探测
- Cookie 注入点探测
- Header 注入点探测

**XSS 检测（10 项）**：
- 反射型 XSS payload 测试
- DOM XSS 检测（分析 JS 中的 sink 函数）
- 存储型 XSS 入口点发现
- 输入点收集（所有 GET/POST 参数）

**SSRF 检测（10 项）**：
- URL 参数 SSRF 探测
- 文件导入功能 SSRF 探测
- Webhook 功能 SSRF 探测
- 云元数据端点探测（169.254.169.254）
- 内网地址探测

**命令注入检测（5 项）**：
- 基本命令注入 payload
- 时间延迟命令注入
- 文件读取命令注入

**反序列化漏洞（5 项）**：
- Java 反序列化检测
- PHP 反序列化检测
- .NET 反序列化检测

**XXE 检测（5 项）**：
- XML 输入点发现
- 基本 XXE payload
- 带外 XXE 探测

**模板注入检测（5 项）**：
- SSTI 基本 payload 测试
- 模板引擎识别

### 关口3验证

```powershell
$dir = "audits/<domain>/step-03-specialized"
@("specialized.json","specialized.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
if ((Get-ChildItem "$dir/evidence" -Filter "*.json" | Measure-Object).Count -gt 0) { "✅ evidence/ has files" } else { "❌ MISSING: evidence files" }
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 4：开放重定向测试（25 项 / 域名）

**目标**：对所有可访问子域名检测开放重定向漏洞

### 测试方法：

1. 从主域名收集所有 URL 参数（GET + POST）
2. 对所有参数注入重定向 payload（共 20+ 种 payload 变体）
3. 覆盖常见重定向参数名（redirect, url, next, return, returnUrl, goto, callback, target, r, u, redir, continue, dest, destination, ref, referrer, source, origin, back, forward 等）
4. 测试不同协议（http, https, //, //\\, data:, javascript:）
5. 测试不同编码（URL 编码、双重编码、Unicode 编码）
6. 测试不同域名格式（@ 符号绕过、CRLF 注入、换行绕过）
7. 对每个重定向参数使用多种目标 URL 测试

### 关口4验证

```powershell
$dir = "audits/<domain>/step-04-open-redirect"
@("open-redirect.json","open-redirect.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 5：HTTP 方法与速率限制（40 项 / 域名）

**目标**：对所有可访问子域名检测 HTTP 方法配置和速率限制

### 测试项分类（40 项）：

**HTTP 方法测试（20 项）**：
- 对每个端点测试 OPTIONS, GET, POST, PUT, DELETE, PATCH, HEAD, TRACE, CONNECT, PROPFIND 等方法的响应
- 检测危险的 HTTP 方法（PUT, DELETE, TRACE, CONNECT）
- 检测 OPTIONS 方法暴露的 Allow 头
- 检测方法覆盖（X-HTTP-Method-Override）
- 检测 WebDAV 方法（PROPFIND, MKCOL, MOVE 等）

**速率限制测试（20 项）**：
- 对登录端点快速发送 20+ 请求，检测 429 响应
- 对注册端点快速发送 20+ 请求
- 对密码重置端点快速发送 20+ 请求
- 对 API 端点快速发送 20+ 请求
- 检测速率限制绕过（不同 IP、不同 User-Agent、不同参数）
- 检测速率限制响应头（Retry-After, X-RateLimit-*）
- 检测速率限制窗口大小（是否使用滑动窗口）

### 关口5验证

```powershell
$dir = "audits/<domain>/step-05-http-methods"
@("http-methods.json","http-methods.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 6：子域名深度审计（100% 覆盖）

**目标**：对每个可访问子域名 + 关联域名执行完整审计（步骤 1-5 的全部测试项，共 275+ 项）

**强制要求**：
- 每个可访问子域名独立执行步骤 1-5 的所有测试（不允许跳过任何子域名）
- 关联域名体系作为独立域名同等对待，执行完整审计
- 每个子域名生成独立的审计报告和覆盖率文件
- 汇总 coverage.json 显示所有子域名覆盖 = 100%

### 关口6验证

```powershell
$dir = "audits/<domain>/step-06-subdomain-audit"
@("subdomain-audit.json","subdomain-audit.md","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$subs = Get-Content "$dir/subdomain-audit.json" | ConvertFrom-Json
foreach ($s in $subs.subdomains_audited) {
  $sd = "$dir/subdomains/$($s.domain)"
  if (Test-Path "$sd") { "✅ $($s.domain) has audit dir" } else { "❌ MISSING: $($s.domain) audit dir" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 7：应用层深度审计（50+ 项）

**目标**：对所有可访问子域名执行 SPA 应用层深度安全审计

### 测试项分类（50+ 项）：

**JS Bundle 逆向分析（15 项）**：
- 获取所有 JS 文件并提取 API 端点
- 提取内部域名和 IP 地址
- 提取硬编码凭据（API key, token, secret, password, client_id, client_secret）
- 提取 OAuth 配置信息（client_id, redirect_uri, scope）
- 提取第三方服务 URL（Sentry, Google Analytics, Intercom, Hotjar 等）
- 提取 WebSocket 端点
- 提取 GraphQL 端点
- 提取功能开关（feature flags）
- 提取错误消息中的敏感信息
- 提取路由映射（发现隐藏页面/功能）
- 提取 reCAPTCHA / 验证码配置
- 提取支付相关配置
- 提取 KYC 相关配置
- 提取敏感的业务逻辑逻辑
- 识别 JS 框架和库版本（用于漏洞匹配）

**配置文件泄露检测（10 项）**：
- /site/config.json 探测
- /config.json 探测
- /app.config.json 探测
- /env.json 探测
- /settings.json 探测
- /.well-known/ 目录探测
- /security.txt 探测
- /asset-manifest.json 探测
- /manifest.json 探测
- /robots.txt 分析（提取隐藏路径）

**第三方追踪与供应链（10 项）**：
- 从 JS 中提取所有第三方域名
- 分析第三方服务的类型（分析、广告、支付、认证、监控）
- 检查第三方服务的安全配置
- 检查第三方 SDK 版本（过时版本风险）
- 检查第三方服务的数据收集范围

**WebSocket 深度测试（15 项）**：
- 从 JS 和 HTML 中提取 WebSocket 端点
- 测试 WebSocket 连接是否需要认证
- 测试 WebSocket 的 Origin 检查
- 测试 WebSocket 消息注入
- 测试 WebSocket 重放攻击
- 测试 WebSocket 中的敏感数据泄露
- 测试 WebSocket 跨站劫持（CSWSH）

### 关口7验证

```powershell
$dir = "audits/<domain>/step-07-app-layer"
@("app-layer.json","app-layer.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 8：CMS 专项审计（40+ 项）

**目标**：对所有可访问子域名检测 CMS 系统（WordPress、Drupal、Joomla 等）并执行专项审计

### 测试项分类（40+ 项）：

**CMS 识别（5 项）**：
- 响应头指纹识别（X-Generator, X-Powered-By 等）
- HTML meta 标签指纹识别
- 路径特征识别（/wp-content, /wp-admin, /wp-includes 等）
- 文件特征识别（/wp-login.php, /xmlrpc.php 等）
- 版本号提取（从 meta 标签、readme.html、feed 等）

**WordPress 专项（20 项）**：
- /wp-login.php 登录页面探测
- /xmlrpc.php XML-RPC 接口探测
- /wp-json/ REST API 探测
- /wp-admin/ 管理后台探测
- /wp-content/ 目录探测
- /wp-includes/ 目录探测
- /wp-config.php 配置文件探测
- /wp-config.php.bak, .swp, ~ 等备份文件探测
- /wp-cron.php 探测
- /wp-trackback.php 探测
- /wp-mail.php 探测
- /wp-links-opml.php 探测
- /wp-sitemap.xml 探测
- /feed/ 探测
- /author/ 用户枚举
- /?author=1 用户枚举
- /wp-json/wp/v2/users REST API 用户枚举
- wp-content/plugins/ 目录探测
- wp-content/themes/ 目录探测
- wp-content/uploads/ 目录探测

**Drupal 专项（5 项）**：
- /user/login 登录页探测
- /node/ 内容页探测
- /admin/ 管理后台探测
- /CHANGELOG.txt 版本泄露
- /core/ 目录探测

**Joomla 专项（5 项）**：
- /administrator/ 管理后台探测
- /components/ 组件目录探测
- /modules/ 模块目录探测
- /templates/ 模板目录探测
- /language/ 语言目录探测

**其他 CMS（5 项）**：
- 通用 CMS 指纹识别（响应头、HTML 结构、路径特征）
- 常见 CMS 管理后台路径探测
- 常见 CMS 配置文件探测
- 常见 CMS 备份文件探测
- 常见 CMS 默认凭据尝试

### 关口8验证

```powershell
$dir = "audits/<domain>/step-08-cms"
@("cms-audit.json","cms-audit.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 9：交易/支付平台专项审计（50+ 项）

**目标**：对发现的交易平台和支付系统执行专项安全审计

### 测试项分类（50+ 项）：

**认证机制（15 项）**：
- 登录页面安全分析（验证码、CSRF token、多因素认证）
- 注册页面安全分析（密码强度要求、邮箱验证）
- 密码重置流程安全分析
- 会话管理安全分析（token 刷新、会话过期）
- OAuth 集成安全分析（redirect_uri 验证、state 参数、PKCE）
- 2FA/MFA 实现分析
- KYC 流程安全分析

**API 端点安全（15 项）**：
- 交易 API 端点发现
- 账户 API 端点发现
- 支付 API 端点发现
- API 认证机制分析（JWT、API Key、OAuth）
- API 速率限制分析
- API 输入验证分析
- API 敏感数据返回分析（是否返回过多字段）

**支付集成安全（10 项）**：
- 第三方支付 SDK 安全分析
- 支付回调 URL 安全分析
- 支付金额篡改防护
- 支付渠道配置安全
- 测试环境与生产环境隔离

**资产安全（10 项）**：
- 钱包地址暴露检测
- 银行账户信息暴露检测
- 交易历史泄露检测
- 用户资产信息泄露检测
- 内部转账功能安全

### 关口9验证

```powershell
$dir = "audits/<domain>/step-09-trading"
@("trading-audit.json","trading-audit.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 10：第三方依赖与供应链审计（40+ 项）

**目标**：审计所有第三方依赖的供应链安全风险

### 测试项分类（40+ 项）：

**CDN 依赖分析（10 项）**：
- 从 JS 和 HTML 中提取所有 CDN 域名
- 检查 CDN 资源的完整性（SRI hash）
- 检查 CDN 资源的版本号
- 检查 CDN 资源的过期/弃用版本
- 检查 CDN 域名是否在 CSP 中声明

**第三方 JS 库分析（10 项）**：
- 提取所有第三方 JS 库的版本号
- 匹配已知漏洞数据库（CVE）
- 检查是否有未打补丁的已知漏洞
- 检查库的维护状态（是否已弃用）
- 检查是否有通过 CDN 加载的过时版本

**数据收集与隐私（10 项）**：
- 识别分析/追踪服务（Google Analytics, Mixpanel, Amplitude 等）
- 识别广告网络
- 识别热力图/用户行为追踪服务
- 识别错误监控服务（Sentry, Bugsnag, Rollbar 等）
- 检查数据收集的合规性（是否有隐私政策）

**供应链攻击面（10 项）**：
- 检查第三方服务的 CORS 配置
- 检查第三方服务的安全头
- 检查第三方服务的 SSL 证书
- 检查第三方服务的可用性
- 检查是否有已弃用的第三方服务仍在引用

### 关口10验证

```powershell
$dir = "audits/<domain>/step-10-supply-chain"
@("supply-chain.json","supply-chain.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
if ((Get-ChildItem "$dir/evidence" -Filter "*.json" | Measure-Object).Count -gt 0) { "✅ evidence/ has files" } else { "❌ MISSING: evidence files" }
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 11：CSP 内部域名深度扫描（30+ 项）

**目标**：从所有已审计域名的 CSP 策略中提取内部域名，并进行一一扫描审计

### 强制要求：
- 从所有已审计域名的 CSP 头中提取所有域名（default-src, script-src, style-src, img-src, connect-src, font-src, frame-src, media-src, object-src, report-uri, worker-src, child-src, frame-ancestors, form-action, base-uri, manifest-src, prefetch-src 等所有指令）
- 对每个提取到的域名执行基础审计（安全头 + 响应分析 + 技术栈指纹）
- 对可访问的内部域名执行完整审计流程
- 发现的漏洞必须关联到源域名（哪个域名的 CSP 暴露了该内部域名）

### 测试项分类（30+ 项）：

**CSP 提取（10 项）**：
- 从所有域名收集 CSP 策略
- 提取所有 CSP 指令中的域名
- 分类域名（内部域名 / 外部域名 / CDN / 第三方服务）
- 识别 CSP 中的 IP 地址
- 识别 CSP 中的通配符使用
- 识别 CSP 中的 unsafe-inline / unsafe-eval
- 识别 CSP 中的 data: / blob: 协议
- 识别 CSP 中的 nonce / hash 使用
- 识别 CSP 中的 report-uri / report-to
- 识别 CSP 中的 strict-dynamic

**内部域名审计（20 项）**：
- 对每个内部域名执行 HTTP 探测
- 检查内部域名是否可以公网访问
- 检查内部域名的安全头配置
- 检查内部域名的技术栈指纹
- 检查内部域名是否有认证保护
- 检查内部域名是否暴露敏感信息
- 检查内部域名的 SSL 证书
- 记录内部域名的命名规范（推断内部架构）

### 关口11验证

```powershell
$dir = "audits/<domain>/step-11-csp-internal"
@("csp-internal.json","csp-internal.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 12：WordPress 插件/主题版本漏洞扫描（30+ 项）

**目标**：对发现的 WordPress 站点进行插件和主题的版本漏洞扫描

### 测试项分类（30+ 项）：

**插件发现与版本提取（10 项）**：
- 从 wp-json API 提取所有插件名称和版本号
- 从 HTML 源码中提取插件信息（meta 标签、注释、link 标签）
- 从 CSS/JS 文件路径中提取插件信息
- 从 readme.txt 文件中提取版本信息
- 从 changelog.txt 文件中提取版本信息
- 从插件目录直接探测（/wp-content/plugins/<name>/）
- 从插件版本文件探测（/wp-content/plugins/<name>/version.php）
- 从插件 README 文件探测（/wp-content/plugins/<name>/readme.txt）
- 从插件的 SVN 信息中提取版本
- 从插件的 package.json / composer.json 提取版本

**主题发现与版本提取（5 项）**：
- 从 wp-json API 提取主题名称和版本号
- 从 HTML 源码中提取主题信息（style.css 注释）
- 从 theme 目录直接探测（/wp-content/themes/<name>/）
- 从主题的 style.css 提取版本信息
- 从主题的 changelog 提取版本信息

**漏洞匹配（10 项）**：
- 对每个插件/主题的版本号进行已知漏洞匹配
- 查询公开漏洞数据库（CVE、WPScan、ExploitDB）
- 检查是否有未打补丁的已知漏洞
- 识别过时插件/主题（版本超过 1 年未更新）
- 识别已从 WordPress 官方仓库移除的插件
- 识别已知有安全漏洞的插件/主题
- 检查 WordPress 核心版本是否有已知漏洞
- 检查 PHP 版本是否有已知漏洞
- 检查数据库版本是否有已知漏洞
- 检查 Web 服务器版本是否有已知漏洞

**XML-RPC 深度分析（5 项）**：
- 调用 system.listMethods 枚举所有可用方法
- 检测 system.multicall 是否启用（暴力破解放大）
- 检测 pingback.ping 是否启用（SSRF 风险）
- 检测 wp.getUsersBlogs 是否启用（用户枚举）
- 检测 wp.getPost 等敏感方法是否可匿名调用

### 关口12验证

```powershell
$dir = "audits/<domain>/step-12-wordpress"
@("wordpress.json","wordpress.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 13：误报验证机制（对全部漏洞执行）

**目标**：对每个漏洞执行误报验证，确保报告中只有真实可复现的漏洞

### 验证方法：

1. **独立工具验证**：使用不同工具（curl + PowerShell + Chrome DevTools）交叉验证同一漏洞
2. **响应对比验证**：对比两次独立请求的响应，确认漏洞一致性
3. **边界条件验证**：在不同 User-Agent、不同请求方法下验证漏洞表现
4. **时效性验证**：间隔 5 分钟以上重新验证，排除临时性错误

### 误报排除规则：

- 404/403/401 响应需有明确的漏洞证据（如信息泄露在响应体中）才算有效漏洞
- 两次独立请求结果不一致的标记为 "需进一步验证"
- 无法复现的漏洞标记为 "误报" 并从最终报告中排除
- 临时性错误（502/503/超时）不视为漏洞
- 正常业务行为不视为漏洞（如正常登录页面暴露不算漏洞）

### 关口13验证

```powershell
$dir = "audits/<domain>/step-13-false-positive"
@("false-positive.json","false-positive.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$data = Get-Content "$dir/false-positive.json" | ConvertFrom-Json
Write-Host "总漏洞数（验证前）: $($data.total_vulnerabilities_before)"
Write-Host "已验证: $($data.verified_count)"
Write-Host "误报排除: $($data.false_positives_count)"
Write-Host "有效漏洞: $($data.valid_vulnerabilities_count)"
Write-Host "需进一步验证: $($data.needs_verification_count)"
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 14：逐域名 CORS 深度测试（50+ 项 / 域名）

**目标**：对每个可访问子域名执行 CORS 深度测试

### 测试项分类（50+ 项 / 域名）：

**CORS 头分析（10 项）**：
- Access-Control-Allow-Origin 值分析（* / 具体域名 / null）
- Access-Control-Allow-Credentials 值分析
- Access-Control-Allow-Methods 值分析
- Access-Control-Allow-Headers 值分析
- Access-Control-Expose-Headers 值分析
- Access-Control-Max-Age 值分析
- 多个 Origin 响应对比
- 不合法 Origin 响应对比
- null Origin 响应对比
- 子域名 Origin 响应对比

**CORS 配置不当测试（20 项）**：
- 测试 Origin 头反射（Origin: https://evil.com 是否被反射）
- 测试 Allow-Credentials: true + Allow-Origin: * 组合
- 测试 Allow-Credentials: true + Allow-Headers: * 组合
- 测试 Allow-Credentials: true + 反射任意 Origin 组合
- 测试 Origin 头前缀绕过（Origin: https://evil.com.target.com）
- 测试 Origin 头后缀绕过（Origin: https://target.com.evil.com）
- 测试 Origin 头子域名绕过
- 测试 Origin 头 null 值绕过
- 测试 Origin 头空值
- 测试 Origin 头特殊字符注入
- 测试 Origin 头大小写变体
- 测试 Origin 头编码变体
- 测试 Origin 头 http vs https 变体
- 测试 Origin 头端口号变体
- 测试 Origin 头 IP 地址变体
- 测试 302 重定向后的 CORS 行为
- 测试 Vary: Origin 头
- 测试预检请求（OPTIONS）的 CORS 头
- 测试简单请求（GET）的 CORS 头
- 测试带凭据请求（withCredentials）的 CORS 头

**CORS 信息泄露（10 项）**：
- 从 CORS 头中提取内部域名
- 从 CORS 头中识别允许的敏感方法
- 从 CORS 头中识别允许的敏感头
- 从 CORS 头中推断 API 版本
- 从 CORS 响应中提取敏感数据
- 跨域请求敏感端点测试
- 跨域请求认证端点测试
- 跨域读取响应体测试
- 跨域请求带 Cookie 测试
- 跨域请求带 Authorization 头测试

**CORS 绕过技术（10 项）**：
- 测试使用泛域名绕过
- 测试使用 IP 地址绕过
- 测试使用同域名不同协议绕过
- 测试使用国际化域名绕过
- 测试使用 Punycode 绕过
- 测试使用换行符绕过
- 测试使用 URL 编码绕过
- 测试使用反向代理绕过
- 测试使用 DNS 重绑定绕过
- 测试使用 WebSocket 绕过

### 关口14验证

```powershell
$dir = "audits/<domain>/step-14-cors"
@("cors.json","cors.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 15：响应体深度信息提取（40+ 项 / 域名）

**目标**：从所有已审计域名的响应体中深度提取信息泄露漏洞

### 测试项分类（40+ 项 / 域名）：

**敏感信息模式匹配（15 项）**：
- 正则匹配 AWS 密钥（AKIA, ASIA 开头）
- 正则匹配 Google API 密钥（AIza 开头）
- 正则匹配 JWT Token（eyJ 开头）
- 正则匹配 私钥（-----BEGIN PRIVATE KEY-----）
- 正则匹配 数据库连接字符串
- 正则匹配 内部 IP 地址（10.x, 172.16-31.x, 192.168.x）
- 正则匹配 邮箱地址
- 正则匹配 手机号格式
- 正则匹配 OAuth client_id / client_secret
- 正则匹配 Sentry DSN
- 正则匹配 API Key 模式
- 正则匹配 密码/bcrypt/scrypt hash 模式
- 正则匹配 信用卡号模式
- 正则匹配 SSN / 身份证号模式
- 正则匹配 内部 URL 模式

**技术栈指纹（10 项）**：
- 从 HTML 注释中提取技术栈信息
- 从 meta 标签中提取 CMS/框架信息
- 从 JS 错误信息中提取内部路径
- 从 CSS 类名中提取框架信息
- 从响应头中组合推断技术栈
- 从 favicon hash 识别技术栈
- 从 404 页面特征识别技术栈
- 从文件路径模式识别技术栈
- 从 cookie 命名规范识别技术栈
- 从 ETag 格式识别技术栈

**内部路径泄露（10 项）**：
- 从 JS 中提取绝对路径（/home/user/, /var/www/, C:\inetpub\ 等）
- 从 HTML 注释中提取目录结构
- 从错误页面中提取文件路径
- 从 CSS 中提取资源路径
- 从 Source Map 中提取源文件路径
- 从 robots.txt 中提取隐藏路径
- 从 sitemap.xml 中提取内部路径
- 从 RSS/Atom Feed 中提取路径
- 从 Link 头中提取内部路径
- 从 JSON 响应中提取路径信息

**第三方服务指纹（5 项）**：
- 从响应体中提取第三方服务域名
- 识别第三方服务的类型
- 检查第三方服务的配置信息
- 检查第三方服务的端点暴露
- 检查第三方服务的版本信息

### 关口15验证

```powershell
$dir = "audits/<domain>/step-15-body-extract"
@("body-extract.json","body-extract.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 16：认证接口用户枚举测试（30+ 项 / 域名）

**目标**：对所有可访问子域名检测用户枚举漏洞

### 测试方法：

**登录接口枚举（10 项）**：
- 使用存在的用户名 vs 不存在的用户名，对比错误消息差异
- 使用存在的邮箱 vs 不存在的邮箱，对比错误消息差异
- 对比 HTTP 响应码差异
- 对比响应长度差异
- 对比响应时间差异（时间侧信道）
- 测试锁定账户后的响应差异
- 测试不同 User-Agent 下的响应差异
- 测试不同 Content-Type 下的响应差异
- 测试空用户名/空密码的响应
- 测试 SQL 注入 payload 作为用户名

**注册接口枚举（5 项）**：
- 使用已注册的邮箱尝试注册，对比错误消息
- 使用已注册的用户名尝试注册，对比错误消息
- 对比响应码差异
- 对比响应长度差异
- 测试批量注册请求

**密码重置接口枚举（10 项）**：
- 使用存在的邮箱 vs 不存在的邮箱，对比错误消息差异
- 对比响应码差异
- 对比响应长度差异
- 对比响应时间差异
- 对比是否发送邮件的行为差异
- 测试密码重置 token 的有效期
- 测试密码重置 token 的随机性
- 测试密码重置 token 是否可被猜测
- 测试密码重置 token 是否在响应中返回
- 测试密码重置 token 是否在 URL 中返回

**API 接口枚举（5 项）**：
- 使用存在的用户 ID vs 不存在的用户 ID 访问用户信息 API
- 使用存在的用户名 vs 不存在的用户名访问用户信息 API
- 对比响应差异
- 测试批量用户 ID 枚举
- 测试用户搜索/自动补全接口

### 关口16验证

```powershell
$dir = "audits/<domain>/step-16-auth-enum"
@("auth-enum.json","auth-enum.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 17：逐端点速率限制深度测试（30+ 项 / 域名）

**目标**：对每个域名的所有认证和 API 端点执行多轮快速请求，检测暴力破解防护

### 测试方法：

**端点发现（5 项）**：
- 从步骤 1-6 中收集所有发现的认证端点
- 从 JS 中提取登录/注册/重置 API 端点
- 从 HTML 中提取表单 action 端点
- 从 robots.txt 中提取隐藏端点
- 从 sitemap.xml 中提取端点

**速率限制测试（20 项）**：
- 对登录端点发送 30 个快速请求，检测 429 响应
- 对注册端点发送 30 个快速请求
- 对密码重置端点发送 30 个快速请求
- 对 API 端点发送 30 个快速请求
- 对验证码发送端点发送 30 个快速请求
- 对 OAuth 端点发送 30 个快速请求
- 对 Token 刷新端点发送 30 个快速请求
- 检测速率限制响应头（Retry-After, X-RateLimit-*, RateLimit-*）
- 检测速率限制是否使用滑动窗口
- 检测速率限制是否区分端点
- 检测速率限制是否区分 IP
- 检测速率限制是否区分用户
- 测试不同 IP 地址绕过速率限制
- 测试不同 User-Agent 绕过速率限制
- 测试不同参数绕过速率限制（添加随机参数）
- 测试不同 Header 绕过速率限制（X-Forwarded-For, X-Real-IP）
- 测试不同 Content-Type 绕过速率限制
- 测试速率限制恢复时间
- 测试分布式攻击场景（多 IP 同时请求）
- 测试 API 版本差异（v1 vs v2 的速率限制）

**暴力破解防护（5 项）**：
- 测试账户锁定机制（连续错误密码后是否锁定）
- 测试账户锁定后的解锁机制
- 测试验证码/人机验证的存在性
- 测试验证码的绕过可能性
- 测试 CSRF token 的存在性

### 关口17验证

```powershell
$dir = "audits/<domain>/step-17-rate-limit"
@("rate-limit.json","rate-limit.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 18：逐域名 Cookie 安全审计（30+ 项 / 域名）

**目标**：对所有可访问子域名检查 Cookie 安全属性

### 测试项分类（30+ 项 / 域名）：

**Cookie 属性分析（10 项）**：
- HttpOnly 标志缺失
- Secure 标志缺失
- SameSite 属性（None / Lax / Strict / 未设置）
- Domain 属性范围（是否过于宽泛，如设置为 .com 等顶级域名）
- Path 属性范围（是否过于宽泛，如设置为 /）
- Expires / Max-Age 时长（是否过长）
- 会话 Cookie 安全（Session Cookie 是否设置了过期时间）
- Cookie 前缀（__Host- / __Secure- 前缀使用）
- Cookie 值是否明文存储敏感信息
- Cookie 值是否可被猜测（如顺序 ID）

**第三方 Cookie 分析（10 项）**：
- 识别所有第三方 Cookie（CDN、分析、广告、社交等）
- 检查第三方 Cookie 的 SameSite 属性
- 检查第三方 Cookie 的 HttpOnly 属性
- 检查第三方 Cookie 的 Secure 属性
- 检查第三方 Cookie 是否包含敏感信息
- 检查第三方 Cookie 的 Domain 属性
- 检查第三方 Cookie 是否在 CSP 中声明
- 检查第三方 Cookie 是否被用于追踪
- 检查第三方 Cookie 的合规性
- 检查第三方 Cookie 是否可通过 JavaScript 访问

**Cookie 安全配置（10 项）**：
- 检查是否所有 Cookie 都有 SameSite 属性
- 检查是否所有认证 Cookie 都有 Secure 标志
- 检查是否所有认证 Cookie 都有 HttpOnly 标志
- 检查 Cookie 的 Path 属性是否合理
- 检查是否有跨子域名的 Cookie 泄露
- 检查是否有持久化 Cookie 存储敏感信息
- 检查 Cookie 是否在非 HTTPS 页面中传输
- 检查 Cookie 的 Domain 属性是否过于宽泛
- 检查是否有 Cookie 前缀冲突
- 检查 Cookie 的大小是否合理

### 关口18验证

```powershell
$dir = "audits/<domain>/step-18-cookie"
@("cookie.json","cookie.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 19：WebSocket 端点发现与测试（30+ 项）

**目标**：对所有可访问子域名发现 WebSocket 端点并执行安全测试

### 测试项分类（30+ 项）：

**端点发现（10 项）**：
- 从 JS Bundle 中提取 WebSocket URL（wss://, ws://）
- 从 HTML 中提取 WebSocket 连接
- 探测常见 WebSocket 路径（/ws, /v1/stream, /socket.io, /realtime, /push, /notifications, /live, /feed, /ticker, /updates）
- 探测 Socket.IO 端点（/socket.io/?EIO=3&transport=polling）
- 探测 SockJS 端点（/sockjs/info）
- 探测 STOMP over WebSocket 端点
- 探测 GraphQL Subscription 端点
- 探测 SignalR 端点（/signalr/negotiate）
- 探测 WAMP 端点
- 探测 MQTT over WebSocket 端点

**认证测试（10 项）**：
- 测试 WebSocket 连接是否需要认证 token
- 测试无认证 Cookie 的 WebSocket 连接
- 测试过期 token 的 WebSocket 连接
- 测试 WebSocket 连接是否验证 Origin 头
- 测试不同 Origin 头的 WebSocket 连接
- 测试 WebSocket 握手阶段的 CSRF 保护
- 测试 WebSocket 是否支持匿名连接
- 测试 WebSocket 的会话管理（重连后是否需要重新认证）
- 测试 WebSocket 认证 token 是否在 URL 参数中暴露
- 测试 WebSocket 是否支持多因素认证后的连接

**消息安全测试（10 项）**：
- 测试 WebSocket 消息注入（JSON 注入、XSS payload）
- 测试 WebSocket 消息重放攻击
- 测试 WebSocket 跨站劫持（CSWSH）
- 测试 WebSocket 消息中的敏感数据泄露
- 测试 WebSocket 消息大小限制
- 测试 WebSocket 消息频率限制
- 测试 WebSocket 通道是否加密（wss:// vs ws://）
- 测试 WebSocket 消息的序列化安全性
- 测试 WebSocket 心跳机制
- 测试 WebSocket 断线重连的安全性

### 关口19验证

```powershell
$dir = "audits/<domain>/step-19-websocket"
@("websocket.json","websocket.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 20：WordPress 深度扫描增强（30+ 项）

**目标**：对发现的所有 WordPress 站点执行深度安全扫描，包含插件/主题漏洞、配置缺陷、REST API 暴露等

### 测试项分类（30+ 项）：

**WordPress 核心漏洞扫描（10 项）**：
- 提取 WordPress 核心版本号（从 meta 标签、feed、readme.html）
- 匹配已知 WordPress 核心 CVE 漏洞
- 检查 WordPress 自动更新是否启用
- 检查 WordPress 文件权限配置
- 检查 wp-config.php 是否可访问
- 检查 WordPress 调试模式是否启用（WP_DEBUG）
- 检查 WordPress 数据库前缀是否默认（wp_）
- 检查 WordPress 安全密钥（AUTH_KEY, SECURE_AUTH_KEY 等）是否配置
- 检查 WordPress 版本是否已停止支持
- 检查 WordPress 安装向导是否仍可访问

**REST API 深度分析（10 项）**：
- 探测 /wp-json/wp/v2/users 用户枚举
- 探测 /wp-json/wp/v2/posts 文章泄露
- 探测 /wp-json/wp/v2/pages 页面泄露
- 探测 /wp-json/wp/v2/comments 评论泄露
- 探测 /wp-json/wp/v2/media 媒体文件泄露
- 探测 /wp-json/wp/v2/settings 配置泄露
- 探测 /wp-json/wp/v2/types 自定义类型泄露
- 探测 REST API 是否需要认证
- 探测 REST API 是否支持匿名写入
- 探测 REST API 的 CORS 配置

**备份与配置文件泄露（10 项）**：
- 探测 /wp-config.php.bak, .swp, .save, ~, .old, .backup, .txt, .zip, .tar.gz
- 探测 /.htaccess.bak, .swp, .save, ~
- 探测 /phpinfo.php, /info.php, /test.php
- 探测 /wp-content/debug.log
- 探测 /wp-content/backups/
- 探测 /wp-content/upgrade/
- 探测 /wp-content/uploads/ 目录遍历
- 探测 wp-config.php 中的数据库凭据
- 探测 .wp-cli.yml 配置文件
- 探测 composer.json / package.json 中的敏感信息

### 关口20验证

```powershell
$dir = "audits/<domain>/step-20-wp-deep"
@("wp-deep.json","wp-deep.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 21：子域名枚举增强与攻击面扩展（20+ 方法）

**目标**：在步骤 0 的基础上，使用更多技术进行更深度的子域名发现，最大化攻击面覆盖

**核心原则**：本步骤是对步骤 0 的补充增强，使用步骤 0 未覆盖的额外方法进行二次发现。所有新发现的域名必须回补到步骤 0 的子域名列表，并执行完整审计。

### 必须覆盖的方法（20+ 种）：

**DNS 爆破增强（5 种）**：
- 使用通用子域名字典进行 DNS A 记录爆破
- 使用行业特定字典（从目标网站提取的关键词）
- 使用 DNS 通配符检测与绕过
- 使用 DNSSEC 验证
- 使用 DNS ANY 查询

**搜索引擎深度挖掘（5 种）**：
- Google Dork 搜索（site:*.domain -www）
- Bing 搜索（domain:domain -www）
- 百度搜索子域名
- 搜狗/360 搜索子域名
- DuckDuckGo 搜索子域名

**第三方数据源（5 种）**：
- AlienVault OTX 被动 DNS 查询
- URLScan.io 域名搜索
- CommonCrawl 索引搜索
- Censys 证书搜索
- BinaryEdge 域名搜索

**GitHub/代码仓库（3 种）**：
- GitHub 代码搜索域名关键词
- GitLab 代码搜索
- Gitee 代码搜索

**其他方法（2+ 种）**：
- PTR 记录（反向 DNS）扫描
- ASN IP 范围扫描
- 域名排列组合（alt-dns 类似方法）

### 输出要求

- 每个新发现的域名标记来源方法
- 与步骤 0 的域名列表交叉比对，去重
- 新域名自动回补到步骤 0 的子域名列表
- 对新发现的域名执行完整审计流程

### 关口21验证

```powershell
$dir = "audits/<domain>/step-21-sub-enhance"
@("sub-enhance.json","sub-enhance.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$data = Get-Content "$dir/sub-enhance.json" | ConvertFrom-Json
Write-Host "新发现域名: $($data.new_subdomains.Count)"
Write-Host "已回补到步骤0: $($data.backfilled_count)"
Write-Host "额外审计完成: $($data.extra_audit_completed)"
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 步骤 22：最终汇总报告

**目标**：在所有审计步骤（0-21）完成后，汇总全部数据生成最终报告。这是审计的最后一步，仅在步骤 0-21 全部完成后执行一次。

### 🔴 数据聚合与报告生成流程（强制执行）

**生成最终报告必须按以下流程逐步执行，确保每个漏洞都有完整详情，不得遗漏任何漏洞。**

#### 阶段 1：漏洞数据聚合

**1.1 从所有步骤收集漏洞数据**

从每个步骤的 `vulnerabilities.json` 读取漏洞列表，合并到统一的漏洞集合：

```
漏洞来源步骤: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20
（步骤 0、13、21、22 不产生漏洞数据）
```

**1.2 去重与合并**

- 按域名+漏洞类型+端点进行去重
- 相同漏洞在不同步骤中发现的，合并为一条，引用所有来源步骤
- 去重后的漏洞总数 = 最终报告中的漏洞数量

**1.3 漏洞数量一致性验证**

在生成报告前，必须验证：

```powershell
# 读取各步骤 vulnerabilities.json 汇总漏洞总数
$total = 0
$steps = @(1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20)
foreach ($s in $steps) {
    $sdir = Get-ChildItem "audits/<domain>" -Directory | Where-Object { $_.Name -match "^step-$(if($s -lt 10){'0'})$s[^0-9]" } | Select-Object -First 1
    if ($sdir) {
        $vuln = Get-Content "$($sdir.FullName)/vulnerabilities.json" -Raw | ConvertFrom-Json
        $total += $vuln.Count
    }
}
Write-Host "步骤漏洞原始总数: $total"
Write-Host "去重后有效漏洞数: 应在报告中体现"
```

**🔴 如果去重后的漏洞总数 < 步骤漏洞原始总数，必须记录去重映射关系。**

#### 阶段 2：报告结构生成

**2.1 按域名系统分组漏洞**

将去重后的漏洞按域名分组，分组顺序规则：
- 主站（www.<domain>）排在最前
- 严重漏洞最多的域名排在前
- 同一域名内按 CVSS 评分从高到低排列

**2.2 为每个域名系统生成章节**

每个域名系统章节包含：
- 域名信息（技术栈、业务类型）
- 漏洞数量统计
- 每个漏洞的完整详情条目

**2.3 为每个漏洞生成完整详情条目**

**🔴 每个漏洞详情条目必须包含以下全部字段，缺一不可：**

| 序号 | 字段 | 强制 | 格式要求 |
|------|------|------|---------|
| 1 | 漏洞编号 | ✅ | `#N.` 格式，从 1 开始连续编号 |
| 2 | 风险等级标签 | ✅ | `[严重]` / `[高危]` / `[中危]` / `[低危]` / `[信息]` |
| 3 | 问题描述 | ✅ | 1-3 句话描述漏洞是什么，在哪里发现 |
| 4 | CVSS 评分 | ✅ | `CVSS X.X` 格式 |
| 5 | 风险说明 | ✅ | 3-5 条要点，说明攻击方式和危害 |
| 6 | 影响范围 | ✅ | 列出受影响的域名、页面、系统 |
| 7 | 解决方案 | ✅ | 具体可执行的代码/配置示例 |
| 8 | 验证命令 | ✅ | curl 或 PowerShell 命令，可独立复现 |
| 9 | 证据引用 | ✅ | 引用步骤来源 |

**🔴 每个漏洞条目模板（必须严格遵循）：**

```markdown
### [严重级别] #N. 漏洞标题

**问题描述**
具体描述漏洞是什么、在哪里发现、为什么是问题。

**风险等级**: 严重级别 (CVSS X.X)
**风险说明**:
- 攻击方式1
- 攻击方式2
- 实际危害

**影响范围**: 受影响的域名或系统

**解决方案**:

` ` `语言
具体可执行的修复代码/配置
` ` `

**验证命令**:

` ` `bash
curl 或 PowerShell 命令
` ` `
```

#### 阶段 3：报告完整性自检

**生成报告后，必须立即执行以下自检：**

**3.1 漏洞数量一致性检查**

```
报告中的漏洞总数 = 去重后的有效漏洞总数
报告中的漏洞编号必须连续（#1 到 #N，无跳号）
```

**3.2 每个漏洞详情完整性检查**

对报告中每个漏洞，逐项检查：
- [ ] 有 CVSS 评分
- [ ] 有风险说明（至少 3 条要点）
- [ ] 有影响范围
- [ ] 有具体解决方案（代码/配置）
- [ ] 有验证命令（curl/PowerShell）
- [ ] 有证据引用

**3.3 域名分组完整性检查**

- [ ] 所有受影响的域名都在报告中有独立章节
- [ ] 每个域名章节的漏洞数量与统计表一致
- [ ] 关联域名体系（如 oslgroup.com、oslsandbox.com）有独立章节

**🔴 如果以上任何检查项未通过，立即补充缺失内容，直到全部通过。**

### 输入数据来源

最终报告必须从以下来源汇总数据：

| 来源 | 数据 | 用途 |
|------|------|------|
| 步骤 0 | subdomains.json | 子域名列表、可访问性状态 |
| 步骤 1-5 | vulnerabilities.json（各步骤） | 每个步骤的漏洞列表 |
| 步骤 6 | subdomain-audit.json | 每个子域名的审计结果 |
| 步骤 7 | app-layer.json, vulnerabilities.json | 应用层审计结果 |
| 步骤 8 | cms-audit.json, vulnerabilities.json | CMS 审计结果 |
| 步骤 9 | trading-audit.json, vulnerabilities.json | 交易平台审计结果 |
| 步骤 10 | supply-chain.json, vulnerabilities.json | 供应链审计结果 |
| 步骤 11 | csp-internal.json, vulnerabilities.json | CSP 内部域名审计结果 |
| 步骤 12 | wordpress.json, vulnerabilities.json | WordPress 插件漏洞扫描结果 |
| 步骤 13 | false-positive.json | 误报验证结果（排除误报后的有效漏洞） |
| 步骤 14 | cors.json, vulnerabilities.json | CORS 深度测试结果 |
| 步骤 15 | body-extract.json, vulnerabilities.json | 响应体信息提取结果 |
| 步骤 16 | auth-enum.json, vulnerabilities.json | 用户枚举测试结果 |
| 步骤 17 | rate-limit.json, vulnerabilities.json | 速率限制测试结果 |
| 步骤 18 | cookie.json, vulnerabilities.json | Cookie 安全审计结果 |
| 步骤 19 | websocket.json, vulnerabilities.json | WebSocket 安全测试结果 |
| 步骤 20 | wp-deep.json, vulnerabilities.json | WordPress 深度扫描结果 |
| 步骤 21 | sub-enhance.json | 子域名增强发现结果 |

### 最终报告必须包含的内容

**1. 审计概要**
- 审计目标、审计时间、审计范围
- 认证/代理状态说明
- 审计方法论概述

**2. 全部审计步骤测试结果表格**
- 每个步骤的测试数、通过数、失败数、漏洞数
- 按步骤编号排序

**3. 基础设施概览**
- 所有发现的子域名（含可访问性状态）
- 所有关联域名体系
- 所有发现的第三方服务
- 技术栈总览

**4. 漏洞汇总**
- 按严重程度统计（严重/高危/中危/低危/信息）
- 按 CWE 分类统计
- 按 OWASP Top 10 分类统计
- 按域名分布统计
- 每个漏洞必须包含：CVSS 评分、CWE 编号、OWASP 分类、证据引用、复现步骤

**5. 详细漏洞报告**
- 按域名分组，每个漏洞完整详情
- 包含属性表、问题描述、风险说明、影响范围、解决方案、复现方法、证据文件

**6. 修复建议**
- 按严重程度排序的修复建议
- 包含具体可执行的修复代码/配置示例
- 四阶段修复路线图：P0(24h) / P1(7d) / P2(30d) / P3(90d)

**7. 合规对标**
- OWASP Top 10 2021 对标
- PCI DSS 4.0 对标
- ISO 27001 对标
- GDPR/数据保护对标

**8. 安全状况评估矩阵**
- 10 维安全评估（认证安全、传输安全、应用安全、API 安全、数据安全、基础设施安全、配置安全、供应链安全、监控安全、合规安全）

### 输出文件

- `final-report.md`：Markdown 格式最终报告
- `final-report.json`：结构化 JSON 格式报告（含 CVSS 评分、合规对标、修复方案）

### 关口22验证

**关口22必须执行以下验证，全部通过才算过关：**

#### 1. 文件完整性验证

```powershell
$dir = "audits/<domain>/step-22-final-report"
@("final-report.md","final-report.json","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
```

#### 2. 报告章节完整性验证

```powershell
$report = Get-Content "$dir/final-report.md" -Raw
if ($report -match "详细漏洞报告") { "✅ 详细漏洞报告 章节存在" } else { "❌ 缺少详细漏洞报告章节" }
if ($report -match "CVSS") { "✅ CVSS 评分存在" } else { "❌ 缺少 CVSS 评分" }
if ($report -match "修复建议") { "✅ 修复建议章节存在" } else { "❌ 缺少修复建议章节" }
if ($report -match "合规对标") { "✅ 合规对标章节存在" } else { "❌ 缺少合规对标章节" }
if ($report -match "审计总结") { "✅ 审计总结章节存在" } else { "❌ 缺少审计总结章节" }
```

#### 3. 🔴 漏洞数量一致性验证（关键检查 - 不通过则关口失败）

```powershell
$base = "audits/<domain>"
$total = 0
$steps = @(1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20)
foreach ($s in $steps) {
    $sdir = Get-ChildItem "$base" -Directory | Where-Object { $_.Name -match "^step-$(if($s -lt 10){'0'})$s[^0-9]" } | Select-Object -First 1
    if ($sdir -and (Test-Path "$($sdir.FullName)/vulnerabilities.json")) {
        $vuln = Get-Content "$($sdir.FullName)/vulnerabilities.json" -Raw | ConvertFrom-Json
        $count = if ($vuln -is [array]) { $vuln.Count } else { $vuln.vulnerabilities.Count }
        Write-Host "Step $s : $count vulnerabilities"
        $total += $count
    }
}
Write-Host "步骤漏洞原始总数: $total"

$reportVulns = ([regex]::Matches($report, "### \[[^\]]+\] #(\d+)\.")).Count
Write-Host "报告中漏洞条目数: $reportVulns"

if ($reportVulns -ge $total) {
    Write-Host "✅ 漏洞数量一致: 报告 $reportVulns 条 >= 步骤汇总 $total 条" -ForegroundColor Green
} else {
    Write-Host "❌ 漏洞数量不一致! 报告 $reportVulns 条 < 步骤汇总 $total 条" -ForegroundColor Red
    Write-Host "❌ 缺失 $($total - $reportVulns) 个漏洞详情!" -ForegroundColor Red
}
```

#### 4. 🔴 漏洞详情完整性验证（关键检查 - 不通过则关口失败）

```powershell
$missing = @()
$vulnBlocks = $report -split "### \[" | Select-Object -Skip 1
$totalBlocks = $vulnBlocks.Count
$completeBlocks = 0
foreach ($block in $vulnBlocks) {
    $hasCVSS = $block -match "CVSS \d+"
    $hasRisk = $block -match "风险说明"
    $hasImpact = $block -match "影响范围"
    $hasSolution = $block -match "解决方案"
    $hasVerify = $block -match "验证命令"
    if ($hasCVSS -and $hasRisk -and $hasImpact -and $hasSolution -and $hasVerify) {
        $completeBlocks++
    } else {
        $vulnId = if ($block -match "#(\d+)\.") { $matches[1] } else { "未知" }
        $missingFields = @()
        if (-not $hasCVSS) { $missingFields += "CVSS" }
        if (-not $hasRisk) { $missingFields += "风险说明" }
        if (-not $hasImpact) { $missingFields += "影响范围" }
        if (-not $hasSolution) { $missingFields += "解决方案" }
        if (-not $hasVerify) { $missingFields += "验证命令" }
        Write-Host "❌ #$vulnId 缺少: $($missingFields -join ', ')" -ForegroundColor Red
        $missing += "#$vulnId"
    }
}
Write-Host "漏洞详情完整性: $completeBlocks/$totalBlocks 完整"
if ($missing.Count -eq 0) {
    Write-Host "✅ 所有漏洞详情完整" -ForegroundColor Green
} else {
    Write-Host "❌ $($missing.Count) 个漏洞详情不完整: $($missing -join ', ')" -ForegroundColor Red
}
```

#### 5. 🔴 漏洞编号连续性验证

```powershell
$vulnIds = [regex]::Matches($report, "### \[[^\]]+\] #(\d+)\.") | ForEach-Object { [int]$_.Groups[1].Value } | Sort-Object
$maxId = $vulnIds[-1]
$allIds = 1..$maxId
$missingIds = $allIds | Where-Object { $_ -notin $vulnIds }
if ($missingIds.Count -eq 0) {
    Write-Host "✅ 漏洞编号连续 #1-#$maxId" -ForegroundColor Green
} else {
    Write-Host "❌ 缺失编号: $($missingIds -join ', ')" -ForegroundColor Red
}
```

#### 6. 域名分组完整性验证

```powershell
$domainSections = [regex]::Matches($report, "## [一二三四五六七八九十]+、(.+)（\d+个漏洞）")
Write-Host "域名分组章节数: $($domainSections.Count)"
if ($domainSections.Count -lt 4) {
    Write-Host "⚠️ 域名分组章节少于4个，可能缺少关联域名体系" -ForegroundColor Yellow
}
```

#### 7. 结构化数据验证

```powershell
$json = Get-Content "$dir/final-report.json" | ConvertFrom-Json
Write-Host "总步骤数: $($json.total_steps)"
Write-Host "总测试数: $($json.total_tests)"
Write-Host "总漏洞数: $($json.total_vulnerabilities)"
Write-Host "风险评分: $($json.risk_score)"
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

#### 🔴 关口22通过条件（全部必须满足，缺一不可）

| 检查项 | 通过条件 |
|--------|---------|
| 文件完整性 | 7 个文件全部存在 |
| 报告章节 | 5 个核心章节全部存在 |
| 漏洞数量一致性 | 报告漏洞条目数 >= 步骤汇总漏洞总数 |
| 漏洞详情完整性 | 100% 漏洞包含 CVSS+风险说明+影响范围+解决方案+验证命令 |
| 漏洞编号连续性 | #1 到 #N 无跳号 |
| 域名分组 | 至少 4 个域名分组章节（含关联域名体系） |
| 结构化数据 | final-report.json 字段完整 |
| 日志 | logs/execution.log 有内容 |

**🔴 以上 8 项全部通过，关口22才算过关。任一项不通过，立即补充缺失内容后重新验证，直到全部通过。**