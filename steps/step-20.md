# 步骤 20：WebSocket 安全测试

## � 必须输出的文件

| 文件 | 必须 | 说明 |
|------|------|------|
| websocket-test.json | ✅ | WebSocket 测试结果（JSON） |
| websocket-test.md | ✅ | WebSocket 测试报告（Markdown） |

---

## 目标

检测所有子域名中的 WebSocket 端点，测试 WebSocket 安全配置（Origin 验证、加密、认证）。

---

## 数据

从步骤 0 的子域名枚举结果中读取所有可访问子域名：

```powers
$subdomains = Get-Content "audits/<domain>/step-00-subdomain-discovery/subdomains.json" | ConvertFrom-Json
$targetDomains = $subdomains.subdomains | ? { $_.https_accessible -eq $true } | % { "https://$($_.domain)" }
```

---

## 执行流程

### 1. WebSocket 端点发现

从 JS Bundle 和 HTML 源码中提取 WebSocket 地址：

```powers
foreach ($d in $targetDomains) {
  try {
    $html = (Invoke-WebRequest -Uri $d -SkipCertificateCheck).Content

    # 提取 WebSocket URL
    $wsPattern = 'wss?://[^"''`\s]+'
    $wsUrls = [regex]::Matches($html, $wsPattern) | % { $_.Value }

    # 提取 socket.io 等库的构造
    $socketPatterns = @(
      'new WebSocket\("([^"]+)"\)',
      'socket\.io\("([^"]+)"',
      'new ReconnectingWebSocket\("([^"]+)"',
      'new SockJS\("([^"]+)"'
    )

    foreach ($sp in $socketPatterns) {
      [regex]::Matches($html, $sp) | % {
        $wsUrls += $_.Groups[1].Value
      }
    }

    "WS URLS on $d: $($wsUrls -join ' | ')"
  } catch {}
}
```

### 2. WebSocket 连接测试

对发现的 WebSocket 端点建立连接并测试：

```powers
# 使用 .NET WebSocket 客户端连接
function Test-WebSocket {
  param($url, $origin)

  try {
    $ws = New-Object System.Net.WebSockets.ClientWebSocket

    # 添加自定义 Origin 头
    if ($origin) {
      $ws.Options.SetRequestHeader("Origin", $origin)
    }

    $ct = New-Object System.Threading.CancellationToken
    $task = $ws.ConnectAsync([Uri]$url, $ct)
    $task.Wait(5000)

    if ($ws.State -eq "Open") {
      "WS CONNECTED: $url (Origin: $origin)"
      $ws.CloseAsync("NormalClosure", "", $ct) | Out-Null
      return $true
    }
  } catch {
    "WS FAILED: $url (Origin: $origin) - $($_.Exception.Message)"
    return $false
  }
  return $false
}

# 测试无 Origin 头连接
foreach ($d in $targetDomains) {
  # 将 https:// 转为 wss://
  $wsUrl = $d -replace "^https://", "wss://"
  $wsPaths = @("/ws", "/socket", "/stream", "/realtime", "/v1/stream", "/api/v1/ws")

  foreach ($p in $wsPaths) {
    Test-WebSocket "$wsUrl$p" $null
  }
}
```

### 3. WebSocket Origin 验证测试

```powers
# 测试不同 Origin 值
$testOrigins = @(
  $null,                          # 无 Origin 头
  "https://evil.com",             # 完全不同的域名
  "https://evil-<target>.com",    # 域名仿冒
  "http://<target>",              # HTTP 协议（非加密）
  "null",                         # null Origin
  "https://<target>.evil.com",    # 子路径欺骗
  ""                              # 空 Origin
)

