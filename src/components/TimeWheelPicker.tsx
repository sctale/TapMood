import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { COLORS, FONT_SIZE, SPACING } from '../constants';

// 滚轮单项高度（决定滚动磁吸粒度）
const ITEM_HEIGHT = 44;
// 可视区域共显示 5 项，中间项为选中项
const VISIBLE_COUNT = 5;
// 滚轮总高度
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
// 顶部/底部留白，使首项和末项也能滚动到居中位置
const CENTER_OFFSET = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

interface WheelColumnProps {
  /** 可选数据列表 */
  data: number[];
  /** 当前选中值 */
  value: number;
  /** 选中变化回调 */
  onChange: (value: number) => void;
}

/**
 * 单列滚轮
 * - 垂直滚动，停止后磁吸到最近整项
 * - 选中项高亮（放大 + 主色）
 */
function WheelColumn({ data, value, onChange }: WheelColumnProps) {
  const listRef = useRef<FlatList<number>>(null);

  // 根据值获取索引
  const getIndex = useCallback((v: number) => {
    const idx = data.indexOf(v);
    return idx < 0 ? 0 : idx;
  }, [data]);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number, animated = true) => {
    const clamped = Math.max(0, Math.min(data.length - 1, index));
    listRef.current?.scrollToOffset({
      offset: clamped * ITEM_HEIGHT,
      animated,
    });
  }, [data.length]);

  // 当外部值变化时同步滚动位置（首次挂载使用无动画定位）
  useEffect(() => {
    const index = getIndex(value);
    scrollToIndex(index, false);
  }, [value, getIndex, scrollToIndex]);

  // 根据滚动偏移计算最近项并磁吸
  const snapToNearest = useCallback((offsetY: number) => {
    const index = Math.round((offsetY - CENTER_OFFSET) / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(data.length - 1, index));
    if (data[clamped] !== value) {
      onChange(data[clamped]);
    }
    scrollToIndex(clamped, true);
  }, [data, onChange, scrollToIndex, value]);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      snapToNearest(e.nativeEvent.contentOffset.y);
    },
    [snapToNearest]
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      snapToNearest(e.nativeEvent.contentOffset.y);
    },
    [snapToNearest]
  );

  const renderItem = useCallback(({ item, index }: { item: number; index: number }) => {
    const selected = item === value;
    return (
      <TouchableOpacity
        style={[styles.item, { height: ITEM_HEIGHT }]}
        onPress={() => {
          onChange(item);
          scrollToIndex(index, true);
        }}
        activeOpacity={0.6}
      >
        <Text
          style={[
            styles.itemText,
            selected && styles.itemTextActive,
          ]}
          numberOfLines={1}
        >
          {String(item).padStart(2, '0')}
        </Text>
      </TouchableOpacity>
    );
  }, [onChange, scrollToIndex, value]);

  const initialIndex = useMemo(() => getIndex(value), [getIndex, value]);

  return (
    <View style={styles.column}>
      <FlatList
        ref={listRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={{ paddingVertical: CENTER_OFFSET }}
        style={styles.list}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
      />
      {/* iOS 风格选中指示线 */}
      <View
        style={[styles.indicatorLine, { top: CENTER_OFFSET }]}
        pointerEvents="none"
      />
      <View
        style={[styles.indicatorLine, { top: CENTER_OFFSET + ITEM_HEIGHT }]}
        pointerEvents="none"
      />
    </View>
  );
}

interface TimeWheelPickerProps {
  /** 当前小时（0-23） */
  hour: number;
  /** 当前分钟（0-59） */
  minute: number;
  /** 时间变化回调 */
  onChange: (hour: number, minute: number) => void;
}

/**
 * 时间滚轮选择器
 * 双列布局：小时（00-23）+ 分钟（00-59）
 */
export default function TimeWheelPicker({ hour, minute, onChange }: TimeWheelPickerProps) {
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <View style={styles.container}>
      <WheelColumn
        data={hours}
        value={hour}
        onChange={(h) => onChange(h, minute)}
      />
      <Text style={styles.separator}>:</Text>
      <WheelColumn
        data={minutes}
        value={minute}
        onChange={(m) => onChange(hour, m)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: WHEEL_HEIGHT,
    backgroundColor: COLORS.surface,
  },
  column: {
    width: 88,
    height: WHEEL_HEIGHT,
    justifyContent: 'center',
  },
  list: {
    height: WHEEL_HEIGHT,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textTertiary,
    fontWeight: '500',
    opacity: 0.65,
  },
  itemTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
    opacity: 1,
    transform: [{ scale: 1.18 }],
  },
  separator: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: SPACING.md,
  },
  indicatorLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
});
