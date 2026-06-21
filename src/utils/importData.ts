import * as DocumentPicker from 'expo-document-picker';
import * as Notifications from 'expo-notifications';
import { DeviceEventEmitter } from 'react-native';
import { File } from 'expo-file-system';
import {
  bulkInsertRecords,
  replaceAllRecords,
  saveNotificationSettings,
} from '../database/moodDB';
import { MOOD_EVENTS } from '../constants';
import type { MoodLevel, MoodRecord, NotificationSettings } from '../types';
import type { MoodBackup } from './exportData';

export type ImportStrategy = 'merge' | 'replace';

export interface ImportResult {
  success: boolean;
  strategy?: ImportStrategy;
  imported: number;
  skipped: number;
  error?: string;
  cancelled?: boolean;
}

const MOOD_VALUES: MoodLevel[] = ['bad', 'okay', 'good'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SUPPORTED_JSON_VERSION = '1';

// 校验单条记录是否合法
function isValidRecord(input: unknown): input is MoodRecord {
  if (!input || typeof input !== 'object') return false;
  const r = input as Record<string, unknown>;
  return (
    typeof r.date === 'string' &&
    DATE_REGEX.test(r.date) &&
    typeof r.mood === 'string' &&
    MOOD_VALUES.includes(r.mood as MoodLevel)
  );
}

// 清洗记录，补齐 created_at
function normalizeRecord(r: MoodRecord): MoodRecord {
  return {
    id: 0,
    date: r.date,
    mood: r.mood,
    created_at: typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
  };
}

// 解析 JSON 备份文件
function parseJSONBackup(text: string): { records: MoodRecord[]; notificationSettings?: NotificationSettings; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { records: [], error: 'JSON 解析失败' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { records: [], error: 'JSON 结构无效' };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== SUPPORTED_JSON_VERSION) {
    return { records: [], error: `不支持的备份版本: ${obj.version}` };
  }
  if (!Array.isArray(obj.records)) {
    return { records: [], error: '缺少 records 字段' };
  }
  const records: MoodRecord[] = [];
  for (const r of obj.records) {
    if (isValidRecord(r)) {
      records.push(normalizeRecord(r as MoodRecord));
    }
  }
  const notificationSettings = obj.notificationSettings as NotificationSettings | undefined;
  return { records, notificationSettings };
}

// 解析 CSV 文本（带 BOM）
// 期望列：日期,心情,心情标签,记录时间（心情标签可忽略）
function parseCSV(text: string): { records: MoodRecord[]; error?: string } {
  const cleaned = text.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { records: [], error: 'CSV 为空' };

  // 跳过表头
  const dataLines = lines.slice(1);
  const records: MoodRecord[] = [];
  for (const line of dataLines) {
    // 简单 CSV 解析：拆分引号包裹字段
    const fields = line.split(',').map((f) => f.trim().replace(/^"|"$/g, ''));
    if (fields.length < 2) continue;
    const date = fields[0];
    const mood = fields[1] as MoodLevel;
    const createdAt = fields[3] || new Date().toISOString();
    if (!DATE_REGEX.test(date)) continue;
    if (!MOOD_VALUES.includes(mood)) continue;
    records.push({ id: 0, date, mood, created_at: createdAt });
  }
  return { records };
}

// 重新调度通知（导入新通知设置后）
async function rescheduleNotification(settings: NotificationSettings): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (settings.enabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '记录今天的心情',
          body: '点击快速记录你的心情吧',
          data: { type: 'mood_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: settings.hour,
          minute: settings.minute ?? 0,
        },
      });
    }
  } catch {
    // 调度失败不影响导入主流程
  }
}

// 导入已解析的记录（执行数据库写入 + 副作用）
async function applyImport(
  records: MoodRecord[],
  notificationSettings: NotificationSettings | undefined,
  strategy: ImportStrategy
): Promise<ImportResult> {
  try {
    if (strategy === 'replace') {
      await replaceAllRecords(records);
    } else {
      await bulkInsertRecords(records);
    }

    if (notificationSettings) {
      await saveNotificationSettings(notificationSettings);
      await rescheduleNotification(notificationSettings);
    } else {
      // JSON 没带 notificationSettings，或者 CSV 导入——取消现有通知
      await Notifications.cancelAllScheduledNotificationsAsync();
    }

    // 通知 UI 刷新
    DeviceEventEmitter.emit(MOOD_EVENTS.DATA_IMPORTED);

    return {
      success: true,
      strategy,
      imported: records.length,
      skipped: 0,
    };
  } catch (e) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      error: '数据库写入失败',
    };
  }
}

// 主入口：pick 文件 + 解析 + 导入
export async function pickAndImportData(strategy: ImportStrategy): Promise<ImportResult> {
  let pickResult;
  try {
    pickResult = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/csv', 'public.comma-separated-values-text', 'public.json', '*/*'],
      copyToCacheDirectory: true,
    });
  } catch {
    return { success: false, imported: 0, skipped: 0, error: '无法选择文件' };
  }

  if (pickResult.canceled || !pickResult.assets || pickResult.assets.length === 0) {
    return { success: false, imported: 0, skipped: 0, cancelled: true };
  }

  const asset = pickResult.assets[0];
  const fileName = asset.name || '';
  const fileUri = asset.uri;
  const isJson = fileName.toLowerCase().endsWith('.json');
  const isCsv = fileName.toLowerCase().endsWith('.csv');

  if (!isJson && !isCsv) {
    return { success: false, imported: 0, skipped: 0, error: '请选择 JSON 或 CSV 文件' };
  }

  let text: string;
  try {
    const file = new File(fileUri);
    text = await file.text();
  } catch {
    return { success: false, imported: 0, skipped: 0, error: '文件读取失败' };
  }

  if (isJson) {
    const { records, notificationSettings, error } = parseJSONBackup(text);
    if (error) {
      return { success: false, imported: 0, skipped: 0, error };
    }
    if (records.length === 0) {
      return { success: false, imported: 0, skipped: 0, error: '备份中无有效记录' };
    }
    return applyImport(records, notificationSettings, strategy);
  }

  // CSV
  const { records, error } = parseCSV(text);
  if (error) {
    return { success: false, imported: 0, skipped: 0, error };
  }
  if (records.length === 0) {
    return { success: false, imported: 0, skipped: 0, error: 'CSV 中无有效记录' };
  }
  return applyImport(records, undefined, strategy);
}