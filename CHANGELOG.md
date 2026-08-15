# 更新日志

## [0.3.44] - 2026-08-15

### 小组件增强
- **Android 小组件状态区**：新增今日状态显示——🔥连续打卡天数 / ✓ 已记录 / ··· 待记录，与 iOS 信息量对齐
- **iOS 小组件多尺寸适配**：按 widgetFamily 分支渲染——systemSmall 仅显示今日心情（避免拥挤截断）、锁屏 accessory 极简单行、中/大尺寸完整布局
- **iOS 小组件背景透明度**：新增 5 档透明度配置（updateWidgetConfig），与 Android 对齐
- **iOS 小组件跨日自动刷新**：时间线预置明日 00:01 清空条目，跨日后自动显示待记录状态
- **iOS 小组件插件声明**：app.json 补 expo-widgets 插件，确保 WidgetKit 配置正确生成

### 可访问性
- **色盲辅助**：月/周视图已记录格子右上角叠加微缩心情脸（颜色+形状双通道区分，覆盖约 8% 色觉障碍男性用户）
- **触摸目标 ≥44dp**：月/周/年视图格子 hitSlop 外扩；导航按钮 40→44；viewTab/Modal 按钮 padding 加大
- **DateMoodModal 触觉反馈**：记录/删除成功与失败调用对应振动；选中按钮 0.92→1 弹性缩放即时反馈

### 体验优化
- **记录庆祝感**：今日心情图标 1.3 倍弹跳 + 回弹 + 二次微震；周期进度条 300ms 平滑填充、颜色改中性强调色（进度≠心情好坏）
- **反馈文案统一**：「已记录今日心情 ✨」/「已记录心情 ✨」
- **viewTab 切换动效**：LayoutAnimation 平滑过渡（iOS segmented 风格）
- **今日高亮强化**：月/周视图今日格子 accent 描边环 + 浅靛蓝底（原灰边对比 1.9:1 几乎不可见）
- **年视图提示区分**：年视图提示改「点击月份色块可补记」
- **未来日期占位**：补记弹窗未来日期显示「还没到这一天哦」插画占位（原内容突然变空）
- **小屏适配**：MoodSelector 小尺寸按钮固定宽 76 改 flex 平分，窄屏不再溢出
- **首次使用引导**：总记录数为 0 时日历区显示引导卡

### 设计系统
- **RADIUS token 语义化**：xs/sm/md/lg/xl/pill 六档，全项目散落硬编码圆角替换（进度条/微格子等极小圆角豁免）
- **SettingsScreen 接入 FONT_SIZE**：全部 fontSize 硬编码（18/15/13/11/22/17）替换为常量

## [0.3.43] - 2026-08-01

### 修复
- **心情图标色系统一**：MoodIcon 硬编码色（bad 紫 #7E57C2 / okay 蓝灰 #78909C）与 MOOD_CONFIG 主色脱节，okay 蓝灰图标压琥珀选中按钮严重冲突；改为从 MOOD_CONFIG 读取（与小组件原生图标一致）
- **Android 小组件无"已记录"状态**：onUpdate 现读取今日心情，已记录的按钮全亮、其余降低透明度，提供视觉反馈；此前记录与否外观完全相同
- **Android 小组件记录后不刷新**：注入 MainActivity.onResume 触发全部小组件刷新，记录心情回到桌面即可看到按钮高亮更新（此前需等 30 分钟系统周期）
- **iOS 小组件记录后 APP 内 UI 不同步**：listener 不再直写数据库，改为复用 HomeScreen 记录链路（刷新今日心情/日历/streak + 通知重调度 + Toast），与 Android 收敛同一入口
- **导入数据后小组件不刷新**：doImport 成功后补 updateMoodWidget（导入含今日记录或替换清空今日时同步）
- **多实例小组件配置不同步**：WidgetConfigActivity 改按 ComponentName 刷新全部实例（此前仅刷新当前一个）

### 优化
- **可访问性对比度**：textTertiary/textSecondary 提升至 WCAG AA 4.5:1+；okay 琥珀底白字（1.9:1）改深棕（6.8:1）；删除按钮红色加深
- **未记录日历格子可见性**：月/周/年视图未记录格子统一 bgAlt 占位色（原色在白卡上几乎不可见，年视图纯白格子无边界）
- **MoodSelector 选中态层次**：选中时图标背景半透明白融入按钮底色；选中圆点改白色实心（原渐变小点在彩底不可见）；删除渐变死代码字段
- **APP 回前台自动刷新**：HomeScreen 增加 AppState 监听，覆盖小组件后台记录等场景的数据同步兜底
- **省电**：小组件 updatePeriodMillis 1800000 → 0（onUpdate 无实时数据需求，30 分钟唤醒纯耗电）

