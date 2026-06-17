import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { MoodLevel, CalendarView } from '../types';
import { COLORS, SPACING, FONT_SIZE } from '../constants';
import { useTodayMood, useMoodRange } from '../hooks/useMood';
import { initDatabase } from '../database/moodDB';
import { getWeekRange, getMonthRange, getYearRange, getMonthName, formatDate } from '../utils/dateUtils';
import MoodSelector from '../components/MoodSelector';
import TodayStatus from '../components/TodayStatus';
import WeekView from '../components/WeekView';
import MonthView from '../components/MonthView';
import YearView from '../components/YearView';

export default function HomeScreen() {
  const [dbReady, setDbReady] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [viewDate, setViewDate] = useState(new Date());

  const { mood: todayMood, recordMood } = useTodayMood();

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
    initDatabase().then(() => setDbReady(true));
  }, []);

  const handleMoodSelect = useCallback(async (level: MoodLevel) => {
    await recordMood(level);
    refreshRecords();
  }, [recordMood, refreshRecords]);

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
    setViewDate(new Date());
  }, []);

  // 计算月度完成率
  const monthProgress = useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    const recorded = records.length;
    return { recorded, total: today, percent: today > 0 ? Math.round((recorded / today) * 100) : 0 };
  }, [records]);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
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
      >
        {/* 今日心情区域 */}
        <View style={styles.section}>
          <TodayStatus mood={todayMood?.mood ?? null} streak={0} />
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

          {calendarView === 'week' && <WeekView currentDate={viewDate} records={records} />}
          {calendarView === 'month' && (
            <MonthView year={viewDate.getFullYear()} month={viewDate.getMonth() + 1} records={records} />
          )}
          {calendarView === 'year' && <YearView year={viewDate.getFullYear()} records={records} />}
        </View>
      </ScrollView>
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
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
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
});
