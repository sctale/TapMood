import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import type { MoodLevel } from '../types';
import { MOOD_CONFIG, MOOD_LEVELS, COLORS, SPACING, FONT_SIZE } from '../constants';

interface MoodSelectorProps {
  onMoodSelect: (mood: MoodLevel) => void;
  selectedMood?: MoodLevel | null;
  size?: 'large' | 'small';
}

export default function MoodSelector({ onMoodSelect, selectedMood, size = 'large' }: MoodSelectorProps) {
  const isLarge = size === 'large';

  return (
    <View style={styles.container}>
      {MOOD_LEVELS.map((level) => {
        const config = MOOD_CONFIG[level];
        const isSelected = selectedMood === level;

        return (
          <TouchableOpacity
            key={level}
            style={[
              styles.moodButton,
              isLarge ? styles.moodButtonLarge : styles.moodButtonSmall,
              { backgroundColor: isSelected ? config.color : COLORS.surface },
              isSelected && styles.moodButtonSelected,
            ]}
            onPress={() => onMoodSelect(level)}
            activeOpacity={0.7}
          >
            <Text style={[styles.moodEmoji, isLarge ? styles.moodEmojiLarge : styles.moodEmojiSmall]}>
              {config.emoji}
            </Text>
            <Text style={[
              styles.moodLabel,
              isLarge ? styles.moodLabelLarge : styles.moodLabelSmall,
              { color: isSelected ? COLORS.surface : config.color },
            ]}>
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  moodButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  moodButtonLarge: {
    width: 100,
    height: 120,
    paddingVertical: SPACING.md,
  },
  moodButtonSmall: {
    width: 72,
    height: 88,
    paddingVertical: SPACING.sm,
  },
  moodButtonSelected: {
    borderColor: 'transparent',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  moodEmoji: {
    textAlign: 'center',
  },
  moodEmojiLarge: {
    fontSize: 40,
  },
  moodEmojiSmall: {
    fontSize: 28,
  },
  moodLabel: {
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  moodLabelLarge: {
    fontSize: FONT_SIZE.md,
  },
  moodLabelSmall: {
    fontSize: FONT_SIZE.sm,
  },
});
