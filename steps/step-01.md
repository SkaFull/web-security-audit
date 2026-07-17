# 步骤 1：基础安全检查（79项测试）

## 🔴 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| basic-security.json | ✅ | 全部79项测试结果 |
| basic-security.md | ✅ | Markdown 格式报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| evidence/bs-*.json | ✅ | 每个漏洞的完整证据 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 覆盖率验证（必须100%） |
| execution.log | ✅ | 所有HTTP请求和测试结果日志 |
| step-commit.json | ✅ | 步骤提交证明 |

---

## 目标
检查基础安全配置和常见漏洞

## 🔴 重要：多端点安全头检查

**安全头检查必须对多个端点执行，而非仅检查主页：**

```bash
# 必须检查的端点列表（至少5个）
ENDPOINTS=(
  "/"                          # 主页
  "/api/v1/"                   # API 根路径（或已知的 API 路径）
  "/signin"                    # 登录页
  "/asset/overview"            # 需要认证的页面
  "/robots.txt"                # 静态文件
)
```

**检查每个端点是否返回一致的安全头**，不同端点可能有不同的安全头配置。

## 测试项（79项）

### 1. HTTP 安全头（6项，每个端点独立检查）
- [ ] HSTS (Strict-Transport-Security)
- [ ] CSP (Content-Security-Policy) - 检查是否包含 `unsafe-inline`、`unsafe-eval`
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] X-XSS-Protection
- [ ] Referrer-Policy

**🔴 必须对主页 + 至少 3 个 API 端点分别检查，逐个记录。不同端点可能缺失不同的安全头。**

### 2. SSL/TLS 配置（4项）
- [ ] 证书有效性
- [ ] 协议版本（TLS 1.2/1.3）
- [ ] 密码套件强度
- [ ] CAA 记录

### 3. Cookie 安全（5项）
- [ ] Secure 标志
- [ ] HttpOnly 标志
- [ ] SameSite 属性
- [ ] Domain 范围
- [ ] **第三方 Cookie 分析**（检查 `_ga`、`_fbp`、`_gcl` 等第三方 Cookie 的 SameSite 配置）

### 4. 信息泄露（8项）
- [ ] Server 头暴露版本
- [ ] X-Powered-By 头
- [ ] 错误信息泄露
- [ ] 调试信息暴露
- [ ] 内部 IP 泄露
- [ ] **自定义响应头信息泄露**（如 `com.upex.utils.consts.globalconstants.excodeflag` 暴露 Java 包路径）
- [ ] **Link 响应头泄露内部域名**（如 `<https://web-static-id.example.com/...>` 暴露静态资源服务器）
- [ ] **响应头暴露技术栈**（如 `x-envoy-upstream-service-time`、`cf-ray` 等）

### 5. 目录遍历（5项）
- [ ] /admin
- [ ] /backup
- [ ] /config
- [ ] /.env
- [ ] /.git

### 6. 敏感文件（8项）
- [ ] robots.txt
- [ ] sitemap.xml
- [ ] security.txt
- [ ] crossdomain.xml
- [ ] clientaccesspolicy.xml
- [ ] **/site/config.json**（配置文件泄露，可能含 OAuth、银行账户、reCAPTCHA 密钥）
- [ ] **备份文件**（.bak、.backup、.old、.zip、.tar.gz、~、.swp、.save）
- [ ] **常见路径备份文件探测**（/console.bak、/console/index.bak、/wp-config.bak、/wp-config.php~、/config.json.bak、/admin.bak、/backup.zip、/backup.tar.gz、/db.sql、/dump.sql、/database.sql）
- [ ] **robots.txt 内容分析**（是否暴露 /api/、/admin/、/internal/ 等路径）
- [ ] **CSP 内部域名泄露分析**（解析 CSP 头中的域名列表，检测是否暴露内部基础设施域名如 *.internal.com、*.nucleus.com、*.stage.*、*.qa.*、内网 IP 等）

## 执行方法

```bash
# 优先使用代理
curl -x 127.0.0.1:7890 -k -v https://example.com/path

# 保存完整响应（头 + 体）
curl -x 127.0.0.1:7890 -k -D headers.txt -o body.txt https://example.com/path

# 代理失败时降级：直连
curl -k -v https://example.com/path

# 直连失败时：使用 WebFetch 工具
```

