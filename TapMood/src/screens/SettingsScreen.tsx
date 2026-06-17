import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import { COLORS, SPACING, FONT_SIZE } from '../constants';

// 配置通知处理器
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function SettingsScreen() {
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationHour, setNotificationHour] = useState(21);
  const [hasPermission, setHasPermission] = useState(false);

  // 检查通知权限
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // 请求通知权限
  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };

  // 切换通知开关
  const toggleNotification = async (value: boolean) => {
    if (value) {
      const granted = hasPermission || await requestPermission();
      if (!granted) return;
      await scheduleDailyReminder(notificationHour);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    setNotificationEnabled(value);
  };

  // 调整提醒时间
  const adjustTime = (delta: number) => {
    const newHour = Math.max(0, Math.min(23, notificationHour + delta));
    setNotificationHour(newHour);
    if (notificationEnabled) {
      scheduleDailyReminder(newHour);
    }
  };

  // 设置每日提醒
  const scheduleDailyReminder = async (hour: number) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '记录今天的心情',
        body: '点击快速记录你的心情吧',
        data: { type: 'mood_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>提醒设置</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>每日提醒</Text>
            <Text style={styles.settingDesc}>每天定时提醒记录心情</Text>
          </View>
          <Switch
            value={notificationEnabled}
            onValueChange={toggleNotification}
            trackColor={{ false: COLORS.border, true: COLORS.good }}
            thumbColor={COLORS.surface}
          />
        </View>

        {notificationEnabled && (
          <View style={styles.timeRow}>
            <Text style={styles.settingLabel}>提醒时间</Text>
            <View style={styles.timeControl}>
              <TouchableOpacity onPress={() => adjustTime(-1)} style={styles.timeBtn}>
                <Text style={styles.timeBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.timeDisplay}>
                {String(notificationHour).padStart(2, '0')}:00
              </Text>
              <TouchableOpacity onPress={() => adjustTime(1)} style={styles.timeBtn}>
                <Text style={styles.timeBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>一点心情 TapMood</Text>
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingDesc}>所有数据仅存储在本地设备，不会上传至任何服务器。</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  settingDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  timeControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    fontWeight: '600',
  },
  timeDisplay: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: SPACING.md,
    minWidth: 60,
    textAlign: 'center',
  },
  versionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
});
