import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Modal, Pressable, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { COLORS, SPACING, FONT_SIZE } from '../constants';
import type { NotificationSettings } from '../types';
import { getNotificationSettings, saveNotificationSettings, getTotalRecordCount } from '../database/moodDB';
import { exportMoodDataAsCSV } from '../utils/exportData';
import TimeWheelPicker from '../components/TimeWheelPicker';

// 注意：setNotificationHandler 已移至 App.tsx 全局设置（支持智能跳过已记录的提醒）

export default function SettingsScreen() {
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationHour, setNotificationHour] = useState(21);
  const [notificationMinute, setNotificationMinute] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerHour, setPickerHour] = useState(notificationHour);
  const [pickerMinute, setPickerMinute] = useState(notificationMinute);

  // 打开时间选择器时同步当前已保存的时间
  useEffect(() => {
    if (timePickerVisible) {
      setPickerHour(notificationHour);
      setPickerMinute(notificationMinute);
    }
  }, [timePickerVisible, notificationHour, notificationMinute]);

  const [totalRecords, setTotalRecords] = useState(0);
  const [exporting, setExporting] = useState(false);

  // 初始化：加载持久化设置 + 检查权限
  useEffect(() => {
    (async () => {
      try {
        const settings = await getNotificationSettings();
        setNotificationEnabled(settings.enabled);
        setNotificationHour(settings.hour);
        setNotificationMinute(settings.minute ?? 0);
        const { status } = await Notifications.getPermissionsAsync();
        setHasPermission(status === 'granted');
        const count = await getTotalRecordCount();
        setTotalRecords(count);
      } catch {
        // 加载失败使用默认值
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 请求通知权限
  const requestPermission = async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };

  // 切换通知开关
  const toggleNotification = async (value: boolean) => {
    try {
      if (value) {
        const granted = hasPermission || await requestPermission();
        if (!granted) {
          Alert.alert('权限不足', '请在系统设置中允许通知权限');
          return;
        }
        await scheduleDailyReminder(notificationHour, notificationMinute);
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
      setNotificationEnabled(value);
      await saveNotificationSettings({ enabled: value, hour: notificationHour, minute: notificationMinute });
    } catch {
      Alert.alert('操作失败', '请稍后重试');
    }
  };

  // 选择提醒时间
  const handleTimeSelect = async (hour: number, minute: number) => {
    setNotificationHour(hour);
    setNotificationMinute(minute);
    setTimePickerVisible(false);
    if (notificationEnabled) {
      try {
        await scheduleDailyReminder(hour, minute);
        await saveNotificationSettings({ enabled: true, hour, minute });
      } catch {
        // 调度失败静默处理
      }
    }
  };

  // 设置每日提醒
  const scheduleDailyReminder = async (hour: number, minute: number) => {
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
        minute,
      },
    });
  };

  // 从 expo-constants 读取版本号，与 package.json/app.json 保持一致
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  // 格式化时间显示
  const timeLabel = `${String(notificationHour).padStart(2, '0')}:${String(notificationMinute).padStart(2, '0')}`;

  // 导出数据
  const handleExport = async () => {
    if (exporting) return;
    if (totalRecords === 0) {
      Alert.alert('提示', '暂无数据可导出');
      return;
    }
    setExporting(true);
    const result = await exportMoodDataAsCSV();
    setExporting(false);
    if (!result.success) {
      Alert.alert('导出失败', result.error ?? '请稍后重试');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
              disabled={loading}
            />
          </View>

          {notificationEnabled && (
            <TouchableOpacity
              style={styles.timeRow}
              onPress={() => setTimePickerVisible(true)}
              activeOpacity={0.6}
            >
              <Text style={styles.settingLabel}>提醒时间</Text>
              <View style={styles.timeDisplayWrap}>
                <Text style={styles.timeDisplay}>{timeLabel}</Text>
                <Text style={styles.timeArrow}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据管理</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>已记录天数</Text>
              <Text style={styles.settingDesc}>共 {totalRecords} 天的心情数据</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExport}
            disabled={exporting || totalRecords === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.exportBtnText}>
              {exporting ? '导出中...' : '导出为CSV'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.exportHint}>
            导出后可通过分享保存到任意位置，换机不丢数据
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>一点心情 TapMood</Text>
            <Text style={styles.versionText}>v{appVersion}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingDesc}>所有数据仅存储在本地设备，不会上传至任何服务器。</Text>
          </View>
        </View>
      </ScrollView>

      {/* 时间选择Modal */}
      <Modal visible={timePickerVisible} transparent animationType="slide" onRequestClose={() => setTimePickerVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setTimePickerVisible(false)}>
          <Pressable style={styles.timePickerModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>选择提醒时间</Text>
              <TouchableOpacity onPress={() => handleTimeSelect(pickerHour, pickerMinute)}>
                <Text style={styles.pickerClose}>完成</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.wheelPickerWrap}>
              <TimeWheelPicker
                hour={pickerHour}
                minute={pickerMinute}
                onChange={(h, m) => {
                  setPickerHour(h);
                  setPickerMinute(m);
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
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
  timeDisplayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeDisplay: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  timeArrow: {
    fontSize: 22,
    color: COLORS.textTertiary,
    marginLeft: SPACING.xs,
  },
  versionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  exportBtn: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  exportBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.accent,
    fontWeight: '600',
  },
  exportHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  // 时间选择Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  timePickerModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  pickerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  pickerClose: {
    fontSize: FONT_SIZE.md,
    color: COLORS.accent,
    fontWeight: '600',
  },
  wheelPickerWrap: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
});