## [0.3.42] - 2026-08-01

### 修复
- **导入数据后分析页不刷新**：AnalysisScreen 补充监听 `DATA_IMPORTED` 事件，导入后全局统计（连续打卡/最长连续/总记录）自动更新
- **Toast 可能永不消失**：useEffect 依赖 `onHide` 引用，父组件 re-render 会重置定时器；改为 ref 模式 + SettingsScreen 的 onHide 用 useCallback 稳定引用
- **年视图未来年份可点击**：isFuture 判断去掉 isCurrentYear 条件（YYYY-MM-DD 字典序比较），未来年份的日期正确禁用
- **趋势图 Y 轴标签错位 14px**：yLabel 的 top 补上 container paddingVertical 偏移；数据点 key 从索引改为日期
- **周视图未来日期不禁用**：与月/年视图行为统一（禁用点击 + 降低透明度）
- **趋势图加载态空白**：trend 分支合并 useMoodRange 的 loading/error 判断

### 优化
- **useMood hooks 重构**：抽取统一 load 函数消除 refresh/useEffect 重复代码；refresh 补充竞态保护；失败时统一保留旧值
- **Android 小组件文件写入串行化**：promise 链队列防止并发写入导致过期数据覆盖新数据
- **withVersionSync 边界校验**：minor/patch ≥ 100 时抛错（防止 versionCode 冲突）；modResults 防御检查
- **性能**：饼图/柱图/TabItem/Toast 补充 React.memo；TabBar 动画迁移 stiffness/damping；月/周视图循环外计算 today
- **Onboarding 适配 iPad 分屏**：模块级 SCREEN_WIDTH 改为 useWindowDimensions 响应窗口变化
- **导出兜底**：通知设置读取失败时用默认值，保证心情记录始终能导出
- **DateMoodModal 加载闪烁**：不预先清空 currentMood

### 清理
- **constants/index.ts 清理约 40% 死代码**：删除 SHADOWS 整个对象、RADIUS 5 个未用值、COLORS 9 个未用字段
- **移除未使用依赖**：expo-linking、react-native-screens（代码零 import，已验证）
- **.gitignore 修正**：删除误输入的 `--css` 规则；补充 `.claude/`、`*.log`、`*.keystore`、`*.tmp`

## [0.3.41] - 2026-08-01

### 修复
- **修复通知链断裂问题**：v0.3.40 的"一次性通知+多时机重新调度"存在严重缺陷——用户滑动清除通知或不打开 APP 时，次日无提醒
  - 根因：`scheduleNextReminder` 每次只调度 1 个通知，触发后依赖 APP 启动或通知点击来重新调度，用户不交互就断链
  - 修复：改为 `scheduleNextReminders` 预调度未来 7 天的通知，即使 APP 长时间不启动也能保证每日提醒
  - 今天已记录心情或已过提醒时间 → 跳过今天，只调度未来 6 天
- **移除冗余的 setNotificationHandler 前台拦截**：调度时已精确控制每一天是否弹通知，前台 handler 永远不会触发，属冗余代码

## [0.3.40] - 2026-06-27

### 修复
- **重构通知调度系统**：从 DAILY 重复通知改为一次性通知+多时机重新调度
  - 修复 Bug1：cancelTodayReminder 会取消整个 DAILY 计划导致次日无提醒
  - 修复 Bug2：setNotificationHandler 只在前台生效，后台时已记录心情仍弹通知
  - 新增 scheduleNextReminder：根据今日心情状态智能调度（未记录且未到时间→今天；已记录或已过时间→明天）
  - 新增通知点击后自动重新调度下一次提醒（App.tsx）
  - HomeScreen 记录心情后改为 applyNotificationSettings 重新调度（跳过今天）

## [0.3.39] - 2026-06-27

