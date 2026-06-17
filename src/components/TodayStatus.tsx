import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MoodLevel } from '../types';
import { MOOD_CONFIG, COLORS, SPACING, FONT_SIZE } from '../constants';

interface TodayStatusProps {
  mood: MoodLevel | null;
  streak?: number;
}

// 根据当前时间生成个性化问候语
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，照顾好自己';
  if (hour < 11) return '早上好，新的一天';
  if (hour < 14) return '中午好，记得休息';
  if (hour < 18) return '下午好，继续加油';
  if (hour < 22) return '晚上好，辛苦了';
  return '夜深了，早点休息';
}

export default React.memo(function TodayStatus({ mood, streak = 0 }: TodayStatusProps) {
  const greeting = getGreeting();

  if (!mood) {
    return (
      <View style={styles.container}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subGreeting}>今天感觉怎么样？</Text>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 连续 {streak} 天</Text>
          </View>
        )}
      </View>
    );
  }

  const config = MOOD_CONFIG[mood];

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.statusText, { color: config.color }]}>
        今天心情：{config.label}
      </Text>
      <Text style={styles.hint}>点击下方可修改</Text>
      {streak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 连续 {streak} 天</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  greeting: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: '400',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  subGreeting: {
    fontSize: FONT_SIZE.xxl,
    color: COLORS.text,
    fontWeight: '300',
    letterSpacing: 1,
  },
  emoji: {
    fontSize: 52,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  streakBadge: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
  },
  streakText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
});
