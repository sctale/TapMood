import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import type { MoodLevel } from '../types';
import { MOOD_CONFIG, MOOD_LEVELS, COLORS, SPACING, FONT_SIZE } from '../constants';
import { getMoodByDate, recordMoodForDate, deleteMoodByDate } from '../database/moodDB';
import { updateMoodWidget } from '../widgets/MoodWidget';
import { parseDate, formatDate } from '../utils/dateUtils';
import MoodIcon from './MoodIcon';

interface DateMoodModalProps {
  visible: boolean;
  date: string | null; // YYYY-MM-DD
  onClose: () => void;
  onRecorded: () => void;
}

export default function DateMoodModal({ visible, date, onClose, onRecorded }: DateMoodModalProps) {
  const [currentMood, setCurrentMood] = useState<MoodLevel | null>(null);
  const [loading, setLoading] = useState(false);
  const recordingRef = useRef(false);

  // 加载该日期的心情
  // 不预先清空 currentMood，避免重开 Modal 时先闪"无记录"再跳变为已记录
  useEffect(() => {
    if (!visible || !date) return;
    let isCancelled = false;
    (async () => {
      try {
        const record = await getMoodByDate(date);
        if (!isCancelled) setCurrentMood(record?.mood ?? null);
      } catch {
        // 加载失败静默处理
      }
    })();
    return () => { isCancelled = true; };
  }, [visible, date]);

  const handleSelect = async (level: MoodLevel) => {
    if (!date || recordingRef.current) return;
    recordingRef.current = true;
    setLoading(true);

    // 安全超时：即使异步操作异常卡住，3秒后自动释放
    const safetyTimeout = setTimeout(() => {
      recordingRef.current = false;
    }, 3000);

    try {
      await recordMoodForDate(date, level);
      setCurrentMood(level);
      // 同步更新小组件状态
      await updateMoodWidget();
      onRecorded();
    } catch {
      // 失败静默，用户可重试
    } finally {
      clearTimeout(safetyTimeout);
      recordingRef.current = false;
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!date || !currentMood) return;
    setLoading(true);
    try {
      await deleteMoodByDate(date);
      setCurrentMood(null);
      // 同步更新小组件状态（与 handleSelect 保持一致）
      await updateMoodWidget();
      onRecorded();
    } catch {
      // 失败静默
    } finally {
      setLoading(false);
    }
  };

  if (!date) return null;

  const dateObj = parseDate(date);
  const isToday = date === formatDate(new Date());
  const isFuture = dateObj > new Date();
  const dateLabel = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* 日期标题 */}
          <View style={styles.header}>
            <Text style={styles.dateTitle}>
              {isToday ? '今天' : dateLabel}
            </Text>
            <Text style={styles.dateSub}>
              {isFuture ? '未来日期暂不支持记录' : currentMood ? '点击修改心情' : '选择今天的心情'}
            </Text>
          </View>

          {/* 当前心情显示 */}
          {currentMood && (
            <View style={[styles.currentMoodBar, { backgroundColor: MOOD_CONFIG[currentMood].color }]}>
              <MoodIcon mood={currentMood} size={24} />
              {/* okay 琥珀底与白字对比度 1.9:1，改深棕保证可读 */}
              <Text style={[styles.currentMoodLabel, currentMood === 'okay' && styles.currentMoodLabelAmber]}>
                心情：{MOOD_CONFIG[currentMood].label}
              </Text>
            </View>
          )}

          {/* 心情选择按钮 */}
          {!isFuture && (
            <View style={styles.moodRow}>
              {MOOD_LEVELS.map((level) => {
                const config = MOOD_CONFIG[level];
                const isSelected = currentMood === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.moodBtn,
                      isSelected && { backgroundColor: config.color, borderColor: 'transparent' },
                    ]}
                    onPress={() => handleSelect(level)}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <MoodIcon
                      mood={level}
                      size={32}
                      isSelected={isSelected}
                      bgOverride={isSelected ? 'rgba(255,255,255,0.3)' : undefined}
                    />
                    <Text style={[styles.moodText, { color: isSelected ? (level === 'okay' ? '#5D4037' : COLORS.surface) : config.color }]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 底部操作 */}
          <View style={styles.footer}>
            {currentMood && !isFuture && (
              <TouchableOpacity onPress={handleDelete} disabled={loading} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>删除记录</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} disabled={loading} style={styles.closeBtn}>
              <Text style={styles.closeText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: SPACING.xl,
    width: '85%',
    maxWidth: 360,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dateTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  dateSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  currentMoodBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  currentMoodLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.surface,
    fontWeight: '600',
  },
  currentMoodLabelAmber: {
    color: '#5D4037',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  moodBtn: {
    width: 80,
    height: 96,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  deleteBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  deleteText: {
    fontSize: FONT_SIZE.sm,
    color: '#C62828', // 白底对比度 5.9:1（原 #E57373 仅 3.8:1）
  },
  closeBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  closeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
});
