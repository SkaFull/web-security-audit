# 步骤 8：应用层深度审计（30项测试）

## 🔴 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| app-deep-audit.json | ✅ | 全部30项测试结果 |
| app-deep-audit.md | ✅ | Markdown 格式报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| evidence/ad-*.json | ✅ | 每个漏洞的完整证据 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 覆盖率验证（必须100%） |

---

## 目标
深度分析 SPA/Web 应用层安全，覆盖 JS Bundle 逆向、配置泄露、第三方追踪、WebSocket 深度测试等维度。

## 测试项（30项）

### 1. JS Bundle 逆向分析（8项）

**目标**：下载并分析 JS Bundle 文件，提取敏感信息

**执行方法**：
```bash
# 1. 获取 HTML 页面，提取主 JS Bundle URL
curl -x 127.0.0.1:7890 -k -s https://target.com/ | grep -oP 'src="([^"]+)"' | grep -E '\.js'

# 2. 下载 JS Bundle
curl -x 127.0.0.1:7890 -k -s -o bundle.js https://target.com/assets/index-xxxxx.js

# 3. 分析 JS Bundle 内容
```

- [ ] **AD-01**：提取 API 端点列表
  - 搜索模式：`/v1/`, `/api/`, `/moon/`, `/bff/`, `/graphql`, 域名引用
  - 方法：`grep -oP '"(/v1/[^"]+)"' bundle.js | sort -u`

- [ ] **AD-02**：提取错误码枚举（用户枚举风险）
  - 搜索模式：`USER_NOT_FOUND`, `PASSWORD_WRONG`, `error_code`, `ERROR_CODES`
  - 方法：`grep -oP '(USER_NOT_FOUND|PASSWORD_WRONG|ACCOUNT_LOCKED|ERROR_CODES[^}]+})' bundle.js`
  - **漏洞判定**：存在 `USER_NOT_FOUND` 和 `PASSWORD_WRONG` 不同错误码 = 用户枚举漏洞

- [ ] **AD-03**：提取 Sentry DSN 密钥
  - 搜索模式：`sentry\.io`, `dsn`, `sentry.*init`
  - 方法：`grep -oP '(https://[a-f0-9]+@sentry\.[^/"]+/[0-9]+)' bundle.js`
  - **漏洞判定**：DSN 直接硬编码在 JS 中 = 中危

- [ ] **AD-04**：提取 OAuth/OIDC 配置
  - 搜索模式：`oauth2`, `openid`, `client_id`, `authority`, `redirect_uri`
  - 方法：`grep -oP '(oauth2|openid|client_id[^,]+)' bundle.js`

- [ ] **AD-05**：提取第三方 API 密钥
  - 搜索模式：`reCAPTCHA`, `google`, `facebook`, `firebase`, `stripe`, `api_key`, `appId`
  - 方法：`grep -oP '(reCAPTCHA|sitekey|appId["\s]*:["\s]*[A-Za-z0-9_-]+)' bundle.js`

- [ ] **AD-06**：提取内部域名/URL
  - 搜索模式：`\.osl\.com`, `\.internal`, `\.local`, `staging`, `sandbox`, `-qa`, `-dev`
  - 方法：`grep -oP 'https?://[a-zA-Z0-9.-]+\.(osl\.com|internal|local)[^"'\'']*' bundle.js`

---

### 🔴 域名回补机制（AD-06 执行后强制执行）

**目的**：步骤 0 的子域名枚举可能遗漏 JS Bundle 中实际引用的子域名。AD-06 提取内部域名后，必须与步骤 0 的子域名列表做交叉比对，将新发现的子域名回补到审计范围。

**执行流程**：

```bash
# 1. 从 AD-06 结果中提取所有域名
# 假设 AD-06 提取到: sentry.example.com, rfs-sg.example.com, oauth2.example.com

# 2. 读取步骤 0 的子域名列表
SUBS_FILE="audits/<domain>/step-00-subdomain-discovery/subdomains.json"
KNOWN_SUBS=$(cat "$SUBS_FILE" | jq -r '.subdomains[].domain')

# 3. 交叉比对，找出新域名
NEW_SUBS=()
for dom in sentry.example.com rfs-sg.example.com oauth2.example.com; do
  if ! echo "$KNOWN_SUBS" | grep -q "$dom"; then
    NEW_SUBS+=("$dom")
  fi
done

# 4. 对新域名执行智能路径探测（来自步骤 0 的探测逻辑）
for dom in "${NEW_SUBS[@]}"; do
  echo "=== 探测新子域名: $dom ==="
  # 根路径探测
  HTTP_CODE=$(curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$dom/")
  echo "Root path: $HTTP_CODE"
  
  # 智能路径探测（18 个路径）
  for path in "/" "/api/" "/api/v1/" "/health" "/status" "/robots.txt" "/favicon.ico" "/login" "/dashboard" "/admin" "/index.html" "/app" "/home" "/register" "/account" "/settings" "/profile" "sitemap.xml"; do
    PATH_CODE=$(curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$dom$path")
    [[ "$PATH_CODE" =~ ^(200|401|403)$ ]] && echo "  [OK] $path -> $PATH_CODE"
  done
done
```

