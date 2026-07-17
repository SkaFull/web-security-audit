# 步骤 4：开放重定向测试（15项测试）

## 🔴 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| open-redirect.json | ✅ | 全部15项测试结果 |
| open-redirect.md | ✅ | Markdown 格式报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| evidence/or-*.json | ✅ | 每个漏洞的完整证据 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 覆盖率验证（必须100%） |

---

## 目标
检测开放重定向漏洞，防止钓鱼攻击和凭证窃取

## 测试项（15项）

### 1. 常见重定向参数（5项）
- [ ] /redirect?url=https://evil.com
- [ ] /login?next=https://evil.com
- [ ] /goto?to=https://evil.com
- [ ] /redirect?redirect=https://evil.com
- [ ] /logout?return=https://evil.com

```bash
curl -x 127.0.0.1:7890 -k -I "https://example.com/redirect?url=https://evil.com"
curl -x 127.0.0.1:7890 -k -I "https://example.com/login?next=https://evil.com"
curl -x 127.0.0.1:7890 -k -I "https://example.com/goto?to=https://evil.com"
curl -x 127.0.0.1:7890 -k -I "https://example.com/redirect?redirect=https://evil.com"
curl -x 127.0.0.1:7890 -k -I "https://example.com/logout?return=https://evil.com"
```

### 2. 重定向端点（5项）
- [ ] /redirect?url=https://evil.com
- [ ] /goto?url=https://evil.com
- [ ] /link?url=https://evil.com
- [ ] /exit?url=https://evil.com
- [ ] /return?to=https://evil.com

```bash
curl -x 127.0.0.1:7890 -k -I "https://example.com/redirect?url=https://evil.com"
curl -x 127.0.0.1:7890 -k -I "https://example.com/goto?url=https://evil.com"
curl -x 127.0.0.1:7890 -k -I "https://example.com/link?url=https://evil.com"
curl -x 127.0.0.1:7890 -k -I "https://example.com/exit?url=https://evil.com"
curl -x 127.0.0.1:7890 -k -I "https://example.com/return?to=https://evil.com"
```

### 3. 编码绕过（3项）
- [ ] URL 编码绕过
- [ ] Base64 编码绕过
- [ ] 双 URL 编码绕过

```bash
# URL编码绕过
curl -x 127.0.0.1:7890 -k -I "https://example.com/redirect?url=%68%74%74%70%73%3a%2f%2f%65%76%69%6c%2e%63%6f%6d"

# Base64绕过
curl -x 127.0.0.1:7890 -k -I "https://example.com/redirect?url=aHR0cHM6Ly9ldmlsLmNvbQ=="

# 双URL编码绕过
curl -x 127.0.0.1:7890 -k -I "https://example.com/redirect?url=%2568%2574%2574%2570%2573%253a%252f%252f%2565%2576%2569%256c%252e%2563%256f%256d"
```

### 4. 协议绕过（2项）
- [ ] 协议相对 URL：//evil.com
- [ ] JavaScript 协议：javascript:alert(1)

```bash
curl -x 127.0.0.1:7890 -k -I "https://example.com/redirect?url=//evil.com"
curl -x 127.0.0.1:7890 -k -I "https://example.com/redirect?url=javascript:alert(1)"
```

## 执行流程

1. **代理优先**：使用 127.0.0.1:7890 代理
2. **降级策略**：代理失败时尝试直连，再失败使用 WebFetch
3. **证据保存**：每个测试保存完整 HTTP 响应到 evidence/ 目录
4. **漏洞判定**：
   - 301/302 重定向到外部域名 = 高危
   - 301/302 重定向到内部域名 = 低危
   - 200 但页面包含重定向 = 中危
   - 404/403 = 安全

## 覆盖率验证

```json
{
  "step": 4,
  "total_tests": 15,
  "executed_tests": 15,
  "coverage_percentage": 100,
  "skipped_tests": [],
  "failed_tests": [],
  "retry_count": 0
}
```

## 漏洞证据格式

```json
{
  "id": "OR-001",
  "name": "开放重定向 - url参数",
  "severity": "high",
  "endpoint": "https://example.com/redirect?url=https://evil.com",
  "curl_command": "curl -x 127.0.0.1:7890 -k -I https://example.com/redirect?url=https://evil.com",
  "response_code": 302,
  "location_header": "https://evil.com",
  "evidence_file": "evidence/or-001.txt",
  "remediation": "验证重定向URL，仅允许白名单域名或相对路径"
}
```

---

## ☑️ 执行检查清单（全部打勾才能通过关口）

- [ ] 1. 常见参数：url=, next=, to=, redirect=, return=
- [ ] 2. 重定向端点：/redirect, /goto, /link, /exit, /return
- [ ] 3. 编码绕过：URL编码
- [ ] 4. 编码绕过：Base64编码
- [ ] 5. 编码绕过：双URL编码
- [ ] 6. 协议绕过：//evil.com
- [ ] 7. 协议绕过：javascript:alert(1)
- [ ] 8. 生成 open-redirect.json
- [ ] 9. 生成 open-redirect.md
- [ ] 10. 生成 vulnerabilities.json
- [ ] 11. 保存所有证据到 evidence/
- [ ] 12. 生成 progress.json
- [ ] 13. 生成 coverage.json（100%）

---

## 🚪 关口验证

**必须全部显示 ✅ 才能进入步骤 5。**

```powershell
$dir = "audits/<domain>/step-04-open-redirect"
@("open-redirect.json","open-redirect.md","vulnerabilities.json","progress.json","coverage.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
```