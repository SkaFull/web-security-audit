# 步骤 10：交易/支付平台专项审计（40 项）

## 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| trading-audit.json | ✅ | 交易平台审计结果（JSON） |
| trading-audit.md | ✅ | Markdown 格式审计报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 40 项测试覆盖率（必须 100%） |
| logs/execution.log | ✅ | 执行日志 |
| step-commit.json | ✅ | 步骤提交证明 |
| evidence/ | ✅ | 漏洞证据文件 |

---

## 目标

对交易/支付/金融服务平台执行专项审计，覆盖交易 API、支付接口、KYC 端点、账户安全等 40 项测试。

## 测试项分类（40 项）

### 交易 API 端点（10 项）

1. 交易订单端点探测（/v1/orders, /v1/trade, /api/order）
2. 订单簿端点探测（/v1/orderbook, /v1/depth）
3. 市场数据端点探测（/v1/market, /v1/ticker, /v1/klines）
4. 资产概览端点探测（/v1/asset/overview, /v1/balance）
5. 交易历史端点探测（/v1/trade/history, /v1/orders/history）
6. 存取款端点探测（/v1/deposit, /v1/withdraw, /v1/transfer）
7. 交易 API 认证检测（未认证请求是否返回 401）
8. 交易 API 频率限制检测（快速发送 20+ 请求）
9. 交易 API 输入验证（SQL 注入、XSS payload 测试）
10. 交易 API 敏感数据泄露（响应中是否暴露内部 ID、余额等）

### 支付接口（8 项）

11. 支付回调端点探测（/v1/payment/callback, /v1/webhook）
12. 支付方式枚举（/v1/payment/methods）
13. 支付金额篡改测试（修改请求中的金额参数）
14. 支付货币转换四舍五入漏洞测试
15. 支付重放攻击测试（重复提交相同支付请求）
16. 支付回调签名验证测试（伪造回调请求）
17. 支付接口 SSL Pinning 检测
18. 支付接口 CORS 配置检测

### KYC/身份验证端点（8 项）

19. KYC 提交端点探测（/v1/kyc, /v1/verify, /v1/identity）
20. KYC 文档上传端点探测（/v1/kyc/upload, /v1/documents）
21. KYC 状态查询端点（/v1/kyc/status）
22. KYC 端点认证绕过测试
23. KYC 文件类型绕过测试（上传非允许格式）
24. KYC 文件大小限制测试
25. KYC 端点敏感信息泄露（响应中暴露身份证号、护照号等）
26. KYC 供应商信息泄露（响应中暴露第三方 KYC 供应商名称、API key）

### 账户安全（8 项）

27. 账户注册端点探测（/v1/register, /v1/signup）
28. 两步验证端点探测（/v1/2fa, /v1/mfa）
29. 密码强度策略检测（弱密码是否被拒绝）
30. 会话管理检测（JWT 过期时间、refresh token 机制）
31. 账户锁定机制检测（多次失败登录后是否锁定）
32. 敏感操作二次验证（提现、修改密码是否需要二次验证）
33. 设备指纹/绑定检测
34. 异地登录检测

### 合规与监管（6 项）

35. 交易记录导出端点（/v1/export, /v1/statement）
36. 隐私政策页面（/privacy, /legal/privacy）
37. 服务条款页面（/terms, /legal/terms）
38. 风险披露页面（/risk, /legal/risk）
39. 数据保护声明（GDPR/CCPA 合规）
40. 监管许可证展示（/license, /legal/license）

---

## 执行方法

对每个目标域名执行以下流程：

```bash
# 1. 探测交易 API 端点
for endpoint in /v1/orders /v1/trade /v1/orderbook /v1/market/ticker /v1/asset/overview /v1/deposit /v1/withdraw; do
  curl -k -s -x $PROXY -H "Cookie: authToken=$AUTH_TOKEN" -w "\nHTTP_CODE:%{http_code}" "https://$DOMAIN$endpoint"
done

# 2. 探测支付接口
curl -k -s -x $PROXY -H "Cookie: authToken=$AUTH_TOKEN" -w "\nHTTP_CODE:%{http_code}" "https://$DOMAIN/v1/payment/callback"
curl -k -s -x $PROXY -H "Cookie: authToken=$AUTH_TOKEN" -X POST -d '{"amount":0.01,"currency":"USD"}' "https://$DOMAIN/v1/payment/create"

# 3. 探测 KYC 端点
curl -k -s -x $PROXY -H "Cookie: authToken=$AUTH_TOKEN" -w "\nHTTP_CODE:%{http_code}" "https://$DOMAIN/v1/kyc/status"
curl -k -s -x $PROXY -w "\nHTTP_CODE:%{http_code}" "https://$DOMAIN/v1/kyc" # 无认证测试

# 4. 测试支付金额篡改
curl -k -s -x $PROXY -H "Cookie: authToken=$AUTH_TOKEN" -X POST -d '{"amount":-1000,"currency":"USD"}' "https://$DOMAIN/v1/withdraw"
```

---

## 关口10验证

```powershell
$dir = "audits/<domain>/step-10-supply-chain"
@("trading-audit.json","trading-audit.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
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

## 执行检查清单

- [ ] 交易 API 端点全部探测
- [ ] 支付接口全部探测
- [ ] KYC 端点全部探测
- [ ] 账户安全测试全部执行
- [ ] 合规与监管检查全部执行
- [ ] 所有输出文件已生成
- [ ] evidence/ 目录有证据文件
- [ ] execution.log 记录所有 HTTP 请求
- [ ] step-commit.json 已生成
- [ ] 关口10验证通过