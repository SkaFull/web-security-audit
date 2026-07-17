# Web Security Audit（網站安全審計）

[English](README.md) | [简体中文](README.zh-CN.md) | [中文繁體](README.zh-HK.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> 通用網站安全審計工具，採用系統化逐域名掃描方法，覆蓋 **23 個審計步驟**中的 **600+ 測試項**。

## 概述

Web Security Audit 是一款全面、系統化的網站安全審計工具，專為安全專業人員和滲透測試人員設計。它採用**關口驅動的逐域名掃描方法論**，確保 100% 測試覆蓋率和零遺漏。

與傳統掃描器一次性批量掃描所有域名不同，該工具通過 23 個順序步驟**逐個域名系統化審計**，每個步驟在進入下一步之前必須通過強制關口驗證。

### 核心功能

- **23 步系統化審計**：從子域名枚舉到最終報告生成
- **600+ 測試項**：涵蓋安全頭、SSL/TLS、API 端點、CMS、WebSocket、認證等
- **關口驅動執行**：每個步驟強制驗證（PowerShell 腳本）
- **逐域名深度審計**：每個子域名 215+ 項測試
- **跨步驟反饋機制**：後續發現觸發前序步驟重新審計
- **六級降級策略**：各種網絡環境下可靠執行
- **雙格式輸出**（JSON + Markdown），完整證據收集
- **CVSS v3.1、CWE、OWASP Top 10** 映射到最終報告
- **合規分析**（PCI DSS、ISO 27001、GDPR）

## 快速開始

### 前置條件

- **Node.js** >= 18.0.0
- **PowerShell** 5.1+（僅 Windows 關口驗證腳本需要）
- **curl**（HTTP 測試用）

### 安裝

```bash
git clone https://github.com/SkaFull/web-security-audit.git
cd web-security-audit
npm install
```

### 基本使用

```bash
# 執行完整審計流程
npm run audit -- --target example.com

# 或直接使用 CLI
node bin/cli.js --target example.com

# 攜帶認證令牌和代理
node bin/cli.js --target example.com --auth-token eyJhbG... --proxy 127.0.0.1:7890
```

### 獨立工具使用

```bash
# SSL 證書檢查器
npm run ssl-check -- example.com test.com

# CT 日誌掃描器
npm run ct-scan -- example.com

# API 安全測試器
npm run api-test -- example.com [auth-token]

# JWT 偽造測試器
npm run jwt-test -- example.com eyJhbG...

# 暴力破解測試器
npm run brute-test -- example.com /api/login
```

## AI 助手整合

本 Skill 原生適配 AI 程式開發助手。將資料夾放入工具中，一句話即可啟動審計，無需 CLI 配置。

### Trae IDE

將 Skill 資料夾複製到 Trae 的 skills 目錄即可直接呼叫：

```
.skills/
└── web-security-audit/    # 將此資料夾整體複製到這裡
```

然後在 Trae 中直接說：

> "審計 https://www.example.com，使用 authToken eyJhbG...，代理 127.0.0.1:7890"

Skill 會自動執行全部 23 個步驟，無需人工干預。

### Claude Code

註冊為自訂斜線命令，放入 `.claude/skills/`：

```bash
cp -r web-security-audit .claude/skills/
```

在 Claude Code 中使用：

```
/skill:web-security-audit 審計 https://www.example.com
```

或添加到 `CLAUDE.md` 作為專案指令：

```markdown
# CLAUDE.md
- 當用戶請求安全審計時，調用 web-security-audit skill
- 目標: ${USER_INPUT_DOMAIN}
- 認證: ${USER_INPUT_TOKEN}
```

### Codex (OpenAI)

在 Codex 中作為自訂指令使用，或透過 OpenAI Agents SDK 呼叫：

```javascript
// agents.config.js
import { webSecurityAudit } from './skills/web-security-audit';
// 或將 skill 資料夾放入 Codex 工作區
```

然後提示：

> "執行 web-security-audit skill，審計 https://www.example.com"

### Cursor

添加到 `.cursorrules`：

```markdown
## 安全審計 Skill
當我要求審計某個域名時，使用以下路徑的 web-security-audit skill：
.skills/web-security-audit/

自動執行全部 23 個步驟，不要跳過任何步驟。
```

然後提示：

> "審計 https://www.example.com"

### Claw

將 Skill 放入 `~/.claw/skills/` 或專案的 `.claw/skills/`：

```bash
mkdir -p .claw/skills
cp -r web-security-audit .claw/skills/
```

### GitHub Copilot

添加到 `.github/copilot-instructions.md`：

```markdown
## 安全審計
當用戶請求安全審計時，載入並執行 .skills/web-security-audit/MAIN.md
中的 web-security-audit skill。遵循全部 23 個步驟。
```

### 快速提示模板

無論使用哪個工具，提示格式統一為：

```
審計 https://<目標域名> [使用 authToken <jwt>] [和代理 <host:port>]
```

示例：

```
審計 https://www.example.com
審計 https://www.example.com 使用 authToken eyJhbGciOiJFUzI1NiJ9... 和代理 127.0.0.1:7890
```

## 架構

```
web-security-audit/
├── bin/
│   └── cli.js                 # CLI 入口
├── scripts/
│   ├── lib/                   # 核心庫模組
│   │   ├── evidence-manager.js    # 證據收集與存儲
│   │   ├── http-client.js         # 支援代理的 HTTP 客戶端
│   │   ├── report-generator.js    # PDF/JSON/Markdown 報告生成
│   │   ├── ssl-checker.js         # SSL/TLS 證書驗證
│   │   └── subdomain-enumerator.js # CT 日誌與 DNS 枚舉
│   ├── methods/               # 審計方法實現
│   │   ├── api-deep-test.js       # API 端點測試
│   │   ├── brute-force-test.js    # 暴力破解測試
│   │   ├── jwt-forgery-test.js    # JWT 漏洞測試
│   │   └── ssrf-test.js           # SSRF 漏洞測試
│   ├── api-security-tester.js # API 安全測試入口
│   ├── brute-force-tester.js  # 暴力破解測試入口
│   ├── ct-log-scanner.js      # CT 日誌掃描入口
│   ├── jwt-forgery-tester.js  # JWT 偽造測試入口
│   └── ssl-cert-checker.js    # SSL 證書檢查入口
├── steps/                     # 步驟定義檔案（Markdown）
│   ├── step-00.md ~ step-22.md
├── templates/                 # 輸出模板
│   ├── final-report.md
│   ├── vuln-detail.md
│   ├── positive-findings.md
│   └── audit-state-template.json
├── docs/                      # 文檔
├── MAIN.md                    # 完整執行流程參考
├── SKILL.md                   # 核心原則與強制執行
└── README.md
```

## 審計步驟

### 第一階段：偵察 (Step 0)

**Step 0 — 子域名枚舉**（20 種方法）
使用 20 種枚舉方法發現所有子域名和關聯域名體系：CT 日誌透明性、DNS 暴力破解、SSL 證書解析、JS 源碼提取、反向 DNS、搜尋引擎 dorking 等。同時識別與目標相關的獨立域名系統（如 `example-group.com`、`example-sandbox.com`）。輸出包含可訪問性狀態的完整子域名清單。

### 第二階段：核心安全 (Steps 1-5)

**Step 1 — 基礎安全頭檢查**（100+ 項測試）
全面審計 HTTP 安全回應頭：CSP、HSTS、X-Frame-Options、X-Content-Type-Options、Referrer-Policy、Permissions-Policy、CORS 頭、Cookie 安全屬性（Secure、HttpOnly、SameSite）、SSL/TLS 配置、伺服器資訊洩露等。每個缺失或配置錯誤的回應頭都會標註 CVSS 評分。

**Step 2 — 進階安全檢查**（60+ 項測試）
深入檢查認證機制、API 端點發現、基礎設施暴露（`.git/`、`.env`、備份檔案、管理面板）、檔案上傳端點、錯誤頁資訊洩露、內部服務暴露。測試洩露敏感內部資源的常見錯誤配置。

**Step 3 — 專項漏洞測試**（50+ 項測試）
主動漏洞探測：SQL 注入、XSS（反射型/存儲型/DOM型）、SSRF、命令注入、XXE、SSTI、路徑穿越、LDAP 注入。每個測試使用多種 Payload 變體和繞過技術，包含 WAF/IDS 規避模式。

**Step 4 — 開放重定向檢測**（25 項測試）
對所有已發現的 URL 參數和路徑進行 20+ 種重定向 Payload 變體測試：協議相對路徑、雙重編碼、參數污染、CRLF 注入及常見繞過技術。每個參數獨立測試並擷取證據。

**Step 5 — HTTP 方法與速率限制**（40 項測試）
枚舉允許的 HTTP 方法（GET、POST、PUT、DELETE、PATCH、OPTIONS、TRACE、CONNECT），測試危險方法暴露、認證端點速率限制、暴力破解防護評估。識別過度寬鬆的方法配置。

### 第三階段：深度審計 (Steps 6-14)

**Step 6 — 子域名深度審計**（每子域名 215+ 項測試）
對 Step 0 中發現的每個可訪問子域名，重新執行完整的 Step 1-5 審計流程。每個子域名均接受 215+ 項完整測試。跨子域名對比結果，識別系統性弱點和配置漂移。

**Step 7 — 應用層深度審計**（50+ 項測試）
JavaScript Bundle 逆向工程：從 JS 源碼映射和 Bundle 中提取 API 端點、內部路徑、功能開關和硬編碼憑據。配置檔案發現（`.env`、`config.json`、`settings.yml`）、WebSocket 端點發現、GraphQL 內省測試。

**Step 8 — CMS 審計**（40+ 項測試）
檢測並測試 CMS 平台（WordPress、Drupal、Joomla、Magento、Shopify）。識別版本、主題、插件暴露、預設管理路徑、REST API 暴露、XML-RPC 及 CMS 特定漏洞。測試已知 CMS 錯誤配置。

**Step 9 — 交易/平台審計**（40 項測試）
針對交易、支付和金融平台的專業測試。覆蓋交易 API 安全、支付網關整合、KYC 端點安全、帳戶安全（雙因素認證、會話管理、密碼策略）及金融交易完整性。

**Step 10 — 供應鏈安全**（25 項測試）
審計第三方腳本、CDN 依賴項和 SDK 整合。檢查子資源完整性（SRI）哈希、過期庫版本、已知漏洞依賴項、來自非信任源的外部腳本載入。

**Step 11 — CSP 深度掃描**（30 項測試）
提取並分析所有域名的 Content-Security-Policy 回應頭。識別 CSP 指令中洩露的內部域名，測試 CSP 繞過風險（unsafe-inline、unsafe-eval、萬用字元來源），繪製完整 CSP 信任鏈。

**Step 12 — WordPress 插件掃描**（25 項測試）
通過常見路徑、readme 檔案和版本指紋枚舉 WordPress 插件和主題。將發現的版本與已知 CVE 資料庫交叉比對。測試存在漏洞的插件端點及未授權訪問。

**Step 13 — 誤報驗證**（20 項測試）
驗證所有先前發現，消除誤報。檢查 WAF/CDN 干擾、確認重定向鏈、驗證泛解析 DNS、區分真實漏洞與環境產物。確保報告準確性。

**Step 14 — CORS 深度測試**（每域名 25 項測試）
逐域名 CORS 配置測試（含憑據）。測試 `Access-Control-Allow-Origin` 反射、null 源繞過、子域名信任利用、預檢請求處理。每個域名使用多個源值獨立測試。

### 第四階段：專項測試 (Steps 15-21)

**Step 15 — 回應體深度分析**（30 項測試）
從回應體中深度提取：電郵地址、內部 IP、AWS 密鑰、API 令牌、資料庫連接字串、除錯資訊、堆疊追蹤等 HTML/JSON 回應中意外暴露的敏感資料。

**Step 16 — 用戶枚舉**（20 項測試）
測試認證端點的用戶枚舉漏洞。檢查登入表單、密碼重設流程、註冊頁面和 API 端點是否存在洩露有效用戶名的差異化回應。測試基於時間和基於回應的枚舉向量。

**Step 17 — 速率限制測試**（15 項測試）
逐端點速率限制評估。對每個認證相關端點進行突發請求測試，識別速率限制閾值，測試繞過技術（請求頭操控、IP 輪換模擬），評估鎖定策略。

**Step 18 — Cookie 安全審計**（15 項測試）
逐域名全面 Cookie 審計：Secure 標誌、HttpOnly 標誌、SameSite 策略、Domain/Path 作用域、過期時間、會話固定抵抗、Cookie 注入點。測試 Cookie 篡改和會話劫持向量。

**Step 19 — WebSocket 安全**（15 項測試）
發現 WebSocket 端點，測試認證要求，檢查跨站 WebSocket 劫持（CSWSH），驗證來源檢查，測試訊息注入和通過 WebSocket 幀的 DoS 攻擊。

**Step 20 — WordPress 深度掃描**（20 項測試）
進階 WordPress 測試：timthumb 漏洞掃描、wpscan 模式匹配、資料庫備份暴露、除錯日誌訪問、已知 WordPress 核心/插件漏洞驗證。

**Step 21 — 子域名枚舉增強**（額外 10 種方法）
利用之前所有步驟收集的資料進行補充枚舉。利用已發現的內部域名、CSP 條目、JS Bundle 引用和 API 回應，發現此前隱藏的子域名和攻擊面。

### 第五階段：報告 (Step 22)

**Step 22 — 最終報告生成**
將所有發現匯總為綜合報告，包含 CVSS v3.1 評分、CWE 映射、OWASP Top 10 分類和合規分析（PCI DSS、ISO 27001、GDPR）。生成雙格式輸出（JSON + Markdown），包含執行摘要、技術細節、證據引用和修復建議。

## 配置

### 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `PROXY_HOST` | HTTP 代理主機 | `127.0.0.1` |
| `PROXY_PORT` | HTTP 代理埠 | `7890` |
| `AUTH_TOKEN` | 認證測試用令牌 | - |
| `TIMEOUT` | HTTP 請求逾時（毫秒） | `15000` |
| `RETRY_COUNT` | 失敗測試最大重試次數 | `3` |

### CLI 選項

```
用法: web-security-audit [選項]

選項:
  --target <domain>      目標域名（必填）
  --auth-token <token>   認證測試用令牌（JWT / Bearer / API Key / 會話 Cookie）
  --proxy <host:port>    代理地址（預設: 127.0.0.1:7890）
  --output <dir>         輸出目錄（預設: ./audits）
  --steps <range>        執行的步驟範圍（如 "0-5" 或 "1,3,5"）
  --skip-gate            跳過關口驗證（不推薦）
  --help                 顯示幫助
```

> **關於 `--auth-token` 的說明**：這是一個通用參數名，實際令牌類型和請求頭名稱因網站而異。常見示例：
> - `Authorization: Bearer <jwt>`（大多數 API）
> - `X-Auth-Token: <token>`（部分平台）
> - `Cookie: session=<value>`（Web 應用）
> - `X-API-Key: <key>`（API 服務）
>
> 工具會根據目標網站檢測到的認證方案，自動使用你提供的令牌附加到請求頭中。如果不確定，請在瀏覽器 DevTools 中查看目標網站已認證請求的請求頭。

## 輸出結構

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
├── ... (步驟 2-21)
└── step-22-final-report/
    ├── final-report.json
    ├── final-report.md
    └── vulnerabilities.json
```

## 文檔

- [完整執行流程](MAIN.md) - 含關口驗證腳本的詳細分步指南
- [核心原則](SKILL.md) - 強制執行協議、降級策略、證據要求
- [貢獻指南](CONTRIBUTING.md) - 如何參與貢獻
- [安全策略](SECURITY.md) - 漏洞報告
- [行為準則](CODE_OF_CONDUCT.md) - 社群標準
- [更新日誌](CHANGELOG.md) - 版本歷史

## 貢獻

歡迎貢獻！請參閱 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

## 安全聲明

本工具**僅限授權安全測試使用**。在對任何目標進行測試前，請務必獲得書面授權。

如需報告安全漏洞，請參閱 [SECURITY.md](SECURITY.md)。

## 授權條款

[MIT](LICENSE) © 2026 OLS Security Audit Contributors