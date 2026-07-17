# <domain> 安全审计报告

## 基本信息

| 项目 | 内容 |
|------|------|
| 目标域名 | <domain> |
| 测试时间 | <timestamp> |
| 漏洞总数 | <total-count> |
| 严重 | <critical-count> |
| 高危 | <high-count> |
| 中危 | <medium-count> |
| 低危 | <low-count> |

---

## 漏洞统计

### 按严重程度

| 严重程度 | 数量 | CVSS范围 |
|---------|------|---------|
| 严重 | <count> | 7.0-10.0 |
| 高危 | <count> | 4.0-6.9 |
| 中危 | <count> | 2.0-3.9 |
| 低危 | <count> | 0.1-1.9 |

### 按类型

| 类型 | 数量 | 说明 |
|------|------|------|
| 信息泄露 | <count> | 内部域名、技术栈、备份文件 |
| 安全配置缺失 | <count> | HSTS、CSP、安全头缺失 |
| Cookie安全 | <count> | Secure、HttpOnly、SameSite缺失 |
| API安全 | <count> | 认证缺失、频率限制缺失 |
| 认证绕过 | <count> | JWT泄露、IDOR、DSN暴露 |

---

## 漏洞详情

### [严重] #001. <标题>

**问题描述**: <description>

**风险等级**: 严重 (CVSS <score>)

**影响范围**: <impact>

**解决方案**:
```<language>
<solution-code>
```

**复现方法**:
```bash
curl -s "<url>" | grep "<pattern>"
```

**证据文件**: [vuln-001.md](vulnerabilities/vuln-001.md)

---

### [高危] #002. <标题>

**问题描述**: <description>

**风险等级**: 高危 (CVSS <score>)

**影响范围**: <impact>

**解决方案**:
```<language>
<solution-code>
```

**复现方法**:
```bash
curl -s "<url>" | grep "<pattern>"
```

**证据文件**: [vuln-002.md](vulnerabilities/vuln-002.md)

---

## 安全配置检查

| 检查项 | 状态 | 配置值 | 风险 |
|--------|------|--------|------|
| HTTPS | <pass/fail> | <value> | <risk> |
| HSTS | <pass/fail> | <value> | <risk> |
| CSP | <pass/fail> | <value> | <risk> |
| X-Content-Type-Options | <pass/fail> | <value> | <risk> |
| X-Frame-Options | <pass/fail> | <value> | <risk> |
| Cookie Secure | <pass/fail> | <value> | <risk> |
| Cookie HttpOnly | <pass/fail> | <value> | <risk> |
| Cookie SameSite | <pass/fail> | <value> | <risk> |

---

## 正面发现

### 安全亮点

<positive-findings-list>

---

## 修复优先级

### P0（立即修复）

| 编号 | 标题 | CVSS | 截止日期 |
|------|------|------|---------|
| <vuln-id> | <title> | <score> | <deadline> |

### P1（本周修复）

| 编号 | 标题 | CVSS | 截止日期 |
|------|------|------|---------|
| <vuln-id> | <title> | <score> | <deadline> |

### P2（本月修复）

| 编号 | 标题 | CVSS | 截止日期 |
|------|------|------|---------|
| <vuln-id> | <title> | <score> | <deadline> |

---

## 总结

<overall-summary>

### 主要风险

<main-risks>

### 建议措施

<recommendations>

---

## 附录

### 测试方法

- 工具: Playwright MCP, curl, 文件系统工具
- 范围: HTTPS (443), HTTP/1.1, HTTP/2
- 认证: 无认证测试

### 相关文件

- 完整报告: <domain>-安全审计报告.md
- 汇总数据: final-test-summary.json
- 漏洞详情: vulnerabilities/vuln-XXX.md
- 证据文件: evidence/evidence-XXX.json