### 修复
- **修复小组件点击心情按钮无法记录**：APP 被拉起后无反应（无 Toast、心情未入库）
  - 根因：App.tsx emit 事件时 HomeScreen 监听器可能未就绪，事件被丢弃
  - 修复：App.tsx 收到 Deep Link 时同时写入 AsyncStorage `pendingWidgetMood` 兜底
  - HomeScreen 挂载 + 数据库就绪后从 AsyncStorage 读取并消费 pendingWidgetMood，记录后删除 key
  - 双重保障：监听器已就绪走事件，未就绪走 AsyncStorage

## [0.3.38] - 2026-06-27

### 优化
- **移除设置页 GitHub 仓库链接**：删除关于卡片中的「GitHub 仓库」row 及 GithubIcon 组件（普通用户用不到，反馈邮箱保留）

## [0.3.37] - 2026-06-27

### 修复
- **移除 TabBar 切换振动**：删除 App.tsx 中 `handleTabPress` 的 `hapticSelect()` 调用（v0.3.36 漏改，振动来自 App.tsx 而非 HomeScreen 的视图切换）
- **切换 Tab 滚动到顶部**：TabBar 切换到目标页时，ScrollView 自动滚动到顶部
  - 新增 `MOOD_EVENTS.TAB_FOCUS` 事件
  - `App.handleTabPress` 发送事件携带目标 tab key
  - 三个 screen 各自监听事件，匹配到自身 key 时调用 `scrollRef.scrollTo({ y: 0, animated: false })`

## [0.3.36] - 2026-06-27

### 优化
- **触觉反馈精简**：仅保留记录页点击心情按钮时的振动反馈（成功/失败），移除其他所有场景（视图切换、设置开关、导入导出、分享按钮等）的振动
- **移除分析页回顾模块**：删除 v0.3.35 新增的「本月/本周/本年回顾」section，避免与分析页已有统计信息重复
- **移除设置页小组件透明度**：删除 v0.3.34 新增的设置页「桌面小组件」卡片，透明度配置保留在小组件本身的配置 Activity 中（长按桌面小组件进入）

## [0.3.35] - 2026-06-27

### 新增
- **E3 设置页显示数据库大小**：「数据管理」卡片「已记录天数」row 的描述追加数据库文件大小（如 "共 30 天的心情数据 · 12.5 KB"），导入数据后自动刷新
  - 新增 `moodDB.getDatabaseSize()` 用 `expo-file-system.getInfoAsync` 读取 `tapmood.db` 文件大小
- **C3 分享今日心情卡**：记录今日心情后，TodayStatus 右上角显示分享按钮
  - 点击调用 RN `Share.share()` 分享文案："今天我的心情是「好」🌿，已连续记录 X 天。来一起记录心情吧 → TapMood"
  - 新增 `ShareIcon` 内联 SVG 图标（三圆点 + 连接线）
  - 无 mood 时不显示分享按钮
- **C2 趋势折线图**：分析页图表 toggle 新增「趋势」选项
  - 新增 `MoodTrendChart` 组件：SVG 折线图，X 轴=日期，Y 轴=心情级别（好/中/差）
  - 数据点颜色对应当日心情，折线用 good 色
  - 3 条横向虚线参考线 + Y 轴标签
  - 支持周/月/年三种 period
- **C1 月度年度回顾报告**：分析页底部新增「回顾」section
  - 展示：记录天数 / 主要心情 / 好心情占比 / 当前连续 / 最长连续 / 情绪状态
  - 底部生成自然语言总结文案
  - 仅在 stats.total > 0 时显示

## [0.3.34] - 2026-06-27

### 新增
- **C4 小组件背景透明度配置 UI**：设置页新增「桌面小组件」卡片（仅 Android 显示）
  - 5 档分段选择器：0% / 25% / 50% / 75% / 100%
  - 选中后调用 `updateWidgetConfig({ bgAlpha })` 写入 `widget_config.json`，原生小组件读取后调整背景透明度
  - 切换时触发 select + success 触觉反馈
  - 卡片含 widget icon（okayBg 背景方块）+ 说明文字「长按桌面添加小组件后生效」
- **C5 关于页链接**：关于卡片新增 2 个链接 row
  - GitHub 仓库（badBg + GithubIcon）：跳转 `https://github.com/sid/TapMood`
  - 反馈与建议（goodBg + MailIcon）：跳转 `mailto:feedback@tapmood.app`
  - 用 `Linking.openURL` + catch 兜底（网络失败/无邮件应用时 Alert 提示）
