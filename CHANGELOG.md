# 更新日志

## [0.3.10] - 2026-06-20

### 修复
- 修复小组件布局文件被插件清理逻辑误删的问题
- 简化为单一 `mood_widget.xml` 布局，去掉 4x1/2x1 双布局切换
- 小组件高度严格锁定为 1 行：minHeight/minResizeHeight/maxResizeHeight 统一 48dp
- resizeMode 改为仅水平调整，避免垂直拉伸导致显示异常
- 小组件内仅保留 3 个可点击心情图标，不再包含内部标题

## [0.3.9] - 2026-06-20

### 修复
- 小组件 4x1 布局移除内部“一点心情”标题，仅保留三个可点击心情图标
- 修复小组件标题点击事件引用已移除的 widget_title 导致的潜在空引用
- 插件不再生成独立的 strings_widget.xml，避免 prebuild 后与主 strings.xml 重复资源

## [0.3.8] - 2026-06-20

### 修复
- 统一 App.tsx 使用 RNPlatform.select 加载 iOS/Android 小组件，避免默认导入 iOS 实现到 Android 包
- MoodWidget.ios.tsx 不再直接调用 SQLite.openDatabaseAsync，改为复用 moodDB 单例
- DateMoodModal 增加 recordingRef + 3 秒安全超时，防止重复点击卡死
- MoodWidget.android.tsx 迁移到新版 expo-file-system File API
- SettingsScreen 提醒时间支持分钟设置，不再硬编码为 0
- AnalysisScreen 监听 MOOD_EVENTS.ANALYSIS_FOCUS 与 MOOD_EVENTS.RECORDED，切换标签页和记录后自动刷新统计

## [0.3.7] - 2026-06-19

### 修复
- 修复 One UI 8.5 小组件下方不显示名称的问题（label 改用 @string/widget_label 并合并到主 strings.xml）
- 修复心情按钮多次点击后失效报错的问题
  - moodDB.getDB() 改用单例 Promise，失败时可自动恢复重连
  - useMood.recordMood 增加 3 秒安全超时，防止防重复机制卡死
  - HomeScreen 事件监听增加异常捕获
  - DateMoodModal 记录后同步更新小组件

## [0.3.6] - 2026-06-19

### 修复
- 修复小组件在三星 One UI 8.5 上不显示名称的问题（label 改为直接字符串值）
- 修复多次切换心情（包括小组件点击）后软件内心情失效报错的问题
  - 消除 MoodWidget.android.tsx 独立打开数据库连接导致的并发冲突
  - App.tsx handleUrl 改为通过 DeviceEventEmitter 与 HomeScreen 协作
  - 统一所有心情记录路径通过 useMood hook 的防重复机制

## [0.3.5] - 2026-06-19

### 修复
- 修复心情切换点几次就出现"记录失败"的问题（防重复点击逻辑优化 + moodDB UPSERT 返回正确 ID）
- 修复小组件选择器不显示名称的问题

### 新增
- 小组件配置 Activity：添加小组件时可设置背景透明度（0%/25%/50%/75%/100%）
- 长按已放置小组件可选择"设置"重新配置（android:widgetFeatures="reconfigurable"）

## [0.3.4] - 2026-06-19

### 修复
- 修复小组件选择器不显示名称的问题（添加 android:label 属性）
- 修复小组件无法缩到1行高度的问题（minHeight/minResizeHeight 从 102dp 降为 40dp）
- 修复软件内心情切换报错（添加防重复点击保护，防止快速连续操作导致数据库并发冲突）

### 优化
- 适配三星 One UI 8.5（Galaxy S25）小组件标准
- 小组件支持垂直方向调整大小（resizeMode 增加 vertical）
- maxResizeHeight 从 102dp 提升到 180dp，支持更大的显示区域

## [0.3.3] - 2026-06-19

### 重构
- 合并两个小组件（4x1/2x1）为单个响应式小组件，遵循 Android 12+ 最佳实践
- 使用 RemoteViews(Map<SizeF, RemoteViews>) 响应式布局，根据尺寸自动切换
- 添加 previewLayout 属性，Android 12+ 选择器实时预览
- 使用系统标准圆角（@android:dimen/system_app_widget_background_radius），v31+ 自动适配
- PendingIntent 使用不同 requestCode，避免覆盖

### 优化
- 重新设计极简矢量图标：圆点眼替代线段眼 + 精致描边 + 更柔和配色
- 按钮背景带色彩倾向（差=淡紫/中=暖灰/好=薄荷），提升辨识度
- 图标配色升级：差=深紫/中=蓝灰/好=薄荷绿，更精致

## [0.3.2] - 2026-06-19

### 优化
- 遵循 Android 12+ 小组件尺寸标准，修正 minWidth/minHeight（4x1=276x102dp, 2x1=130x102dp）
- 新增 minResizeWidth/maxResizeWidth 支持水平调整大小
- 使用极简矢量图标替代 emoji（圆形+简笔表情：下弯嘴/直线/上弯嘴）
- 按钮背景统一为浅灰色，图标颜色区分心情（蓝/橙/绿）
- 背景圆角从16dp调整为20dp，更柔和

## [0.3.1] - 2026-06-19

### 优化
- 小组件高度与普通图标一致，布局更紧凑
- 移除文字标签（差/中/好），emoji 更大更清晰
- 按钮使用心情对应浅色（差=浅蓝/中=浅橙/好=浅绿）

### 新增
- 今天已记录心情时，点击小组件提示「今天已记录心情」，不重复记录
- 首次记录成功时提示「记录成功」
- 背景透明度5级可调（0%/25%/50%/75%/100%），默认75%

## [0.3.0] - 2026-06-19

### 修复
- 修复小组件添加到桌面后显示空白的问题（垂直布局在1行高度下被裁切）

### 新增
- 4x1 宽版小组件：标题 + 三个快捷心情按钮（横排）
- 2x1 窄版小组件：紧凑横排三个心情按钮

### 优化
- 布局从垂直改为水平，适配1行高度
- 移除不可见的白色指示点

## [0.2.9] - 2026-06-19

### 修复
- 修复 MoodBarChart 中 `Animated.createAnimatedComponent(Svg)` 导致 Android 原生崩溃
- 使用 `Animated.View` 包裹 Svg 替代 AnimatedSvg，启用 useNativeDriver
- 移除 HomeScreen 中重复的 initDatabase 调用

### 变更
- 删除 GitHub Actions 工作流，改用本地构建
