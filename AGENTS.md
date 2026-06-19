# TapMood 项目规范

## Expo 版本

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

## Android 构建流程（标准流程）

每次修改代码后，按以下步骤构建 APK：

### 1. Prebuild（生成原生代码）

```powershell
cd d:\V-Coding\TapMood
npx expo prebuild --platform android
```

- 首次构建或修改了 Config Plugin（`plugins/` 目录）时必须执行
- 如果 `android/` 目录被锁定（EBUSY），先关闭占用进程再重试
- **不要使用 `--clean`**，除非明确需要完全重建（会触发 EBUSY 问题）

### 2. 构建 Release APK

```powershell
cd d:\V-Coding\TapMood\android
.\gradlew assembleRelease
```

- 构建时间约 1-2 分钟（增量构建）/ 8-15 分钟（全量构建）
- APK 输出路径：`android\app\build\outputs\apk\release\app-release.apk`
- **不需要手动处理 hermesc.exe**，标准流程会自动处理

### 3. 验证构建结果

```powershell
# 确认 APK 文件存在且大小合理
Get-Item d:\V-Coding\TapMood\android\app\build\outputs\apk\release\app-release.apk
```

---

## 版本发布流程

每次发布新版本必须完成以下所有步骤：

### 1. 更新版本号

三个文件必须同步更新：
- `app.json` → `expo.version`
- `package.json` → `version`
- `README.md` → "当前版本" 行

版本号规则：
- 新功能 → 次版本号 +1（0.3.0 → 0.4.0）
- Bug 修复 → 修订号 +1（0.3.0 → 0.3.1）
- 破坏性更新 → 主版本号 +1

### 2. 更新 CHANGELOG.md

在文件顶部添加新版本记录：
```markdown
## [x.y.z] - YYYY-MM-DD

### 新增/修复/优化
- 变更说明
```

### 3. 更新 README.md

- 功能描述是否需要更新
- 版本号是否已同步

### 4. Git 提交

```powershell
cd d:\V-Coding\TapMood
git add <相关文件>
git commit -m "feat/fix/docs: 中文描述"
```

- commit message 格式：`feat:` / `fix:` / `docs:` + 中文描述
- 不要 `git add .`，逐个添加文件避免误提交

### 5. 推送到 GitHub

```powershell
git push origin main
```

### 6. 创建 GitHub Release

> 安全提示：请不要将 GitHub Token 硬编码到文件中。执行前请先通过以下任一方式完成认证：
> - 运行 `gh auth login` 进行交互式登录
> - 在本地环境变量中设置 `GH_TOKEN`，例如 `$env:GH_TOKEN="<你的_token>"`

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" release create v<版本号> `
  "d:\V-Coding\TapMood\android\app\build\outputs\apk\release\app-release.apk" `
  --repo sctale/TapMood `
  --title "v<版本号>" `
  --notes "## v<版本号> - 简短说明`n`n### 修复/新增/优化`n- 变更说明"
```

- 注意：使用 `& "C:\Program Files\GitHub CLI\gh.exe"` 而非 `gh`（系统 PATH 中的 gh 可能是错误的）
- APK 必须上传到 Release

---

## 小组件开发规范

### 文件位置
- Config Plugin：`plugins/withAndroidWidget.js`
- JS 侧接口：`src/widgets/MoodWidget.android.tsx`
- Deep Link 处理：`App.tsx` 中的 `handleUrl`

### Android 12+ 小组件标准
- 必须同时设置 `targetCellWidth/Height`（Android 12+）和 `minWidth/Height`（兼容旧版）
- 尺寸公式（5x4 网格）：`(73n - 16) x (118m - 16)` dp
- 使用 `previewLayout` 替代 `previewImage`（Android 12+ 选择器实时预览）
- 使用 `@android:dimen/system_app_widget_background_radius` 系统标准圆角（通过 `drawable-v31` 目录）
- `appwidget-provider` 必须设置 `android:label`（选择器显示名称）
- `minHeight`/`minResizeHeight` 设为 40dp 以确保三星等设备能缩到1行

### 三星 One UI 适配
- 三星网格可能是 5x5 而非 5x4，1行高度约 80-90dp
- `minResizeHeight` 必须足够小（40dp），否则无法缩到1行
- `resizeMode` 必须包含 `vertical`，否则无法垂直调整

---

## 常见问题

### EBUSY: resource busy or locked
- 原因：Gradle daemon 或其他进程占用 `android/` 目录
- 解决：关闭占用进程，或直接运行 `npx expo prebuild --platform android`（不加 `--clean`）

### hermesc.exe 缺失
- 之前遇到过 Windows Defender 删除 hermesc.exe 的问题
- 当前版本的标准构建流程不再需要手动处理
- 如果构建报错提示 hermesc 缺失，从 npm 下载对应版本手动放置

### PowerShell 不支持 HEREDOC
- 不要使用 `$(cat <<'EOF' ... EOF)` 语法
- 使用简单的单行 commit message，或用 `-m` 参数直接写

### gh CLI 路径
- 正确路径：`C:\Program Files\GitHub CLI\gh.exe`
- 系统PATH中的 `gh` 可能指向错误的脚本
