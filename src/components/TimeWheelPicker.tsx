import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  type ListRenderItem,
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
 * - 仅依赖 RN 内置 snap 系统做磁吸，避免双事件竞态
 * - 受控 value → 外部变化时单向 scrollToOffset 同步
 * - 选中项高亮通过 extraData + renderItem 闭包值驱动
 */
function WheelColumn({ data, value, onChange }: WheelColumnProps) {
  const listRef = useRef<FlatList<number>>(null);
  // 记录当前列表居中项的索引（用于受控 value 变化时跳过 scrollToOffset）
  const currentIndexRef = useRef(0);
  // 标记是否处于「受控同步」中，避免同步滚动误触发 onChange
  const syncingRef = useRef(false);

  // 把值换算为列表索引
  const valueToIndex = useCallback(
    (v: number) => {
      const idx = data.indexOf(v);
      return idx < 0 ? 0 : idx;
    },
    [data]
  );

  // 受控 value 变化 → 单向同步滚动位置（外部驱动，无动画）
  useEffect(() => {
    const index = valueToIndex(value);
    if (index === currentIndexRef.current) return;
    syncingRef.current = true;
    listRef.current?.scrollToOffset({
      offset: index * ITEM_HEIGHT,
      animated: false,
    });
    currentIndexRef.current = index;
    // 异步解除 syncing，避免短时间内的连发误判
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, [value, valueToIndex]);

  // 滚动结束时计算落点并回写 value
  // 关键：使用 (offsetY + CENTER_OFFSET + ITEM_HEIGHT / 2) 适配
  //   「snapToAlignment='start' + contentContainerStyle.paddingVertical: CENTER_OFFSET」
  //   snapToAlignment='start' 含义：滚动停止时首项 top 对齐容器顶部 0。
  //   加 CENTER_OFFSET padding 后，第一项 top = CENTER_OFFSET，索引 0 的内容可见区是 [0, ITEM_HEIGHT]。
  //   因此第 N 项 top = CENTER_OFFSET + N * ITEM_HEIGHT；
  //   选中位置（CENTER_OFFSET）对应的索引 = (offsetY + CENTER_OFFSET) / ITEM_HEIGHT。
  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (syncingRef.current) return;
      const offsetY = e.nativeEvent.contentOffset.y;
      const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(data.length - 1, rawIndex));
      currentIndexRef.current = clamped;
      const nextValue = data[clamped];
      if (nextValue !== value) {
        onChange(nextValue);
      }
    },
    [data, onChange, value]
  );

  // 用户点击单项 → 直接滚到该项 + 上报 value
  const handleItemPress = useCallback(
    (item: number, index: number) => {
      if (item === value) return;
      currentIndexRef.current = index;
      syncingRef.current = true;
      listRef.current?.scrollToOffset({
        offset: index * ITEM_HEIGHT,
        animated: true,
      });
      onChange(item);
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    },
    [onChange, value]
  );

  // renderItem 依赖 value（闭包）+ extraData 同值驱动，配合 FlatList 增量更新
  const renderItem: ListRenderItem<number> = useCallback(
    ({ item }) => {
      const selected = item === value;
      return (
        <TouchableOpacity
          style={[styles.item, { height: ITEM_HEIGHT }]}
          onPress={() => handleItemPress(item, valueToIndex(item))}
          activeOpacity={0.6}
        >
          <Text
            style={[styles.itemText, selected && styles.itemTextActive]}
            numberOfLines={1}
          >
            {String(item).padStart(2, '0')}
          </Text>
        </TouchableOpacity>
      );
    },
    [value, handleItemPress, valueToIndex]
  );

  const initialIndex = useMemo(() => valueToIndex(value), [valueToIndex, value]);

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
        extraData={value}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        windowSize={5}
        removeClippedSubviews
        initialNumToRender={VISIBLE_COUNT * 2}
        maxToRenderPerBatch={VISIBLE_COUNT}
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
