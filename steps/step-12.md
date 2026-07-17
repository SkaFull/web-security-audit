# 步骤 12：CSP 内部域名深度扫描（30 项）

## 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| csp-internal.json | ✅ | CSP 内部域名扫描结果（JSON） |
| csp-internal.md | ✅ | Markdown 格式扫描报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 30 项测试覆盖率（必须 100%） |
| logs/execution.log | ✅ | 执行日志 |
| step-commit.json | ✅ | 步骤提交证明 |
| evidence/ | ✅ | 漏洞证据文件 |

---

## 目标

从 CSP 策略中提取所有引用的域名，深入分析 CSP 配置的安全性，发现内部域名泄露、CSP 绕过风险等 30 项测试。

## 测试项分类（30 项）

### CSP 策略提取（6 项）

1. 从所有可访问子域名的响应头中提取 Content-Security-Policy
2. 从所有可访问子域名的 meta 标签中提取 CSP
3. 从 report-uri 指令中提取报告端点
4. 从 report-to 指令中提取报告组
5. 解析所有 CSP 指令（default-src, script-src, style-src, img-src, connect-src, font-src, frame-src, media-src, object-src, base-uri, form-action, frame-ancestors, etc.）
6. 统计 CSP 覆盖率（哪些子域名有 CSP/哪些没有）

### CSP 域名提取与分类（8 项）

7. 从 script-src 中提取所有域名
8. 从 connect-src 中提取所有域名
9. 从 img-src 中提取所有域名
10. 从 style-src 中提取所有域名
11. 从 font-src 中提取所有域名
12. 从 frame-src 中提取所有域名
13. 分类提取的域名（内部域名 vs 第三方域名 vs CDN 域名）
14. 识别潜在的内部域名泄露（内网 IP、内部服务域名）

### CSP 安全分析（10 项）

15. 检测 unsafe-inline 使用（script-src 中）
16. 检测 unsafe-eval 使用（script-src 中）
17. 检测通配符 `*` 使用（各指令中）
18. 检测 data: 协议使用（script-src 中）
19. 检测 blob: 协议使用
20. 检测 http: 协议使用（应使用 https:）
21. 检测 CSP 是否包含 `strict-dynamic`
22. 检测 CSP 是否包含 `nonce-` 或 `hash-`
23. 检测 CSP 是否包含 `upgrade-insecure-requests`
24. 检测 CSP 是否包含 `block-all-mixed-content`

### CSP 绕过风险（6 项）

25. 检测 JSONP 端点（可能被用于 CSP 绕过）
26. 检测允许的 CDN 域名是否存在已知 CSP 绕过路径
27. 检测 script-src 中是否包含用户可控的域名
28. 检测 base-uri 指令缺失（允许 base 标签注入）
29. 检测 form-action 指令缺失（允许表单劫持）
30. 检测 frame-ancestors 指令缺失（允许点击劫持）

---

## 执行方法

```bash
# 1. 提取所有子域名的 CSP 头
for domain in $DOMAINS; do
  curl -k -s -I -x $PROXY "https://$domain" | grep -i "content-security-policy"
done

# 2. 解析 CSP 各指令
# 提取 script-src 中的域名
echo "$CSP_HEADER" | grep -oP "script-src[^;]+" | grep -oP "https?://[^\s']+"

# 3. 检测 unsafe-inline 和 unsafe-eval
echo "$CSP_HEADER" | grep -o "'unsafe-inline'"
echo "$CSP_HEADER" | grep -o "'unsafe-eval'"

# 4. 检测通配符
echo "$CSP_HEADER" | grep -o "'\*'"

# 5. 对 CSP 中的域名进行可达性探测
for csp_domain in $CSP_DOMAINS; do
  curl -k -s -x $PROXY -o /dev/null -w "%{http_code}" "https://$csp_domain"
done
```

---

## 关口12验证

```powershell
$dir = "audits/<domain>/step-12-wordpress"
@("csp-internal.json","csp-internal.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
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

- [ ] 所有子域名的 CSP 策略已提取
- [ ] CSP 域名已全部提取并分类
- [ ] unsafe-inline/unsafe-eval 检测完成
- [ ] 通配符使用检测完成
- [ ] 内部域名泄露检测完成
- [ ] CSP 绕过风险分析完成
- [ ] 所有输出文件已生成
- [ ] evidence/ 目录有证据文件
- [ ] execution.log 记录所有 HTTP 请求
- [ ] step-commit.json 已生成
- [ ] 关口12验证通过