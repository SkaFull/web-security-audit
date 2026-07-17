# 步骤 3：专项安全测试（30项测试）

## 🔴 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| specialized-testing.json | ✅ | 全部30项测试结果 |
| specialized-testing.md | ✅ | Markdown 格式报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| evidence/st-*.json | ✅ | 每个漏洞的完整证据 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 覆盖率验证（必须100%） |

---

## 目标
针对特定服务的深度安全测试

## 测试项（30项）

### 1. Sentry API 安全（4项）
**测试端点**：
- [ ] /api/1/envelope/
- [ ] /api/1/store/
- [ ] /api/1/events/
- [ ] /api/1/projects/

**测试项**：
- [ ] 未授权访问
- [ ] 数据提交限制
- [ ] CORS 配置
- [ ] 敏感信息泄露

### 2. LeanTech API 认证（6项）
**测试端点**：
- [ ] /v1/customers
- [ ] /v1/banks
- [ ] /v1/banks/connections
- [ ] /v1/payments
- [ ] /v1/identities
- [ ] /v1/keys

**测试项**：
- [ ] 认证要求
- [ ] 授权检查
- [ ] 数据泄露
- [ ] API 密钥暴露

### 3. 内部 API 安全（4项）
**测试端点**：
- [ ] /internal/api/v1/config
- [ ] /internal/api/v1/users
- [ ] /internal/api/v1/health
- [ ] /internal/api/v1/metrics

**测试项**：
- [ ] 访问控制
- [ ] 认证绕过
- [ ] 信息泄露

### 4. DNS 邮件记录（4项）
- [ ] SPF 记录
- [ ] DKIM 记录
- [ ] DMARC 记录
- [ ] MX 记录

**测试命令**：
```bash
nslookup -type=TXT example.com
nslookup -type=MX example.com
```

### 5. 登录暴力破解与用户枚举（5项，🔴 扩展自原2项）
- [ ] 频率限制测试（连续20次登录请求）
- [ ] 账户锁定机制
- [ ] CAPTCHA 要求
- [ ] **错误信息差异化（用户枚举）** - 测试不存在的用户 vs 错误密码的不同响应
- [ ] **密码重置用户枚举** - 测试忘记密码接口是否暴露用户是否存在

**测试方法**：
```bash
# 快速发送多个登录请求
for i in {1..20}; do
  curl -x 127.0.0.1:7890 -k -X POST https://example.com/login \
    -d "username=admin&password=wrong$i"
done

# 用户枚举：测试不同用户名的响应差异
curl -x 127.0.0.1:7890 -k -s https://example.com/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent_user@test.com","password":"test123"}'
# 对比 "USER_NOT_FOUND" vs "PASSWORD_WRONG" 错误码

# 密码重置用户枚举
curl -x 127.0.0.1:7890 -k -s https://example.com/api/v1/password/reset \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent_user@test.com"}'
```

### 6. JWT 令牌深度分析（4项，🔴 新增）
- [ ] **JWT payload 敏感信息泄露**（解码 JWT payload，检查是否含用户ID、角色、邮箱等）
- [ ] **JWT kid 参数注入**（测试 `kid` 参数路径遍历）
- [ ] **JWT jku/x5u 头注入**（测试远程 JWK Set 引用）
- [ ] **JWT 签名验证绕过**（alg:none + 空签名）

### 7. API 参数注入（3项，🔴 新增）
- [ ] **SQL 注入基础探测**（在 API 参数中注入 `'`、`"`、`;` 等特殊字符）
- [ ] **NoSQL 注入探测**（注入 `{"$gt":""}` 等 MongoDB 操作符）
- [ ] **命令注入探测**（在参数中注入 `;id`、`|whoami`、`` `whoami` `` 等）

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

## 覆盖率验证

```json
{
  "step": 3,
  "total_tests": 30,
  "executed_tests": 30,
  "coverage_percentage": 100,
  "skipped_tests": [],
  "failed_tests": [],
  "retry_count": 0
}
```

## 验证要求

- 每个服务类型都已测试
- 每个漏洞有真实证据
- 所有端点都已检查
- 覆盖率必须达到 100%

---

## ☑️ 执行检查清单（全部打勾才能通过关口）

### Sentry API
- [ ] 1. /api/1/envelope/
- [ ] 2. /api/1/store/
- [ ] 3. /api/1/events/
- [ ] 4. /api/1/projects/

### LeanTech API
- [ ] 5. /v1/customers
- [ ] 6. /v1/banks
- [ ] 7. /v1/banks/connections
- [ ] 8. /v1/payments
- [ ] 9. /v1/identities
- [ ] 10. /v1/keys

### 内部 API
- [ ] 11. /internal/api/v1/config
- [ ] 12. /internal/api/v1/users
- [ ] 13. /internal/api/v1/health
- [ ] 14. /internal/api/v1/metrics

### DNS 邮件记录
- [ ] 15. SPF 记录
- [ ] 16. DKIM 记录
- [ ] 17. DMARC 记录
- [ ] 18. MX 记录

### 登录暴力破解与用户枚举
- [ ] 19. 频率限制测试（20次连续请求）
- [ ] 20. 账户锁定机制
- [ ] 21. CAPTCHA 要求
- [ ] 22. 错误信息差异化（用户枚举）
- [ ] 23. 密码重置接口用户枚举

### JWT 深度分析
- [ ] 24. JWT payload 敏感信息泄露
- [ ] 25. JWT kid 参数注入
- [ ] 26. JWT jku/x5u 头注入
- [ ] 27. JWT 签名验证绕过

### API 参数注入
- [ ] 28. SQL 注入基础探测
- [ ] 29. NoSQL 注入探测
- [ ] 30. 命令注入探测

### 输出文件
- [ ] 31. 生成 specialized-testing.json
- [ ] 32. 生成 specialized-testing.md
- [ ] 33. 生成 vulnerabilities.json
- [ ] 34. 保存所有证据到 evidence/
- [ ] 35. 生成 progress.json
- [ ] 36. 生成 coverage.json（30项全部执行 = 100%）

---

## 🚪 关口验证

**必须全部显示 ✅ 才能进入步骤 4。**

```powershell
$dir = "audits/<domain>/step-03-specialized-testing"
@("specialized-testing.json","specialized-testing.md","vulnerabilities.json","progress.json","coverage.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
if ((Get-ChildItem "$dir/evidence" -Filter "*.json" | Measure-Object).Count -gt 0) { "✅ evidence/ has files" } else { "❌ MISSING: evidence files" }
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
```