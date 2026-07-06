import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { COLORS, SPACING, FONT_SIZE } from '../constants';

type TabKey = 'home' | 'analysis' | 'settings';

interface TabBarProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'home', label: '记录' },
  { key: 'analysis', label: '分析' },
  { key: 'settings', label: '设置' },
];

// 简约图标组件
function HomeIcon({ active }: { active: boolean }) {
  const color = active ? COLORS.text : COLORS.textSecondary;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" fill={color} />
    </Svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  const color = active ? COLORS.text : COLORS.textSecondary;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="12" width="4" height="9" rx="1" fill={color} />
      <Rect x="10" y="6" width="4" height="15" rx="1" fill={color} />
      <Rect x="17" y="3" width="4" height="18" rx="1" fill={color} />
    </Svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  const color = active ? COLORS.text : COLORS.textSecondary;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" fill={color} />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" fill={color} />
    </Svg>
  );
}

const icons: Record<TabKey, React.FC<{ active: boolean }>> = {
  home: HomeIcon,
  analysis: ChartIcon,
  settings: SettingsIcon,
};

// 单个 Tab 项：激活时图标轻微上移 + 颜色过渡
function TabItem({ tab, isActive, onPress }: { tab: { key: TabKey; label: string }; isActive: boolean; onPress: () => void }) {
  const Icon = icons[tab.key];
  // 上移动画值：激活 -2，未激活 0
  const translateY = useRef(new Animated.Value(isActive ? -2 : 0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isActive ? -2 : 0,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  }, [isActive, translateY]);

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Icon active={isActive} />
      </Animated.View>
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

export default React.memo(function TabBar({ activeTab, onTabPress }: TabBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TabItem
          key={tab.key}
          tab={tab}
          isActive={activeTab === tab.key}
          onPress={() => onTabPress(tab.key)}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
});
