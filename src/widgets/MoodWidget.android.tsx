// Android 小组件：通过原生 AppWidgetProvider 实现
// 此文件提供 JS 侧的接口，用于写入状态文件供原生小组件读取

import { File, Paths } from 'expo-file-system';
import * as moodDB from '../database/moodDB';

const stateFile = new File(Paths.document, 'widget_state.json');
const configFile = new File(Paths.document, 'widget_config.json');

// 文件写入串行化队列：async 函数在 await 处交错后并发执行 write，
// 最后写入胜出可能用过期数据覆盖新数据，用 promise 链保证写入顺序
let writeQueue: Promise<void> = Promise.resolve();
function enqueueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task).catch(() => {
    // 单次写入失败不阻断后续队列
  });
  return writeQueue;
}

// 更新小组件状态文件（今天的心情记录）
export async function updateMoodWidget() {
  await enqueueWrite(async () => {
    try {
      const record = await moodDB.getTodayMood();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      stateFile.create({ intermediates: true, overwrite: true });
      stateFile.write(JSON.stringify({ date: todayStr, mood: record?.mood ?? '' }));
    } catch {
      // 数据库未初始化时忽略
    }
  });
}

// 更新小组件配置（背景透明度等）
// bgAlpha: 0=透明, 1=25%, 2=50%, 3=75%(默认), 4=100%
export async function updateWidgetConfig(config: { bgAlpha: number }) {
  await enqueueWrite(async () => {
    try {
      configFile.create({ intermediates: true, overwrite: true });
      configFile.write(JSON.stringify(config));
    } catch {
      // 写入失败静默
    }
  });
}

export function setupWidgetInteractionListener() {
  // Android 小组件交互通过 PendingIntent + Deep Link 实现
  // 在原生代码中处理按钮点击，通过 URL Scheme 传递到 JS 侧
  return { remove: () => {} };
}

export default { updateMoodWidget, setupWidgetInteractionListener, updateWidgetConfig };
