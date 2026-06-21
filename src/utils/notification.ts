import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationSettings } from '../types';

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
// 不主动调用：系统会按需创建默认 channel，但用户无法改名称/声音
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

// 单点入口：应用通知设置
// 用于：
//   1. App 启动时恢复（DB 已启用但系统侧 schedule 被清空）
//   2. 用户切换开关 / 改时间（SettingsScreen）
//   3. 导入数据后（importData）
export async function applyNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await ensureNotificationChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!settings.enabled) return;

    await Notifications.scheduleNotificationAsync({
      content: NOTIFICATION_CONTENT,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute ?? 0,
      },
    });
  } catch {
    // 调度失败不影响主流程
  }
}

// 取消当日剩余心情提醒（用户提前记录心情后调用）
// 只取消 type='mood_reminder' 且下一次触发日期是今日的通知，不影响其他类型
export async function cancelTodayReminder(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const todayStr = formatDate(new Date());

    for (const notif of scheduled) {
      if (notif.content.data?.type !== 'mood_reminder') continue;

      // DAILY trigger 的下一次触发日期在 trigger.nextTriggerDate（数字或字符串）
      const trigger: any = notif.trigger;
      const nextTimestamp: number | undefined =
        typeof trigger?.nextTriggerDate === 'number'
          ? trigger.nextTriggerDate
          : trigger?.date
            ? new Date(trigger.date).getTime()
            : undefined;

      if (!nextTimestamp) continue;

      const triggerDayStr = formatDate(new Date(nextTimestamp));
      if (triggerDayStr === todayStr) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch {
    // 取消失败不影响主流程
  }
}

// 本地 YYYY-MM-DD（不依赖 dateUtils 避免循环依赖）
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}