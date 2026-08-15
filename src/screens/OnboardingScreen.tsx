import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants';

interface OnboardingScreenProps {
  onDone: () => void;
}

// 3 屏内容（极简风格：emoji + 标题 + 副文案）
const PAGES = [
  { emoji: '🌿', title: '一点心情', subtitle: '每天 3 秒，记录你的情绪' },
  { emoji: '👆', title: '点一下就好', subtitle: '差 / 中 / 好，三档心情一键记录' },
  { emoji: '🔔', title: '每日提醒', subtitle: '设置一个时间，我会在对的时候提醒你' },
] as const;

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  // 响应窗口宽度变化（iPad 分屏/旋转），模块级 Dimensions.get 只取一次会算错页宽
  const { width } = useWindowDimensions();

  // 滚动结束时计算当前页索引
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== pageIndex && index >= 0 && index < PAGES.length) {
      setPageIndex(index);
    }
  };

  // 点击 dots 跳转到指定页
  const goToPage = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setPageIndex(index);
  };

  // 第 3 屏 CTA：触发通知权限请求（可跳过，失败也能进主页）
  const handleStart = async () => {
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // 权限请求失败静默处理，不阻塞进入主页
    }
    onDone();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {PAGES.map((page, i) => (
          <View key={i} style={styles.page}>
            <Text style={styles.emoji}>{page.emoji}</Text>
            <Text style={styles.title}>{page.title}</Text>
            <Text style={styles.subtitle}>{page.subtitle}</Text>

            {/* 最后一屏显示 CTA 按钮 */}
            {i === PAGES.length - 1 && (
              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={handleStart}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaText}>开始使用</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* 底部 dots 指示器（可点击跳转） */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <TouchableOpacity
            key={i}
            style={styles.dotWrap}
            onPress={() => goToPage(i)}
            activeOpacity={0.6}
          >
            <View style={[styles.dot, pageIndex === i && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    // width 由 useWindowDimensions 动态注入（响应 iPad 分屏）
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emoji: {
    fontSize: 80,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 22,
  },
  ctaBtn: {
    // 圆角元素强制实色背景（项目硬约束）
    backgroundColor: COLORS.good,
    borderRadius: RADIUS.md, // 保持原 16 视觉不变（RADIUS.lg 已语义化为 20）
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    marginTop: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  ctaText: {
    color: COLORS.surface,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  dotWrap: {
    padding: SPACING.xs, // 增大点击区域
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.borderSubtle, // 未激活：实色背景避免 RN Android 圆角失效
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
    backgroundColor: COLORS.text, // 激活：深色高亮
  },
});
