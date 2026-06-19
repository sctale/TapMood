import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, DeviceEventEmitter } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { MoodLevel, CalendarView } from '../types';
import { COLORS, SPACING, FONT_SIZE } from '../constants';
import { useTodayMood, useMoodRange } from '../hooks/useMood';
import { getStreak } from '../database/moodDB';
import { getWeekRange, getMonthRange, getYearRange, getMonthName, formatDate, getDaysInMonth } from '../utils/dateUtils';
import { updateMoodWidget } from '../widgets/MoodWidget';
import MoodSelector from '../components/MoodSelector';
import TodayStatus from '../components/TodayStatus';
import WeekView from '../components/WeekView';
import MonthView from '../components/MonthView';
import YearView from '../components/YearView';
import DateMoodModal from '../components/DateMoodModal';
import Toast, { type ToastType } from '../components/Toast';

export default function HomeScreen() {
  const [dbReady, setDbReady] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [viewDate, setViewDate] = useState(new Date());
  const [streak, setStreak] = useState(0);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as ToastType });

  const { mood: todayMood, recordMood, refresh: refreshToday } = useTodayMood();

  const getDateRange = useCallback(() => {
    switch (calendarView) {
      case 'week': return getWeekRange(viewDate);
      case 'month': return getMonthRange(viewDate);
      case 'year': return getYearRange(viewDate);
    }
  }, [calendarView, viewDate]);

  const { start, end } = getDateRange();
  const { records, refresh: refreshRecords } = useMoodRange(start, end);

  useEffect(() => {
    (async () => {
      // 数据库已在 App.tsx 中初始化，这里直接标记就绪并加载连续打卡
      setDbReady(true);
      const s = await getStreak();
      setStreak(s);
    })();
  }, []);

  // 显示Toast提示
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleMoodSelect = useCallback(async (level: MoodLevel) => {
    try {
      const result = await recordMood(level);
      if (!result) return; // 防重复点击跳过，不显示提示
      refreshRecords();
      refreshToday();
      const s = await getStreak();
      setStreak(s);
      // 更新小组件状态
      await updateMoodWidget();
      showToast('已记录今日心情');
    } catch (e) {
      showToast('记录失败，请重试', 'error');
    }
  }, [recordMood, refreshRecords, refreshToday, showToast]);

  // 监听小组件通过 Deep Link 发来的心情记录请求
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('recordMoodFromWidget', async ({ mood }: { mood: MoodLevel }) => {
      handleMoodSelect(mood);
    });
    return () => subscription.remove();
  }, [handleMoodSelect]);

  // 点击日历日期，弹出补记Modal
  const handleDatePress = useCallback((date: string) => {
    setModalDate(date);
  }, []);

  // Modal中记录成功后刷新
  const handleModalRecorded = useCallback(async () => {
    refreshRecords();
    refreshToday();
    const s = await getStreak();
    setStreak(s);
    showToast('已保存');
  }, [refreshRecords, refreshToday, showToast]);

  const navigateDate = useCallback((direction: -1 | 1) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      switch (calendarView) {
        case 'week': next.setDate(next.getDate() + direction * 7); break;
        case 'month': next.setMonth(next.getMonth() + direction); break;
        case 'year': next.setFullYear(next.getFullYear() + direction); break;
      }
      return next;
    });
  }, [calendarView]);

  const goToday = useCallback(() => { setViewDate(new Date()); }, []);

  const handleViewChange = useCallback((view: CalendarView) => {
    setCalendarView(view);
  }, []);

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshRecords(), refreshToday()]);
      const s = await getStreak();
      setStreak(s);
    } catch {
      // 刷新失败静默
    } finally {
      setRefreshing(false);
    }
  }, [refreshRecords, refreshToday]);

  // 计算月度完成率
  const monthProgress = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = viewDate.getFullYear() === now.getFullYear()
      && viewDate.getMonth() === now.getMonth();
    if (!isCurrentMonth) {
      const totalDays = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth() + 1);
      return { recorded: records.length, total: totalDays, percent: totalDays > 0 ? Math.round((records.length / totalDays) * 100) : 0 };
    }
    const today = now.getDate();
    return { recorded: records.length, total: today, percent: today > 0 ? Math.round((records.length / today) * 100) : 0 };
  }, [records, viewDate]);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <View style={styles.loadingEmoji}>🌿</View>
          <Text style={styles.loadingText}>正在准备你的心情空间...</Text>
        </View>
      </View>
    );
  }

  const viewTabs: { key: CalendarView; label: string }[] = [
    { key: 'week', label: '周' },
    { key: 'month', label: '月' },
    { key: 'year', label: '年' },
  ];

  const calendarTitle = calendarView === 'year'
    ? `${viewDate.getFullYear()}年`
    : `${viewDate.getFullYear()}年${getMonthName(viewDate.getMonth() + 1)}`;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.textSecondary}
            colors={[COLORS.textSecondary]}
          />
        }
      >
        {/* 今日心情区域 */}
        <View style={styles.section}>
          <TodayStatus mood={todayMood?.mood ?? null} streak={streak} />
          <MoodSelector onMoodSelect={handleMoodSelect} selectedMood={todayMood?.mood} />
        </View>

        {/* 月度进度 */}
        {calendarView === 'month' && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>本月记录</Text>
              <Text style={styles.progressValue}>{monthProgress.recorded}/{monthProgress.total}天</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${monthProgress.percent}%` }]} />
            </View>
          </View>
        )}

        {/* 日历视图区域 */}
        <View style={styles.section}>
          <View style={styles.viewTabs}>
            {viewTabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.viewTab, calendarView === tab.key && styles.viewTabActive]}
                onPress={() => handleViewChange(tab.key)}
              >
                <Text style={[
                  styles.viewTabText,
                  calendarView === tab.key && styles.viewTabTextActive,
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dateNav}>
            <TouchableOpacity onPress={() => navigateDate(-1)} style={styles.navBtn}>
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToday} style={styles.titleBtn}>
              <Text style={styles.calendarTitle}>{calendarTitle}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigateDate(1)} style={styles.navBtn}>
              <Text style={styles.navBtnText}>›</Text>
            </TouchableOpacity>
          </View>

          {calendarView === 'week' && <WeekView currentDate={viewDate} records={records} onDatePress={handleDatePress} />}
          {calendarView === 'month' && (
            <MonthView year={viewDate.getFullYear()} month={viewDate.getMonth() + 1} records={records} onDatePress={handleDatePress} />
          )}
          {calendarView === 'year' && <YearView year={viewDate.getFullYear()} records={records} />}

          {/* 日历操作提示 */}
          <Text style={styles.calendarHint}>点击日期可补记或修改心情</Text>
        </View>
      </ScrollView>

      {/* 日期补记Modal */}
      <DateMoodModal
        visible={modalDate !== null}
        date={modalDate}
        onClose={() => setModalDate(null)}
        onRecorded={handleModalRecorded}
      />

      {/* Toast提示 */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
  },
  loadingCard: {
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 20,
    padding: SPACING.lg,
  },
  progressSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: 20,
    padding: SPACING.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  progressLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  progressValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.good,
    borderRadius: 3,
  },
  viewTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 3,
    marginBottom: SPACING.md,
  },
  viewTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  viewTabActive: {
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  viewTabText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  viewTabTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 28,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  titleBtn: {
    flex: 1,
    alignItems: 'center',
  },
  calendarTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  calendarHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
