import { createWidget, addUserInteractionListener } from 'expo-widgets';
import { View, Text } from 'react-native';
import * as moodDB from '../database/moodDB';
import { MOOD_CONFIG } from '../constants';
import type { MoodLevel } from '../types';

// 小组件 Props 类型
interface MoodWidgetProps {
  todayMood: string;   // 'bad' | 'okay' | 'good' | ''
  streak: number;
}

// iOS 小组件专用 emoji（SVG 图标无法在 WidgetKit 中使用）
const MOOD_EMOJIS: Record<string, string> = {
  bad: '😔',
  okay: '😐',
  good: '😊',
};

// 创建 iOS 桌面小组件
const moodWidget = createWidget<MoodWidgetProps>('MoodWidget', (props, environment) => {
  const { todayMood, streak } = props;
  const isDark = environment.colorScheme === 'dark';
  const bgColor = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#2D2D2D';
  const subColor = isDark ? '#8E8E93' : '#9E9E9E';

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, borderRadius: 20, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
      {/* 标题 */}
      <Text style={{ fontSize: 16, fontWeight: '600', color: textColor, marginBottom: 4 }}>
        一点心情
      </Text>

      {/* 今日状态 */}
      {todayMood ? (
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 36 }}>{MOOD_EMOJIS[todayMood]}</Text>
          <Text style={{ fontSize: 14, color: MOOD_CONFIG[todayMood as MoodLevel].color, fontWeight: '600', marginTop: 2 }}>
            今天：{MOOD_CONFIG[todayMood as MoodLevel].label}
          </Text>
        </View>
      ) : (
        <Text style={{ fontSize: 14, color: subColor, marginBottom: 12 }}>
          今天心情如何？
        </Text>
      )}

      {/* 三个快捷按钮 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['bad', 'okay', 'good'] as MoodLevel[]).map((level) => (
          <View
            key={level}
            {...{ widgetTarget: level } as any}
            style={{
              backgroundColor: todayMood === level ? MOOD_CONFIG[level].color : (isDark ? '#2C2C2E' : '#F8F6F3'),
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 20 }}>{MOOD_EMOJIS[level]}</Text>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: todayMood === level ? '#FFFFFF' : MOOD_CONFIG[level].color,
              marginTop: 2,
            }}>
              {MOOD_CONFIG[level].label}
            </Text>
          </View>
        ))}
      </View>

      {/* 连续打卡 */}
      {streak > 0 && (
        <Text style={{ fontSize: 11, color: subColor, marginTop: 8 }}>
          🔥 连续 {streak} 天
        </Text>
      )}
    </View>
  );
});

// 监听小组件交互事件
let isProcessingWidgetInteraction = false;
export function setupWidgetInteractionListener() {
  return addUserInteractionListener(async (event) => {
    const mood = event.target as MoodLevel;
    if (!['bad', 'okay', 'good'].includes(mood)) return;

    // 防止快速重复点击
    if (isProcessingWidgetInteraction) return;
    isProcessingWidgetInteraction = true;

    try {
      // 检查今日是否已记录心情（与 Android 行为一致）
      const todayMood = await moodDB.getTodayMood();
      if (todayMood) {
        // 今日已记录，仅刷新小组件显示，不重复记录
        await updateMoodWidget();
        return;
      }

      await moodDB.recordMood(mood);
      await updateMoodWidget();
    } catch {
      // 数据库未初始化或写入失败时静默忽略
    } finally {
      isProcessingWidgetInteraction = false;
    }
  });
}

// 更新小组件内容
export async function updateMoodWidget() {
  try {
    // 通过 moodDB 单例读取今日心情和连续打卡天数
    const record = await moodDB.getTodayMood();
    const streak = await moodDB.getStreak();

    moodWidget.updateSnapshot({
      todayMood: record?.mood ?? '',
      streak,
    });
  } catch {
    // 数据库未初始化时忽略
  }
}

export default moodWidget;
