import * as SQLite from 'expo-sqlite';
import type { MoodRecord, MoodLevel, MoodStats, NotificationSettings } from '../types';
import { getToday } from '../utils/dateUtils';

const DB_NAME = 'tapmood.db';

let db: SQLite.SQLiteDatabase | null = null;

// 获取数据库实例
async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return db;
}

// 初始化数据库表
export async function initDatabase(): Promise<void> {
  const database = await getDB();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS mood_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      mood TEXT NOT NULL CHECK(mood IN ('bad', 'okay', 'good')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_mood_records_date ON mood_records(date);
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// 记录或更新心情（同一天重复记录则覆盖）
export async function recordMood(mood: MoodLevel): Promise<MoodRecord> {
  return recordMoodForDate(getToday(), mood);
}

// 记录或更新指定日期的心情（用于补记历史）
export async function recordMoodForDate(date: string, mood: MoodLevel): Promise<MoodRecord> {
  const database = await getDB();
  const now = new Date().toISOString();

  const result = await database.runAsync(
    `INSERT INTO mood_records (date, mood, created_at) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET mood = ?, created_at = ?`,
    [date, mood, now, mood, now]
  );

  return {
    id: result.lastInsertRowId,
    date,
    mood,
    created_at: now,
  };
}

// 删除指定日期的心情记录
export async function deleteMoodByDate(date: string): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM mood_records WHERE date = ?', [date]);
}

// 获取指定日期的心情记录
export async function getMoodByDate(date: string): Promise<MoodRecord | null> {
  const database = await getDB();
  const record = await database.getFirstAsync<MoodRecord>(
    'SELECT * FROM mood_records WHERE date = ?',
    [date]
  );
  return record ?? null;
}

// 获取日期范围内的心情记录
export async function getMoodRange(startDate: string, endDate: string): Promise<MoodRecord[]> {
  const database = await getDB();
  const records = await database.getAllAsync<MoodRecord>(
    'SELECT * FROM mood_records WHERE date BETWEEN ? AND ? ORDER BY date ASC',
    [startDate, endDate]
  );
  return records;
}

// 获取今日心情
export async function getTodayMood(): Promise<MoodRecord | null> {
  return getMoodByDate(getToday());
}

// 获取心情统计
export async function getMoodStats(startDate: string, endDate: string): Promise<MoodStats> {
  const database = await getDB();
  const result = await database.getFirstAsync<MoodStats>(
    `SELECT
      SUM(CASE WHEN mood = 'bad' THEN 1 ELSE 0 END) as bad,
      SUM(CASE WHEN mood = 'okay' THEN 1 ELSE 0 END) as okay,
      SUM(CASE WHEN mood = 'good' THEN 1 ELSE 0 END) as good,
      COUNT(*) as total
    FROM mood_records WHERE date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  return result ?? { bad: 0, okay: 0, good: 0, total: 0 };
}

// 获取连续打卡天数（从今天往前算）
export async function getStreak(): Promise<number> {
  const database = await getDB();
  const records = await database.getAllAsync<{ date: string }>(
    'SELECT date FROM mood_records ORDER BY date DESC'
  );
  if (records.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const record of records) {
    const [y, m, d] = record.date.split('-').map(Number);
    const recordDate = new Date(y, m - 1, d);
    recordDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - recordDate.getTime()) / 86400000);
    // diffDays === streak 表示连续
    if (diffDays === streak) {
      streak++;
    } else if (diffDays > streak) {
      // 中断，停止计数
      break;
    }
  }
  return streak;
}

// 获取历史最长连续打卡天数
export async function getLongestStreak(): Promise<number> {
  const database = await getDB();
  const records = await database.getAllAsync<{ date: string }>(
    'SELECT date FROM mood_records ORDER BY date ASC'
  );
  if (records.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < records.length; i++) {
    const [py, pm, pd] = records[i - 1].date.split('-').map(Number);
    const [cy, cm, cd] = records[i].date.split('-').map(Number);
    const prevDate = new Date(py, pm - 1, pd);
    const currDate = new Date(cy, cm - 1, cd);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

// 获取总记录天数
export async function getTotalRecordCount(): Promise<number> {
  const database = await getDB();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM mood_records'
  );
  return result?.count ?? 0;
}

// 读取通知设置
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const database = await getDB();
  const result = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    ['notification_settings']
  );
  if (result?.value) {
    try {
      return JSON.parse(result.value) as NotificationSettings;
    } catch {
      // 解析失败返回默认值
    }
  }
  return { enabled: false, hour: 21, minute: 0 };
}

// 保存通知设置
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = ?`,
    ['notification_settings', JSON.stringify(settings), JSON.stringify(settings)]
  );
}
