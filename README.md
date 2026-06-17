# 一点心情 TapMood

一款主打"零阻力"记录的极简心情打卡工具。

## 功能特性

- **快捷记录**：3秒完成心情打卡，支持"差/中/好"三档
- **日历视图**：周/月/年三种视图，情绪热力图一目了然
- **心情分析**：饼图/柱图切换，周期对比发现情绪规律
- **每日提醒**：自定义时间推送通知，养成记录习惯
- **隐私优先**：所有数据本地存储，不上传任何服务器

## 技术栈

- React Native + Expo SDK 56
- TypeScript
- expo-sqlite（本地数据存储）
- expo-notifications（定时提醒）
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
│   ├── TodayStatus.tsx     # 今日状态展示
│   ├── WeekView.tsx        # 周视图
│   ├── MonthView.tsx       # 月视图
│   ├── YearView.tsx        # 年视图
│   ├── MoodPieChart.tsx    # 饼图
│   ├── MoodBarChart.tsx    # 柱状图
│   └── TabBar.tsx          # 底部导航
├── screens/        # 页面
│   ├── HomeScreen.tsx      # 首页（记录+日历）
│   ├── AnalysisScreen.tsx  # 分析页
│   └── SettingsScreen.tsx  # 设置页
├── database/       # 数据层
│   └── moodDB.ts           # SQLite CRUD
├── hooks/          # 自定义Hooks
│   └── useMood.ts
├── constants/      # 常量配置
├── types/          # 类型定义
└── utils/          # 工具函数
    └── dateUtils.ts
```

## 版本

当前版本：0.1.1（MVP）
