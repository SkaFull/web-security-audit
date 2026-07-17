# 步骤 17：认证接口用户枚举测试

## 🔴 必须输出的文件

| 文件 | 必须 | 说明 |
|------|------|------|
| user-enumeration.json | ✅ | 用户枚举测试结果（JSON） |
| user-enumeration.md | ✅ | 用户枚举测试报告（Markdown） |

---

## 目标

对所有发现的身份认证接口进行用户枚举测试。用户枚举是暴力破解攻击的前提，发现用户枚举漏洞可帮助评估账户安全风险。

---

## 输入数据

从步骤 0 的子域名枚举结果中读取所有可访问子域名，优先选择包含登录/认证页面的域名：

```powershell
$subdomains = Get-Content "audits/<domain>/step-00-subdomain-discovery/subdomains.json" | ConvertFrom-Json
$targetDomains = $subdomains.subdomains | ? { $_.https_accessible -eq $true } | % { "https://$($_.domain)" }
```

---

## 执行流程

### 1. 登录页面用户枚举

先探测登录端点，然后进行用户枚举测试：

```powershell
# 探测常见登录端点
$loginPaths = @("/signin", "/login", "/auth/login", "/api/login", "/api/auth/login", "/api/v1/login")

foreach ($d in $targetDomains) {
  foreach ($lp in $loginPaths) {
    try {
      $r = Invoke-WebRequest -Uri "$d$lp" -Method GET -SkipCertificateCheck -TimeoutSec 5
      if ($r.StatusCode -eq 200) {
        "LOGIN PAGE: $d$lp"
        
        # 用户枚举测试
        $body1 = @{email="nonexistent_user_12345@test.com"; password="test123"} | ConvertTo-Json
        $body2 = @{email="admin@example.com"; password="wrong_password_12345"} | ConvertTo-Json

        $r1 = Invoke-WebRequest -Uri "$d$lp" -Method POST -Body $body1 `
          -ContentType "application/json" -SkipCertificateCheck
        $r2 = Invoke-WebRequest -Uri "$d$lp" -Method POST -Body $body2 `
          -ContentType "application/json" -SkipCertificateCheck

        $diff = @{
          status_diff = $r1.StatusCode -ne $r2.StatusCode
          body_length_diff = [Math]::Abs($r1.Content.Length - $r2.Content.Length)
          error_message_diff = ($r1.Content -ne $r2.Content)
        }
        if ($diff.status_diff -or $diff.error_message_diff) {
          "USER ENUMERATION: 登录接口 $d$lp 存在用户枚举漏洞"
        }
      }
    } catch {
      $status = $_.Exception.Response.StatusCode.value__
      if ($status -eq 405 -or $status -eq 404) { continue }
      if ($status -eq 200) {
        "LOGIN PAGE (catch): $d$lp"
      }
    }
  }
}
```

### 2. 密码重置接口枚举

```powershell
$resetPaths = @("/forgot-password", "/reset-password", "/password-reset", "/api/auth/reset", "/api/v1/reset-password")

foreach ($d in $targetDomains) {
  foreach ($rp in $resetPaths) {
    try {
      $r1 = Invoke-WebRequest -Uri "$d$rp" -Method POST `
        -Body '{"email":"nonexistent@test.com"}' `
        -ContentType "application/json" -SkipCertificateCheck
      $r2 = Invoke-WebRequest -Uri "$d$rp" -Method POST `
        -Body '{"email":"admin@example.com"}' `
        -ContentType "application/json" -SkipCertificateCheck

      if ($r1.Content -ne $r2.Content -or $r1.StatusCode -ne $r2.StatusCode) {
        "USER ENUMERATION: 密码重置接口 $d$rp 存在用户枚举"
      }
    } catch {}
  }
}
```

### 3. 注册接口枚举

```powershell
$registerPaths = @("/register", "/signup", "/auth/register", "/api/auth/register", "/api/v1/register")

foreach ($d in $targetDomains) {
  foreach ($rp in $registerPaths) {
    try {
      $r = Invoke-WebRequest -Uri "$d$rp" -Method POST `
        -Body '{"email":"admin@example.com","password":"Test123!"}' `
        -ContentType "application/json" -SkipCertificateCheck
      if ($r.Content -match "already exists|已注册|已存在|already taken") {
        "USER ENUMERATION: 注册接口 $d$rp 返回用户已存在信息"
      }
    } catch {}
  }
}
```

### 4. WordPress 用户枚举

如果步骤 9 检测到 WordPress CMS，执行以下测试：

