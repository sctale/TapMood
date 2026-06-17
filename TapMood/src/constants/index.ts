import type { MoodLevel } from '../types';

// 心情等级配置
export const MOOD_CONFIG: Record<MoodLevel, { label: string; color: string; emoji: string }> = {
  bad: {
    label: '差',
    color: '#9E9E9E',   // 灰色
    emoji: '😔',
  },
  okay: {
    label: '中',
    color: '#FFC107',   // 黄色
    emoji: '😐',
  },
  good: {
    label: '好',
    color: '#4CAF50',   // 绿色
    emoji: '😊',
  },
};

// 心情等级列表（顺序：差、中、好）
export const MOOD_LEVELS: MoodLevel[] = ['bad', 'okay', 'good'];

// 主题色
export const COLORS = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  bad: '#9E9E9E',
  okay: '#FFC107',
  good: '#4CAF50',
};

// 间距
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// 字体大小
export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};
