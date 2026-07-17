# 步骤 6：子域名深度审计（100%覆盖）

## 🔴 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| subdomain-audit.json | ✅ | 汇总审计结果（JSON） |
| subdomain-audit.md | ✅ | 汇总审计结果（Markdown） |
| coverage.json | ✅ | 子域名覆盖率验证（必须100%） |
| subdomains/<subdomain>/audit-report.json | ✅ | 每个可访问子域名的独立审计报告 |
| subdomains/<subdomain>/coverage.json | ✅ | 每个子域名的测试覆盖率（必须100%） |

---

## 目标
对所有可访问子域名 + 关联域名体系执行**完整**的安全审计（步骤 1-5 + 步骤 9 的所有测试）

## � 核心要求：所有子域名 + 关联域名体系 100% 覆盖

**所有可访问子域名 + 关联域名体系 = 必须执行完整的步骤 1-5 + 步骤 9 审计，不允许任何例外。**

| 要求 | 说明 |
|------|------|
| 所有可访问子域名 | 从步骤 0 的 subdomains.json 读取，一个不漏 |
| 关联域名体系 | 从步骤 0 的 related-domains.json 读取，作为独立域名同等对待 |
| 完整审计 | 每个子域名执行步骤 1-5 + 步骤 9 的全部测试项 |
| 独立报告 | 每个子域名生成独立的目录和 audit-report.json |
| 独立覆盖率 | 每个子域名生成独立的 coverage.json（必须100%） |
| 禁止跳过 | 即使预判无漏洞，也必须执行全部测试 |

**🔴 关联域名体系审计强制要求**：
- **example-group.com、example-sandbox.com、example-test.com、example-corp.com、example-pay.com** 等关联域名系统必须作为独立域名同等对待
- 每个关联域名的可访问子域名必须执行完整步骤 1-5 + 步骤 9 审计
- 关联域名在 `audits/<domain>/step-06-subdomain-audit/related-domains/` 下生成独立审计目录
- 关联域名审计进度纳入汇总 coverage.json

**❌ 禁止**：
- ❌ 以"风险较低"借口跳过子域名
- ❌ 以"关联域名非主域名"借口跳过关联域名体系审计
- ❌ 以"CDN/静态资源不需审计"借口跳过子域名
- ❌ 以"连接超时"借口跳过子域名（应降级重试）
- ❌ 只生成汇总 JSON 而不生成每个子域名的独立报告
- ❌ 对某些子域名只执行部分步骤（必须全部步骤 1-5 + 步骤 9）

## 🔴 重定向子域名处理（关键）

**从步骤 0 的 subdomains.json 中读取每个子域名的 `access_type` 和 `primary_path`。**

### 审计入口路径选择

| access_type | 审计入口 | 说明 |
|-------------|---------|------|
| **normal** | `/` | 根路径正常，直接审计 |
| **spa-redirect** | `primary_path`（如 `/asset/overview`） | SPA 应用，使用探测到的功能路径作为入口 |
| **login-redirect** | `/login` 或 `/signin` | 认证网关，使用登录页作为入口 |

**🔴 对于 spa-redirect 和 login-redirect 类型的子域名，所有安全测试必须基于 `primary_path` 执行，而非根路径 `/`。** 例如：

```bash
# 错误做法：对 spa-redirect 子域名仍用根路径
curl -x 127.0.0.1:7890 -k -I https://trade-hk.example.com/  # 返回 302，无意义
# 应该使用 primary_path 进行审计
curl -x 127.0.0.1:7890 -k -I https://trade-hk.example.com/asset/overview  # 返回 200，获取真实响应头
```

### 子域名审计适配规则

对于 access_type 不是 normal 的子域名，调整以下测试行为：