```powershell
# 从步骤 9 结果中获取 WordPress 站点
$wpDomains = @()  # 填充检测到的 WordPress 域名

foreach ($d in $wpDomains) {
  # REST API 用户枚举
  try {
    $r = Invoke-WebRequest -Uri "$d/wp-json/wp/v2/users" -SkipCertificateCheck
    $users = $r.Content | ConvertFrom-Json
    foreach ($u in $users) {
      "WP USER: id=$($u.id) name=$($u.name) slug=$($u.slug) link=$($u.link)"
    }
  } catch {}

  # 作者归档枚举
  for ($authorId = 1; $authorId -le 10; $authorId++) {
    try {
      $r = Invoke-WebRequest -Uri "$d/?author=$authorId" -SkipCertificateCheck -MaximumRedirection 0
    } catch {
      $location = $_.Exception.Response.Headers["Location"]
      if ($location) {
        "WP AUTHOR: author=$authorId -> $location"
      }
    }
  }

  # XML-RPC 用户枚举
  try {
    $body = @"
<?xml version="1.0"?>
<methodCall>
  <methodName>wp.getUsersBlogs</methodName>
  <params>
    <param><value><string>admin</string></value></param>
    <param><value><string>password</string></value></param>
  </params>
</methodCall>
"@
    $r = Invoke-WebRequest -Uri "$d/xmlrpc.php" -Method POST `
      -Body $body -ContentType "text/xml" -SkipCertificateCheck
    if ($r.Content -match "Incorrect username or password") {
      "USER ENUM: XML-RPC 认证失败消息泄露用户名有效性"
    }
  } catch {}
}
```

### 5. JWT/Token 信息泄露分析

```powershell
# 从响应中提取 JWT Token
$jwtPattern = 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'

# 解码 JWT Token（Base64 URL-safe decode）
$jwt = "<extracted_token>"
$parts = $jwt -split '\.'
if ($parts.Count -ge 2) {
  $payload = $parts[1]
  $payload = $payload -replace '-', '+' -replace '_', '/'
  $payload = $payload.PadRight(($payload.Length + 3) - ($payload.Length % 3), '=')
  try {
    $decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload))
    $decoded | ConvertFrom-Json

    # 检查敏感字段
    $sensitiveFields = @("userId","user_id","sub","email","role","permissions","kyc","mfa","2fa","internal","riskLevel","verificationState","loggedInWithTwoFactor")
    foreach ($f in $sensitiveFields) {
      if ($decoded -match $f) { "JWT INFO LEAK: '$f' field found in JWT payload" }
    }
  } catch {}
}
```

---

## 漏洞记录格式

```json
{
  "id": "ENUM-001",
  "domain": "<target>",
  "endpoint": "https://<target>/signin",
  "title": "登录接口用户枚举（错误消息差异）",
  "severity": "medium",
  "cvss_score": 5.3,
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
  "cwe": "CWE-204",
  "owasp": "A07:2021 - Identification and Authentication Failures",
  "description": "登录接口对不存在用户和存在用户返回不同错误消息...",
  "remediation": "统一错误消息为'用户名或密码错误'，不区分用户存在与否",
  "evidence": {
    "nonexistent_user_response": "用户不存在",
    "wrong_password_response": "密码错误",
    "difference": "error_message"
  }
}
```

---

## ☑️ 执行检查清单

- [ ] 1. 测试每个登录端点的用户枚举（错误消息差异）
- [ ] 2. 测试每个登录端点的用户枚举（状态码差异）
- [ ] 3. 测试每个登录端点的用户枚举（响应时间差异）
- [ ] 4. 测试每个密码重置端点的用户枚举
- [ ] 5. 测试每个注册端点的用户枚举
- [ ] 6. WordPress REST API 用户枚举（/wp-json/wp/v2/users）
- [ ] 7. WordPress 作者归档枚举（/?author=1）
- [ ] 8. WordPress XML-RPC 用户枚举（wp.getUsersBlogs）
- [ ] 9. 解码并分析 JWT Token 中的敏感信息
- [ ] 10. 检查 Token 过期时间是否过长
- [ ] 11. 检测 MFA/2FA 配置状态
- [ ] 12. 记录所有用户枚举漏洞
- [ ] 13. 生成 user-enumeration.json
- [ ] 14. 生成 user-enumeration.md

---

## 🚪 关口验证

```powershell
$dir = "audits/<domain>/step-17-user-enumeration"
@("user-enumeration.json","user-enumeration.md") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
```