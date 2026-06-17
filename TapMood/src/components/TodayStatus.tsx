import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MoodLevel } from '../types';
import { MOOD_CONFIG, COLORS, SPACING, FONT_SIZE } from '../constants';

interface TodayStatusProps {
  mood: MoodLevel | null;
}

export default function TodayStatus({ mood }: TodayStatusProps) {
  if (!mood) {
    return (
      <View style={styles.container}>
        <Text style={styles.prompt}>今天心情如何？</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  prompt: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.text,
    fontWeight: '300',
  },
  emoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  statusText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
  },
  hint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
