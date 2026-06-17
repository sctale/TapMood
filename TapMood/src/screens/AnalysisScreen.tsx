import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { AnalysisPeriod } from '../types';
import { COLORS, SPACING, FONT_SIZE } from '../constants';
import { useMoodStats } from '../hooks/useMood';
import { getWeekRange, getMonthRange, getYearRange } from '../utils/dateUtils';
import MoodPieChart from '../components/MoodPieChart';
import MoodBarChart from '../components/MoodBarChart';

export default function AnalysisScreen() {
  const [period, setPeriod] = useState<AnalysisPeriod>('month');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  const getDateRange = useCallback(() => {
    switch (period) {
      case 'week': return getWeekRange();
      case 'month': return getMonthRange();
      case 'year': return getYearRange();
    }
  }, [period]);

  const { start, end } = getDateRange();
  const { stats, loading } = useMoodStats(start, end);

  const periodTabs: { key: AnalysisPeriod; label: string }[] = [
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
    { key: 'year', label: '本年' },
  ];

  const periodLabel: Record<AnalysisPeriod, string> = {
    week: '本周',
    month: '本月',
    year: '本年',
  };

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

        {/* 图表区域 */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>{periodLabel[period]}心情分布</Text>
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

          {chartType === 'pie' ? (
            <MoodPieChart stats={stats} />
          ) : (
            <MoodBarChart stats={stats} />
          )}
        </View>

        {/* 数据摘要 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据摘要</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>记录天数</Text>
            <Text style={styles.summaryValue}>{stats.total} 天</Text>
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
});
