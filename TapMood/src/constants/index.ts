import type { MoodLevel } from '../types';

// 心情等级配置（参考 Daylio/Headspace 柔和色系）
export const MOOD_CONFIG: Record<MoodLevel, {
  label: string; color: string; gradientStart: string; gradientEnd: string; emoji: string;
}> = {
  bad: {
    label: '差',
    color: '#7986CB',         // 柔和靛蓝
    gradientStart: '#9FA8DA', // 浅靛蓝
    gradientEnd: '#5C6BC0',   // 深靛蓝
    emoji: '😔',
  },
  okay: {
    label: '中',
    color: '#FFB74D',         // 温暖琥珀
    gradientStart: '#FFCC80', // 浅琥珀
    gradientEnd: '#FFA726',   // 深琥珀
    emoji: '😐',
  },
  good: {
    label: '好',
    color: '#81C784',         // 柔和薄荷绿
    gradientStart: '#A5D6A7', // 浅绿
    gradientEnd: '#66BB6A',   // 深绿
    emoji: '😊',
  },
};

// 心情等级列表（顺序：差、中、好）
export const MOOD_LEVELS: MoodLevel[] = ['bad', 'okay', 'good'];

// 主题色（参考 Headspace/Finch 治愈风格）
export const COLORS = {
  background: '#F8F6F3',     // 暖米白（替代冷灰白）
  surface: '#FFFFFF',
  surfaceAlt: '#FFF9F5',     // 暖色卡片底
  text: '#2D2D2D',           // 深灰（替代纯黑）
  textSecondary: '#9E9E9E',
  textTertiary: '#BDBDBD',
  border: '#F0EDE8',         // 暖灰边框
  bad: '#7986CB',
  okay: '#FFB74D',
  good: '#81C784',
  accent: '#7986CB',         // 强调色
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