1. **安全头检查**：对 `primary_path` 执行，而非 `/`
2. **Cookie 分析**：对 `primary_path` 执行
3. **目录遍历**：相对于 `primary_path` 的父路径执行（如 `/asset/`、`/api/`）
4. **敏感文件**：对根路径和 `primary_path` 的父路径分别执行
5. **API 端点**：基于 `primary_path` 推断 API 前缀（如 `/asset/overview` → `/api/v1/asset/`）
6. **速率限制**：对 `primary_path` 相关的 API 端点执行

## 执行流程

### 1. 获取可访问子域名列表
从步骤 0 的 subdomains.json 读取所有 status="accessible" 的子域名，**必须包含 access_type 和 primary_path**：
```json
{
  "accessible_subdomains": [
    {
      "domain": "api.example.com",
      "status": "accessible",
      "access_type": "normal",
      "primary_path": "/"
    },
    {
      "domain": "trade-hk.example.com",
      "status": "accessible",
      "access_type": "spa-redirect",
      "primary_path": "/asset/overview",
      "working_paths": ["/asset/overview", "/dashboard", "/robots.txt"]
    },
    {
      "domain": "admin.example.com",
      "status": "accessible",
      "access_type": "login-redirect",
      "primary_path": "/login"
    }
  ]
}
```

**🔴 审计每个子域名前，必须先读取其 access_type 和 primary_path，确定正确的审计入口路径。**

### 2. 对每个子域名执行完整审计（步骤 1-5 + 步骤 9）
**所有可访问子域名统一执行以下全部步骤，不允许任何例外：**

对每个子域名，按顺序执行：
1. **步骤 1**：基础安全检查（79项）- HTTP 安全头、SSL/TLS、Cookie、信息泄露、目录遍历、敏感文件
2. **步骤 2**：高级安全检查（46项）- SSRF、JWT 伪造、WebSocket、GraphQL、调试端点、Host 头注入
3. **步骤 3**：专项安全测试（30项）- Sentry API、JWT 深度分析、API 参数注入、内部 API、DNS 邮件记录、暴力破解
4. **步骤 4**：开放重定向测试（15项）- 常见参数、端点、编码绕过、协议绕过
5. **步骤 5**：HTTP方法与认证接口审计（25项）- 方法枚举、认证接口速率限制、CORS 深度验证、请求大小限制
6. **步骤 9**：CMS 专项审计（20项）- WordPress 版本/XML-RPC/REST API/用户枚举/插件暴露（如未检测到 CMS 则标记 not-applicable）

### 3. 子域名审计进度追踪
为每个子域名维护独立的进度文件，确保不遗漏：
```json
{
  "subdomain": "trade-hk.example.com",
  "access_type": "spa-redirect",
  "primary_path": "/asset/overview",
  "steps": {
    "step-01": {"status": "completed", "tests": 59, "executed": 59, "base_path": "/asset/overview"},
    "step-02": {"status": "completed", "tests": 44, "executed": 44, "base_path": "/asset/overview"},
    "step-03": {"status": "completed", "tests": 30, "executed": 30, "base_path": "/asset/overview"},
    "step-04": {"status": "completed", "tests": 15, "executed": 15, "base_path": "/asset/overview"},
    "step-05": {"status": "completed", "tests": 25, "executed": 25, "base_path": "/asset/overview"},
    "step-09": {"status": "completed", "tests": 20, "executed": 20, "base_path": "/asset/overview"}
  },
  "coverage_percentage": 100
}
```

### 3.1 关联域名体系审计
**从步骤 0 的 related-domains.json 读取所有关联域名系统，对每个可访问的关联域名子域名执行完整审计。**

```json
{
  "related_domain_system": "example-group.com",
  "subdomain": "example-group.com",
  "access_type": "normal",
  "primary_path": "/",
  "steps": {
    "step-01": {"status": "completed", "tests": 59, "executed": 59},
    "step-02": {"status": "completed", "tests": 44, "executed": 44},
    "step-03": {"status": "completed", "tests": 30, "executed": 30},
    "step-04": {"status": "completed", "tests": 15, "executed": 15},
    "step-05": {"status": "completed", "tests": 25, "executed": 25},
    "step-09": {"status": "completed", "tests": 20, "executed": 20}
  },
  "coverage_percentage": 100
}
```

