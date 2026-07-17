# 步骤 0：子域名枚举

## 🔴 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| subdomains.json | ✅ | 完整子域名列表（JSON），含可访问性状态 |
| subdomains.md | ✅ | Markdown 格式子域名列表 |
| inaccessible-subdomains.json | ✅ | 不可访问子域名及原因 |
| related-domains.json | ✅ | **关联域名体系列表**（独立域名系统，如 example-group.com、example-sandbox.com） |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 15种方法执行覆盖率（必须100%） |

---

## 目标
发现所有子域名和相关域名体系，评估可访问性。**此步骤是后续所有审计的基础，域名覆盖不全将导致漏洞遗漏。**

## 🔴 关键概念：子域名 vs 关联域名体系

| 类型 | 定义 | 示例（目标 www.example.com） | 审计范围 |
|------|------|--------------------------|----------|
| **子域名** | 同属一个主域名 | trade-hk.example.com, api.example.com | 步骤 6 子域名审计 |
| **关联域名体系** | 独立域名，但属于同一组织/集团 | example-group.com, example-sandbox.com, example-corp.com | 步骤 1-9 完整审计 |

**关联域名体系必须纳入审计范围**，因为它们是独立域名，拥有不同的技术栈、后端和漏洞面。

## 执行方法（16 种）

1. **网站内容爬取** - HTML/JS/API/Config/CSS/Sitemap/Robots/iframe
2. **SSL 证书查询** - 解析 SAN 字段，发现关联域名
3. **搜索引擎查询** - site:example.com
4. **第三方服务** - crt.sh, SecurityTrails 等
5. **网站源码分析** - 提取域名引用
6. **配置文件解析** - /site/config.json 等
7. **JS 代码分析** - 提取 API 端点和域名引用
8. **历史报告提取** - 从已有报告提取
9. **CT 日志查询** - 证书透明度日志
10. **常见服务推断** - admin, api, test 等
11. **DNS 暴力枚举** - 500+ 常见子域名字典
12. **多地区枚举** - hk, sg, us 等地区
13. **关联域名体系发现** - 从 SSL 证书、WHOIS、HTML 源码、JS Bundle 中发现关联域名系统
14. **配置文件反向发现** - 读取 /site/config.json 等配置，提取所有引用的域名
15. **JS Bundle 域名提取** - 下载并分析 JS Bundle，提取所有域名引用（静态资源、API、第三方）
16. **常见内部服务子域名探测** - 针对 20+ 种常见内部服务主动探测 🔴 新增

### 🔴 方法 16：常见内部服务子域名探测（强制执行）

**目的**：传统 DNS 枚举和证书透明度日志可能遗漏内部服务子域名（如 sentry、grafana、jenkins 等），但这些子域名往往是重要的安全隐患来源。此方法主动探测常见内部服务名称，弥补传统枚举的盲区。

**探测列表（20+ 种常见内部服务）**：

```bash
# 监控与可观测性
SERVICES=(
  "sentry"        # Sentry 错误追踪 - 配置信息泄露、DSN 泄露
  "sentry-prod"   # Sentry 生产实例
  "grafana"       # Grafana 监控面板 - 数据泄露
  "prometheus"    # Prometheus 指标 - 内部指标暴露
  "kibana"        # Kibana 日志分析 - 日志泄露
  "monitor"       # 通用监控
  "monitoring"    # 通用监控
  "status"        # 状态页
  "health"        # 健康检查
  "metrics"       # 指标端点

  # CI/CD 与代码仓库
  "jenkins"       # Jenkins CI/CD
  "gitlab"        # GitLab 代码仓库
  "git"           # Git 服务
  "registry"      # 容器镜像仓库
  "nexus"         # 制品仓库
  "sonarqube"     # 代码质量扫描

  # DevOps 基础设施
  "traefik"       # Traefik 反向代理面板
  "argocd"        # ArgoCD 部署面板
  "vault"         # HashiCorp Vault 密钥管理
  "consul"        # Consul 服务发现
  "rancher"       # Rancher 容器管理

  # 数据库管理
  "adminer"       # Adminer 数据库管理
  "phpmyadmin"    # phpMyAdmin 数据库管理
  "pgadmin"       # pgAdmin PostgreSQL 管理

  # 内部工具
  "jira"          # Jira 项目管理
  "confluence"    # Confluence 文档
  "wiki"          # 内部 Wiki
  "docs"          # 内部文档
  "chat"          # 内部聊天
  "socat"         # Socket 代理/转发
  "vpn"           # VPN 入口
  "jupyter"       # Jupyter 数据分析
  "harbor"        # Harbor 镜像仓库
  "keycloak"      # Keycloak SSO
  "auth"          # 认证服务
  "sso"           # 单点登录
)
```

