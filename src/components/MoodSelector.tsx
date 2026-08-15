import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import type { MoodLevel } from '../types';
import { MOOD_CONFIG, MOOD_LEVELS, COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants';
import MoodIcon from './MoodIcon';

// okay 琥珀底(#FFB74D)与白字对比度仅 1.9:1，改用深棕（对比度 6.8:1）
const SELECTED_TEXT_COLOR: Record<MoodLevel, string> = {
  bad: COLORS.surface,
  okay: '#5D4037',
  good: COLORS.surface,
};

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
          <Animated.View key={level} style={{ flex: 1, transform: [{ scale: scaleAnims[index] }] }}>
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
              <MoodIcon
                mood={level}
                size={isLarge ? 44 : 30}
                isSelected={isSelected}
                bgOverride={isSelected ? 'rgba(255,255,255,0.3)' : undefined}
              />
              <Text style={[
                styles.moodLabel,
                isLarge ? styles.moodLabelLarge : styles.moodLabelSmall,
                { color: isSelected ? SELECTED_TEXT_COLOR[level] : config.color },
              ]}>
                {config.label}
              </Text>
              {isSelected && <View style={styles.selectedDot} />}
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
    borderRadius: RADIUS.xl,
    borderWidth: 2,
  },
  moodButtonLarge: {
    height: 104,
    paddingVertical: SPACING.md,
  },
  moodButtonSmall: {
    flex: 1, // 小屏安全：平分剩余宽度，替代固定 width:76
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
    marginTop: SPACING.xs,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
