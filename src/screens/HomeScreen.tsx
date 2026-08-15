import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, DeviceEventEmitter, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MoodLevel, CalendarView } from '../types';
import { COLORS, SPACING, FONT_SIZE, MOOD_EVENTS } from '../constants';
import { useTodayMood, useMoodRange } from '../hooks/useMood';
import { getStreak } from '../database/moodDB';
import { getWeekRange, getMonthRange, getYearRange, getMonthName, formatDate, getDaysInMonth, isLeapYear, dayOfYear, isSameISOWeek, getMondayOfWeek } from '../utils/dateUtils';
import { applyNotificationSettings } from '../utils/notification';
import { getNotificationSettings } from '../database/moodDB';
import { hapticSuccess, hapticError } from '../utils/haptics';
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
  const scrollRef = useRef<ScrollView>(null);

  // 切换到本 tab 时滚动到顶部
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(MOOD_EVENTS.TAB_FOCUS, ({ tab }: { tab: string }) => {
      if (tab === 'home') {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }
    });
    return () => sub.remove();
  }, []);

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

  // 兜底：APP 从后台回到前台时刷新数据
  // 覆盖小组件后台记录（iOS emit 事件丢失）、外部修改 DB 等场景
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        refreshToday();
        refreshRecords();
        getStreak().then(setStreak).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [refreshToday, refreshRecords]);

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
      // 重新调度通知：已记录今日心情 → 跳过今天，调度明天
      try {
        const settings = await getNotificationSettings();
        await applyNotificationSettings(settings);
      } catch {
        // 重新调度失败静默
      }
      // 更新小组件状态
      await updateMoodWidget();
      // 通知分析页等需要全局统计的页面刷新
      DeviceEventEmitter.emit(MOOD_EVENTS.RECORDED);
      hapticSuccess();
      showToast('已记录今日心情');
    } catch (e) {
      hapticError();
      showToast('记录失败，请重试', 'error');
    }
  }, [recordMood, refreshRecords, refreshToday, showToast, updateMoodWidget]);

  // 兜底：冷启动时事件监听器未就绪，从 AsyncStorage 读取小组件待处理心情
  useEffect(() => {
    if (!dbReady || !handleMoodSelect) return;
    let cancelled = false;
    (async () => {
      try {
        const pending = await AsyncStorage.getItem('pendingWidgetMood');
        if (cancelled || !pending) return;
        if (pending === 'bad' || pending === 'okay' || pending === 'good') {
          await AsyncStorage.removeItem('pendingWidgetMood');
          await handleMoodSelect(pending as MoodLevel);
        }
      } catch {
        // 读取或记录失败静默
      }
    })();
    return () => { cancelled = true; };
  }, [dbReady, handleMoodSelect]);

  // 监听小组件通过 Deep Link 发来的心情记录请求
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('recordMoodFromWidget', ({ mood }: { mood: MoodLevel }) => {
      handleMoodSelect(mood).catch(() => {});
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
    DeviceEventEmitter.emit(MOOD_EVENTS.RECORDED);
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

  // 计算周期记录进度（周/月/年通用）
  const periodProgress = useMemo(() => {
    const now = new Date();
    let total = 0;
    let label = '记录';

    if (calendarView === 'week') {
      label = '本周';
      if (isSameISOWeek(viewDate, now)) {
        const monday = getMondayOfWeek(now);
        const diffMs = now.getTime() - monday.getTime();
        total = Math.floor(diffMs / 86400000) + 1;
      } else {
        total = 7;
      }
    } else if (calendarView === 'month') {
      label = '本月';
      const isCurrentMonth = viewDate.getFullYear() === now.getFullYear()
        && viewDate.getMonth() === now.getMonth();
      if (isCurrentMonth) {
        total = now.getDate();
      } else {
        total = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth() + 1);
      }
    } else {
      label = '今年';
      if (viewDate.getFullYear() === now.getFullYear()) {
        total = dayOfYear(now);
      } else {
        total = isLeapYear(viewDate.getFullYear()) ? 366 : 365;
      }
    }

    const percent = total > 0 ? Math.round((records.length / total) * 100) : 0;
    return { recorded: records.length, total, percent, label };
  }, [calendarView, records, viewDate]);

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
        ref={scrollRef}
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

        {/* 周期记录进度（周/月/年通用） */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{periodProgress.label}记录</Text>
            <Text style={styles.progressValue}>{periodProgress.recorded}/{periodProgress.total}天</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${periodProgress.percent}%` }]} />
          </View>
        </View>

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
          {calendarView === 'year' && <YearView year={viewDate.getFullYear()} records={records} onDatePress={handleDatePress} />}

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
    borderRadius: 16,
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
