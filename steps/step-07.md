# 步骤 7：应用层深度审计

> **注意：最终汇总报告已移至步骤 22。本步骤执行 SPA 应用层深度安全审计。**

## 🔴 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| app-layer.json | ✅ | 应用层审计结果（JSON） |
| app-layer.md | ✅ | 应用层审计结果（Markdown） |
| vulnerabilities.json | ✅ | 漏洞列表（含 CVSS 评分） |
| progress.json | ✅ | 步骤执行进度 |
| coverage.json | ✅ | 测试覆盖率 |
| logs/execution.log | ✅ | 本步骤执行日志 |
| step-commit.json | ✅ | 步骤提交文件 |

---

## 目标
对所有可访问子域名执行 SPA 应用层深度安全审计，包括 JS Bundle 逆向分析、配置文件泄露检测、第三方追踪与供应链分析、WebSocket 深度测试。

## 测试项分类（50+ 项）

### JS Bundle 逆向分析（15 项）
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

### 配置文件泄露检测（10 项）
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

### 第三方追踪与供应链（10 项）
- 从 JS 中提取所有第三方域名
- 分析第三方服务的类型（分析、广告、支付、认证、监控）
- 检查第三方服务的安全配置
- 检查第三方 SDK 版本（过时版本风险）
- 检查第三方服务的数据收集范围

### WebSocket 深度测试（15 项）
- 从 JS 和 HTML 中提取 WebSocket 端点
- 测试 WebSocket 连接是否需要认证
- 测试 WebSocket 的 Origin 检查
- 测试 WebSocket 消息注入
- 测试 WebSocket 重放攻击
- 测试 WebSocket 中的敏感数据泄露
- 测试 WebSocket 跨站劫持（CSWSH）

---

## 报告质量要求

本步骤产生的漏洞必须包含：
- CVSS v3.1 评分和向量字符串
- CWE 编号
- OWASP 分类
- 影响范围分析
- 修复代码/配置示例

所有漏洞将汇总到步骤 22 的最终报告中。

---

## 执行检查清单

- [ ] 获取所有可访问子域名的 JS 文件
- [ ] 执行 JS Bundle 逆向分析（15 项）
- [ ] 执行配置文件泄露检测（10 项）
- [ ] 执行第三方追踪与供应链分析（10 项）
- [ ] 执行 WebSocket 深度测试（15 项）
- [ ] 生成 app-layer.json 和 app-layer.md
- [ ] 生成 vulnerabilities.json（含 CVSS）
- [ ] 写入 logs/execution.log 执行日志
- [ ] 执行关口7验证
- [ ] 生成 step-commit.json

## 关口7验证

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