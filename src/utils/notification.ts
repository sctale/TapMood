import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationSettings } from '../types';
import { getTodayMood } from '../database/moodDB';

// Android 通知 channel 配置
const CHANNEL_ID = 'mood_reminder';
const CHANNEL_NAME = '心情提醒';
const CHANNEL_DESCRIPTION = '每天提醒记录心情';

// 预调度未来 N 天的通知，避免 APP 长时间不启动导致通知链断裂
// 7 天后用户大概率会打开 APP 一次，届时会重新预调度下一个 7 天
const SCHEDULE_DAYS = 7;

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

// 计算未来 N 天的提醒时间列表
// 规则：
//   - 今天：已记录心情 或 已过提醒时间 → 跳过（不补发）
//   - 未来 6 天：都加入调度列表
function getNextTriggerDates(settings: NotificationSettings, hasTodayMood: boolean): Date[] {
  const now = new Date();
  const dates: Date[] = [];
  // 今天的提醒时间点
  const todayTrigger = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(),
    settings.hour, settings.minute ?? 0, 0, 0
  );

  for (let i = 0; i < SCHEDULE_DAYS; i++) {
    const date = new Date(todayTrigger);
    date.setDate(date.getDate() + i);

    // 今天：已记录心情 或 已过提醒时间 → 跳过
    if (i === 0 && (hasTodayMood || now.getTime() >= date.getTime())) {
      continue;
    }
    dates.push(date);
  }
  return dates;
}

// 核心调度函数：预调度未来 7 天的一次性通知
// 解决 v0.3.40 的通知链断裂问题（用户不点通知/不开 APP 时次日无提醒）
export async function scheduleNextReminders(
  settings: NotificationSettings,
  hasTodayMood: boolean
): Promise<void> {
  try {
    await ensureNotificationChannel();
    // 清空旧的所有调度（确保只有最新一批待触发通知）
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!settings.enabled) return;

    const dates = getNextTriggerDates(settings, hasTodayMood);
    for (const date of dates) {
      await Notifications.scheduleNotificationAsync({
        identifier: `mood_reminder_${date.toISOString()}`,
        content: NOTIFICATION_CONTENT,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
    }
  } catch {
    // 调度失败不影响主流程
  }
}

// 单点入口：应用通知设置
// 内部自动查询今日心情状态，决定调度方案（今天已记录则跳过今天）
// 用于：
//   1. App 启动时恢复调度
//   2. 用户切换开关 / 改时间（SettingsScreen）
//   3. 用户记录心情后（HomeScreen）
//   4. 通知被点击后重新调度（App.tsx）
//   5. 导入数据后（importData）
export async function applyNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    const todayMood = await getTodayMood();
    await scheduleNextReminders(settings, !!todayMood);
  } catch {
    // 查询今日心情失败时，按未记录处理（调度今天，最坏情况是已记录也收到提醒）
    await scheduleNextReminders(settings, false);
  }
}
