import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationSettings } from '../types';
import { getTodayMood } from '../database/moodDB';

// Android 通知 channel 配置
const CHANNEL_ID = 'mood_reminder';
const CHANNEL_NAME = '心情提醒';
const CHANNEL_DESCRIPTION = '每天提醒记录心情';

// 通知内容（统一文案，避免重复）
const NOTIFICATION_CONTENT: Notifications.NotificationContentInput = {
  title: '记录今天的心情',
  body: '点击快速记录你的心情吧',
  data: { type: 'mood_reminder' },
};

// 显式创建 Android 通知通道（幂等：已存在则更新，不抛错）
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: CHANNEL_NAME,
      description: CHANNEL_DESCRIPTION,
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFB74D',
    });
  } catch {
    // 创建 channel 失败不影响主流程
  }
}

// 计算下一次提醒时间的核心逻辑
// 规则：今天未记录且未到提醒时间 → 今天提醒；否则 → 明天提醒
function getNextTriggerDate(settings: NotificationSettings, hasTodayMood: boolean): Date {
  const now = new Date();
  // 今天的提醒时间点
  const todayTrigger = new Date(now.getFullYear(), now.getMonth(), now.getDate(), settings.hour, settings.minute ?? 0, 0, 0);

  if (!hasTodayMood && now.getTime() < todayTrigger.getTime()) {
    // 今天还没到提醒时间且没记录心情 → 今天提醒
    return todayTrigger;
  }

  // 已记录心情 或 已过今日提醒时间 → 明天提醒
  const tomorrow = new Date(todayTrigger);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

// 核心调度函数：调度下一次一次性通知
// 替代原 DAILY trigger，避免 cancelTodayReminder 破坏整个重复计划
export async function scheduleNextReminder(settings: NotificationSettings, hasTodayMood: boolean): Promise<void> {
  try {
    await ensureNotificationChannel();
    // 清空旧的所有调度（确保只有一个待触发通知）
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!settings.enabled) return;

    const nextDate = getNextTriggerDate(settings, hasTodayMood);

    await Notifications.scheduleNotificationAsync({
      content: NOTIFICATION_CONTENT,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextDate,
      },
    });
  } catch {
    // 调度失败不影响主流程
  }
}

// 单点入口：应用通知设置
// 内部自动查询今日心情状态，决定调度今天还是明天
// 用于：
//   1. App 启动时恢复调度
//   2. 用户切换开关 / 改时间（SettingsScreen）
//   3. 用户记录心情后（HomeScreen）
//   4. 通知被点击后重新调度（App.tsx）
//   5. 导入数据后（importData）
export async function applyNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    const todayMood = await getTodayMood();
    await scheduleNextReminder(settings, !!todayMood);
  } catch {
    // 查询今日心情失败时，按未记录处理（调度今天，最坏情况是已记录也收到提醒）
    await scheduleNextReminder(settings, false);
  }
}
