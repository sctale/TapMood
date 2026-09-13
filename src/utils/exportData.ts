import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
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

// 备份文件名（两种导出方式共用）
function backupFileName(): string {
  return `tapmood_backup_${getDateStr()}.json`;
}

// 构建备份 JSON（记录为空时返回错误；通知设置读取失败用默认值兜底）
async function buildBackupJson(): Promise<
  { ok: true; json: string; count: number } | { ok: false; count: number; error: string }
> {
  const records = await getAllMoodRecords();
  if (records.length === 0) {
    return { ok: false, count: 0, error: '暂无数据可导出' };
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
  return { ok: true, json: JSON.stringify(backup, null, 2), count: records.length };
}

// 导出心情记录 + 通知设置为 JSON 文件并分享
export async function exportMoodData(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const built = await buildBackupJson();
    if (!built.ok) {
      return { success: false, count: built.count, error: built.error };
    }

    const fileName = backupFileName();
    const file = new File(Paths.cache, fileName);
    file.create({ intermediates: true, overwrite: true });
    file.write(built.json);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: '导出数据',
        UTI: 'public.json',
      });
      return { success: true, count: built.count };
    }
    return { success: false, count: built.count, error: '当前设备不支持分享' };
  } catch (e) {
    return { success: false, count: 0, error: '导出失败，请重试' };
  }
}

// 直接导出到手机存储（Android 公共「下载」目录）：
// 写入应用内部 export_tmp/ 后通过 tapmoodexport:// 深链拉起原生
// ExportToDownloadsActivity（config plugin 注入）完成 MediaStore 落盘，
// 结果由原生 Toast 呈现；本函数只代表"任务已移交"，非"写入成功"
export async function exportMoodDataToDownloads(): Promise<{
  success: boolean;
  count: number;
  fileName?: string;
  error?: string;
}> {
  try {
    if (Platform.OS !== 'android') {
      return { success: false, count: 0, error: '仅 Android 支持保存到手机存储，请使用"导出数据"分享' };
    }
    const built = await buildBackupJson();
    if (!built.ok) {
      return { success: false, count: built.count, error: built.error };
    }

    const fileName = backupFileName();
    // 文档推荐多参拼接路径段（单参内含 '/' 非文档行为，曾致暂存路径解析失败）
    const file = new File(Paths.document, 'export_tmp', fileName);
    file.create({ intermediates: true, overwrite: true });
    file.write(built.json);

    try {
      await Linking.openURL(`tapmoodexport://save?name=${encodeURIComponent(fileName)}`);
    } catch {
      return { success: false, count: built.count, error: '无法拉起系统写入入口' };
    }
    return { success: true, count: built.count, fileName };
  } catch (e) {
    const detail = e instanceof Error && e.message ? `：${e.message.slice(0, 60)}` : '';
    return { success: false, count: 0, error: `暂存备份失败${detail}` };
  }
}

// 获取日期字符串用于文件名
function getDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}