- 新增 `WidgetIcon` / `GithubIcon` / `MailIcon` 内联 SVG 图标
- 新增 `alphaSegment` 分段选择器样式（iOS 风格分段控件，激活态白底 + 阴影）
- 新增 `linkRow` 样式（row 的语义别名，带顶部分隔线）

## [0.3.33] - 2026-06-27

### 优化
- **E2 开启 Android 预测性返回手势**：`app.json` 的 `predictiveBackGestureEnabled` 从 `false` 改为 `true`，适配 Android 13+ Material 3 预测性返回手势，Modal/页面返回有动画预览
- **B4 Tab 切换微动效**：重构 `TabBar.tsx`，新增 `TabItem` 子组件，激活态图标用 `Animated.spring` 轻微上移 2px（tension 300 / friction 20），切 Tab 有弹性反馈
- **B2 渐变色微动效**：
  - `MoodSelector` 选中圆点 `selectedDot` 从纯色 `View` 改为 SVG `LinearGradient` 圆点，消费 `MOOD_CONFIG.gradientStart/End`（差=靛蓝渐变 / 中=琥珀渐变 / 好=薄荷绿渐变）
  - `TodayStatus` 心情图标加弹跳庆祝动效：mood 变化时 scale 1→1.2→1（150ms ease-out + 250ms elastic），记录成功有视觉反馈
- **E1 gradient 死代码清理**：`gradientStart/End` 已被 `MoodSelector.selectedDot` 消费，不再是死代码，保留字段定义

## [0.3.32] - 2026-06-27

### 优化
- **Splash 淡出定制**：引入 `expo-splash-screen`，用 `preventAutoHideAsync` 阻止原生 splash 自动隐藏，数据库初始化完成后调用 `hideAsync` 触发原生渐变隐藏，消除冷启动白屏过渡的廉价感
- 不引入 JS 层 fadeMask，避免双层 splash 闪烁，依赖系统原生隐藏动画（约 200ms 渐变）
- 新增依赖 `expo-splash-screen@^56.0.10`

## [0.3.31] - 2026-06-27

### 新增
- **首次启动 Onboarding 引导**：新用户首次打开显示 3 屏极简引导
  - 第 1 屏：欢迎「一点心情」+ 副标「每天 3 秒，记录你的情绪」
  - 第 2 屏：玩法「点一下就好」+ 副标「差 / 中 / 好，三档心情一键记录」
  - 第 3 屏：通知预告「每日提醒」+ 「开始使用」按钮
  - 横向 pagingEnabled 滑动 + 底部 dots 指示器（可点击跳转）
  - 通知权限做成"可跳过"：CTA 按下才请求，用户拒绝也能进主页，后续在设置页再开
- 新增 `src/screens/OnboardingScreen.tsx`
- 引入 `@react-native-async-storage/async-storage`，用 `hasOnboarded` 标记首次启动
- App.tsx 启动时读 AsyncStorage：未 onboarded 渲染 Onboarding，已 onboarded 渲染主 Tab 容器；老用户升级后不会重复看到引导

## [0.3.30] - 2026-06-27

### 优化
- 年视图迷你格子支持点击补记，与周/月视图体验一致；当前年的未来日期禁用点击并以降低透明度区分

## [0.3.29] - 2026-06-27

### 新增
- 引入 `expo-haptics`，在关键交互场景加轻量触觉反馈：
  - 记录心情成功 → success 触感
  - 切换 Tab / 切换日历视图（周/月/年）→ selection 轻触感
  - 开关通知 / 导出 / 导入成功 → success 触感，失败 → error 触感
- 新增 `src/utils/haptics.ts` 统一封装 4 种触觉类型（select / light / success / error），失败静默处理

## [0.3.28] - 2026-06-27

### 优化
- 移除设置页顶部"设置"大标题，与首页/分析页无页面级大标题的风格统一；3 个卡片的 sectionTitle（提醒设置/数据管理/关于）保留作为功能分组标题

## [0.3.27] - 2026-06-27

### 优化
- 记录页 3 个大心情按钮高度从 128 调整为 104，改善整页视觉匀称度，其他参数（borderRadius / borderWidth / paddingVertical / icon size）保持不变

## [0.3.26] - 2026-06-27

