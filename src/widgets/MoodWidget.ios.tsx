import { createWidget, addUserInteractionListener } from 'expo-widgets';
import { View, Text, DeviceEventEmitter } from 'react-native';
import * as moodDB from '../database/moodDB';
import { MOOD_CONFIG, RADIUS } from '../constants';
import type { MoodLevel } from '../types';

// 小组件 Props 类型
interface MoodWidgetProps {
  todayMood: string;   // 'bad' | 'okay' | 'good' | ''
  streak: number;
  // 背景透明度档位（0=透明 1=25% 2=50% 3=75% 4=100%），与 Android 对齐
  bgAlpha?: number;
}

// iOS 小组件专用 emoji（SVG 图标无法在 WidgetKit 中使用）
const MOOD_EMOJIS: Record<string, string> = {
  bad: '😔',
  okay: '😐',
  good: '😊',
};

// 档位 → 背景不透明度
const ALPHA_LEVELS = [0, 0.25, 0.5, 0.75, 1];

// 背景透明度当前档位（模块级缓存，updateWidgetConfig 写入后由 updateMoodWidget 透传到 props）
let currentBgAlphaLevel = 3;

// 创建 iOS 桌面小组件（按 widgetFamily 适配多尺寸）
const moodWidget = createWidget<MoodWidgetProps>('MoodWidget', (props, environment) => {
  const { todayMood, streak } = props;
  const isDark = environment.colorScheme === 'dark';
  const family = environment.widgetFamily;

  // 背景按透明度档位合成
  const alpha = ALPHA_LEVELS[props.bgAlpha ?? 3] ?? 0.75;
  const baseBg = isDark ? '28,28,30' : '255,255,255';
  const bgColor = `rgba(${baseBg},${alpha})`;
  const textColor = isDark ? '#FFFFFF' : '#2D2D2D';
  const subColor = isDark ? '#8E8E93' : '#6E6E6E';

  // 锁屏/手表等 accessory 尺寸：极简单行
  if (family === 'accessoryInline') {
    return (
      <Text style={{ fontSize: 13, color: textColor }}>
        {todayMood ? `${MOOD_EMOJIS[todayMood]} 今天${MOOD_CONFIG[todayMood as MoodLevel]?.label ?? ''}` : '一点心情'}
      </Text>
    );
  }
  if (family === 'accessoryCircular' || family === 'accessoryRectangular') {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 22 }}>{todayMood ? MOOD_EMOJIS[todayMood] : '🌿'}</Text>
        {family === 'accessoryRectangular' && (
          <Text style={{ fontSize: 10, color: subColor, marginTop: 2 }}>
            {todayMood ? `今天：${MOOD_CONFIG[todayMood as MoodLevel]?.label ?? ''}` : '记录心情'}
          </Text>
        )}
      </View>
    );
  }

  // systemSmall：仅今日心情（三按钮布局在小尺寸下拥挤截断，去掉）
  if (family === 'systemSmall') {
    return (
      <View
        {...{ widgetTarget: 'small' } as any}
        style={{ flex: 1, backgroundColor: bgColor, borderRadius: RADIUS.lg, padding: 12, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: textColor, marginBottom: 6 }}>一点心情</Text>
        <Text style={{ fontSize: 44 }}>{todayMood ? MOOD_EMOJIS[todayMood] : '🌿'}</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: subColor, marginTop: 6 }}>
          {todayMood ? `今天：${MOOD_CONFIG[todayMood as MoodLevel]?.label ?? ''}` : '今天心情如何？'}
        </Text>
        {streak > 0 && (
          <Text style={{ fontSize: 11, color: subColor, marginTop: 4 }}>🔥 连续 {streak} 天</Text>
        )}
      </View>
    );
  }

  // systemMedium / systemLarge / systemExtraLarge：完整布局
  return (
    <View style={{ flex: 1, backgroundColor: bgColor, borderRadius: RADIUS.lg, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
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
              backgroundColor: todayMood === level ? MOOD_CONFIG[level].color : (isDark ? 'rgba(44,44,46,0.8)' : 'rgba(248,246,243,0.8)'),
              borderRadius: RADIUS.sm,
              paddingHorizontal: 14,
              paddingVertical: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 20 }}>{MOOD_EMOJIS[level]}</Text>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: todayMood === level ? (level === 'okay' ? '#5D4037' : '#FFFFFF') : MOOD_CONFIG[level].color,
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
// 不直接写库，改为 emit 事件复用 HomeScreen.handleMoodSelect 完整链路
// （今日心情/日历/streak 刷新 + 通知重调度 + RECORDED 事件 + Toast），与 Android Deep Link 收敛同一入口
let isProcessingWidgetInteraction = false;
export function setupWidgetInteractionListener() {
  return addUserInteractionListener(async (event) => {
    const mood = event.target as MoodLevel;
    if (!['bad', 'okay', 'good'].includes(mood)) return;
    // systemSmall 点击整体打开 APP（target 为 'small'），不记录
    if (mood === ('small' as unknown as MoodLevel)) return;

    // 防止快速重复点击
    if (isProcessingWidgetInteraction) return;
    isProcessingWidgetInteraction = true;

    try {
      // 检查今日是否已记录心情（与 Android 行为一致）：已记录仅刷新小组件，不重复记录
      const todayMood = await moodDB.getTodayMood();
      if (todayMood) {
        await updateMoodWidget();
        return;
      }

      // emit 到 HomeScreen 的记录链路（含 UI 刷新/通知调度/Toast）
      DeviceEventEmitter.emit('recordMoodFromWidget', { mood });
    } catch {
      // 数据库未初始化或写入失败时静默忽略
    } finally {
      isProcessingWidgetInteraction = false;
    }
  });
}

// 计算明天 00:01（跨日后小组件自动切到空状态，清空昨日心情显示）
function tomorrowMidnight(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 1, 0, 0);
  return d;
}

// 更新小组件内容
// 使用 timeline 而非 snapshot：当前心情 + 明天 00:01 清空条目，
// 跨日时 WidgetKit 自动切换，无需 APP 手动刷新
export async function updateMoodWidget() {
  try {
    // 今日心情和连续打卡天数并行查询
    const [record, streak] = await Promise.all([moodDB.getTodayMood(), moodDB.getStreak()]);
    const currentProps: MoodWidgetProps = {
      todayMood: record?.mood ?? '',
      streak,
      bgAlpha: currentBgAlphaLevel,
    };
    // 明天 00:01 自动清空今日心情显示
    const nextDayProps: MoodWidgetProps = {
      todayMood: '',
      streak,
      bgAlpha: currentBgAlphaLevel,
    };

    moodWidget.updateTimeline([
      { date: new Date(), props: currentProps },
      { date: tomorrowMidnight(), props: nextDayProps },
    ]);
  } catch {
    // 数据库未初始化时忽略
  }
}

// 更新小组件配置（背景透明度，与 Android 的 updateWidgetConfig 对齐）
// bgAlpha: 0=透明, 1=25%, 2=50%, 3=75%(默认), 4=100%
export async function updateWidgetConfig(config: { bgAlpha: number }) {
  const level = Math.max(0, Math.min(4, Math.round(config.bgAlpha)));
  currentBgAlphaLevel = level;
  // 透明度变化需重新渲染小组件（updateMoodWidget 会带上新档位）
  await updateMoodWidget();
}

export default moodWidget;
