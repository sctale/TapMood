// Android 小组件：通过原生 AppWidgetProvider 实现
// 此文件提供 JS 侧的接口，用于写入状态文件供原生小组件读取

import * as FileSystem from 'expo-file-system';
import * as moodDB from '../database/moodDB';

const STATE_FILE = FileSystem.documentDirectory + 'widget_state.json';
const CONFIG_FILE = FileSystem.documentDirectory + 'widget_config.json';

// 更新小组件状态文件（今天的心情记录）
export async function updateMoodWidget() {
  try {
    const record = await moodDB.getTodayMood();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    await FileSystem.writeAsStringAsync(
      STATE_FILE,
      JSON.stringify({ date: todayStr, mood: record?.mood ?? '' })
    );
  } catch {
    // 数据库未初始化时忽略
  }
}

// 更新小组件配置（背景透明度等）
// bgAlpha: 0=透明, 1=25%, 2=50%, 3=75%(默认), 4=100%
export async function updateWidgetConfig(config: { bgAlpha: number }) {
  try {
    await FileSystem.writeAsStringAsync(
      CONFIG_FILE,
      JSON.stringify(config)
    );
  } catch {
    // 写入失败静默
  }
}

export function setupWidgetInteractionListener() {
  // Android 小组件交互通过 PendingIntent + Deep Link 实现
  // 在原生代码中处理按钮点击，通过 URL Scheme 传递到 JS 侧
  return { remove: () => {} };
}

export default { updateMoodWidget, setupWidgetInteractionListener, updateWidgetConfig };
