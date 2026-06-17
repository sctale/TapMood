// 日期工具函数

// 格式化日期为 YYYY-MM-DD
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 获取今日日期字符串
export function getToday(): string {
  return formatDate(new Date());
}

// 解析日期字符串为Date对象
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 获取本周的起止日期（周一到周日）
export function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1; // 周一为起始
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: formatDate(monday), end: formatDate(sunday) };
}

// 获取本月的起止日期
export function getMonthRange(date: Date = new Date()): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

// 获取本年的起止日期
export function getYearRange(date: Date = new Date()): { start: string; end: string } {
  return {
    start: `${date.getFullYear()}-01-01`,
    end: `${date.getFullYear()}-12-31`,
  };
}

// 获取某月的天数
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// 获取某月第一天是星期几（0=周日，1=周一...）
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

// 获取月份名称
export function getMonthName(month: number): string {
  const names = ['一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return names[month - 1];
}

// 获取星期名称
export function getWeekdayName(day: number): string {
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  return names[day];
}

// 日期加减天数
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
