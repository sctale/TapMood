import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import type { AnalysisPeriod } from '../types';
import { COLORS, SPACING, FONT_SIZE, MOOD_EVENTS } from '../constants';
import { useMoodStats } from '../hooks/useMood';
import { getWeekRange, getMonthRange, getYearRange } from '../utils/dateUtils';
import { getStreak, getLongestStreak, getTotalRecordCount } from '../database/moodDB';
import { getMoodTip } from '../utils/moodTips';
import MoodPieChart from '../components/MoodPieChart';
import MoodBarChart from '../components/MoodBarChart';

export default function AnalysisScreen() {
  const [period, setPeriod] = useState<AnalysisPeriod>('month');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  const getDateRange = useCallback(() => {
    switch (period) {
      case 'week': return getWeekRange();
      case 'month': return getMonthRange();
      case 'year': return getYearRange();
    }
  }, [period]);

  const { start, end } = getDateRange();
  const { stats, loading, error } = useMoodStats(start, end);

  // 根据心情比例生成温馨小提示
  const tip = useMemo(() => getMoodTip(stats, period), [stats, period]);

  // 加载全局统计（不受周期影响）
  const loadGlobalStats = useCallback(async () => {
    try {
      const [s, l, t] = await Promise.all([
        getStreak(),
        getLongestStreak(),
        getTotalRecordCount(),
      ]);
      setStreak(s);
      setLongestStreak(l);
      setTotalDays(t);
    } catch {
      // 加载失败静默
    }
  }, []);

  useEffect(() => {
    loadGlobalStats();
  }, [loadGlobalStats]);

  useEffect(() => {
    const subscriptions = [
      DeviceEventEmitter.addListener(MOOD_EVENTS.ANALYSIS_FOCUS, () => {
        loadGlobalStats();
      }),
      DeviceEventEmitter.addListener(MOOD_EVENTS.RECORDED, () => {
        loadGlobalStats();
      }),
    ];
    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, [loadGlobalStats]);

  const periodTabs: { key: AnalysisPeriod; label: string }[] = [
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
    { key: 'year', label: '本年' },
  ];

  // 计算最常见心情
  const mostCommonMood = stats.total > 0
    ? (stats.good >= stats.okay && stats.good >= stats.bad ? '好'
      : stats.okay >= stats.bad ? '中' : '差')
    : '-';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 周期选择 */}
        <View style={styles.section}>
          <View style={styles.periodTabs}>
            {periodTabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.periodTab, period === tab.key && styles.periodTabActive]}
                onPress={() => setPeriod(tab.key)}
              >
                <Text style={[
                  styles.periodTabText,
                  period === tab.key && styles.periodTabTextActive,
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 打卡统计卡片 */}
        <View style={styles.statsCardRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsCardValue}>{streak}</Text>
            <Text style={styles.statsCardLabel}>连续打卡</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsCardValue}>{longestStreak}</Text>
            <Text style={styles.statsCardLabel}>最长连续</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsCardValue}>{totalDays}</Text>
            <Text style={styles.statsCardLabel}>总记录</Text>
          </View>
        </View>

        {/* 图表区域 */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>{periodTabs.find(t => t.key === period)?.label}心情分布</Text>
            <View style={styles.chartToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, chartType === 'pie' && styles.toggleBtnActive]}
                onPress={() => setChartType('pie')}
              >
                <Text style={[styles.toggleText, chartType === 'pie' && styles.toggleTextActive]}>饼图</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, chartType === 'bar' && styles.toggleBtnActive]}
                onPress={() => setChartType('bar')}
              >
                <Text style={[styles.toggleText, chartType === 'bar' && styles.toggleTextActive]}>柱图</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <Text style={styles.emptyText}>加载中...</Text>
          ) : error ? (
            <Text style={styles.emptyText}>{error}</Text>
          ) : stats.total === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyText}>这个周期还没有记录</Text>
              <Text style={styles.emptyHint}>去首页记录今天的心情吧</Text>
            </View>
          ) : chartType === 'pie' ? (
            <MoodPieChart stats={stats} />
          ) : (
            <MoodBarChart stats={stats} />
          )}
        </View>

        {/* 温馨小提示 */}
        {tip && (
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>{tip.emoji}</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipMessage}>{tip.message}</Text>
            </View>
          </View>
        )}

        {/* 数据摘要 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据摘要</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>记录天数</Text>
            <Text style={styles.summaryValue}>{stats.total} 天</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>最常见心情</Text>
            <Text style={styles.summaryValue}>{mostCommonMood}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>心情好的占比</Text>
            <Text style={styles.summaryValue}>
              {stats.total > 0 ? `${Math.round(stats.good / stats.total * 100)}%` : '-'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>心情差的占比</Text>
            <Text style={styles.summaryValue}>
              {stats.total > 0 ? `${Math.round(stats.bad / stats.total * 100)}%` : '-'}
            </Text>
          </View>
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
  statsCardRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  statsCardValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  statsCardLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 3,
  },
  periodTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodTabText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  periodTabTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  chartToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.surface,
    elevation: 1,
  },
  toggleText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surfaceAlt,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  tipEmoji: {
    fontSize: 28,
    marginRight: SPACING.md,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tipMessage: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
