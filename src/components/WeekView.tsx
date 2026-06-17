import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { MoodRecord } from '../types';
import { MOOD_CONFIG, COLORS, SPACING, FONT_SIZE } from '../constants';
import { getWeekdayName, addDays, formatDate } from '../utils/dateUtils';

interface WeekViewProps {
  currentDate: Date;
  records: MoodRecord[];
  onDatePress?: (date: string) => void;
}

// 将记录转为按日期索引的Map
function buildRecordMap(records: MoodRecord[]): Map<string, MoodRecord> {
  const map = new Map<string, MoodRecord>();
  records.forEach(r => map.set(r.date, r));
  return map;
}

export default function WeekView({ currentDate, records, onDatePress }: WeekViewProps) {
  const recordMap = buildRecordMap(records);

  // 计算本周7天
  const day = currentDate.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - diff);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(monday, i));
  }

  return (
    <View style={styles.container}>
      {/* 星期标题行 */}
      <View style={styles.headerRow}>
        {days.map((d, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {getWeekdayName(d.getDay())}
          </Text>
        ))}
      </View>

      {/* 日期和心情色块行 */}
      <View style={styles.dayRow}>
        {days.map((d, i) => {
          const dateStr = formatDate(d);
          const record = recordMap.get(dateStr);
          const moodColor = record ? MOOD_CONFIG[record.mood].color : COLORS.border;
          const isToday = dateStr === formatDate(new Date());

          return (
            <TouchableOpacity
              key={i}
              style={styles.dayCell}
              onPress={() => onDatePress?.(dateStr)}
              activeOpacity={0.6}
              disabled={!onDatePress}
            >
              <View style={[styles.moodBlock, { backgroundColor: moodColor }]}>
                <Text style={[styles.dayNumber, isToday && styles.todayText]}>
                  {d.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
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
    marginBottom: SPACING.sm,
  },
  weekdayLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    width: 40,
    textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayCell: {
    alignItems: 'center',
  },
  moodBlock: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.surface,
    fontWeight: '600',
  },
  todayText: {
    fontWeight: 'bold',
    fontSize: FONT_SIZE.md,
  },
});
