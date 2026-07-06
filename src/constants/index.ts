import type { MoodLevel } from '../types';

// 心情等级配置（参考 Daylio/Headspace 柔和色系）
export const MOOD_CONFIG: Record<MoodLevel, {
  label: string; color: string; gradientStart: string; gradientEnd: string;
}> = {
  bad: {
    label: '差',
    color: '#7986CB',         // 柔和靛蓝
    gradientStart: '#9FA8DA', // 浅靛蓝
    gradientEnd: '#5C6BC0',   // 深靛蓝
  },
  okay: {
    label: '中',
    color: '#FFB74D',         // 温暖琥珀
    gradientStart: '#FFCC80', // 浅琥珀
    gradientEnd: '#FFA726',   // 深琥珀
  },
  good: {
    label: '好',
    color: '#81C784',         // 柔和薄荷绿
    gradientStart: '#A5D6A7', // 浅绿
    gradientEnd: '#66BB6A',   // 深绿
  },
};

// 心情等级列表（顺序：差、中、好）
export const MOOD_LEVELS: MoodLevel[] = ['bad', 'okay', 'good'];

// 主题色（参考 Headspace/Finch 治愈风格）
export const COLORS = {
  background: '#F8F6F3',     // 暖米白（替代冷灰白）
  bgAlt: '#F3EFE9',          // 深一档背景
  surface: '#FFFFFF',
  surfaceAlt: '#FFF9F5',     // 暖色卡片底
  surfaceHover: '#FAFAF8',   // 卡片悬停
  text: '#2D2D2D',           // 深灰（替代纯黑）
  textSecondary: '#9E9E9E',
  textTertiary: '#BDBDBD',
  border: '#F0EDE8',         // 暖灰边框
  borderSubtle: '#E8E4DE',   // 更浅边框
  bad: '#7986CB',
  okay: '#FFB74D',
  good: '#81C784',
  accent: '#7986CB',         // 强调色
  // 浅色变体（用于日历格子等弱填充场景）
  badLight: '#C5CAE9',
  okayLight: '#FFE0B2',
  goodLight: '#C8E6C9',
  // 背景色变体（用于图标背景等）
  badBg: '#E8EAF6',
  okayBg: '#FFF3E0',
  goodBg: '#E8F5E9',
  // 语义色
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#E57373',
};

// 阴影规范（参考预览设计 token）
export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  float: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

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
  sm: 8,    // 小按钮、标签
  md: 12,   // 中等卡片、输入框
  lg: 16,   // 标准卡片
  xl: 20,   // 大卡片、section
  xxl: 24,  // Modal、特殊卡片
  pill: 999, // 胶囊形
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
