# 步骤 14：误报验证机制（20 项）

## 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| false-positive.json | ✅ | 误报验证结果（JSON） |
| false-positive.md | ✅ | Markdown 格式验证报告 |
| vulnerabilities.json | ✅ | 确认的漏洞列表（去误报后） |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 20 项测试覆盖率（必须 100%） |
| logs/execution.log | ✅ | 执行日志 |
| step-commit.json | ✅ | 步骤提交证明 |
| evidence/ | ✅ | 验证证据文件 |

---

## 目标

对前序步骤中发现的所有漏洞进行误报验证，通过二次验证确认漏洞的真实性，排除以下类型的误报：

1. CDN/WAF 拦截导致的假阳性（如 Cloudflare 返回的 403 实际是 WAF 拦截）
2. 重定向导致的假阳性（如 302 跳转到登录页被误判为内容泄露）
3. 泛解析域名导致的假阳性（如 *.example.com 全部解析到同一 IP 的通配符 DNS）
4. 响应码误判（如 200 返回的是错误页面而非实际内容）
5. 404 软页面（返回 200 但内容是"Not Found"）

## 测试项分类（20 项）

### CDN/WAF 拦截验证（5 项）

1. 验证 403 响应是否来自 Cloudflare WAF（检查 cf-ray 头、Server: cloudflare 头）
2. 验证 403 响应是否来自 AWS CloudFront（检查 X-Cache: Error from cloudfront 头）
3. 验证 403 响应是否来自 Akamai（检查 X-Akamai-* 头）
4. 验证 403 响应是否来自 Imperva/Incapsula（检查 X-Iinfo 头）
5. 验证 403 响应是否需要通过特定路径绕过（尝试 /login、/api 等路径）

### 重定向验证（5 项）

6. 追踪 302/301 重定向链，确认最终目标
7. 验证重定向到登录页的响应（是否误判为内容泄露）
8. 验证重定向到 SSO 页面的响应
9. 验证重定向到外部域名的响应（开放重定向确认）
10. 验证重定向后的实际内容（非重定向模式请求）

### 泛解析域名验证（3 项）

11. 验证 DNS 通配符解析（多个随机子域名是否解析到同一 IP）
12. 验证泛解析域名的响应内容一致性（是否返回相同的默认页面）
13. 验证泛解析域名是否确实属于目标组织

### 响应内容验证（5 项）

14. 验证 200 响应是否包含实际内容（非空白页、非错误页）
15. 验证 200 响应是否包含关键特征（如 WordPress 站点应有 wp-content 特征）
16. 验证响应体大小是否合理（非空、非异常小）
17. 验证 Content-Type 与实际内容匹配
18. 验证 404 响应是否返回真正的 404 状态码（非软 404）

### 漏洞复现验证（2 项）

19. 对每个高危及以上漏洞，使用不同方法/工具重新验证
20. 对每个严重漏洞，使用不同网络环境重新验证（代理 vs 直连）

---

## 执行方法

```bash
# 1. CDN/WAF 检测
curl -k -s -I -x $PROXY "https://$DOMAIN" | grep -iE "(cf-ray|server:|x-cache|x-akamai|x-iinfo)"

# 2. 泛解析域名检测
# 生成随机子域名并测试 DNS 解析
for random in "random-$RANDOM" "test-$RANDOM" "xyz-$RANDOM"; do
  nslookup "$random.$DOMAIN"
done

# 3. 重定向链追踪
curl -k -s -L -x $PROXY -w "Redirect Chain: %{url_effective}\n" -o /dev/null "https://$DOMAIN/vuln-endpoint"

# 4. 响应内容验证
$body = curl -k -s -x $PROXY "https://$DOMAIN/vuln-endpoint"
$size = $body.Length
$hasContent = $body -notmatch "(?i)(not found|404|error|page not found)"

# 5. 漏洞二次验证
# 使用直连模式重新测试
curl -k -s -w "\n%{http_code}" "https://$DOMAIN/vuln-endpoint"
```

---

## 误报标记规则

| 场景 | 标记 | 处理方式 |
|------|------|---------|
| Cloudflare WAF 拦截 | `false-positive:waf-cloudflare` | 从漏洞列表移除，记录到 false-positive.json |
| 其他 CDN/WAF 拦截 | `false-positive:waf-other` | 从漏洞列表移除 |
| 通配符 DNS 泛解析 | `false-positive:wildcard-dns` | 从漏洞列表移除 |
| 软 404 页面 | `false-positive:soft-404` | 从漏洞列表移除 |
| 重定向到登录页 | `false-positive:redirect-login` | 从漏洞列表移除 |
| 二次验证确认 | `confirmed` | 保留漏洞，标记为已验证 |
| 二次验证失败 | `false-positive:unverified` | 降级为信息级别 |

---

## 关口14验证

```powershell
$dir = "audits/<domain>/step-14-cors"
@("false-positive.json","false-positive.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
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

- [ ] CDN/WAF 拦截验证完成
- [ ] 重定向验证完成
- [ ] 泛解析域名验证完成
- [ ] 响应内容验证完成
- [ ] 漏洞复现验证完成
- [ ] 误报已标记并移除
- [ ] 所有输出文件已生成
- [ ] evidence/ 目录有证据文件
- [ ] execution.log 记录所有 HTTP 请求
- [ ] step-commit.json 已生成
- [ ] 关口14验证通过