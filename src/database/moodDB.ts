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
  const database = await getDB();
  const today = getToday();
  const now = new Date().toISOString();

  const result = await database.runAsync(
    `INSERT INTO mood_records (date, mood, created_at) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET mood = ?, created_at = ?`,
    [today, mood, now, mood, now]
  );

  return {
    id: result.lastInsertRowId,
    date: today,
    mood,
    created_at: now,
  };
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
