import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MoodRecord } from '../types';
import { MOOD_CONFIG, COLORS, SPACING, FONT_SIZE } from '../constants';
import { getDaysInMonth, getFirstDayOfMonth, getWeekdayName, formatDate } from '../utils/dateUtils';

interface MonthViewProps {
  year: number;
  month: number; // 1-12
  records: MoodRecord[];
}

function buildRecordMap(records: MoodRecord[]): Map<string, MoodRecord> {
  const map = new Map<string, MoodRecord>();
  records.forEach(r => map.set(r.date, r));
  return map;
}

export default function MonthView({ year, month, records }: MonthViewProps) {
  const recordMap = buildRecordMap(records);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0=周日
  // 转为周一起始：0=周一, 6=周日
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  // 星期标题
  const weekHeaders = ['一', '二', '三', '四', '五', '六', '日'];

  // 构建日历格子
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // 补齐最后一行
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const today = formatDate(new Date());

  return (
    <View style={styles.container}>
      {/* 星期标题 */}
      <View style={styles.headerRow}>
        {weekHeaders.map((h, i) => (
          <Text key={i} style={styles.weekHeader}>{h}</Text>
        ))}
      </View>

      {/* 日期格子 */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.weekRow}>
          {row.map((day, ci) => {
            if (day === null) {
              return <View key={ci} style={styles.emptyCell} />;
            }

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = recordMap.get(dateStr);
            const moodColor = record ? MOOD_CONFIG[record.mood].color : 'transparent';
            const isToday = dateStr === today;

            return (
              <View key={ci} style={styles.dayCell}>
                <View style={[
                  styles.moodCircle,
                  { backgroundColor: moodColor },
                  isToday && styles.todayCircle,
                ]}>
                  <Text style={[styles.dayText, record ? styles.dayTextRecorded : styles.dayTextEmpty]}>
                    {day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.xs,
  },
  weekHeader: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    width: 36,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 2,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  emptyCell: {
    width: 36,
    height: 36,
  },
  moodCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  dayText: {
    fontSize: FONT_SIZE.xs,
  },
  dayTextRecorded: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  dayTextEmpty: {
    color: COLORS.textSecondary,
  },
});