**处理规则**：

| 新域名探测结果 | 处理方式 |
|--------------|---------|
| 可访问（HTTP 200/401/403） | 立即加入 subdomains.json，标记为 `accessible`，执行完整审计 |
| DNS 解析成功但 HTTP 超时 | 加入 subdomains.json，标记为 `inaccessible` |
| DNS 解析失败 | 记录为 `unresolved`，不加入审计 |
| 与已知域名相同（仅大写/协议差异） | 去重，不重复加入 |

**回补后必须执行**：
1. 更新 `subdomains.json`，添加新发现的子域名
2. 更新 `audit-progress.json`，增加 `total_subdomains` 计数
3. 对新子域名执行步骤 1-5 的完整审计（173 项测试/子域名）
4. 在步骤 8 的 `app-deep-audit.json` 中记录回补结果

**输出格式**（在 app-deep-audit.json 中）：

```json
{
  "domain_feedback": {
    "new_subdomains_found": ["sentry.example.com", "rfs-sg.example.com"],
    "new_subdomains_accessible": ["sentry.example.com"],
    "new_subdomains_inaccessible": ["rfs-sg.example.com"],
    "audit_status": "重新审计中",
    "new_vulnerabilities": []
  }
}
```

**🔴 关键**：此回补机制确保 JS Bundle 分析中发现的任何新子域名都不会被遗漏，避免出现 sentry.example.com 这类漏网之鱼。

---

- [ ] **AD-07**：提取 JWT 处理逻辑
  - 搜索模式：`jwt`, `token`, `payload`, `\.verify`, `alg`, `exp`, `iat`
  - 方法：`grep -oP '(jwt[^;]+|token[^;]+|\.verify[^)]+\))' bundle.js`

- [ ] **AD-08**：提取调试/开发模式开关
  - 搜索模式：`debug`, `dev_tool`, `open_dev_tool`, `__DEV__`, `DEBUG`, `development`
  - 方法：`grep -oP '(open_dev_tool|debug|__DEV__|development[^;]+)' bundle.js`
  - **漏洞判定**：生产环境存在调试开关 = 高危

### 2. 配置文件泄露检测（6项）

- [ ] **AD-09**：`/site/config.json` 配置泄露
  ```bash
  curl -x 127.0.0.1:7890 -k -s https://target.com/site/config.json
  ```
  - 检查：OAuth 端点、银行账户、reCAPTCHA 密钥、KYC 供应商、环境标识
  - **漏洞判定**：可访问且包含敏感配置 = 中危/高危

- [ ] **AD-10**：`/env.json` 或 `/.env` 环境变量泄露
  ```bash
  curl -x 127.0.0.1:7890 -k -s https://target.com/env.json
  curl -x 127.0.0.1:7890 -k -s https://target.com/.env
  ```

- [ ] **AD-11**：`/config.js` 或 `/app-config.js` 配置泄露
  ```bash
  curl -x 127.0.0.1:7890 -k -s https://target.com/config.js
  curl -x 127.0.0.1:7890 -k -s https://target.com/app-config.js
  ```

- [ ] **AD-12**：`/staticConfig/public/web` 配置泄露
  ```bash
  curl -x 127.0.0.1:7890 -k -s --max-time 10 https://static.target.com/staticConfig/public/web
  ```

- [ ] **AD-13**：`robots.txt` 敏感路径暴露
  ```bash
  curl -x 127.0.0.1:7890 -k -s https://target.com/robots.txt
  ```
  - 检查：是否暴露 /api/、/admin/、/internal/ 等内部路径
  - **漏洞判定**：暴露内部 API 路径 = 低危

- [ ] **AD-14**：`sitemap.xml` 结构暴露
  ```bash
  curl -x 127.0.0.1:7890 -k -s https://target.com/sitemap.xml
  ```

### 3. 第三方追踪与供应链分析（6项）

