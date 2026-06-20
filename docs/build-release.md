# TapMood Android 构建与发布流程

## 前置要求

- Windows PowerShell
- Node.js + npm
- JDK 17+
- Android SDK（含命令行工具）
- 已配置 `ANDROID_HOME` 环境变量

## 构建前检查清单

- [ ] `package.json` 与 `app.json` 的 `version` 一致
- [ ] `android/app/build.gradle` 的 `versionCode` 手动 +1（`versionName` 已自动从 `app.json` 同步）
- [ ] `README.md` 中的版本号已同步
- [ ] `CHANGELOG.md` 已记录本次改动
- [ ] `android/app/src/main/res/values/strings.xml` 包含小组件所需的字符串（如 `widget_label`、`widget_description`）
- [ ] `android/app/src/main/res/xml/mood_widget_info.xml` 正确引用 `@string/widget_label`
- [ ] 检查是否存在重复的 strings XML 文件（例如 `strings_widget.xml`），避免 `mergeReleaseResources` 报 Duplicate resources
- [ ] 数据库单例等核心修复已验证

## 构建后验证（必做）

- [ ] 用 `aapt dump badging <apk>` 验证 APK 元数据：
  ```powershell
  & "$env:LOCALAPPDATA\Android\Sdk\build-tools\<version>\aapt.exe" dump badging android\app\build\outputs\apk\release\app-release.apk | Select-String "package"
  ```
- [ ] 确认 `versionCode` 递增 +1，`versionName` 与 `app.json.expo.version` 一致
- [ ] 若版本号不对，必须重新构建后**先覆盖 release APK 再通知用户**（不要只发新 release 标签）

## 标准构建命令

```powershell
# 1. 安装依赖（如有变动）
npm install

# 2. 若 android 目录缺失或需要重新生成原生代码
npx expo prebuild --platform android

# 3. 构建 Release APK
cd d:\V-Coding\TapMood\android
.\gradlew assembleRelease
```

构建成功后，APK 默认位于：

```
android\app\build\outputs\apk\release\app-release.apk
```

## 常见错误排查

| 现象 | 可能原因 | 解决方案 |
| --- | --- | --- |
| `mergeReleaseResources` 报 Duplicate resources | 多个 strings XML 定义了同名资源 | 删除重复文件，统一放到 `strings.xml` |
| `:app:createBundleReleaseJsAndAssets` 失败 | Metro 打包出错 / TypeScript 错误 | 运行 `npx tsc --noEmit` 检查类型；查看 Metro 日志 |
| Gradle 下载超时 | 网络问题 | 检查代理或手动配置 Gradle 镜像 |
| 原生模块找不到 | node_modules 不完整 | 删除 `node_modules` 和 `package-lock.json`，重新 `npm install` |
| `:app:validateSigningRelease` 失败 | 缺少 release 签名配置 | 在 `android/app/build.gradle` 或 `gradle.properties` 中配置签名 |

## GitHub Release 推送步骤

```powershell
# 查看当前改动
git status

# 添加改动（注意只提交需要发布的文件）
git add .

# 提交，使用规范 commit message
git commit -m "fix: 修复 One UI 8.5 小组件名称和心情点击失效问题"

# 推送（确认远程分支后再执行）
git push

# 4. 覆盖旧 release 的 APK（如版本号修正后）
gh release upload <tag> android\app\build\outputs\apk\release\app-release.apk#TapMood-<tag>.apk --clobber

# 创建 tag（发布版本时）
git tag v0.3.7
git push origin v0.3.7

# 创建 GitHub Release 并上传 APK（需安装 gh CLI 且已认证）
gh release create v0.3.7 --title "v0.3.7" --notes-file CHANGELOG.md android\app\build\outputs\apk\release\app-release.apk
```

## 版本号规范

- 新增功能：次版本号 +1，例如 `1.0.0 → 1.1.0`
- 修复 Bug：修订号 +1，例如 `1.0.0 → 1.0.1`
- 破坏性更新：主版本号 +1，例如 `1.0.0 → 2.0.0`
