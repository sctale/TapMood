// 心情等级类型
export type MoodLevel = 'bad' | 'okay' | 'good';

// 心情记录数据结构
export interface MoodRecord {
  id: number;
  date: string; // YYYY-MM-DD 格式
  mood: MoodLevel;
  created_at: string; // ISO 时间戳
}

// 日历视图类型
export type CalendarView = 'week' | 'month' | 'year';

// 分析周期类型
export type AnalysisPeriod = 'week' | 'month' | 'year';

// 心情统计数据
export interface MoodStats {
  bad: number;
  okay: number;
  good: number;
  total: number;
}

// 通知设置
export interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}
