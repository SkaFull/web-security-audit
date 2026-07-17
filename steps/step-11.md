# 步骤 11：第三方依赖与供应链审计（25 项）

## 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| supply-chain.json | ✅ | 供应链审计结果（JSON） |
| supply-chain.md | ✅ | Markdown 格式审计报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 25 项测试覆盖率（必须 100%） |
| logs/execution.log | ✅ | 执行日志 |
| step-commit.json | ✅ | 步骤提交证明 |
| evidence/ | ✅ | 漏洞证据文件 |

---

## 目标

对网站加载的第三方脚本、CDN 资源、外部依赖进行供应链安全审计。检测 SRI 缺失、过时库版本、已知漏洞 CDN 资源等 25 项测试。

## 测试项分类（25 项）

### 第三方脚本收集（5 项）

1. 从 HTML 中提取所有 `<script src="...">` 标签
2. 从 JS Bundle 中提取所有 `import`/`require` 语句
3. 识别所有第三方域名（非主站域名的脚本来源）
4. 分类第三方服务类型（分析、广告、支付、认证、监控、CDN）
5. 统计第三方脚本数量

### SRI 完整性检查（8 项）

6. 检测所有 `<script>` 标签是否有 `integrity` 属性
7. 检测所有 `<link rel="stylesheet">` 标签是否有 `integrity` 属性
8. 检测 `integrity` 属性使用的哈希算法（sha256/sha384/sha512）
9. 检测是否使用了弱哈希（如 sha1、md5）
10. 检测 `crossorigin` 属性是否与 `integrity` 配合使用
11. 检测 CDN 脚本的 SRI 状态
12. 检测第三方分析脚本的 SRI 状态
13. 生成 SRI 缺失报告

### 第三方 SDK 版本检测（5 项）

14. 检测 Google Analytics 版本（gtag.js/analytics.js/ga.js）
15. 检测 Sentry SDK 版本并检查已知漏洞
16. 检测 支付 SDK 版本（Stripe/PayPal/Braintree 等）
17. 检测 验证码 SDK 版本（reCAPTCHA/hCaptcha 等）
18. 检测 其他第三方库版本（jQuery/Lodash/Moment 等）

### 过时库版本检测（4 项）

19. 从 JS 文件名中提取版本号
20. 从 JS 源码注释中提取版本号
21. 对比版本号与已知漏洞数据库
22. 标记存在已知 CVE 的库版本

### 第三方数据收集审计（3 项）

23. 检测第三方脚本收集的数据类型（分析从 JS 提取的 track/event 调用）
24. 检测是否向第三方发送用户敏感数据（PII、token、session ID）
25. 检测第三方域名的 HTTPS 使用情况

---

## 执行方法

```bash
# 1. 获取页面 HTML 并提取 script 标签
$html = curl -k -s -x $PROXY "https://$DOMAIN"
$scripts = $html | Select-String -Pattern '<script[^>]*src="([^"]*)"' -AllMatches

# 2. 检查每个脚本的 SRI
foreach ($script in $scripts) {
  $integrity = $script | Select-String -Pattern 'integrity="([^"]*)"'
  $crossorigin = $script | Select-String -Pattern 'crossorigin="([^"]*)"'
  if (-not $integrity) { "SRI MISSING: $script" }
}

# 3. 下载 JS 文件并提取版本信息
foreach ($scriptUrl in $scriptUrls) {
  $js = curl -k -s "$scriptUrl"
  # 提取版本号模式
  $versions = $js | Select-String -Pattern 'v?(\d+\.\d+\.\d+)' -AllMatches
}

# 4. 检测第三方数据发送
$js | Select-String -Pattern '(track|send|log|analytics|pageview|event)\('
```

---

## 关口11验证

```powershell
$dir = "audits/<domain>/step-11-csp-internal"
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

## 执行检查清单

- [ ] 第三方脚本全部收集并分类
- [ ] SRI 完整性检查全部执行
- [ ] 第三方 SDK 版本全部检测
- [ ] 过时库版本全部对比
- [ ] 第三方数据收集全部审计
- [ ] 所有输出文件已生成
- [ ] evidence/ 目录有证据文件
- [ ] execution.log 记录所有 HTTP 请求
- [ ] step-commit.json 已生成
- [ ] 关口11验证通过