import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Modal, Pressable, ScrollView, TextInput, Linking, DeviceEventEmitter, Platform as RNPlatform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import Svg, { Path, Circle, Polyline, Ellipse, Rect } from 'react-native-svg';
import { COLORS, SPACING, MOOD_EVENTS } from '../constants';
import type { NotificationSettings } from '../types';
import { getNotificationSettings, saveNotificationSettings, getTotalRecordCount, getDatabaseSize } from '../database/moodDB';
import { exportMoodData } from '../utils/exportData';
import { pickAndImportData, type ImportStrategy } from '../utils/importData';
import { applyNotificationSettings } from '../utils/notification';
import TimeWheelPicker from '../components/TimeWheelPicker';
import Toast from '../components/Toast';

// 平台特定小组件模块（与 App.tsx 相同模式），导入后刷新小组件用
const widgetModule = RNPlatform.select({
  ios: () => require('../widgets/MoodWidget.ios'),
  android: () => require('../widgets/MoodWidget.android'),
  default: () => require('../widgets/MoodWidget'),
})();
const { updateMoodWidget } = widgetModule as { updateMoodWidget: () => Promise<void> };

// 注意：setNotificationHandler 已移至 App.tsx 全局设置（支持智能跳过已记录的提醒）

// === 内联 SVG 图标组件（参考 TabBar.tsx 内联 SVG 模式）===

// 铃铛 18×18（每日提醒）
function BellIcon() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
        stroke="#81C784"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
        stroke="#81C784"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 时钟 18×18（提醒时间）
function ClockIcon() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke="#FFB74D" fill="none" strokeWidth={2} />
      <Polyline
        points="12 6 12 12 16 14"
        stroke="#FFB74D"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 数据库 18×18（已记录天数）
function DatabaseIcon() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Ellipse cx="12" cy="5" rx="9" ry="3" stroke="#7986CB" fill="none" strokeWidth={2} />
      <Path
        d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"
        stroke="#7986CB"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"
        stroke="#7986CB"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 锁 16×16（隐私说明）
