import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllMoodRecords, getNotificationSettings } from '../database/moodDB';
import { MOOD_CONFIG } from '../constants';
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

// 将心情记录导出为CSV文件并分享
export async function exportMoodDataAsCSV(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const records = await getAllMoodRecords();
    if (records.length === 0) {
      return { success: false, count: 0, error: '暂无数据可导出' };
    }

    // 构建CSV内容（带BOM头确保Excel正确识别中文）
    const header = '日期,心情,心情标签,记录时间\n';
    const rows = records.map((r: MoodRecord) => {
      const label = MOOD_CONFIG[r.mood].label;
      return `"${r.date}","${r.mood}","${label}","${r.created_at}"`;
    }).join('\n');

    const csvContent = '\uFEFF' + header + rows;

    const fileName = `tapmood_export_${getDateStr()}.csv`;
    const file = new File(Paths.cache, fileName);
    file.create({ intermediates: true, overwrite: true });
    file.write(csvContent);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: '导出心情数据',
        UTI: 'public.comma-separated-values-text',
      });
      return { success: true, count: records.length };
    }
    return { success: false, count: records.length, error: '当前设备不支持分享' };
  } catch (e) {
    return { success: false, count: 0, error: '导出失败，请重试' };
  }
}

// 将心情记录 + 通知设置导出为JSON文件并分享
export async function exportMoodDataAsJSON(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const records = await getAllMoodRecords();
    if (records.length === 0) {
      return { success: false, count: 0, error: '暂无数据可导出' };
    }

    const notificationSettings = await getNotificationSettings();
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
        dialogTitle: '导出完整备份',
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