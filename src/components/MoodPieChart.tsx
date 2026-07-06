import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import type { MoodStats } from '../types';
import { MOOD_CONFIG, MOOD_LEVELS, COLORS, SPACING, FONT_SIZE } from '../constants';

interface MoodPieChartProps {
  stats: MoodStats;
  size?: number;
}

export default function MoodPieChart({ stats, size = 180 }: MoodPieChartProps) {
  const radius = size / 2 - 8;
  const strokeWidth = 16;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // 淡入动画
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    const anim = Animated.timing(animValue, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [stats]);

  // 计算各段弧长
  const total = stats.total || 1; // 避免除零
  const segments = MOOD_LEVELS.map((level) => ({
    level,
    ratio: stats[level] / total,
    color: MOOD_CONFIG[level].color,
  }));

  // 构建各段
  let accumulated = 0;
  const arcs = segments.map((seg) => {
    const strokeDasharray = `${seg.ratio * circumference} ${(1 - seg.ratio) * circumference}`;
    const rotation = accumulated * 360 - 90; // 从顶部开始
    accumulated += seg.ratio;
    return {
      ...seg,
      strokeDasharray,
      rotation,
    };
  });

  return (
    <View style={styles.container}>
      {stats.total === 0 ? (
        <View style={[styles.emptyState, { width: size, height: size }]}>
          <Text style={styles.emptyText}>暂无数据</Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: animValue }}>
          <Svg width={size} height={size}>
            {arcs.map((arc, i) => {
              // 跳过占比为 0 的段，避免 strokeLinecap="round" 画出多余圆点
              if (arc.ratio === 0) return null;
              return (
                <G key={i} rotation={arc.rotation} origin={`${center}, ${center}`}>
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={arc.strokeDasharray}
                    strokeLinecap="round"
                  />
                </G>
              );
            })}
            {/* 中心文字 */}
            <SvgText x={center} y={center + 6} textAnchor="middle" fontSize={FONT_SIZE.xl} fontWeight="bold" fill={COLORS.text}>{stats.total}</SvgText>
          </Svg>
        </Animated.View>
      )}

      {/* 图例 */}
      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.level} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendLabel}>{MOOD_CONFIG[seg.level].label} {stats[seg.level]}天</Text>
            <Text style={styles.legendPercent}>{stats.total > 0 ? `${Math.round(seg.ratio * 100)}%` : '0%'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

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
  legend: {
    marginTop: SPACING.md,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  legendLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  legendPercent: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
});
