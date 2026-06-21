import type { MoodStats, AnalysisPeriod, MoodLevel } from '../types';
import { MOOD_CONFIG } from '../constants';

type MoodLabel = '好' | '中' | '差';

const PERIOD_WORD: Record<AnalysisPeriod, string> = {
  week: '本周',
  month: '本月',
  year: '今年',
};

const MOOD_LABEL: Record<MoodLevel, MoodLabel> = {
  good: '好',
  okay: '中',
  bad: '差',
};

// 返回文本中含 markdown 风格的加粗标记 `**xxx**`，调用方需自行解析为 <Text> 渲染
export interface SummarySegment {
  text: string;
  bold?: boolean;
}

export interface SummaryText {
  segments: SummarySegment[];
}

// 解析 `**xxx**` 标记为 segments（无 marked 库，纯手写）
function parseInlineBold(input: string): SummarySegment[] {
  const segments: SummarySegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index) });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex) });
  }
  return segments;
}

// 判定整体情绪倾向
function getOverallTone(goodRatio: number, badRatio: number): string {
  if (goodRatio >= 0.6) return '整体积极向上 ✨';
  if (goodRatio >= 0.4) return '整体平稳 😊';
  if (badRatio >= 0.5) return '心情较为低落 🌧️，记得照顾自己';
  if (badRatio >= 0.3) return '需要给自己一些温暖 🫂';
  return '情绪起伏不定 🌊';
}

// 生成自然语言摘要
export function generateSummaryText(stats: MoodStats, period: AnalysisPeriod): SummaryText {
  if (stats.total === 0) {
    return {
      segments: [{ text: '开始记录你的心情吧 🌱' }],
    };
  }

  const periodWord = PERIOD_WORD[period];

  // 最常见心情
  let topMood: MoodLevel = 'okay';
  if (stats.good >= stats.okay && stats.good >= stats.bad) {
    topMood = 'good';
  } else if (stats.bad >= stats.okay && stats.bad >= stats.good) {
    topMood = 'bad';
  }

  const goodRatio = stats.good / stats.total;
  const badRatio = stats.bad / stats.total;
  const goodPercent = Math.round(goodRatio * 100);
  const badPercent = Math.round(badRatio * 100);

  const topLabel = MOOD_CONFIG[topMood].label;

  const lines: string[] = [];

  // 第一句：天数 + 最常见
  lines.push(
    `${periodWord}共记录 **${stats.total}** 天，以**${topLabel}**心情为主。`
  );

  // 第二句：好/差占比 + 整体倾向
  if (badPercent > 0) {
    lines.push(
      `好心情占 **${goodPercent}%**，差心情占 **${badPercent}%**。${getOverallTone(goodRatio, badRatio)}`
    );
  } else {
    lines.push(
      `好心情占 **${goodPercent}%**，没有差心情记录。${getOverallTone(goodRatio, 0)}`
    );
  }

  const combined = lines.join('\n');
  return { segments: parseInlineBold(combined) };
}