## 降级策略

1. **代理连接**（127.0.0.1:7890）- 首选
2. **直连**（无代理）- 代理失败时使用
3. **WebFetch** - 直连失败时使用
4. **离线分析** - 所有连接失败时使用已有数据

## 漏洞证据格式

每个漏洞必须包含：
```json
{
  "id": "BS-001",
  "title": "漏洞标题",
  "severity": "high",
  "endpoint": "https://example.com/path",
  "curl_command": "curl -x 127.0.0.1:7890 -k -v https://example.com/path",
  "response_headers": "...",
  "response_body": "...",
  "evidence_file": "evidence/bs-001.json",
  "description": "详细描述",
  "impact": "影响分析",
  "remediation": "修复建议"
}
```

## 覆盖率验证

```json
{
  "step": 1,
  "total_tests": 79,
  "executed_tests": 79,
  "coverage_percentage": 100,
  "skipped_tests": [],
  "failed_tests": [],
  "retry_count": 0
}
```

---

## ☑️ 执行检查清单（全部打勾才能通过关口）

### HTTP 安全头（每个端点独立检查）
- [ ] 1-6. 对主页检查 6 项安全头
- [ ] 7-12. 对 API 端点检查 6 项安全头
- [ ] 13-18. 对登录页检查 6 项安全头
- [ ] 19-24. 对认证页面检查 6 项安全头

### SSL/TLS 配置
- [ ] 25. 证书有效性
- [ ] 26. 协议版本
- [ ] 27. 密码套件强度
- [ ] 28. CAA 记录

### Cookie 安全
- [ ] 29. Secure 标志
- [ ] 30. HttpOnly 标志
- [ ] 31. SameSite 属性
- [ ] 32. Domain 范围
- [ ] 33. 第三方 Cookie 分析

### 信息泄露
- [ ] 34. Server 头
- [ ] 35. X-Powered-By
- [ ] 36. 错误信息泄露
- [ ] 37. 调试信息暴露
- [ ] 38. 内部 IP 泄露
- [ ] 39. 自定义响应头信息泄露
- [ ] 40. Link 响应头泄露内部域名
- [ ] 41. 响应头暴露技术栈

### 目录遍历
- [ ] 42-46. 测试 /admin, /backup, /config, /.env, /.git

### 敏感文件
- [ ] 47. robots.txt
- [ ] 48. sitemap.xml
- [ ] 49. security.txt
- [ ] 50. crossdomain.xml
- [ ] 51. clientaccesspolicy.xml
- [ ] 52. /site/config.json
- [ ] 53-60. 备份文件扩展名（.bak, .backup, .old, .zip, .tar.gz, ~, .swp, .save）
- [ ] 61-71. 常见路径备份文件（/console.bak, /console/index.bak, /wp-config.bak, /wp-config.php~, /config.json.bak, /admin.bak, /backup.zip, /backup.tar.gz, /db.sql, /dump.sql, /database.sql）
- [ ] 72. robots.txt 内容分析
- [ ] 73. CSP 内部域名泄露分析（解析 CSP 域名列表，检测内部基础设施暴露）

### 输出文件
- [ ] 74. 生成 basic-security.json
- [ ] 75. 生成 basic-security.md
- [ ] 76. 生成 vulnerabilities.json
- [ ] 77. 保存所有证据到 evidence/
- [ ] 78. 生成 progress.json
- [ ] 79. 生成 coverage.json（73项全部执行 = 100%）

---

## 🚪 关口验证

**必须全部显示 ✅ 才能进入步骤 2。** 如果有 ❌，立即补充缺失内容。

```powershell
$dir = "audits/<domain>/step-01-basic-security"
@("basic-security.json","basic-security.md","vulnerabilities.json","progress.json","coverage.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
if ((Get-ChildItem "$dir/evidence" -Filter "*.json" | Measure-Object).Count -gt 0) { "✅ evidence/ has files" } else { "❌ MISSING: evidence files" }
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
```