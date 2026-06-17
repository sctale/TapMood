import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MoodRecord } from '../types';
import { MOOD_CONFIG, COLORS, SPACING, FONT_SIZE } from '../constants';
import { getMonthName, getDaysInMonth } from '../utils/dateUtils';

interface YearViewProps {
  year: number;
  records: MoodRecord[];
}

function buildRecordMap(records: MoodRecord[]): Map<string, MoodRecord> {
  const map = new Map<string, MoodRecord>();
  records.forEach(r => map.set(r.date, r));
  return map;
}

export default function YearView({ year, records }: YearViewProps) {
  const recordMap = buildRecordMap(records);

  // 12个月的迷你日历
  const months: React.ReactNode[] = [];
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = getDaysInMonth(year, m);
    const firstDay = new Date(year, m - 1, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    // 构建该月的小格子
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(<View key={`e${i}`} style={styles.miniEmptyCell} />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = recordMap.get(dateStr);
      const moodColor = record ? MOOD_CONFIG[record.mood].color : 'transparent';

      cells.push(
        <View
          key={d}
          style={[styles.miniDayCell, { backgroundColor: moodColor }]}
        />
      );
    }

    months.push(
      <View key={m} style={styles.monthBlock}>
        <Text style={styles.monthLabel}>{getMonthName(m)}</Text>
        <View style={styles.miniGrid}>{cells}</View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.yearGrid}>
        {months}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthBlock: {
    width: '31%',
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  miniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  miniDayCell: {
    width: 8,
    height: 8,
    borderRadius: 2,
    margin: 0.5,
  },
  miniEmptyCell: {
    width: 8,
    height: 8,
    margin: 0.5,
  },
});