**探测方法**：

```bash
# 对目标域名生成所有内部服务子域名并探测
DOMAIN="<domain>"
for svc in "${SERVICES[@]}"; do
  subdomain="${svc}.${DOMAIN}"
  # 先 DNS 解析
  if nslookup "$subdomain" 8.8.8.8 > /dev/null 2>&1; then
    HTTP_CODE=$(curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$subdomain/")
    echo "$subdomain: DNS=YES, HTTP=$HTTP_CODE"
  else
    echo "$subdomain: DNS=NO"
  fi
done
```

**判定规则**：
- DNS 解析成功 + HTTP 返回 2xx/3xx/4xx → 加入 `accessible` 子域名列表
- DNS 解析成功 + HTTP 超时/5xx → 加入 `inaccessible` 列表
- DNS 解析失败 → 跳过（不存在的子域名）

**🔴 重要**：此方法发现的子域名与步骤 8 的 AD-06 互补：
- 方法 16 在步骤 0 中通过名称猜测探测已知服务
- 步骤 8 的 AD-06 从 JS Bundle 中提取实际引用的域名
- 两步结果合并后，所有新发现的子域名都必须纳入后续审计

**关联域名体系**：对每个关联域名体系（如 example-group.com、example-sandbox.com）也执行此方法。

---

## 🔴 可访问性检查（智能路径探测）

### 核心原则：根路径 302 ≠ 不可访问

**SPA 应用、微服务架构、认证网关等场景下，根路径 `/` 返回 302 重定向是常见行为，但该子域名可能有大量功能页面（如 `/asset/overview`、`/dashboard` 等）。**

**❌ 禁止行为**：仅因根路径返回 302/301 就将子域名标记为"redirect-only"或"不可访问"。

### 智能探测流程

对每个子域名执行以下多级探测，直到确认其真实可访问性：

```bash
# 第 1 级：根路径探测
HTTP_CODE=$(curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" https://subdomain.example.com/)
echo "Root path: $HTTP_CODE"

# 第 2 级：如果根路径返回 3xx/4xx/5xx，执行智能路径探测
# 不直接判定为不可访问，而是尝试以下路径列表
```

### 智能探测路径列表（按优先级排序）

```bash
# SPA 常见路径（React/Vue/Angular 路由）
PATHS=(
  "/"                           # 根路径
  "/asset/overview"             # 资产管理概览
  "/dashboard"                  # 仪表盘
  "/app"                        # 应用主页
  "/home"                       # 首页
  "/login"                      # 登录页
  "/signin"                     # 登录页变体
  "/register"                   # 注册页
  "/account"                    # 账户页
  "/profile"                    # 个人资料
  "/settings"                   # 设置页
  "/robots.txt"                 # 静态文件（最可靠）
  "/api/v1/"                    # API 根路径
  "/api/"                       # API 根路径变体
  "/health"                     # 健康检查
  "/status"                     # 状态页
  "/index.html"                 # 入口文件
  "/favicon.ico"                # 图标文件
)
```

### 完整探测脚本

```bash
# 对每个子域名执行智能探测
SUBDOMAIN="trade-hk.example.com"
declare -A path_results

for path in "${PATHS[@]}"; do
  HTTP_CODE=$(curl -x 127.0.0.1:7890 -k -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    "https://$SUBDOMAIN$path")
  path_results["$path"]=$HTTP_CODE
  echo "$path: $HTTP_CODE"
done

# 判定逻辑：
# 1. 如果根路径 / 返回 200/401/403 → 可访问，working_paths = ["/"]
# 2. 如果根路径返回 302/301，但存在其他路径返回 200/401/403 → 可访问（SPA 模式），working_paths = [所有返回 2xx/4xx 的路径]
# 3. 如果所有路径都返回 3xx/5xx/0 → 不可访问
# 4. 如果所有路径都返回 302/301 且 Location 头指向其他域名 → 永久重定向（redirect-only）
```

### 分类规则

| 根路径 `/` | 探测结果 | 分类 | 标记 | 说明 |
|-----------|---------|------|------|------|
| 200/401/403 | - | **accessible** | normal | 正常可访问 |
| 302/301 | 至少 1 个探测路径返回 2xx/4xx | **accessible** | spa-redirect | SPA 应用，根路径重定向但功能路径可用 |
| 302/301 | 所有路径返回 302/301（同域名） | **accessible** | login-redirect | 认证网关，所有路径重定向到登录页 |
| 302/301 | 所有路径返回 302/301（跨域名） | **redirect-only** | permanent-redirect | 永久重定向到其他域名 |
| 0/超时 | 所有路径超时 | **inaccessible** | timeout | 无法连接 |
| 5xx | - | **inaccessible** | error | 服务器错误 |

