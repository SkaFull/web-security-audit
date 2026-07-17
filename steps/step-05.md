# 步骤 5：HTTP方法、认证接口与速率限制（25项测试）

## 🔴 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| http-methods-rate-limit.json | ✅ | 全部25项测试结果 |
| http-methods-rate-limit.md | ✅ | Markdown 格式报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| evidence/hm-*.json | ✅ | 每个漏洞的完整证据 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 覆盖率验证（必须100%） |

---

## 目标
检测 HTTP 方法配置错误、认证接口速率限制缺失、CORS 配置漏洞

## 测试项（25项）

### 1. HTTP 方法枚举（4项）
- [ ] OPTIONS -I
- [ ] PUT -I
- [ ] DELETE -I
- [ ] PATCH -I

```bash
curl -x 127.0.0.1:7890 -k -X OPTIONS -I https://example.com/
curl -x 127.0.0.1:7890 -k -X PUT -I https://example.com/
curl -x 127.0.0.1:7890 -k -X DELETE -I https://example.com/
curl -x 127.0.0.1:7890 -k -X PATCH -I https://example.com/
```

**漏洞判定**：
- OPTIONS 返回 Allow 头包含危险方法（PUT, DELETE）= 中危
- PUT/DELETE 返回 200/201/204 = 高危
- 所有方法返回 405 = 安全

### 2. 认证接口速率限制（9项，🔴 扩展自原3项）

- [ ] **登录接口**：10次错误密码请求
- [ ] **登录接口**：用户枚举（不同用户名）
- [ ] **密码重置接口**：10次请求
- [ ] **密码重置接口**：用户枚举（不同邮箱）
- [ ] **OTP/验证码接口**：10次请求
- [ ] **注册接口**：10次请求
- [ ] **Token 刷新接口**：10次请求
- [ ] **API 接口**：20次请求
- [ ] **搜索接口**：20次请求

```bash
# 登录接口速率限制
for i in {1..10}; do
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://example.com/api/v1/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@test.com\",\"password\":\"wrong$i\"}"
done

# 密码重置接口速率限制
for i in {1..10}; do
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://example.com/api/v1/password/reset \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"user$i@test.com\"}"
done

# OTP/验证码接口速率限制
for i in {1..10}; do
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://example.com/api/v1/otp/verify \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@test.com\",\"otp\":\"$i\"}"
done

# 注册接口速率限制
for i in {1..10}; do
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://example.com/api/v1/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"bot$i@test.com\",\"password\":\"Test123!\"}"
done

# Token 刷新接口速率限制
for i in {1..10}; do
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://example.com/api/v1/token/refresh \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"invalid_token_$i\"}"
done

# API 接口速率限制
for i in {1..20}; do
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}\n" \
    https://example.com/api/v1/users
done

# 搜索接口速率限制
for i in {1..20}; do
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}\n" \
    "https://example.com/search?q=test$i"
done
```

**漏洞判定**：
- 10次登录失败无 429/403 = 高危（暴力破解风险）
- 10次密码重置无 429/403 = 高危（用户枚举 + 短信轰炸）
- 10次OTP验证无 429/403 = 高危（OTP 暴力破解）
- 10次注册无 429/403 = 中危（垃圾注册）
- 10次Token刷新无 429/403 = 中危
- 20次API请求无 429 = 中危（DoS风险）
- 返回 429/403 = 安全

### 3. CORS 深度配置验证（8项，🔴 扩展自原2项）

- [ ] **Origin 反射测试**：`Origin: https://evil.com` 是否反射回 ACAO
- [ ] **Null Origin 测试**：`Origin: null` 是否被接受
- [ ] **子域名 Origin 测试**：`Origin: https://evil.example.com` 是否被接受
- [ ] **预检请求（OPTIONS）**：`Access-Control-Request-Method: POST`
- [ ] **通配符 + Credentials 组合**：`ACAO: *` + `ACAC: true`
- [ ] **多 Origin 头注入**：测试 Origin 头注入绕过
- [ ] **非标准头请求**：`Access-Control-Request-Headers: X-Custom-Header`
- [ ] **敏感 API 端点 CORS 检查**：对 /api/v1/users、/api/v1/account 等端点分别检查

