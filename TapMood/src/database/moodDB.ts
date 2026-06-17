import * as SQLite from 'expo-sqlite';
import type { MoodRecord, MoodLevel } from '../types';

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
  `);
}

// 记录或更新心情（同一天重复记录则覆盖）
export async function recordMood(mood: MoodLevel): Promise<MoodRecord> {
  const database = await getDB();
  const today = getTodayString();

  const result = await database.runAsync(
    `INSERT INTO mood_records (date, mood) VALUES (?, ?)
     ON CONFLICT(date) DO UPDATE SET mood = ?, created_at = datetime('now', 'localtime')`,
    [today, mood, mood]
  );

  return {
    id: result.lastInsertRowId,
    date: today,
    mood,
    created_at: new Date().toISOString(),
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
  return getMoodByDate(getTodayString());
}

// 获取心情统计
export async function getMoodStats(startDate: string, endDate: string): Promise<{
  bad: number; okay: number; good: number; total: number;
}> {
  const database = await getDB();
  const result = await database.getFirstAsync<{
    bad: number; okay: number; good: number; total: number;
  }>(
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

// 工具函数：获取今日日期字符串
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
