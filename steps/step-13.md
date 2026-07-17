# 步骤 13：WordPress 插件/主题版本漏洞扫描（25 项）

## 必须输出的文件（缺一不可）

| 文件 | 必须 | 说明 |
|------|------|------|
| wordpress.json | ✅ | WordPress 插件/主题扫描结果（JSON） |
| wordpress.md | ✅ | Markdown 格式扫描报告 |
| vulnerabilities.json | ✅ | 发现的漏洞列表 |
| progress.json | ✅ | 步骤进度 |
| coverage.json | ✅ | 25 项测试覆盖率（必须 100%） |
| logs/execution.log | ✅ | 执行日志 |
| step-commit.json | ✅ | 步骤提交证明 |
| evidence/ | ✅ | 漏洞证据文件 |

---

## 目标

对检测到的 WordPress 站点进行深度扫描，枚举插件和主题、检测版本、匹配已知漏洞数据库（CVE）。25 项专项测试。

## 前置条件

此步骤依赖于步骤 8（CMS 专项审计）和步骤 9 的 CMS 检测结果。仅对检测到 WordPress 的站点执行。

- 如果未检测到 WordPress，标记为 `not-applicable` 并生成空报告
- 如果检测到 WordPress，执行全部 25 项测试

## 测试项分类（25 项）

### 插件枚举（10 项）

1. 从 wp-content/plugins/ 目录枚举已安装插件（读取目录列表）
2. 从 HTML 源码提取插件引用（wp-content/plugins/xxx/ 路径）
3. 从 JS 文件提取插件引用
4. 从 CSS 文件提取插件引用
5. 从 readme.html 提取插件信息
6. 探测常见漏洞插件（wp-file-manager、duplicator、elementor、woocommerce 等）
7. 读取插件 readme.txt 获取版本号
8. 读取插件主文件获取版本号
9. 读取插件 changelog.txt 获取版本历史
10. 使用 WPScan 插件指纹数据库匹配

### 主题枚举（5 项）

11. 从 wp-content/themes/ 目录枚举已安装主题（读取目录列表）
12. 从 HTML 源码提取主题引用
13. 读取主题 style.css 获取版本号和主题信息
14. 探测常见漏洞主题
15. 检测子主题配置

### WordPress 核心版本检测（3 项）

16. 从 meta 标签提取 WordPress 版本（`<meta name="generator" content="WordPress X.X.X">`）
17. 从 readme.html 提取版本
18. 从 RSS/Atom feed 提取版本

### 已知漏洞匹配（5 项）

19. 插件版本 vs CVE 数据库匹配
20. 主题版本 vs CVE 数据库匹配
21. WordPress 核心版本 vs CVE 数据库匹配
22. 检测是否存在未打补丁的已知高危漏洞
23. 检测是否存在可利用的 RCE 漏洞

### 配置文件安全（2 项）

24. 探测 wp-config.php 备份文件（.bak, .swp, .save, ~, .old, .txt, .zip）
25. 探测 wp-config.php 直接访问（是否返回空白/403）

---

## 执行方法

```bash
# 1. 枚举插件
curl -k -s -x $PROXY "https://$WP_DOMAIN/wp-content/plugins/" | grep -oP 'href="[^"]*"'

# 2. 读取常见插件 readme.txt
for plugin in $PLUGINS; do
  curl -k -s -x $PROXY "https://$WP_DOMAIN/wp-content/plugins/$plugin/readme.txt" | grep -i "stable tag"
done

# 3. 读取主题 style.css
curl -k -s -x $PROXY "https://$WP_DOMAIN/wp-content/themes/$THEME/style.css" | grep -E "(Version|Theme Name)"

# 4. 提取 WordPress 版本
curl -k -s -x $PROXY "https://$WP_DOMAIN/" | grep -oP 'content="WordPress [^"]*"'
curl -k -s -x $PROXY "https://$WP_DOMAIN/readme.html" | grep -i "version"

# 5. 探测配置文件备份
for ext in .bak .swp .save '~' .old .txt .zip; do
  curl -k -s -x $PROXY -o /dev/null -w "wp-config.php$ext: %{http_code}\n" "https://$WP_DOMAIN/wp-config.php$ext"
done
```

---

## 关口13验证

```powershell
$dir = "audits/<domain>/step-13-false-positive"
@("wordpress.json","wordpress.md","vulnerabilities.json","progress.json","coverage.json","logs/execution.log","step-commit.json") | % {
  if (Test-Path "$dir/$_") { "✅ $_" } else { "❌ MISSING: $_" }
}
if ((Get-ChildItem "$dir/evidence" -Filter "*.json" | Measure-Object).Count -gt 0) { "✅ evidence/ has files" } else { "❌ MISSING: evidence files" }
$cov = Get-Content "$dir/coverage.json" | ConvertFrom-Json
if ($cov.coverage_percentage -eq 100) { "✅ coverage = 100%" } else { "❌ coverage = $($cov.coverage_percentage)%" }
$log = Get-Content "$dir/logs/execution.log" -Raw
if ($log.Length -gt 500) { "✅ logs/ has content" } else { "❌ logs/ is empty or too short" }
$commit = Get-Content "$dir/step-commit.json" | ConvertFrom-Json
if ($commit.gate_verification_passed) { "✅ step-commit: gate passed" } else { "❌ step-commit: gate NOT passed" }
```

---

## 执行检查清单

- [ ] 插件枚举完成
- [ ] 主题枚举完成
- [ ] WordPress 核心版本检测完成
- [ ] 已知漏洞匹配完成
- [ ] 配置文件安全检测完成
- [ ] 所有输出文件已生成
- [ ] evidence/ 目录有证据文件
- [ ] execution.log 记录所有 HTTP 请求
- [ ] step-commit.json 已生成
- [ ] 关口13验证通过