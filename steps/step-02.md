# 步骤 2：高级安全检查（46项测试）

## 🔴 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| advanced-security.json | ✅ | 全部40项测试结果 |
| advanced-security.md | ✅ | Markdown 格式报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| evidence/as-*.json | ✅ | 每个漏洞的完整证据 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 覆盖率验证（必须100%） |

---

## 目标
检测高级安全漏洞

## 测试项（40项）

### 1. SSRF（服务器端请求伪造）- 8个payload × 4个端点
**测试 payload**：
- [ ] http://169.254.169.254/latest/meta-data/ (AWS 元数据)
- [ ] http://169.254.169.254/latest/meta_data/ (AWS 元数据 v2)
- [ ] http://localhost:22/ (SSH)
- [ ] http://127.0.0.1:6379/ (Redis)
- [ ] http://127.0.0.1:9200/ (Elasticsearch)
- [ ] http://internal.example.com/ (内部服务)
- [ ] http://localhost:8080/admin (管理后台)
- [ ] http://[::1]/ (IPv6 localhost)

**测试端点**：
- [ ] /api/v1/proxy?url=
- [ ] /api/v1/fetch?target=
- [ ] /_api/fetch_url?url=
- [ ] /_api/request?url=

### 2. JWT 伪造 - 5项
- [ ] algorithm: none（无签名）
- [ ] 弱密钥爆破（secret, password, 123456）
- [ ] RS256 混淆为 HS256
- [ ] 过期时间篡改
- [ ] 权限字段篡改

### 3. WebSocket 安全 - 10项（🔴 基础层级，深度测试在步骤8）
**测试端点**：
- [ ] ws://example.com/ws
- [ ] wss://example.com/ws
- [ ] ws://example.com/socket.io
- [ ] wss://example.com/socket.io
- [ ] ws://example.com/graphql
- [ ] wss://example.com/graphql

**测试项**：
- [ ] 认证要求
- [ ] Origin 验证
- [ ] 消息注入
- [ ] 会话固定
- [ ] **Socket.IO polling 端点发现**（`/socket.io/?EIO=4&transport=polling`）
- [ ] **WebSocket 跨站劫持（CSWSH）**（测试 CORS 通配符 + Credentials 组合）
- [ ] **WebSocket Origin 绕过测试**（测试 `evil.com`、`localhost`、`null` 等恶意 Origin）
- [ ] **WebSocket 频率限制**（连续 10 次连接测试是否触发 429）

### 4. 调试端点暴露 - 14项（🔴 扩展，含 Spring Boot Actuator + Prometheus）
- [ ] /actuator
- [ ] /actuator/health
- [ ] /actuator/health-details（检查 /actuator/health 是否暴露详细组件状态如 diskSpace、db、redis）
- [ ] /actuator/env
- [ ] /actuator/beans
- [ ] /actuator/mappings
- [ ] /actuator/metrics
- [ ] /actuator/heapdump
- [ ] /actuator/threaddump
- [ ] /actuator/loggers
- [ ] /debug
- [ ] /trace
- [ ] /metrics（Prometheus 端点）
- [ ] /actuator/prometheus（Prometheus 指标端点，暴露 JVM 内存、GC、HTTP 请求统计等）

### 5. 内部 API 暴露 - 4项
- [ ] /internal/api/v1/config
- [ ] /internal/api/v1/health
- [ ] /internal/api/v1/metrics
- [ ] /internal/api/v1/users

### 6. Host 头注入 - 3项
```bash
curl -x 127.0.0.1:7890 -k -H "Host: evil.com" https://example.com/
curl -x 127.0.0.1:7890 -k -H "X-Forwarded-Host: evil.com" https://example.com/
curl -x 127.0.0.1:7890 -k -H "X-Host: evil.com" https://example.com/
```