关联域名审计目录结构：
```
audits/<domain>/step-06-subdomain-audit/related-domains/<domain_system>/<subdomain>/
├── step-01-basic-security/
├── step-02-advanced-security/
├── step-03-specialized-testing/
├── step-04-open-redirect/
├── step-05-http-methods/
├── step-09-cms-audit/
├── audit-report.json
└── progress.json
```

### 4. 降级策略（每个子域名独立尝试）
如果代理连接失败：
1. 尝试直连（无代理）
2. 直连失败，使用 WebFetch
3. 所有连接失败，使用离线分析（已有的 DNS、SSL 证书等数据）
4. 如果离线分析也失败，标记为 "inaccessible" 并记录原因，**不跳过**

### 5. 证据保存
每个子域名的每个漏洞保存完整证据：
```
audits/<domain>/step-06-subdomain-audit/subdomains/<subdomain>/
├── step-01-basic-security/
│   ├── basic-security.json
│   ├── vulnerabilities.json
│   ├── coverage.json
│   └── evidence/
├── step-02-advanced-security/
│   ├── advanced-security.json
│   ├── vulnerabilities.json
│   ├── coverage.json
│   └── evidence/
├── step-03-specialized-testing/
│   ├── specialized-testing.json
│   ├── vulnerabilities.json
│   ├── coverage.json
│   └── evidence/
├── step-04-open-redirect/
│   ├── open-redirect.json
│   ├── vulnerabilities.json
│   ├── coverage.json
│   └── evidence/
├── step-05-http-methods/
│   ├── http-methods-rate-limit.json
│   ├── vulnerabilities.json
│   ├── coverage.json
│   └── evidence/
├── step-09-cms-audit/
│   ├── cms-audit.json
│   ├── vulnerabilities.json
│   ├── coverage.json
│   └── evidence/
├── audit-report.json (汇总)
└── progress.json
```

## 输出文件

### 每个子域名的报告（必须全部生成）
- `audit-report.json` - 子域名审计报告
- `vulnerabilities.json` - 漏洞列表
- `coverage.json` - 覆盖率验证（必须 100%）
- `progress.json` - 进度追踪

### 汇总报告
- `subdomain-audit.json` - 所有子域名审计汇总
- `subdomain-audit.md` - Markdown 格式汇总

---

## ☑️ 执行检查清单（全部打勾才能通过关口）

对每个可访问子域名，逐项检查：

- [ ] 子域名已执行步骤 1（79项测试，coverage = 100%）
- [ ] 子域名已执行步骤 2（46项测试，coverage = 100%）
- [ ] 子域名已执行步骤 3（30项测试，coverage = 100%）
- [ ] 子域名已执行步骤 4（15项测试，coverage = 100%）
- [ ] 子域名已执行步骤 5（25项测试，coverage = 100%）
- [ ] 子域名已执行步骤 9（20项测试，coverage = 100%，如无 CMS 标记 not-applicable）
- [ ] 子域名已生成 audit-report.json
- [ ] 子域名已生成 vulnerabilities.json
- [ ] 子域名已生成 coverage.json（100%）
- [ ] 子域名已生成 progress.json
- [ ] 所有漏洞证据已保存到 evidence/
- [ ] 关联域名体系已审计（从 related-domains.json 读取，每个可访问关联域名执行完整步骤 1-5 + 步骤 9）
- [ ] 生成汇总 subdomain-audit.json
- [ ] 生成汇总 subdomain-audit.md
- [ ] 生成汇总 coverage.json（所有子域名覆盖 = 100%）

---

## 🚪 关口验证

**必须全部显示 ✅ 才能进入步骤 7。** 如果有 ❌，立即补充缺失内容。

