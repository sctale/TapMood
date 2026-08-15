import type { MoodLevel } from '../types';

// 心情等级配置（参考 Daylio/Headspace 柔和色系）
export const MOOD_CONFIG: Record<MoodLevel, {
  label: string; color: string;
}> = {
  bad: {
    label: '差',
    color: '#7986CB',         // 柔和靛蓝
  },
  okay: {
    label: '中',
    color: '#FFB74D',         // 温暖琥珀
  },
  good: {
    label: '好',
    color: '#81C784',         // 柔和薄荷绿
  },
};

// 心情等级列表（顺序：差、中、好）
export const MOOD_LEVELS: MoodLevel[] = ['bad', 'okay', 'good'];

// 主题色（参考 Headspace/Finch 治愈风格）
// 注：心情色（bad/okay/good）以 MOOD_CONFIG 为单一数据源
export const COLORS = {
  background: '#F8F6F3',     // 暖米白（替代冷灰白）
  bgAlt: '#F3EFE9',          // 深一档背景
  surface: '#FFFFFF',
  surfaceAlt: '#FFF9F5',     // 暖色卡片底
  text: '#2D2D2D',           // 深灰（替代纯黑）
  textSecondary: '#6E6E6E',  // 白底对比度 4.7:1（WCAG AA）
  textTertiary: '#757575',   // 白底对比度 4.6:1（WCAG AA）
  border: '#F0EDE8',         // 暖灰边框
  borderSubtle: '#E8E4DE',   // 更浅边框
  good: '#81C784',
  accent: '#7986CB',         // 强调色
  // 背景色变体（用于图标背景等）
  badBg: '#E8EAF6',
  okayBg: '#FFF3E0',
  goodBg: '#E8F5E9',
};

// 间距（更宽松，参考 Headspace 大留白）
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// 圆角规范（统一设计token）
export const RADIUS = {
  lg: 16,   // 标准卡片
};

// 全局事件名
export const MOOD_EVENTS = {
  RECORDED: 'mood:recorded',
  ANALYSIS_FOCUS: 'analysis:focus',
  DATA_IMPORTED: 'mood:data_imported',
  TAB_FOCUS: 'tab:focus',
} as const;

// 字体大小
export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};