### 优化
- **设置页按 design 风格重构**（仅视觉，无新功能）
  - 新增页面顶部"设置"大标题（22 bold，左对齐）
  - 每个 settings-row 左侧添加 36×36 圆角 icon 方块（按行语义配色：每日提醒 good-bg + 铃铛 / 提醒时间 surfaceAlt + 时钟 / 已记录天数 bad-bg + 数据库）
  - 同一卡片内多行之间增加 hairline 分隔线
  - 数据管理导出 / 导入按钮改为横向并排（flex:1 + gap 12），导出 outlined 边框样式 + 导入 filled 实色背景
  - 关于卡片版本号改为 pill 形式（radius 999 + bgAlt 背景）
  - 隐私说明改为 row 布局：锁 SVG 图标 + 文字，gap 8
  - 关于卡片底部新增居中"用 ❤️ 为你打造"情感标语
  - exportHint 文案改为"JSON 格式包含心情记录与通知设置，可跨设备恢复"
  - 所有圆角元素设置实色 backgroundColor 避免历史 RN Android 圆角失效问题
  - 阴影统一使用 elevation + shadow 属性，不使用 CSS box-shadow ring

## [0.3.25] - 2026-06-27

### 修复
- MoodSelector 大按钮宽度溢出：固定 width:104 改为 flex:1，3 个按钮自适应平分 section 内宽度

## [0.3.24] - 2026-06-27

### 修复
- 恢复 0.3.21 简洁 UI 风格，撤销 0.3.22/0.3.23 引入的视觉倒退
- TabBar：移除激活态 pill 背景，恢复纯文字高亮
- TodayStatus：恢复 emoji 🔥 文案，移除 FlameIcon SVG，streakBadge 圆角恢复 12
- MoodSelector：未选中边框恢复灰色(border)，圆角恢复 24，字重恢复 600
- HomeScreen：进度条恢复 surface 背景/圆角 20/黑色数值，viewTabs 圆角恢复 12
- MonthView/WeekView：日历格子恢复满色背景，圆角恢复 12，今日标记恢复单层深色边框
- YearView：日历格子恢复满色背景（保留 miniDayCell 默认 backgroundColor 修复）
- AnalysisScreen：移除页面标题，统计卡片恢复 3 独立卡片+黑色数字，toggle 背景恢复 background，提示卡恢复横向
- MoodPieChart：strokeWidth 恢复 16，中心恢复仅数字，图例恢复单行
- SettingsScreen：移除页面标题/行图标/页脚，按钮恢复上下堆叠，版本号恢复纯文本

## [0.3.23] - 2026-06-27

### 修复
- TabBar 激活态背景色从暖灰改为浅绿(goodLight)，清晰区分激活态
- MoodSelector 按钮圆角 24→16，未选中字重 600→500，选中时覆盖为 600
- MonthView/WeekView 日期格子圆角 12→8，更适配小尺寸格子
- MonthView/WeekView 今日标记改为满色背景+白字+单层白色边框（安卓单层边框稳定，替代 CSS 双层 ring）
- AnalysisScreen 补充"分析"页面标题（Phase 4 遗漏）
- AnalysisScreen periodTabs/chartToggle 背景色从 background 改为 bgAlt，对比度更好
- MoodPieChart 环形描边宽度 16→20，视觉更饱满

## [0.3.22] - 2026-06-27

### 新增
- **UI 视觉优化**（基于设计预稿全量对齐）
  - 设计 Token 扩展：新增浅色变体（badLight/okayLight/goodLight）、背景变体（badBg/okayBg/goodBg）、语义色、SHADOWS 阴影常量
  - Tab Bar：激活态添加暖灰 pill 背景高亮
  - 首页：
    - TodayStatus 连续天数改用 amber 火焰 SVG 图标 + pill 样式
    - MoodSelector 未选中按钮边框改为按心情色（靛蓝/琥珀/绿色），边框加粗至 2px
    - 进度条区域改用 surfaceAlt 背景 + 绿色数值
    - 周/月/年切换改用 pill 样式（borderRadius 999）
    - MonthView/WeekView/YearView 有记录日改用浅色变体背景，今日标记区分有/无记录两种边框色
  - 分析页：新增"分析"页面大标题；统计卡片合并为单卡片 + 竖分隔线 + 彩色数字；周期/图表切换改用 pill 样式；饼图中心新增"天记录"标签；图例改为左 label / 右"N天 NN%"两列布局；提示卡改为纵向布局
  - 设置页：新增"设置"页面大标题；每行添加 36x36 彩色背景图标（铃铛/时钟/数据库）；导出/导入按钮改为并排布局（outlined + filled）；版本号改用 pill 样式；隐私说明添加锁图标；新增"用 ❤️ 为你打造"页脚