function LockIcon() {
  return (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="11"
        width="18"
        height="11"
        rx={2}
        ry={2}
        stroke={COLORS.textSecondary}
        fill="none"
        strokeWidth={2}
      />
      <Path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        stroke={COLORS.textSecondary}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 邮件 18×18
function MailIcon() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="2" stroke="#81C784" fill="none" strokeWidth={2} />
      <Path d="M2 6l10 7L22 6" stroke="#81C784" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function SettingsScreen() {
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationHour, setNotificationHour] = useState(21);
  const [notificationMinute, setNotificationMinute] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  // 切换到本 tab 时滚动到顶部
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(MOOD_EVENTS.TAB_FOCUS, ({ tab }: { tab: string }) => {
      if (tab === 'settings') {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }
    });
    return () => sub.remove();
  }, []);
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
  const [dbSizeBytes, setDbSizeBytes] = useState(0);
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
        const sizeBytes = await getDatabaseSize();
        setDbSizeBytes(sizeBytes);
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

  // 格式化数据库大小（字节 → KB，保留 1 位小数）
  const dbSizeLabel = dbSizeBytes > 0 ? ` · ${(dbSizeBytes / 1024).toFixed(1)} KB` : '';

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

  // 隐藏 Toast（useCallback 稳定引用，避免 Toast 的 useEffect 因 onHide 变化重置定时器）
  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

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

    // 刷新总记录数和数据库大小（数据库变了）
    try {
      const count = await getTotalRecordCount();
      setTotalRecords(count);
      const sizeBytes = await getDatabaseSize();
      setDbSizeBytes(sizeBytes);
    } catch {
      // 刷新失败静默
    }

    // 刷新小组件（导入可能改变今日记录/replace 清空今日，小组件需同步）
    try {
      await updateMoodWidget();
    } catch {
      // 小组件刷新失败静默
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* 1. 提醒设置卡片 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>提醒设置</Text>

          {/* 每日提醒 row */}
          <View style={[styles.row, styles.rowFirst]}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.goodBg }]}>
              <BellIcon />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>每日提醒</Text>
              <Text style={styles.rowDesc}>每天定时提醒记录心情</Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={toggleNotification}
              trackColor={{ false: COLORS.borderSubtle, true: COLORS.good }}
              thumbColor={COLORS.surface}
              disabled={loading}
            />
          </View>

          {/* 提醒时间 row（仅在 notificationEnabled 时显示） */}
          {notificationEnabled && (
            <TouchableOpacity style={styles.row} onPress={() => setTimePickerVisible(true)} activeOpacity={0.6}>
              <View style={[styles.rowIcon, { backgroundColor: COLORS.surfaceAlt }]}>
                <ClockIcon />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>提醒时间</Text>
              </View>
              <View style={styles.timeValueWrap}>
                <Text style={styles.timeValue}>{timeLabel}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* 2. 数据管理卡片 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>数据管理</Text>

          <View style={[styles.row, styles.rowFirst]}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.badBg }]}>
              <DatabaseIcon />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>已记录天数</Text>
              <Text style={styles.rowDesc}>共 {totalRecords} 天的心情数据{dbSizeLabel}</Text>
            </View>
          </View>

          {/* 按钮组 - 横向并排 */}
          <View style={styles.btnGroup}>
            <TouchableOpacity
              style={styles.btnOutlined}
              onPress={handleExport}
              disabled={exporting || importing || totalRecords === 0}
              activeOpacity={0.7}
            >
              <Text style={styles.btnOutlinedText}>{exporting ? '导出中...' : '导出数据'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnFilled}
              onPress={handleImport}
              disabled={exporting || importing}
              activeOpacity={0.7}
            >
              <Text style={styles.btnFilledText}>{importing ? '导入中...' : '导入数据'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.exportHint}>
            JSON 格式包含心情记录与通知设置，可跨设备恢复
          </Text>
        </View>

        {/* 3. 关于卡片 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>关于</Text>

          <View style={[styles.row, styles.rowFirst]}>
            <View style={styles.rowInfo}>
              <Text style={styles.appName}>一点心情 TapMood</Text>
            </View>
            <View style={styles.versionPill}>
              <Text style={styles.versionPillText}>v{appVersion}</Text>
            </View>
          </View>

          {/* 反馈邮箱 row */}
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL('mailto:feedback@tapmood.app?subject=TapMood%20反馈').catch(() => Alert.alert('打开失败', '未找到邮件应用'))}
            activeOpacity={0.6}
          >
            <View style={[styles.rowIcon, { backgroundColor: COLORS.goodBg }]}>
              <MailIcon />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>反馈与建议</Text>
              <Text style={styles.rowDesc}>你的想法对我很重要</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* 隐私说明 row（保留原样，无跳转） */}
          <View style={styles.privacyRow}>
            <LockIcon />
            <Text style={styles.privacyText}>
              所有数据仅存储在本地设备，不会上传至任何服务器。
            </Text>
          </View>

          <Text style={styles.footer}>用 ❤️ 为你打造</Text>
        </View>

      </ScrollView>

      {/* 时间选择 Modal - 保持原逻辑 */}
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

      {/* 替换确认 Modal - 保持原逻辑 */}
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
        onHide={hideToast}
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
  // 卡片
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    // shadow-card 替代
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  // row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  rowDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // 时间值
  timeValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeValue: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  chevron: {
    fontSize: 22,
    color: COLORS.textTertiary,
    marginTop: -4,
  },
  // linkRow = row 的语义别名（关于卡片链接行）
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  // 横向按钮组
  btnGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  btnOutlined: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface, // 必须实色，否则 RN Android 圆角失效
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlinedText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.accent,
  },
  btnFilled: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnFilledText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.surface,
  },
  exportHint: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  // 关于卡片
  appName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  versionPill: {
    backgroundColor: COLORS.bgAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  versionPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  footer: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingTop: 8,
  },
  // === Modal 样式保持原状 ===
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  timePickerModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  pickerClose: {
    fontSize: 15,
    color: COLORS.accent,
    fontWeight: '600',
  },
  wheelPickerWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  confirmModal: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 32,
    borderRadius: 16,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  confirmInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: COLORS.background,
  },
  confirmBtnCancelText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  confirmBtnDanger: {
    backgroundColor: '#E57373',
  },
  confirmBtnDangerText: {
    fontSize: 15,
    color: COLORS.surface,
    fontWeight: '600',
  },
});
