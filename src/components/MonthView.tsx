import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { MoodRecord } from '../types';
import { MOOD_CONFIG, COLORS, SPACING, FONT_SIZE } from '../constants';
import { getDaysInMonth, getFirstDayOfMonth, formatDate } from '../utils/dateUtils';

interface MonthViewProps {
  year: number;
  month: number; // 1-12
  records: MoodRecord[];
  onDatePress?: (date: string) => void;
}

function buildRecordMap(records: MoodRecord[]): Map<string, MoodRecord> {
  const map = new Map<string, MoodRecord>();
  records.forEach(r => map.set(r.date, r));
  return map;
}

export default React.memo(function MonthView({ year, month, records, onDatePress }: MonthViewProps) {
  const recordMap = buildRecordMap(records);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const weekHeaders = ['一', '二', '三', '四', '五', '六', '日'];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const today = formatDate(new Date());
  // 循环外计算一次（避免每个 cell 重复创建 Date 对象）
  const now = new Date();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {weekHeaders.map((h, i) => (
          <Text key={i} style={styles.weekHeader}>{h}</Text>
        ))}
      </View>

      {rows.map((row, ri) => (
        <View key={ri} style={styles.weekRow}>
          {row.map((day, ci) => {
            if (day === null) {
              return <View key={`empty-${ri}-${ci}`} style={styles.emptyCell} />;
            }

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = recordMap.get(dateStr);
            const isToday = dateStr === today;
            const isFuture = new Date(year, month - 1, day) > now;

            return (
              <TouchableOpacity
                key={dateStr}
                style={styles.dayCell}
                onPress={() => onDatePress?.(dateStr)}
                activeOpacity={0.6}
                disabled={!onDatePress}
              >
                <View style={[
                  styles.moodCircle,
                  record && { backgroundColor: MOOD_CONFIG[record.mood].color },
                  !record && isFuture && { backgroundColor: 'transparent' },
                  isToday && record && styles.todayCircleRecorded,
                  isToday && !record && styles.todayCircleEmpty,
                ]}>
                  <Text style={[
                    styles.dayText,
                    record ? styles.dayTextRecorded : styles.dayTextEmpty,
                    isFuture && styles.dayTextFuture,
                  ]}>
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.sm,
  },
  weekHeader: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    width: 38,
    textAlign: 'center',
    fontWeight: '500',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
  },
  emptyCell: {
    width: 38,
    height: 38,
  },
  moodCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.border, // 默认背景色，被 style 数组中的条件覆盖
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircleRecorded: {
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  todayCircleEmpty: {
    borderWidth: 2,
    borderColor: COLORS.textTertiary,
  },
  dayText: {
    fontSize: FONT_SIZE.xs,
  },
  dayTextRecorded: {
    color: COLORS.text,
    fontWeight: '600',
  },
  dayTextEmpty: {
    color: COLORS.textSecondary,
  },
  dayTextFuture: {
    color: COLORS.textTertiary,
  },
});