### 7. Path Traversal in Headers - 3项
```bash
curl -x 127.0.0.1:7890 -k -H "X-Original-URL: /admin" https://example.com/
curl -x 127.0.0.1:7890 -k -H "X-Rewrite-URL: /admin" https://example.com/
curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" -H "X-Original-URL: /../../etc/passwd" https://example.com/
```

### 8. GraphQL 安全 - 4项（🔴 新增）
- [ ] **GraphQL 端点发现**（/graphql, /api/graphql, /query, /gateway/graphql）
- [ ] **GraphQL introspection 查询**（`__schema { types { name } }`）
- [ ] **GraphQL 批量查询 DoS**（深层嵌套查询）
- [ ] **GraphQL 字段建议泄露**（错误响应中暴露 schema 字段名）

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
  "step": 2,
  "total_tests": 46,
  "executed_tests": 46,
  "coverage_percentage": 100,
  "skipped_tests": [],
  "failed_tests": [],
  "retry_count": 0
}
```

## 验证要求

- 每个漏洞必须有真实 curl 证据
- 证据文件包含完整 HTTP 响应
- 所有测试项都已执行
- 覆盖率必须达到 100%

---

## ☑️ 执行检查清单（全部打勾才能通过关口）

- [ ] 1. SSRF：8个payload × 端点 /api/v1/proxy?url=
- [ ] 2. SSRF：8个payload × 端点 /api/v1/fetch?target=
- [ ] 3. SSRF：8个payload × 端点 /_api/fetch_url?url=
- [ ] 4. SSRF：8个payload × 端点 /_api/request?url=
- [ ] 5. JWT：algorithm:none 测试
- [ ] 6. JWT：弱密钥爆破
- [ ] 7. JWT：RS256→HS256 混淆
- [ ] 8. JWT：过期时间篡改
- [ ] 9. JWT：权限字段篡改
- [ ] 10. WebSocket：6个端点发现（ws/wss）
- [ ] 11. WebSocket：认证/Origin验证/消息注入/会话固定
- [ ] 12. WebSocket：Socket.IO polling 端点发现
- [ ] 13. WebSocket：CSWSH（CORS 通配符 + Credentials）
- [ ] 14. WebSocket：Origin 绕过测试（evil.com, localhost, null）
- [ ] 15. WebSocket：频率限制（10次连接测试）
- [ ] 16. 调试端点：/actuator, /actuator/health, /actuator/health-details, /actuator/env, /actuator/beans, /actuator/mappings
- [ ] 17. 调试端点：/actuator/metrics, /actuator/heapdump, /actuator/threaddump, /actuator/loggers, /actuator/prometheus
- [ ] 18. 调试端点：/debug, /trace
- [ ] 19. 调试端点：/metrics（Prometheus）
- [ ] 20. 内部API：/internal/api/v1/config, /health, /metrics, /users
- [ ] 21. Host头注入：Host:, X-Forwarded-Host:, X-Host:
- [ ] 22. Path Traversal：X-Original-URL, X-Rewrite-URL
- [ ] 23. GraphQL：端点发现（/graphql, /api/graphql, /query, /gateway/graphql）
- [ ] 24. GraphQL：introspection 查询
- [ ] 25. GraphQL：批量查询 DoS
- [ ] 26. GraphQL：字段建议泄露
- [ ] 27. 生成 advanced-security.json
- [ ] 28. 生成 advanced-security.md
- [ ] 29. 生成 vulnerabilities.json
- [ ] 30. 保存所有证据到 evidence/
- [ ] 31. 生成 progress.json
- [ ] 32. 生成 coverage.json（46项全部执行 = 100%）

---

## 🚪 关口验证

**必须全部显示 ✅ 才能进入步骤 3。**

```powershell
$dir = "audits/<domain>/step-02-advanced-security"
@("advanced-security.json","advanced-security.md","vulnerabilities.json","progress.json","coverage.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
if ((Get-ChildItem "$dir/evidence" -Filter "*.json" | Measure-Object).Count -gt 0) { "✅ evidence/ has files" } else { "❌ MISSING: evidence files" }
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
```