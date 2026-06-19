import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllMoodRecords } from '../database/moodDB';
import { MOOD_CONFIG } from '../constants';
import type { MoodRecord } from '../types';

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
      // CSV字段用双引号包裹，防止逗号/换行破坏格式
      return `"${r.date}","${r.mood}","${label}","${r.created_at}"`;
    }).join('\n');

    const csvContent = '\uFEFF' + header + rows;

    // 使用新版expo-file-system的File API写入临时文件
    const fileName = `tapmood_export_${getDateStr()}.csv`;
    const file = new File(Paths.cache, fileName);
    file.create({ intermediates: true, overwrite: true });
    file.write(csvContent);

    // 调用系统分享
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

// 获取日期字符串用于文件名
function getDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}