foreach ($d in $targetDomains) {
  $wsUrl = $d -replace "^https://", "wss://"
  $wsPaths = @("/ws", "/socket", "/stream", "/realtime", "/v1/stream", "/api/v1/ws")

  foreach ($p in $wsPaths) {
    foreach ($origin in $testOrigins) {
      $result = Test-WebSocket "$wsUrl$p" $origin
      if ($result) {
        "WS ORIGIN BYPASS: $wsUrl$p accepted Origin=$origin"
      }
    }
  }
}
```

### 4. WebSocket 消息注入测试

```powers
# 连接成功后发送测试消息，检查响应
function Send-WS-Message {
  param($url, $message)

  try {
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ct = New-Object System.Threading.CancellationToken
    $ws.ConnectAsync([Uri]$url, $ct).Wait(5000)

    if ($ws.State -eq "Open") {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($message)
      $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
      $ws.SendAsync($segment, "Text", $true, $ct).Wait(3000)

      # 接收响应
      $buffer = New-Object byte[] 4096
      $recvSegment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
      $result = $ws.ReceiveAsync($recvSegment, $ct)
      $result.Wait(3000)

      if ($result.Result.Count -gt 0) {
        $response = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Result.Count)
        "WS RESPONSE: $url -> $response"
      }

      $ws.CloseAsync("NormalClosure", "", $ct) | Out-Null
    }
  } catch {}
}

# 测试注入消息
$testMessages = @(
  '{"type":"subscribe","channel":"*"}',
  '{"type":"ping"}',
  '{"type":"echo","data":"test"}',
  '{"type":"auth","token":"test_token"}',
  '{"type":"admin","action":"get_users"}',
  '<script>alert(1)</script>',
  '{"$where":"1=1"}'
)
```

### 5. 安全配置检查

| 检查项 | 检测方法 | 风险 |
|--------|---------|------|
| 无 Origin 验证 | 任意 Origin 可连接 | 严重 |
| 无加密 | ws:// 而非 wss:// | 高危 |
| 无认证 | 连接后无需认证即可订阅 | 高危 |
| 消息注入 | 可发送恶意消息 | 中危 |
| DoS 风险 | 连接数无限制 | 中危 |
| 信息泄露 | 订阅后返回敏感数据 | 高危 |

---

## 漏洞记录格式

```json
{
  "id": "WS-001",
  "domain": "<target>",
  "endpoint": "wss://<target>/v1/stream",
  "title": "WebSocket缺少Origin验证",
  "severity": "critical",
  "cvss_score": 8.6,
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H",
  "cwe": "CWE-1385",
  "owasp": "A05:2021 - Security Misconfiguration",
  "description": "WebSocket 端点接受任意 Origin 头，可被恶意网站跨域连接窃取数据",
  "evidence": {
    "tested_origins": ["null", "https://evil.com", "https://attacker.example.com"],
    "accepted_origins": ["null", "https://evil.com"],
    "ws_endpoint": "wss://<target>/v1/stream"
  }
}
```

---

## ☑️ 执行检查清单

- [ ] 1. 从 JS Bundle 和 HTML 中提取 WebSocket 地址
- [ ] 2. 探测常用 WebSocket 路径（/ws, /socket, /stream）
- [ ] 3. 测试无 Origin 头连接
- [ ] 4. 测试伪造 Origin 头（evil.com）
- [ ] 5. 测试 null Origin 头
- [ ] 6. 测试空 Origin 头
- [ ] 7. 测试 HTTP Origin（非加密）
- [ ] 8. 测试域名仿冒 Origin
- [ ] 9. 连接后发送测试消息验证广播
- [ ] 10. 测试消息注入（JSON、SQL、XSS payload）
- [ ] 11. 检查是否使用 wss:// 加密
- [ ] 12. 检查连接是否需要认证
- [ ] 13. 记录所有 WebSocket 漏洞
- [ ] 14. 生成 websocket-test.json
- [ ] 15. 生成 websocket-test.md

---

## 🚪 关口验证

```powers
$dir = "audits/<domain>/step-20-websocket-test"
@("websocket-test.json","websocket-test.md") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
```