```powershell
$dir = "audits/<domain>/step-06-subdomain-audit"
@("subdomain-audit.json","subdomain-audit.md","coverage.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}

# 获取可访问子域名列表
$subs = Get-Content "audits/<domain>/step-00-subdomain-discovery/subdomains.json" | ConvertFrom-Json
$accessible = $subs.subdomains | Where-Object { $_.status -eq "accessible" }

# 验证每个子域名有独立报告
$allPass = $true
foreach ($s in $accessible) {
  $sd = "$dir/subdomains/$($s.domain)"
  if (Test-Path "$sd/audit-report.json") { 
    Write-Host "✅ $($s.domain) - audit-report.json" 
  } else { 
    Write-Host "❌ MISSING: $($s.domain) - audit-report.json"
    $allPass = $false
  }
  if (Test-Path "$sd/coverage.json") { 
    $cov = Get-Content "$sd/coverage.json" | ConvertFrom-Json
    if ($cov.coverage_percentage -eq 100) { 
      Write-Host "  ✅ coverage = 100%" 
    } else { 
      Write-Host "  ❌ coverage = $($cov.coverage_percentage)%"
      $allPass = $false
    }
  } else { 
    Write-Host "  ❌ MISSING: coverage.json"
    $allPass = $false
  }
}

# 汇总覆盖率
$sumCov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
$total = ($accessible | Measure-Object).Count
$audited = $sumCov.audited_subdomains
if ($audited -eq $total) { Write-Host "✅ All $total subdomains audited" } else { Write-Host "❌ Only $audited/$total subdomains audited"; $allPass = $false }
if ($sumCov.coverage_percentage -eq 100) { Write-Host "✅ summary coverage = 100%" } else { Write-Host "❌ summary coverage = $($sumCov.coverage_percentage)%" }

if (-not $allPass) { Write-Host "`n❌ GATE FAILED - 补充缺失内容后重新验证" } else { Write-Host "`n✅ GATE PASSED" }
```

## 覆盖率验证

每个子域名的 coverage.json：
```json
{
  "subdomain": "api.example.com",
  "total_tests": 215,
  "executed_tests": 215,
  "coverage_percentage": 100,
  "steps": {
    "step_01": {"total": 79, "executed": 79, "coverage": 100},
    "step_02": {"total": 46, "executed": 46, "coverage": 100},
    "step_03": {"total": 30, "executed": 30, "coverage": 100},
    "step_04": {"total": 15, "executed": 15, "coverage": 100},
    "step_05": {"total": 25, "executed": 25, "coverage": 100},
    "step_09": {"total": 20, "executed": 20, "coverage": 100}
  }
}
```

汇总 coverage.json：
```json
{
  "step": 6,
  "total_subdomains": 38,
  "accessible_subdomains": 25,
  "audited_subdomains": 25,
  "coverage_percentage": 100,
  "skipped_subdomains": [],
  "failed_subdomains": []
}
```

## 漏洞证据格式

```json
{
  "id": "SUB-API-001",
  "subdomain": "api.example.com",
  "name": "CSP unsafe-inline",
  "severity": "high",
  "step": 1,
  "endpoint": "https://api.example.com/",
  "curl_command": "curl -x 127.0.0.1:7890 -k -I https://api.example.com/",
  "response_headers": "Content-Security-Policy: default-src 'self' 'unsafe-inline'",
  "evidence_file": "subdomains/api.example.com/step-01-basic-security/evidence/csp-001.txt",
  "remediation": "移除 unsafe-inline，使用 nonce 或 hash"
}
```

## 失败处理

如果某个子域名审计失败：
1. 记录错误到 execution.log
2. 重试最多 3 次（每次尝试不同降级策略）
3. 如果仍失败，标记为 "failed" 并记录原因
4. 在最终报告中说明失败的子域名及原因
5. **不允许跳过失败的子域名**，必须在报告中明确说明
