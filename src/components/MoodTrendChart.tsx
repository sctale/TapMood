import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Rect } from 'react-native-svg';
import type { MoodRecord, MoodLevel } from '../types';
import { MOOD_CONFIG, COLORS, FONT_SIZE } from '../constants';

interface MoodTrendChartProps {
  records: MoodRecord[];
  // 显示范围（用于 X 轴标签）
  startDate: string;
  endDate: string;
}

// 心情级别映射到 Y 轴数值：bad=0, okay=1, good=2
const MOOD_VALUE: Record<MoodLevel, number> = {
  bad: 0,
  okay: 1,
  good: 2,
};

const CHART_W = 320;
const CHART_H = 140;
const PAD_L = 28;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

export default React.memo(function MoodTrendChart({ records, startDate, endDate }: MoodTrendChartProps) {
  // 按日期排序 + 映射坐标点
  const points = useMemo(() => {
    if (records.length === 0) return [];
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const totalMs = Math.max(1, endMs - startMs);
    return sorted.map((r) => {
      const ms = new Date(r.date).getTime();
      const x = PAD_L + (ms - startMs) / totalMs * PLOT_W;
      // Y 轴反转：bad 在底部，good 在顶部
      const y = PAD_T + PLOT_H - (MOOD_VALUE[r.mood] / 2) * PLOT_H;
      return { x, y, mood: r.mood };
    });
  }, [records, startDate, endDate]);

  // 折线路径字符串
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Y 轴标签（好/中/差）
  const yLabels = [
    { label: '好', value: 2 },
    { label: '中', value: 1 },
    { label: '差', value: 0 },
  ];

  // Y 坐标计算
  const getY = (value: number) => PAD_T + PLOT_H - (value / 2) * PLOT_H;

  return (
    <View style={styles.container}>
      <Svg width={CHART_W} height={CHART_H}>
        {/* 横向参考线（3 条） */}
        {[0, 1, 2].map(v => {
          const y = getY(v);
          return (
            <Line
              key={v}
              x1={PAD_L}
              y1={y}
              x2={CHART_W - PAD_R}
              y2={y}
              stroke={COLORS.borderSubtle}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          );
        })}

        {/* 折线（有 2 个点以上才画线） */}
        {points.length > 1 && (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={COLORS.good}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* 数据点 */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={MOOD_CONFIG[p.mood].color}
            stroke={COLORS.surface}
            strokeWidth={1}
          />
        ))}
      </Svg>

      {/* Y 轴标签（用绝对定位的 RN Text 替代 SVG Text，避免类型问题） */}
      {yLabels.map(item => (
        <Text
          key={item.value}
          style={[styles.yLabel, { top: getY(item.value) - 6 }]}
        >
          {item.label}
        </Text>
      ))}

      <Text style={styles.hint}>心情趋势 · 点位颜色对应当日心情</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  hint: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  yLabel: {
    position: 'absolute',
    left: 4,
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});