### 输出格式

subdomains.json 中每个子域名必须包含：

```json
{
  "domain": "trade-hk.example.com",
  "status": "accessible",
  "access_type": "spa-redirect",
  "root_path_code": 302,
  "root_path_location": "https://trade-hk.example.com/asset/overview",
  "working_paths": ["/asset/overview", "/dashboard", "/robots.txt"],
  "primary_path": "/asset/overview",
  "dns_resolved": true,
  "ssl_valid": true,
  "notes": "根路径 302 重定向到 /asset/overview，SPA 应用，功能路径正常"
}
```

**🔴 `primary_path` 字段至关重要**：步骤 6 子域名审计将使用 `primary_path` 作为该子域名的审计入口，而非根路径 `/`。

## 降级策略

1. **代理连接**（127.0.0.1:7890）- 首选
2. **直连**（无代理）- 代理失败时使用
3. **WebFetch** - 直连失败时使用
4. **离线分析** - 所有连接失败时使用已有 DNS/SSL 数据

---

## ☑️ 执行检查清单（全部打勾才能通过关口）

- [ ] 1. 网站内容爬取（HTML/JS/API/Config/CSS/Sitemap/Robots/iframe）
- [ ] 2. SSL 证书查询（解析 SAN 字段，发现关联域名）
- [ ] 3. 搜索引擎查询（site:example.com）
- [ ] 4. 第三方服务（crt.sh, SecurityTrails）
- [ ] 5. 网站源码分析（提取域名引用）
- [ ] 6. 配置文件解析（/site/config.json）
- [ ] 7. JS 代码分析（提取 API 端点）
- [ ] 8. 历史报告提取
- [ ] 9. CT 日志查询
- [ ] 10. 常见服务推断（admin, api, test 等）
- [ ] 11. DNS 暴力枚举（500+ 字典）
- [ ] 12. 多地区枚举（hk, sg, us 等）
- [ ] 13. **关联域名体系发现**（SSL 证书 SAN、WHOIS、HTML、JS 中提取关联域名）
- [ ] 14. **配置文件反向发现**（读取 /site/config.json 等配置，提取所有域名引用）
- [ ] 15. **JS Bundle 域名提取**（下载 JS Bundle，提取所有域名引用）
- [ ] 16. **常见内部服务子域名探测**（sentry/grafana/jenkins/gitlab/kibana/vault 等 25+ 种服务）
- [ ] 17. 对每个子域名执行根路径 HTTP 探测
- [ ] 18. 对根路径返回 3xx/4xx/5xx 的子域名执行智能路径探测（18个路径）
- [ ] 19. 根据分类规则正确标记每个子域名（normal / spa-redirect / login-redirect / permanent-redirect）
- [ ] 20. 为每个 accessible 子域名记录 primary_path 和 working_paths
- [ ] 21. 对每个关联域名执行同样的可访问性检查
- [ ] 22. 生成 subdomains.json（含可访问性状态、access_type、primary_path）
- [ ] 23. 生成 subdomains.md
- [ ] 24. 生成 inaccessible-subdomains.json
- [ ] 25. 生成 related-domains.json（关联域名体系列表）
- [ ] 26. 生成 progress.json
- [ ] 27. 生成 coverage.json（16种方法全部执行 = 100%）

---

## 🚪 关口验证

**必须全部显示 ✅ 才能进入步骤 1。** 如果有 ❌，立即补充缺失内容。

```powershell
$dir = "audits/<domain>/step-00-subdomain-discovery"
@("subdomains.json","subdomains.md","inaccessible-subdomains.json","progress.json","coverage.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
$subs = Get-Content "$dir/subdomains.json" | ConvertFrom-Json
$total = ($subs.subdomains | Measure-Object).Count
$accessible = ($subs.subdomains | Where-Object { $_.status -eq "accessible" } | Measure-Object).Count
Write-Host "✅ total subdomains: $total, accessible: $accessible"
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
if ($total -gt 0) { "✅ subdomain count > 0" } else { "❌ ZERO subdomains found" }
```

## 覆盖率验证

```json
{
  "step": 0,
  "total_methods": 16,
  "executed_methods": 16,
  "coverage_percentage": 100,
  "total_subdomains": 38,
  "accessible_subdomains": 25,
  "inaccessible_subdomains": 13,
  "related_domains": ["example-group.com", "example-sandbox.com"],
  "skipped_methods": [],
  "failed_methods": []
}
```
