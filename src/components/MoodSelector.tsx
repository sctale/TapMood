import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import type { MoodLevel } from '../types';
import { MOOD_CONFIG, MOOD_LEVELS, COLORS, SPACING, FONT_SIZE } from '../constants';
import MoodIcon from './MoodIcon';

interface MoodSelectorProps {
  onMoodSelect: (mood: MoodLevel) => void;
  selectedMood?: MoodLevel | null;
  size?: 'large' | 'small';
}

export default React.memo(function MoodSelector({ onMoodSelect, selectedMood, size = 'large' }: MoodSelectorProps) {
  const isLarge = size === 'large';
  const scaleAnims = useRef(MOOD_LEVELS.map(() => new Animated.Value(1))).current;

  const animatePress = (index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.9,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 150,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {MOOD_LEVELS.map((level, index) => {
        const config = MOOD_CONFIG[level];
        const isSelected = selectedMood === level;

        return (
          <Animated.View key={level} style={{ transform: [{ scale: scaleAnims[index] }] }}>
            <TouchableOpacity
              style={[
                styles.moodButton,
                isLarge ? styles.moodButtonLarge : styles.moodButtonSmall,
                isSelected && {
                  backgroundColor: config.color,
                  borderColor: 'transparent',
                },
                !isSelected && {
                  backgroundColor: COLORS.surface,
                  borderColor: COLORS.border,
                },
              ]}
              onPress={() => {
                animatePress(index);
                onMoodSelect(level);
              }}
              activeOpacity={0.85}
            >
              <MoodIcon mood={level} size={isLarge ? 44 : 30} isSelected={isSelected} />
              <Text style={[
                styles.moodLabel,
                isLarge ? styles.moodLabelLarge : styles.moodLabelSmall,
                { color: isSelected ? COLORS.surface : config.color },
              ]}>
                {config.label}
              </Text>
              {isSelected && (
                <View style={[styles.selectedDot, { backgroundColor: COLORS.surface }]} />
              )}
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
});

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
    borderRadius: 24,
    borderWidth: 1.5,
  },
  moodButtonLarge: {
    width: 104,
    height: 128,
    paddingVertical: SPACING.md,
  },
  moodButtonSmall: {
    width: 76,
    height: 92,
    paddingVertical: SPACING.sm,
  },
  moodLabel: {
    fontWeight: '600',
    marginTop: SPACING.xs,
    letterSpacing: 0.5,
  },
  moodLabelLarge: {
    fontSize: FONT_SIZE.md,
  },
  moodLabelSmall: {
    fontSize: FONT_SIZE.sm,
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: SPACING.xs,
  },
});
