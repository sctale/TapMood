import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
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

// 直接导出到手机存储（系统「下载」目录）：
// 用 react-native-blob-util 的 MediaCollection.copyToMediaStore('Download')——
// 原生模块直接调用（非 Intent/深链拉起），API 29+ 走 MediaStore.Downloads 零权限，
// ≤28 库内部落盘 Legacy 下载目录。One UI 实测：本应用自定义 scheme 的
// Linking.openURL 隐式拉起不可靠（0.4.0~0.4.3 深链方案失败），故废弃该通道
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
    const staged = new File(Paths.cache, fileName);
    staged.create({ intermediates: true, overwrite: true });
    staged.write(built.json);

    await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
      {
        name: fileName,
        parentFolder: '',
        mimeType: 'application/json',
      } as never,
      'Download',
      staged.uri
    );
    return { success: true, count: built.count, fileName };
  } catch (e) {
    const detail = e instanceof Error && e.message ? e.message.slice(0, 100) : String(e).slice(0, 100);
    return { success: false, count: 0, error: `写入下载目录失败：${detail}` };
  }
}

// 生成文件名时间戳：YYYYMMDD_HHmmss（同日多次导出文件名不重复）
function getDateStr(): string {
  const now = new Date();
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const t = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `${d}_${t}`;
}