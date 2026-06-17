import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { MoodLevel, CalendarView } from '../types';
import { COLORS, SPACING, FONT_SIZE } from '../constants';
import { useTodayMood, useMoodRange } from '../hooks/useMood';
import { initDatabase } from '../database/moodDB';
import { getWeekRange, getMonthRange, getYearRange, getMonthName, addDays } from '../utils/dateUtils';
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

  // 根据视图获取日期范围
  const getDateRange = useCallback(() => {
    switch (calendarView) {
      case 'week': return getWeekRange(viewDate);
      case 'month': return getMonthRange(viewDate);
      case 'year': return getYearRange(viewDate);
    }
  }, [calendarView, viewDate]);

  const { start, end } = getDateRange();
  const { records, refresh: refreshRecords } = useMoodRange(start, end);

  // 初始化数据库
  useEffect(() => {
    initDatabase().then(() => setDbReady(true));
  }, []);

  // 记录心情后刷新日历
  const handleMoodSelect = useCallback(async (level: MoodLevel) => {
    await recordMood(level);
    refreshRecords();
  }, [recordMood, refreshRecords]);

  // 日期导航：前进/后退
  const navigateDate = useCallback((direction: -1 | 1) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      switch (calendarView) {
        case 'week':
          next.setDate(next.getDate() + direction * 7);
          break;
        case 'month':
          next.setMonth(next.getMonth() + direction);
          break;
        case 'year':
          next.setFullYear(next.getFullYear() + direction);
          break;
      }
      return next;
    });
  }, [calendarView]);

  // 回到今天
  const goToday = useCallback(() => {
    setViewDate(new Date());
  }, []);

  // 切换视图时重置到今天
  const handleViewChange = useCallback((view: CalendarView) => {
    setCalendarView(view);
    setViewDate(new Date());
  }, []);

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

  // 标题文字
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
          <TodayStatus mood={todayMood?.mood ?? null} />
          <MoodSelector onMoodSelect={handleMoodSelect} selectedMood={todayMood?.mood} />
        </View>

        {/* 日历视图区域 */}
        <View style={styles.section}>
          {/* 视图切换标签 */}
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

          {/* 日期导航 */}
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

          {/* 日历内容 */}
          {calendarView === 'week' && (
            <WeekView currentDate={viewDate} records={records} />
          )}
          {calendarView === 'month' && (
            <MonthView
              year={viewDate.getFullYear()}
              month={viewDate.getMonth() + 1}
              records={records}
            />
          )}
          {calendarView === 'year' && (
            <YearView year={viewDate.getFullYear()} records={records} />
          )}
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
    borderRadius: 16,
    padding: SPACING.lg,
  },
  viewTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 3,
    marginBottom: SPACING.md,
  },
  viewTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewTabActive: {
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
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
  },
});