## [0.3.21] - 2026-06-26

### 修复
- **年视图无记录日期丢圆角 Bug**（v0.3.20 修复不彻底）
  - 根因：`miniDayCell` 无默认 `backgroundColor`，无记录时为 `'transparent'`，Android 在透明背景下 `borderRadius` 不生效
  - 修复：`miniDayCell` 加默认 `backgroundColor: COLORS.surface`；无记录时 `moodColor` 从 `'transparent'` 改为 `COLORS.surface`
  - 与 v0.3.19 MonthView 修复同源：Android 要求 View 有实际像素才能裁剪圆角

## [0.3.20] - 2026-06-25

### 修复
- **年视图跨年切换丢圆角 Bug**（v0.3.19 修复不彻底）
  - 根因：`YearView` 的日期格子 `key={`${m}-${d}`}` 跨年不唯一，从 2025 切到 2026 时 React 复用同一 View 实例，Android 原生层 `borderRadius` 不重新下发
  - 修复：key 加 year 前缀 → `key={`${year}-${m}-${d}`}`；空位 key 同步 → `key={`empty-${year}-${m}-${i}`}`
  - 原则：不改动 `miniDayCell` 的 `backgroundColor`（保持无记录日透明，不改变视觉设计），只改 key

## [0.3.19] - 2026-06-25

### 修复
- **日历圆角丢失 Bug**（记录页月视图/年视图切换几次后方块圆角变直角）
  - 根因 A（主）：日期格子 `key` 用列索引/日期数字，切换月份时 key 相同导致 React 复用 View 实例，Android 原生层 borderRadius 在 style 数组条件更新时不稳定刷新
  - 根因 B（辅）：`MonthView` 的 `moodCircle` 无默认 `backgroundColor`，从"无属性"→"有属性"切换比"有值→改值"更易触发 borderRadius 裁剪失效
  - `MonthView`：moodCircle 加默认 `backgroundColor: COLORS.border`，移除冗余条件分支；格子 key 从 `ci` 改为 `dateStr`
  - `YearView`：key 从 `d` 改为 `${m}-${d}`，空位改为 `empty-${m}-${i}`
  - `WeekView`：key 从 `i` 改为 `dateStr`（预防性）
  - 不引入嵌套 wrapper（避免重蹈 v0.3.17 失败覆辙），仅改 key 和默认值，从上游规避问题

## [0.3.18] - 2026-06-25

### 修复
- **七层架构全面排查修复**（不发版，本地记录）
  - **视图层**（8 处）：
    - `DateMoodModal` handleDelete 删除心情后未同步小组件状态 → 添加 `updateMoodWidget()` 调用
    - `DateMoodModal` useEffect 切换日期时存在竞态 → 添加 `isCancelled` 取消标志
    - `DateMoodModal` 关闭按钮在 loading 中可被点击 → 添加 `disabled={loading}`
    - `MoodPieChart` ratio=0 段配合 `strokeLinecap="round"` 渲染多余圆点 → 过滤零占比段
    - `MoodPieChart` / `MoodBarChart` 动画 useEffect 无 cleanup → 卸载时调用 `anim.stop()`
    - `MoodIcon` 缺少 `React.memo` → 包装避免无效 SVG 重绘
    - `Toast` useEffect 依赖数组不全 → 补全 `[duration, onHide]`
  - **工具层**（1 处）：
    - `importData` parseJSONBackup 未返回 skipped 计数（ImportResult.skipped 永远 0）→ 增加计数并透传到结果
  - **数据层**（1 处）：
    - `moodDB.getMoodStats` 在空查询范围返回 `{bad: null, okay: null, good: null, total: 0}`，破坏 MoodStats 类型安全 → SQL 改用 `COALESCE(SUM(...), 0)`

### 已知问题（未在本次修复）
- `notification.cancelTodayReminder` 取消整个 DAILY 递归调度而非仅今日一次。已有 App 启动时 `applyNotificationSettings` 恢复调度作为缓解，根本修复需重新设计"今日已记录"机制（改用 lastRecordedDate 标记），留待后续。

## [0.3.16] - 2026-06-20

