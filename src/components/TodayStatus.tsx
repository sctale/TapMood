import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MoodLevel } from '../types';
import { MOOD_CONFIG, COLORS, SPACING, FONT_SIZE } from '../constants';

interface TodayStatusProps {
  mood: MoodLevel | null;
  streak?: number;
}

export default function TodayStatus({ mood, streak = 0 }: TodayStatusProps) {
  if (!mood) {
    return (
      <View style={styles.container}>
        <Text style={styles.greeting}>今天感觉怎么样？</Text>
        <Text style={styles.subGreeting}>点选下方记录此刻心情</Text>
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
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.statusText, { color: config.color }]}>
        今天心情：{config.label}
      </Text>
      <Text style={styles.hint}>点击可修改</Text>
      {streak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 连续 {streak} 天</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  greeting: {
    fontSize: FONT_SIZE.xxl,
    color: COLORS.text,
    fontWeight: '300',
    letterSpacing: 1,
  },
  subGreeting: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  emoji: {
    fontSize: 52,
    marginBottom: SPACING.sm,
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
