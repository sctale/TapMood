import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { Animated, Easing } from 'react-native';
import type { MoodStats } from '../types';
import { MOOD_CONFIG, MOOD_LEVELS, COLORS, SPACING, FONT_SIZE } from '../constants';

interface MoodBarChartProps {
  stats: MoodStats;
  height?: number;
}

export default function MoodBarChart({ stats, height = 160 }: MoodBarChartProps) {
  const maxValue = Math.max(stats.bad, stats.okay, stats.good, 1);
  const chartWidth = 240;
  const barWidth = 48;
  const gap = (chartWidth - barWidth * 3) / 4;

  // 柱状图增长动画
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [stats]);

  // 动画驱动的柱高比例
  const animRatio = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {stats.total === 0 ? (
        <View style={[styles.emptyState, { height }]}>
          <Text style={styles.emptyText}>暂无数据</Text>
        </View>
      ) : (
        <AnimatedSvg width={chartWidth} height={height} style={{ opacity: animRatio }}>
          {MOOD_LEVELS.map((level, i) => {
            const value = stats[level];
            const barHeight = (value / maxValue) * (height - 40);
            const x = gap + i * (barWidth + gap);
            const y = height - 24 - barHeight;

            return (
              <React.Fragment key={level}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={MOOD_CONFIG[level].color}
                  rx={8}
                  ry={8}
                />
                {/* 数值标签 */}
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={FONT_SIZE.sm}
                  fill={COLORS.text}
                  fontWeight="600"
                >
                  {value}
                </SvgText>
                {/* 底部标签 */}
                <SvgText
                  x={x + barWidth / 2}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize={FONT_SIZE.xs}
                  fill={COLORS.textSecondary}
                >
                  {MOOD_CONFIG[level].label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </AnimatedSvg>
      )}
    </View>
  );
}

// 包装Svg以支持Animated驱动opacity
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
});
