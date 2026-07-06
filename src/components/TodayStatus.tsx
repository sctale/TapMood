import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Share, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { MoodLevel } from '../types';
import { MOOD_CONFIG, COLORS, SPACING, FONT_SIZE } from '../constants';
import MoodIcon from './MoodIcon';

interface TodayStatusProps {
  mood: MoodLevel | null;
  streak?: number;
}

// 心情 emoji（用于分享文案）
const MOOD_EMOJI: Record<MoodLevel, string> = {
  bad: '😔',
  okay: '😐',
  good: '😊',
};

// 分享图标 20×20
function ShareIcon() {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6z"
        stroke={COLORS.textSecondary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"
        stroke={COLORS.textSecondary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
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
  // 心情图标弹跳庆祝动效：mood 变化时触发
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!mood) return;
    // mood 从 null → 有值 或从一个值切到另一个值时触发弹跳
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
    ]).start();
  }, [mood, scaleAnim]);

  // 分享今日心情
  const handleShare = async () => {
    if (!mood) return;
    const config = MOOD_CONFIG[mood];
    const streakText = streak > 0 ? `，已连续记录 ${streak} 天` : '';
    const message = `今天我的心情是「${config.label}」${MOOD_EMOJI[mood]}${streakText}。\n\n来一起记录心情吧 → TapMood`;
    try {
      await Share.share({ message });
    } catch {
      Alert.alert('分享失败', '请稍后重试');
    }
  };

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
      {/* 分享按钮（右上角绝对定位） */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.6}>
        <ShareIcon />
      </TouchableOpacity>
      <Text style={styles.greeting}>{greeting}</Text>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <MoodIcon mood={mood} size={52} />
      </Animated.View>
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
    position: 'relative',
  },
  shareBtn: {
    position: 'absolute',
    top: SPACING.sm,
    right: 0,
    padding: SPACING.xs,
    zIndex: 1,
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
    alignItems: 'center',
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
