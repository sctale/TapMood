# 一点心情 TapMood

一款主打"零阻力"记录的极简心情打卡工具。

## 功能特性

- **快捷记录**：3秒完成心情打卡，支持"差/中/好"三档
- **桌面小组件**：今日心情 + 三键快速打卡 + 连续打卡天数（Android 原生 AppWidget + iOS expo-widgets）
- **日历视图**：周/月/年三种视图，进度统计条 + 情绪热力图一目了然
- **心情分析**：饼图（占比）/柱图（趋势）切换显示，周期对比发现情绪规律
- **每日提醒**：自定义时间推送通知，养成记录习惯
- **数据导入/导出**：JSON 完整备份（心情记录 + 通知设置），支持"合并/替换"策略
- **隐私优先**：所有数据本地存储，不上传任何服务器

## 技术栈

- React Native + Expo SDK 56
- TypeScript
- expo-sqlite（本地数据存储）
- expo-file-system（数据文件读写）
- expo-sharing（系统分享面板）
- expo-notifications（定时提醒）
- expo-document-picker（导入选文件）
- react-native-svg（图表渲染）

## 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 运行 Android
npx expo start --android

# 运行 iOS（需 macOS）
npx expo start --ios
```

## 项目结构

```
src/
├── components/     # UI组件
│   ├── MoodSelector.tsx    # 心情选择器
│   ├── DateMoodModal.tsx   # 日期心情弹窗（查看/修改/删除某日心情）
│   ├── TodayStatus.tsx     # 今日状态展示
│   ├── WeekView.tsx        # 周视图
│   ├── MonthView.tsx       # 月视图
│   ├── YearView.tsx        # 年视图
│   ├── MoodPieChart.tsx    # 饼图（占比分布）
│   ├── MoodBarChart.tsx    # 柱状图（趋势对比）
│   ├── TabBar.tsx          # 底部导航
│   ├── TimeWheelPicker.tsx # 时间滚轮选择器
│   └── Toast.tsx           # 轻提示
├── screens/        # 页面
│   ├── HomeScreen.tsx      # 首页（记录+日历+进度条）
│   ├── AnalysisScreen.tsx  # 分析页（饼图+柱图）
│   └── SettingsScreen.tsx  # 设置页（提醒+导入导出）
├── widgets/        # 桌面小组件
│   ├── MoodWidget.tsx           # 通用占位（web/其他平台）
│   ├── MoodWidget.ios.tsx       # iOS 桌面小组件（expo-widgets）
│   └── MoodWidget.android.tsx   # Android 桌面小组件（写状态文件 + 原生 AppWidgetProvider）
├── database/       # 数据层
│   └── moodDB.ts           # SQLite CRUD（含 bulkInsert / replaceAll / clearAll）
├── hooks/          # 自定义Hooks
│   └── useMood.ts
├── constants/      # 常量配置
│   └── index.ts
├── types/          # 类型定义
│   └── index.ts
└── utils/          # 工具函数
    ├── dateUtils.ts        # 日期处理（含 isLeapYear / dayOfYear / isSameISOWeek）
    ├── exportData.ts       # JSON 数据导出
    ├── importData.ts       # JSON 数据导入（合并/替换策略 + 校验）
    └── moodTips.ts         # 心情建议文案

plugins/
├── withAndroidWidget.js    # Expo Config Plugin：自动生成 Android 原生桌面小组件
└── withVersionSync.js      # Expo Config Plugin：自动从 app.json.expo.version 派生 Android versionCode
```

## 版本

当前版本：0.3.42