```bash
# Origin 反射测试
curl -x 127.0.0.1:7890 -k -I -H "Origin: https://evil.com" https://example.com/api/v1/users

# Null Origin 测试
curl -x 127.0.0.1:7890 -k -I -H "Origin: null" https://example.com/api/v1/users

# 子域名 Origin 测试
curl -x 127.0.0.1:7890 -k -I -H "Origin: https://evil.example.com" https://example.com/api/v1/users

# 预检请求
curl -x 127.0.0.1:7890 -k -X OPTIONS -I \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Custom-Header" \
  https://example.com/api/v1/users

# 多 Origin 头注入
curl -x 127.0.0.1:7890 -k -I \
  -H "Origin: https://evil.com" \
  -H "Origin: https://trusted.com" \
  https://example.com/api/v1/users
```

**漏洞判定**：
- Access-Control-Allow-Origin: * = 高危
- Access-Control-Allow-Origin: https://evil.com（反射任意 Origin）= 高危
- Access-Control-Allow-Credentials: true + 通配符 = 严重
- Null Origin 被接受 = 高危（可用于本地文件攻击）
- 子域名 Origin 被接受 = 中危（子域名劫持风险）
- 无 CORS 头或仅允许白名单 = 安全

### 4. 请求大小限制（1项）
- [ ] 10MB 大请求体测试

```bash
python -c 'print("A" * 10000000)' | \
  curl -x 127.0.0.1:7890 -k -X POST -d @- \
  -H "Content-Type: application/json" \
  https://example.com/api/v1/upload
```

**漏洞判定**：
- 10MB 请求成功 = 中危（DoS风险）
- 返回 413 Request Entity Too Large = 安全

### 5. 认证接口用户枚举（3项，🔴 新增）
- [ ] **登录接口差异化错误**：对比 "USER_NOT_FOUND" vs "PASSWORD_WRONG" 错误码
- [ ] **密码重置接口暴露**：对比存在/不存在的邮箱返回差异
- [ ] **注册接口重复检测**：已注册邮箱 vs 未注册邮箱返回差异

## 覆盖率验证

```json
{
  "step": 5,
  "total_tests": 25,
  "executed_tests": 25,
  "coverage_percentage": 100,
  "skipped_tests": [],
  "failed_tests": [],
  "retry_count": 0
}
```

## 漏洞证据格式

```json
{
  "id": "HM-001",
  "name": "PUT方法未禁用",
  "severity": "high",
  "endpoint": "https://example.com/",
  "curl_command": "curl -x 127.0.0.1:7890 -k -X PUT -I https://example.com/",
  "response_code": 201,
  "evidence_file": "evidence/hm-001.txt",
  "remediation": "禁用不必要的HTTP方法，仅允许GET、POST、HEAD"
}
```

---

## ☑️ 执行检查清单（全部打勾才能通过关口）

### HTTP 方法枚举
- [ ] 1. OPTIONS（检查 Allow 头）
- [ ] 2. PUT
- [ ] 3. DELETE
- [ ] 4. PATCH

### 认证接口速率限制
- [ ] 5. 登录接口：10次错误密码
- [ ] 6. 登录接口：用户枚举（不同用户名）
- [ ] 7. 密码重置接口：10次请求
- [ ] 8. 密码重置接口：用户枚举（不同邮箱）
- [ ] 9. OTP/验证码接口：10次请求
- [ ] 10. 注册接口：10次请求
- [ ] 11. Token 刷新接口：10次请求
- [ ] 12. API 接口：20次请求
- [ ] 13. 搜索接口：20次请求

### CORS 深度验证
- [ ] 14. Origin 反射测试
- [ ] 15. Null Origin 测试
- [ ] 16. 子域名 Origin 测试
- [ ] 17. 预检请求（OPTIONS）
- [ ] 18. 通配符 + Credentials 组合
- [ ] 19. 多 Origin 头注入
- [ ] 20. 非标准头请求
- [ ] 21. 敏感 API 端点 CORS 检查

### 请求大小与用户枚举
- [ ] 22. 10MB 大请求体测试
- [ ] 23. 登录接口差异化错误
- [ ] 24. 密码重置接口暴露
- [ ] 25. 注册接口重复检测

### 输出文件
- [ ] 26. 生成 http-methods-rate-limit.json
- [ ] 27. 生成 http-methods-rate-limit.md
- [ ] 28. 生成 vulnerabilities.json
- [ ] 29. 保存所有证据到 evidence/
- [ ] 30. 生成 progress.json
- [ ] 31. 生成 coverage.json（25项全部执行 = 100%）

---

## 🚪 关口验证

**必须全部显示 ✅ 才能进入步骤 6。**

```powershell
$dir = "audits/<domain>/step-05-http-methods"
@("http-methods-rate-limit.json","http-methods-rate-limit.md","vulnerabilities.json","progress.json","coverage.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
```