- [ ] **AD-15**：Google Tag Manager (GTM) 检测
  - 搜索 HTML/JS 中 `googletagmanager.com`、`GTM-` 前缀
  - 风险：GTM 被劫持可注入任意脚本

- [ ] **AD-16**：第三方分析/追踪服务枚举
  - 搜索：`volccdn.com`（火山引擎）、`appsflyer`、`facebook.net`、`tiktok`、`linkedin`、`taboola`、`hotjar`、`fullstory`
  - 方法：`grep -oP '(volccdn|appsflyer|facebook\.net|analytics\.tiktok|snap\.licdn|taboola|hotjar|fullstory)[^"'\'' ]*' bundle.js`

- [ ] **AD-17**：第三方 CDN 资源加载分析
  - 搜索所有外部域名引用
  - 方法：`grep -oP 'https?://[^/"]+' bundle.js | grep -v target.com | sort -u`

- [ ] **AD-18**：第三方 Cookie 分析
  - 检查 Set-Cookie 响应头的 Domain 和 SameSite 属性
  - 搜索：`_ga`, `_fbp`, `_gcl`, `_tt`, `_li`, `_rdt`
  - **漏洞判定**：SameSite=None 且无 Secure 的第三方 Cookie = 中危

- [ ] **AD-19**：外链 iframe 嵌入
  - 搜索 HTML 中 `<iframe` 标签
  - 检查是否加载不受信任的第三方 iframe

- [ ] **AD-20**：外部脚本完整性校验
  - 检查外部脚本 `<script>` 标签是否使用 `integrity` 属性（SRI）
  - **漏洞判定**：加载外部脚本但无 SRI = 低危

### 4. WebSocket 深度测试（6项）

**🔴 注意**：此部分与步骤 2 的 WebSocket 基础测试不同，这里是深度测试，包括 Socket.IO 协议、Session ID 泄露、CSWSH 等。

- [ ] **AD-21**：Socket.IO polling 端点 Session ID 泄露
  ```bash
  curl -x 127.0.0.1:7890 -k -s "https://target.com/socket.io/?EIO=4&transport=polling"
  ```
  - 检查：响应是否包含 `sid`（Session ID）和连接配置
  - **漏洞判定**：无需认证返回 Session ID = 高危

- [ ] **AD-22**：WebSocket 跨站劫持（CSWSH）测试
  ```bash
  # 测试 Socket.IO CORS 配置
  curl -x 127.0.0.1:7890 -k -I -H "Origin: https://evil.com" "https://target.com/socket.io/?EIO=4&transport=polling"
  ```
  - 检查：`Access-Control-Allow-Origin: *` + `Access-Control-Allow-Credentials: true`
  - **漏洞判定**：通配符 Origin + Credentials = 严重

- [ ] **AD-23**：WebSocket Origin 验证绕过测试
  ```bash
  # 测试多个恶意 Origin
  for origin in "https://evil.com" "https://localhost" "null" "https://attacker.com"; do
    curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" \
      -H "Origin: $origin" "https://target.com/socket.io/?EIO=4&transport=polling"
  done
  ```
  - **漏洞判定**：任意 Origin 返回 200 = 高危

- [ ] **AD-24**：WebSocket 无认证连接测试
  ```bash
  # 使用 websocat 或 wscat 尝试无认证连接
  # 若无专用工具，使用 curl 升级请求
  curl -x 127.0.0.1:7890 -k -I -H "Connection: Upgrade" -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    https://target.com/v1/stream
  ```
  - **漏洞判定**：返回 101 Switching Protocols 且无认证要求 = 严重

- [ ] **AD-25**：WebSocket 频率限制测试
  - 连续快速建立 10 次 WebSocket 连接
  - 检查是否触发 429 或连接拒绝
  - **漏洞判定**：无限制 = 中危

- [ ] **AD-26**：WebSocket 子协议/路径枚举
  ```bash
  # 枚举常见 WebSocket 路径
  for path in "/v1/stream" "/socket.io" "/ws" "/realtime" "/stream" "/graphql-ws"; do
    curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "$path: %{http_code}\n" "https://target.com$path"
  done
  ```

### 5. SPA 路由与认证（4项）

- [ ] **AD-27**：SPA 路由认证绕过测试
  - 访问需要认证的页面路径（如 `/asset/overview`、`/dashboard`、`/admin`）
  - 检查：是否返回 HTML 入口页（客户端路由）还是重定向到登录页
  - **漏洞判定**：未认证可访问 HTML 入口页（但 API 受保护）= 低危；HTML 包含敏感数据 = 中危

