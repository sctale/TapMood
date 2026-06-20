# TapMood Android 构建与发布流程（详细补充）

> **本文件是 [AGENTS.md](../AGENTS.md) 的详细补充**。标准流程以 AGENTS.md 为准，本文件保留：
> 1. 失败排查细节
> 2. 一次性安装步骤
> 3. 高级命令用法
> 4. 极端情况下的应急方案

---

## 前置要求

- Windows PowerShell
- Node.js + npm
- JDK 17+
- Android SDK（含命令行工具）
- 已配置 `ANDROID_HOME` 环境变量
- gh CLI（用于创建 Release）

---

## 一次性安装

```powershell
# 安装 Expo CLI
npm install -g expo

# 安装 gh CLI
winget install --id GitHub.cli

# gh 一次性 OAuth 登录
& "C:\Program Files\GitHub CLI\gh.exe" auth login --hostname github.com --git-protocol https --web
```

---

## 高级命令

### 覆盖已发布 release 的 APK

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" release upload v0.3.12 `
  d:\V-Coding\TapMood\android\app\build\outputs\apk\release\app-release.apk#TapMood-v0.3.12.apk `
  --repo sctale/TapMood --clobber
```

### 列出所有 release

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" release list --repo sctale/TapMood
```

### 删除某个 release

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" release delete v0.3.12 --repo sctale/TapMood --yes
```

### 重新打 tag

```powershell
# 删除本地 tag
git tag -d v0.3.12

# 重新打
git tag v0.3.12
git push origin :refs/tags/v0.3.12
git push origin v0.3.12
```

---

## 失败排查

### Prebuild 卡死 / EBUSY
- 关闭所有占用 `android/` 的进程（Android Studio、IDE Gradle Sync、其他 shell）
- 重新 `npx expo prebuild --platform android`（**不要 `--clean`**，会触发 EBUSY）

### Gradle 编译失败
- 删除 `android/.gradle` 和 `android/app/build` 后重试（**仅必要时**）
- 确认 Node、Java、Android SDK 版本匹配 Expo 56

### APK 体积异常大（>120MB）
- 通常是 Hermes 缓存问题：`rm -rf android/app/build/intermediates/hermesc` 后重新 `gradlew assembleRelease`
- 排除法：检查 `android/app/build/outputs/apk/release` 下其他文件

### 推 tag 失败 / 403
- 撤销并重新生成 PAT（如果还在用）
- 改用 `gh auth login --web` 走 OAuth

---

## 应急：手动同步 build.gradle

> **不推荐**。正确做法是用 [`plugins/withVersionSync.js`](../plugins/withVersionSync.js) 自动同步。

仅在 config plugin 失效时（如 expo 大版本升级）使用：

```gradle
android {
    defaultConfig {
        versionCode 312  // 手动 +1
        versionName "0.3.12"  // 与 app.json.expo.version 同步
    }
}
```

修改后必须：
1. 验证 `aapt dump badging` APK 元数据
2. 修复 config plugin（不能每次手动改）
