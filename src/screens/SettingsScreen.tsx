import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { COLORS, SPACING, FONT_SIZE } from '../constants';
import type { NotificationSettings } from '../types';
import { getNotificationSettings, saveNotificationSettings, getTotalRecordCount } from '../database/moodDB';
import { exportMoodData } from '../utils/exportData';
import { pickAndImportData, type ImportStrategy } from '../utils/importData';
import { applyNotificationSettings } from '../utils/notification';
import TimeWheelPicker from '../components/TimeWheelPicker';
import Toast from '../components/Toast';

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
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [confirmReplaceVisible, setConfirmReplaceVisible] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

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
      }
      setNotificationEnabled(value);
      await saveNotificationSettings({ enabled: value, hour: notificationHour, minute: notificationMinute });
      await applyNotificationSettings({ enabled: value, hour: notificationHour, minute: notificationMinute });
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
        await saveNotificationSettings({ enabled: true, hour, minute });
        await applyNotificationSettings({ enabled: true, hour, minute });
      } catch {
        // 调度失败静默处理
      }
    }
  };

  // 从 expo-constants 读取版本号，与 package.json/app.json 保持一致
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  // 格式化时间显示
  const timeLabel = `${String(notificationHour).padStart(2, '0')}:${String(notificationMinute).padStart(2, '0')}`;

  // 导出数据（JSON 格式）
  const handleExport = async () => {
    if (exporting) return;
    if (totalRecords === 0) {
      Alert.alert('提示', '暂无数据可导出');
      return;
    }
    setExporting(true);
    const result = await exportMoodData();
    setExporting(false);
    if (!result.success) {
      Alert.alert('导出失败', result.error ?? '请稍后重试');
    }
  };

  // 显示 Toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  // 导入数据：先选策略，再选文件
  const handleImport = () => {
    if (importing) return;
    Alert.alert(
      '选择导入策略',
      '合并：保留现有数据，仅追加新日期\n替换：清空现有数据，全部替换（不可恢复）',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '合并',
          onPress: () => doImport('merge'),
        },
        {
          text: '替换',
          style: 'destructive',
          onPress: () => confirmReplaceAndImport(),
        },
      ]
    );
  };

  // 替换策略二次确认：弹一个输入框让用户输入"替换"
  const confirmReplaceAndImport = () => {
    setConfirmInput('');
    setConfirmReplaceVisible(true);
  };

  const submitReplaceConfirm = () => {
    if (confirmInput !== '替换') {
      showToast('输入不正确，已取消', 'info');
      setConfirmReplaceVisible(false);
      setConfirmInput('');
      return;
    }
    setConfirmReplaceVisible(false);
    setConfirmInput('');
    doImport('replace');
  };

  // 执行导入
  const doImport = async (strategy: ImportStrategy) => {
    setImporting(true);
    const result = await pickAndImportData(strategy);
    setImporting(false);

    if (result.cancelled) return;

    if (!result.success) {
      showToast(result.error ?? '导入失败', 'error');
      return;
    }

    if (strategy === 'replace') {
      showToast(`已替换为 ${result.imported} 条记录`, 'success');
    } else {
      showToast(`合并成功，共 ${result.imported} 条`, 'success');
    }

    // 刷新总记录数（数据库变了）
    try {
      const count = await getTotalRecordCount();
      setTotalRecords(count);
    } catch {
      // 刷新失败静默
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
            disabled={exporting || importing || totalRecords === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.exportBtnText}>
              {exporting ? '导出中...' : '导出数据'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, styles.importBtn]}
            onPress={handleImport}
            disabled={exporting || importing}
            activeOpacity={0.7}
          >
            <Text style={styles.importBtnText}>
              {importing ? '导入中...' : '导入数据'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.exportHint}>
            JSON 包含心情记录与通知设置，可完整恢复
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

      {/* 替换确认 Modal（跨平台替代 Alert.prompt） */}
      <Modal visible={confirmReplaceVisible} transparent animationType="fade" onRequestClose={() => setConfirmReplaceVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setConfirmReplaceVisible(false)}>
          <Pressable style={styles.confirmModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmTitle}>确认替换</Text>
            <Text style={styles.confirmDesc}>
              此操作将清空现有所有记录，且不可恢复。{'\n'}请输入"替换"二字以确认。
            </Text>
            <TextInput
              style={styles.confirmInput}
              value={confirmInput}
              onChangeText={setConfirmInput}
              placeholder="替换"
              placeholderTextColor={COLORS.textTertiary}
              autoFocus
              maxLength={10}
            />
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnCancel]}
                onPress={() => {
                  setConfirmReplaceVisible(false);
                  setConfirmInput('');
                }}
              >
                <Text style={styles.confirmBtnCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnDanger]}
                onPress={submitReplaceConfirm}
              >
                <Text style={styles.confirmBtnDangerText}>确认替换</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
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
  importBtn: {
    backgroundColor: COLORS.accent,
  },
  importBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.surface,
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
  // 替换确认 Modal
  confirmModal: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  confirmTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  confirmDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  confirmInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: COLORS.background,
  },
  confirmBtnCancelText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  confirmBtnDanger: {
    backgroundColor: '#E57373',
  },
  confirmBtnDangerText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.surface,
    fontWeight: '600',
  },
});
