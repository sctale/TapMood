import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllMoodRecords, getNotificationSettings } from '../database/moodDB';
import type { MoodRecord, NotificationSettings } from '../types';

// JSON 备份文件格式版本
const JSON_BACKUP_VERSION = '1';

export interface MoodBackup {
  version: string;
  exportedAt: string;
  count: number;
  records: MoodRecord[];
  notificationSettings: NotificationSettings;
}

// 导出心情记录 + 通知设置为 JSON 文件并分享
export async function exportMoodData(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const records = await getAllMoodRecords();
    if (records.length === 0) {
      return { success: false, count: 0, error: '暂无数据可导出' };
    }

    // 通知设置是附属数据，读取失败时用默认值兜底（保证心情记录始终能导出）
    let notificationSettings: NotificationSettings = { enabled: false, hour: 21, minute: 0 };
    try {
      notificationSettings = await getNotificationSettings();
    } catch {
      // 读取失败保持默认值
    }
    const backup: MoodBackup = {
      version: JSON_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      count: records.length,
      records,
      notificationSettings,
    };

    const fileName = `tapmood_backup_${getDateStr()}.json`;
    const file = new File(Paths.cache, fileName);
    file.create({ intermediates: true, overwrite: true });
    file.write(JSON.stringify(backup, null, 2));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: '导出数据',
        UTI: 'public.json',
      });
      return { success: true, count: records.length };
    }
    return { success: false, count: records.length, error: '当前设备不支持分享' };
  } catch (e) {
    return { success: false, count: 0, error: '导出失败，请重试' };
  }
}

// 获取日期字符串用于文件名
function getDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}