### 优化
- **通知系统重构**：抽 `src/utils/notification.ts` 单点入口（消除 `SettingsScreen.scheduleDailyReminder` 与 `importData.rescheduleNotification` 重复代码）
  - `applyNotificationSettings(settings)`：统一的 cancel + schedule + ensureChannel
  - `cancelTodayReminder()`：取消今日剩余 mood_reminder
  - `ensureNotificationChannel()`：Android 8+ 显式创建 `mood_reminder` 通道（为未来改 channel 名称/声音留口子）
- **App 启动时自动恢复通知调度**：解决重装 App / 系统重启后通知消失问题（之前需要手动进设置页开关一次才能恢复）
- **recordMood 后取消当日提醒**：用户早 8 点记录心情后，21:00 通知不再触发（原本就被 handler 静默，但避免了系统调度开销）

## [0.3.15] - 2026-06-20

### 新增
- **记录页周/年视图增加进度统计条**：之前"月度进度"section 只在月视图显示，UX 不一致
  - 周视图："本周记录 X/Y 天"（Y = 当前周已过天数 或 7）
  - 月视图："本月记录 X/Y 天"（Y = 本月已过天数 或 当月总天数，逻辑保持）
  - 年视图："今年记录 X/Y 天"（Y = 今年已过天数 或 365/366）
  - 重构 `monthProgress` → `periodProgress`，按 `calendarView` 分发计算
  - 新增 dateUtils 工具：`isLeapYear` / `dayOfYear` / `isSameISOWeek` / `getMondayOfWeek`

## [0.3.14] - 2026-06-20

### 移除
- **分析页自然语言段落**：用户反馈与图表内容 100% 冗余，删除"本周共记录 X 天，以好心情为主..."段落（图表本身已表达全部信息）。tipCard（灵感文案）保留
- **CSV 备份格式**：导出/导入统一 JSON 格式
  - `exportMoodDataAsCSV`、`parseCSV`、CSV 导入分支均已删除
  - `exportMoodDataAsJSON` 重命名为 `exportMoodData`
  - 设置页"导出为 CSV"按钮删除，"导出为 JSON"按钮重命名为"导出数据"

## [0.3.13] - 2026-06-20

### 新增
- **数据导入能力**：设置页新增"导入数据"按钮，支持 CSV 与 JSON 两种格式
  - JSON 完整备份（含心情记录 + 通知设置 + 元数据），可跨设备完整恢复
  - CSV 兼容旧导出格式，仅导入心情记录
  - 提供"合并"与"替换"两种策略；替换时强制二次确认（输入"替换"二字）
  - 导入成功后自动取消旧通知 + 应用新通知设置 + 发 `DATA_IMPORTED` 事件通知 UI 刷新
- **JSON 导出**：设置页新增"导出为 JSON"按钮，含完整备份信息
- **底部感叹**：替换二次确认 Modal（替代 iOS-only 的 Alert.prompt），Android/iOS 体验一致

### 优化
- 分析页"数据摘要"section 与图表内容 100% 重复，重写为自然语言段落
  - 例："本周共记录 **5** 天，以**好**心情为主。好心情占 **60%**，差心情占 **20%**。整体积极向上 ✨"
  - 通过解析 `**xxx**` 标记渲染内联加粗（手写 segment 渲染，无 marked 库）
  - 不同 period 文案差异化（本周/本月/今年）
  - 空数据显示"开始记录你的心情吧 🌱"

## [0.3.12] - 2026-06-20

### 修复
- 修复设置页提醒时间滚轮上下拨动卡顿 / 二次跳动问题
  - 删除双事件磁吸（onScrollEndDrag + onMomentumScrollEnd），仅依赖 RN 内置 snap 系统
  - 修正 useEffect → scrollToOffset 循环链路，受控 value 变化单向同步
  - 新增 syncingRef / currentIndexRef 阻止链式刷新
  - 修正磁吸算法，适配 snapToAlignment='start' + paddingVertical 组合
  - 性能参数对齐：getItemLayout / windowSize=5 / removeClippedSubviews / initialNumToRender / maxToRenderPerBatch

## [0.3.11] - 2026-06-20

### 优化
- APP 内心情图标统一为桌面小组件同款 SVG（差/中/好三套简笔圆形表情）
- 新增 `MoodIcon` 组件，替代原有 emoji 显示
- 设置页提醒时间选择器改为行业标准上下滚轮双列选择（小时+分钟）
- 新增可复用 `TimeWheelPicker` 组件，支持磁吸定位与选中高亮

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
