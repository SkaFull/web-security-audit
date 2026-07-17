# Web Security Audit（网站安全审计）

[English](README.md) | [简体中文](README.zh-CN.md) | [中文繁體](README.zh-HK.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> 通用网站安全审计工具，采用系统化逐域名扫描方法，覆盖 **23 个审计步骤**中的 **600+ 测试项**。

## 概述

Web Security Audit 是一款全面、系统化的网站安全审计工具，专为安全专业人员和渗透测试人员设计。它采用**关口驱动的逐域名扫描方法论**，确保 100% 测试覆盖率和零遗漏。

与传统扫描器一次性批量扫描所有域名不同，该工具通过 23 个顺序步骤**逐个域名系统化审计**，每个步骤在进入下一步之前必须通过强制关口验证。

### 核心功能

- **23 步系统化审计**：从子域名枚举到最终报告生成
- **600+ 测试项**：涵盖安全头、SSL/TLS、API 端点、CMS、WebSocket、认证等
- **关口驱动执行**：每个步骤强制验证（PowerShell 脚本）
- **逐域名深度审计**：每个子域名 215+ 项测试
- **跨步骤反馈机制**：后续发现触发前序步骤重新审计
- **六级降级策略**：各种网络环境下可靠执行
- **双格式输出**（JSON + Markdown），完整证据收集
- **CVSS v3.1、CWE、OWASP Top 10** 映射到最终报告
- **合规分析**（PCI DSS、ISO 27001、GDPR）

## 快速开始

### 前置条件

- **Node.js** >= 18.0.0
- **PowerShell** 5.1+（仅 Windows 关口验证脚本需要）
- **curl**（HTTP 测试用）

### 安装

```bash
git clone https://github.com/SkaFull/web-security-audit.git
cd web-security-audit
npm install
```

### 基本使用

```bash
# 运行完整审计流程
npm run audit -- --target example.com

# 或直接使用 CLI
node bin/cli.js --target example.com

# 携带认证令牌和代理
node bin/cli.js --target example.com --auth-token eyJhbG... --proxy 127.0.0.1:7890
```

### 独立工具使用

```bash
# SSL 证书检查器
npm run ssl-check -- example.com test.com

# CT 日志扫描器
npm run ct-scan -- example.com

# API 安全测试器
npm run api-test -- example.com [auth-token]

# JWT 伪造测试器
npm run jwt-test -- example.com eyJhbG...

# 暴力破解测试器
npm run brute-test -- example.com /api/login
```

## AI 助手集成

本 Skill 原生适配 AI 编程助手。将文件夹放入工具中，一句话即可启动审计，无需 CLI 配置。

### Trae IDE

将 Skill 文件夹复制到 Trae 的 skills 目录即可直接调用：

```
.skills/
└── web-security-audit/    # 将此文件夹整体复制到这里
```

然后在 Trae 中直接说：

> "审计 https://www.example.com，使用 authToken eyJhbG...，代理 127.0.0.1:7890"

Skill 会自动执行全部 23 个步骤，无需人工干预。

### Claude Code

注册为自定义斜杠命令，放入 `.claude/skills/`：

```bash
cp -r web-security-audit .claude/skills/
```

在 Claude Code 中使用：

```
/skill:web-security-audit 审计 https://www.example.com
```

或添加到 `CLAUDE.md` 作为项目指令：

```markdown
# CLAUDE.md
- 当用户请求安全审计时，调用 web-security-audit skill
- 目标: ${USER_INPUT_DOMAIN}
- 认证: ${USER_INPUT_TOKEN}
```

### Codex (OpenAI)

在 Codex 中作为自定义指令使用，或通过 OpenAI Agents SDK 调用：

```javascript
// agents.config.js
import { webSecurityAudit } from './skills/web-security-audit';
// 或将 skill 文件夹放入 Codex 工作区
```

然后提示：

> "运行 web-security-audit skill，审计 https://www.example.com"

### Cursor

添加到 `.cursorrules`：

```markdown
## 安全审计 Skill
当我要求审计某个域名时，使用以下路径的 web-security-audit skill：
.skills/web-security-audit/

自动执行全部 23 个步骤，不要跳过任何步骤。
```

然后提示：

> "审计 https://www.example.com"

### Claw

将 Skill 放入 `~/.claw/skills/` 或项目的 `.claw/skills/`：

```bash
mkdir -p .claw/skills
cp -r web-security-audit .claw/skills/
```

### GitHub Copilot

添加到 `.github/copilot-instructions.md`：

```markdown
## 安全审计
当用户请求安全审计时，加载并执行 .skills/web-security-audit/MAIN.md
中的 web-security-audit skill。遵循全部 23 个步骤。
```

### 快速提示模板

无论使用哪个工具，提示格式统一为：

```
审计 https://<目标域名> [使用 authToken <jwt>] [和代理 <host:port>]
```

示例：

```
审计 https://www.example.com
审计 https://www.example.com 使用 authToken eyJhbGciOiJFUzI1NiJ9... 和代理 127.0.0.1:7890
```

## 架构

```
web-security-audit/
├── bin/
│   └── cli.js                 # CLI 入口
├── scripts/
│   ├── lib/                   # 核心库模块
│   │   ├── evidence-manager.js    # 证据收集与存储
│   │   ├── http-client.js         # 支持代理的 HTTP 客户端
│   │   ├── report-generator.js    # PDF/JSON/Markdown 报告生成
│   │   ├── ssl-checker.js         # SSL/TLS 证书验证
│   │   └── subdomain-enumerator.js # CT 日志与 DNS 枚举
│   ├── methods/               # 审计方法实现
│   │   ├── api-deep-test.js       # API 端点测试
│   │   ├── brute-force-test.js    # 暴力破解测试
│   │   ├── jwt-forgery-test.js    # JWT 漏洞测试
│   │   └── ssrf-test.js           # SSRF 漏洞测试
│   ├── api-security-tester.js # API 安全测试入口
│   ├── brute-force-tester.js  # 暴力破解测试入口
│   ├── ct-log-scanner.js      # CT 日志扫描入口
│   ├── jwt-forgery-tester.js  # JWT 伪造测试入口
│   └── ssl-cert-checker.js    # SSL 证书检查入口
├── steps/                     # 步骤定义文件（Markdown）
│   ├── step-00.md ~ step-22.md
├── templates/                 # 输出模板
│   ├── final-report.md
│   ├── vuln-detail.md
│   ├── positive-findings.md
│   └── audit-state-template.json
├── docs/                      # 文档
├── MAIN.md                    # 完整执行流程参考
├── SKILL.md                   # 核心原则与强制执行
└── README.md
```

## 审计步骤

### 第一阶段：侦察 (Step 0)

**Step 0 — 子域名枚举**（20 种方法）
使用 20 种枚举方法发现所有子域名和关联域名体系：CT 日志透明性、DNS 暴力破解、SSL 证书解析、JS 源码提取、反向 DNS、搜索引擎 dorking 等。同时识别与目标相关的独立域名系统（如 `example-group.com`、`example-sandbox.com`）。输出包含可访问性状态的完整子域名清单。

### 第二阶段：核心安全 (Steps 1-5)

**Step 1 — 基础安全头检查**（100+ 项测试）
全面审计 HTTP 安全响应头：CSP、HSTS、X-Frame-Options、X-Content-Type-Options、Referrer-Policy、Permissions-Policy、CORS 头、Cookie 安全属性（Secure、HttpOnly、SameSite）、SSL/TLS 配置、服务器信息泄露等。每个缺失或配置错误的响应头都会标注 CVSS 评分。

**Step 2 — 高级安全检查**（60+ 项测试）
深入检查认证机制、API 端点发现、基础设施暴露（`.git/`、`.env`、备份文件、管理面板）、文件上传端点、错误页信息泄露、内部服务暴露。测试泄露敏感内部资源的常见错误配置。

**Step 3 — 专项漏洞测试**（50+ 项测试）
主动漏洞探测：SQL 注入、XSS（反射型/存储型/DOM型）、SSRF、命令注入、XXE、SSTI、路径穿越、LDAP 注入。每个测试使用多种 Payload 变体和绕过技术，包含 WAF/IDS 规避模式。

**Step 4 — 开放重定向检测**（25 项测试）
对所有已发现的 URL 参数和路径进行 20+ 种重定向 Payload 变体测试：协议相对路径、双重编码、参数污染、CRLF 注入及常见绕过技术。每个参数独立测试并捕获证据。

**Step 5 — HTTP 方法与速率限制**（40 项测试）
枚举允许的 HTTP 方法（GET、POST、PUT、DELETE、PATCH、OPTIONS、TRACE、CONNECT），测试危险方法暴露、认证端点速率限制、暴力破解防护评估。识别过度宽松的方法配置。

### 第三阶段：深度审计 (Steps 6-14)

**Step 6 — 子域名深度审计**（每子域名 215+ 项测试）
对 Step 0 中发现的每个可访问子域名，重新执行完整的 Step 1-5 审计流程。每个子域名均接受 215+ 项完整测试。跨子域名对比结果，识别系统性弱点和配置漂移。

**Step 7 — 应用层深度审计**（50+ 项测试）
JavaScript Bundle 逆向工程：从 JS 源码映射和 Bundle 中提取 API 端点、内部路径、功能开关和硬编码凭据。配置文件发现（`.env`、`config.json`、`settings.yml`）、WebSocket 端点发现、GraphQL 内省测试。

**Step 8 — CMS 审计**（40+ 项测试）
检测并测试 CMS 平台（WordPress、Drupal、Joomla、Magento、Shopify）。识别版本、主题、插件暴露、默认管理路径、REST API 暴露、XML-RPC 及 CMS 特定漏洞。测试已知 CMS 错误配置。

**Step 9 — 交易/平台审计**（40 项测试）
针对交易、支付和金融平台的专业测试。覆盖交易 API 安全、支付网关集成、KYC 端点安全、账户安全（双因素认证、会话管理、密码策略）及金融交易完整性。

**Step 10 — 供应链安全**（25 项测试）
审计第三方脚本、CDN 依赖项和 SDK 集成。检查子资源完整性（SRI）哈希、过期库版本、已知漏洞依赖项、来自非可信源的外部脚本加载。

**Step 11 — CSP 深度扫描**（30 项测试）
提取并分析所有域名的 Content-Security-Policy 响应头。识别 CSP 指令中泄露的内部域名，测试 CSP 绕过风险（unsafe-inline、unsafe-eval、通配符来源），绘制完整 CSP 信任链。

**Step 12 — WordPress 插件扫描**（25 项测试）
通过常见路径、readme 文件和版本指纹枚举 WordPress 插件和主题。将发现的版本与已知 CVE 数据库交叉比对。测试存在漏洞的插件端点及未授权访问。

**Step 13 — 误报验证**（20 项测试）
验证所有先前发现，消除误报。检查 WAF/CDN 干扰、确认重定向链、验证泛解析 DNS、区分真实漏洞与环境产物。确保报告准确性。

**Step 14 — CORS 深度测试**（每域名 25 项测试）
逐域名 CORS 配置测试（含凭据）。测试 `Access-Control-Allow-Origin` 反射、null 源绕过、子域名信任利用、预检请求处理。每个域名使用多个源值独立测试。

### 第四阶段：专项测试 (Steps 15-21)

**Step 15 — 响应体深度分析**（30 项测试）
从响应体中深度提取：邮箱地址、内部 IP、AWS 密钥、API 令牌、数据库连接字符串、调试信息、堆栈跟踪等 HTML/JSON 响应中意外暴露的敏感数据。

**Step 16 — 用户枚举**（20 项测试）
测试认证端点的用户枚举漏洞。检查登录表单、密码重置流程、注册页面和 API 端点是否存在泄露有效用户名的差异化响应。测试基于时间和基于响应的枚举向量。

**Step 17 — 速率限制测试**（15 项测试）
逐端点速率限制评估。对每个认证相关端点进行突发请求测试，识别速率限制阈值，测试绕过技术（请求头操控、IP 轮换模拟），评估锁定策略。

**Step 18 — Cookie 安全审计**（15 项测试）
逐域名全面 Cookie 审计：Secure 标志、HttpOnly 标志、SameSite 策略、Domain/Path 作用域、过期时间、会话固定抵抗、Cookie 注入点。测试 Cookie 篡改和会话劫持向量。

**Step 19 — WebSocket 安全**（15 项测试）
发现 WebSocket 端点，测试认证要求，检查跨站 WebSocket 劫持（CSWSH），验证源检查，测试消息注入和通过 WebSocket 帧的 DoS 攻击。

**Step 20 — WordPress 深度扫描**（20 项测试）
高级 WordPress 测试：timthumb 漏洞扫描、wpscan 模式匹配、数据库备份暴露、调试日志访问、已知 WordPress 核心/插件漏洞验证。

**Step 21 — 子域名枚举增强**（额外 10 种方法）
利用之前所有步骤收集的数据进行补充枚举。利用已发现的内部域名、CSP 条目、JS Bundle 引用和 API 响应，发现此前隐藏的子域名和攻击面。

### 第五阶段：报告 (Step 22)

**Step 22 — 最终报告生成**
将所有发现汇总为综合报告，包含 CVSS v3.1 评分、CWE 映射、OWASP Top 10 分类和合规分析（PCI DSS、ISO 27001、GDPR）。生成双格式输出（JSON + Markdown），包含执行摘要、技术细节、证据引用和修复建议。

## 配置

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PROXY_HOST` | HTTP 代理主机 | `127.0.0.1` |
| `PROXY_PORT` | HTTP 代理端口 | `7890` |
| `AUTH_TOKEN` | 认证测试用令牌 | - |
| `TIMEOUT` | HTTP 请求超时（毫秒） | `15000` |
| `RETRY_COUNT` | 失败测试最大重试次数 | `3` |

### CLI 选项

```
用法: web-security-audit [选项]

选项:
  --target <domain>      目标域名（必填）
  --auth-token <token>   认证测试用令牌（JWT / Bearer / API Key / 会话 Cookie）
  --proxy <host:port>    代理地址（默认: 127.0.0.1:7890）
  --output <dir>         输出目录（默认: ./audits）
  --steps <range>        运行的步骤范围（如 "0-5" 或 "1,3,5"）
  --skip-gate            跳过关口验证（不推荐）
  --help                 显示帮助
```

> **关于 `--auth-token` 的说明**：这是一个通用参数名，实际令牌类型和请求头名称因网站而异。常见示例：
> - `Authorization: Bearer <jwt>`（大多数 API）
> - `X-Auth-Token: <token>`（部分平台）
> - `Cookie: session=<value>`（Web 应用）
> - `X-API-Key: <key>`（API 服务）
>
> 工具会根据目标网站检测到的认证方案，自动使用你提供的令牌附加到请求头中。如果不确定，请在浏览器 DevTools 中查看目标网站已认证请求的请求头。

## 输出结构

```
audits/<domain>/
├── audit-progress.json
├── step-00-subdomain-discovery/
│   ├── subdomains.json
│   ├── subdomains.md
│   ├── related-domains.json
│   ├── progress.json
│   ├── coverage.json
│   ├── logs/execution.log
│   └── step-commit.json
├── step-01-basic-security/
│   ├── basic-security.json
│   ├── basic-security.md
│   ├── vulnerabilities.json
│   ├── evidence/
│   ├── logs/execution.log
│   └── step-commit.json
├── ... (步骤 2-21)
└── step-22-final-report/
    ├── final-report.json
    ├── final-report.md
    └── vulnerabilities.json
```

## 文档

- [完整执行流程](MAIN.md) - 含关口验证脚本的详细分步指南
- [核心原则](SKILL.md) - 强制执行协议、降级策略、证据要求
- [贡献指南](CONTRIBUTING.md) - 如何参与贡献
- [安全策略](SECURITY.md) - 漏洞报告
- [行为准则](CODE_OF_CONDUCT.md) - 社区标准
- [更新日志](CHANGELOG.md) - 版本历史

## 贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

## 安全声明

本工具**仅限授权安全测试使用**。在对任何目标进行测试前，请务必获得书面授权。

如需报告安全漏洞，请参阅 [SECURITY.md](SECURITY.md)。

## 许可证

[MIT](LICENSE) © 2026 OLS Security Audit Contributors