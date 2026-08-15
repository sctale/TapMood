import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { MoodRecord } from '../types';
import { MOOD_CONFIG, COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants';
import { getWeekdayName, addDays, formatDate } from '../utils/dateUtils';
import MoodIcon from './MoodIcon';

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

export default React.memo(function WeekView({ currentDate, records, onDatePress }: WeekViewProps) {
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

  // 循环外计算一次（避免每个 cell 重复创建 Date 对象和字符串格式化）
  const todayStr = formatDate(new Date());

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
          const moodColor = record ? MOOD_CONFIG[record.mood].color : COLORS.bgAlt;
          const isToday = dateStr === todayStr;
          // 未来日期禁用点击（与月/年视图一致），降低透明度区分
          const isFuture = dateStr > todayStr;

          return (
            <TouchableOpacity
              key={dateStr}
              style={styles.dayCell}
              onPress={() => onDatePress?.(dateStr)}
              activeOpacity={0.6}
              disabled={!onDatePress || isFuture}
              hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
            >
              <View style={[
                styles.moodBlock,
                { backgroundColor: moodColor },
                isToday && record && styles.todayBlockRecorded,
                isToday && !record && styles.todayBlockEmpty,
                isFuture && styles.moodBlockFuture,
              ]}>
                <Text style={[
                  styles.dayNumber,
                  !record && styles.dayNumberEmpty,
                  isToday && styles.todayText,
                ]}>
                  {d.getDate()}
                </Text>
                {/* 色盲辅助：右上角微缩心情脸，颜色+形状双通道区分 */}
                {record && (
                  <View style={styles.moodBadge}>
                    <MoodIcon mood={record.mood} size={12} bgOverride={COLORS.surface} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
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
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBlockRecorded: {
    borderWidth: 2.5,
    borderColor: COLORS.accent, // accent 描边环（原黑边生硬）
  },
  todayBlockEmpty: {
    borderWidth: 2.5,
    borderColor: COLORS.accent, // 原 textTertiary 灰边对比 1.9:1 几乎不可见
    backgroundColor: COLORS.badBg, // accent 同色系浅底，强化"今日"感知
  },
  moodBlockFuture: {
    opacity: 0.4,
  },
  dayNumber: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  dayNumberEmpty: {
    color: COLORS.textSecondary,
  },
  todayText: {
    fontWeight: 'bold',
    fontSize: FONT_SIZE.md,
  },
  moodBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
  },
});