- [ ] **AD-28**：静态资源路径认证检查
  ```bash
  for path in "/asset/assets/" "/assets/" "/static/" "/public/" "/dist/"; do
    curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "$path: %{http_code}\n" "https://target.com$path"
  done
  ```
  - **漏洞判定**：JS/CSS 静态资源通常无需认证，但配置文件路径需要认证

- [ ] **AD-29**：API 文档/控制台暴露
  ```bash
  for path in "/swagger-ui.html" "/swagger" "/api-docs" "/graphql" "/graphiql" "/console" "/playground"; do
    curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "$path: %{http_code}\n" "https://target.com$path"
  done
  ```
  - **漏洞判定**：Swagger/GraphiQL 可公开访问 = 中危

- [ ] **AD-30**：API 版本枚举
  ```bash
  for version in "v1" "v2" "v3" "latest" "beta" "alpha" "internal"; do
    curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "$version: %{http_code}\n" "https://target.com/api/$version/"
  done
  ```

## 执行方法

```bash
# 优先使用代理
curl -x 127.0.0.1:7890 -k -s https://target.com/path

# 下载 JS Bundle 分析
curl -x 127.0.0.1:7890 -k -s -o bundle.js https://target.com/assets/index-xxxxx.js
# 分析 bundle.js 内容
grep -oP '...' bundle.js | sort -u

# 代理失败时降级：直连
curl -k -s https://target.com/path

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
  "step": 8,
  "total_tests": 30,
  "executed_tests": 30,
  "coverage_percentage": 100,
  "skipped_tests": [],
  "failed_tests": [],
  "retry_count": 0
}
```

---

## ☑️ 执行检查清单（全部打勾才能通过关口）

### JS Bundle 逆向分析
- [ ] 1. AD-01：提取 API 端点列表
- [ ] 2. AD-02：提取错误码枚举（用户枚举风险）
- [ ] 3. AD-03：提取 Sentry DSN 密钥
- [ ] 4. AD-04：提取 OAuth/OIDC 配置
- [ ] 5. AD-05：提取第三方 API 密钥
- [ ] 6. AD-06：提取内部域名/URL
- [ ] 7. AD-07：提取 JWT 处理逻辑
- [ ] 8. AD-08：提取调试/开发模式开关

### 配置文件泄露检测
- [ ] 9. AD-09：/site/config.json
- [ ] 10. AD-10：/env.json 或 /.env
- [ ] 11. AD-11：/config.js 或 /app-config.js
- [ ] 12. AD-12：/staticConfig/public/web
- [ ] 13. AD-13：robots.txt 敏感路径暴露
- [ ] 14. AD-14：sitemap.xml 结构暴露

### 第三方追踪与供应链
- [ ] 15. AD-15：Google Tag Manager 检测
- [ ] 16. AD-16：第三方分析/追踪服务枚举
- [ ] 17. AD-17：第三方 CDN 资源加载
- [ ] 18. AD-18：第三方 Cookie 分析
- [ ] 19. AD-19：外链 iframe 嵌入
- [ ] 20. AD-20：外部脚本完整性校验（SRI）

### WebSocket 深度测试
- [ ] 21. AD-21：Socket.IO polling Session ID 泄露
- [ ] 22. AD-22：WebSocket CSWSH（CORS 通配符 + Credentials）
- [ ] 23. AD-23：WebSocket Origin 验证绕过
- [ ] 24. AD-24：WebSocket 无认证连接
- [ ] 25. AD-25：WebSocket 频率限制测试
- [ ] 26. AD-26：WebSocket 子协议/路径枚举

### SPA 路由与认证
- [ ] 27. AD-27：SPA 路由认证绕过
- [ ] 28. AD-28：静态资源路径认证检查
- [ ] 29. AD-29：API 文档/控制台暴露
- [ ] 30. AD-30：API 版本枚举

### 输出文件
- [ ] 31. 生成 app-deep-audit.json
- [ ] 32. 生成 app-deep-audit.md
- [ ] 33. 生成 vulnerabilities.json
- [ ] 34. 保存所有证据到 evidence/
- [ ] 35. 生成 progress.json
- [ ] 36. 生成 coverage.json（100%）

---

## 🚪 关口验证

**必须全部显示 ✅ 才能进入步骤 9。**

```powershell
$dir = "audits/<domain>/step-08-app-deep-audit"
@("app-deep-audit.json","app-deep-audit.md","vulnerabilities.json","progress.json","coverage.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
if ((Get-ChildItem "$dir/evidence" -Filter "*.json" | Measure-Object).Count -gt 0) { "✅ evidence/ has files" } else { "❌ MISSING: evidence files" }
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
```