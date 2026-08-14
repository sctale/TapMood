import type { MoodStats, AnalysisPeriod } from '../types';

// 温馨小提示接口
export interface MoodTip {
  emoji: string;
  title: string;
  message: string;
}

// 提示文案池 - 根据心情比例和周期组合选取
// 设计原则：陪伴感 > 说教感，具体 > 空洞，温暖 > 鸡汤

// ---- 按心情比例分类的提示 ----

// 好心情占多数（good >= 60%）
const goodMajorityTips: Record<AnalysisPeriod, MoodTip[]> = {
  week: [
    { emoji: '🌿', title: '这周很棒', message: '你的心情像春天的叶子一样舒展，继续保持这份自在吧' },
    { emoji: '☀️', title: '阳光满满', message: '这周的好心情值得被记住，是你给自己的礼物' },
    { emoji: '🎵', title: '节奏不错', message: '这一周你找到了让自己舒服的节奏，真不错' },
  ],
  month: [
    { emoji: '🌸', title: '温柔的一个月', message: '这个月大部分日子你都在微笑，生活正在回应你的温柔' },
    { emoji: '🌱', title: '好心情在生长', message: '一个月的好心情不是偶然，是你认真对待自己的证明' },
    { emoji: '✨', title: '闪闪发光', message: '这个月你收集了很多闪亮的日子，它们会照亮未来的路' },
  ],
  year: [
    { emoji: '🌻', title: '向阳而生', message: '这一年你选择了更多的微笑，这份力量会一直陪着你' },
    { emoji: '🏔️', title: '稳步向前', message: '好心情不是终点，是路上的风景，你一直在走' },
  ],
};

// 中性心情占多数（okay >= 50%，或三种心情较均衡）
const neutralMajorityTips: Record<AnalysisPeriod, MoodTip[]> = {
  week: [
    { emoji: '☁️', title: '平淡也挺好', message: '不是每天都要精彩，平静本身就是一种力量' },
    { emoji: '🍵', title: '慢下来也没事', message: '这周像一杯温茶，不浓不淡，刚刚好' },
    { emoji: '📖', title: '日常的力量', message: '普通的日子里藏着安稳，这也是一种幸福' },
  ],
  month: [
    { emoji: '🍂', title: '如常即好', message: '这个月没有大起大落，但平稳本身就是最好的消息' },
    { emoji: '🌙', title: '安静的力量', message: '不是每段日子都需要高光，安静地过也是一种本事' },
    { emoji: '🌾', title: '稳稳的', message: '这个月像一片安静的麦田，风来就摇，风停就静' },
  ],
  year: [
    { emoji: '🌊', title: '细水长流', message: '这一年没有太多波澜，但细水长流本身就是最好的答案' },
    { emoji: '🧘', title: '平和之年', message: '能在平淡中找到安宁，是一种了不起的能力' },
  ],
};

// 差心情占多数（bad >= 40%）
const badMajorityTips: Record<AnalysisPeriod, MoodTip[]> = {
  week: [
    { emoji: '🫂', title: '辛苦了', message: '这周有点难熬，但你撑过来了，明天又是新的开始' },
    { emoji: '🌧️', title: '雨会停的', message: '连阴天也有放晴的时候，给自己一个拥抱吧' },
    { emoji: '🕯️', title: '你不是一个人', message: '低落的时候不用假装坚强，允许自己慢慢来' },
  ],
  month: [
    { emoji: '🤍', title: '抱抱自己', message: '这个月不太容易，但你一直在走，这本身就很勇敢' },
    { emoji: '🪴', title: '扎根的时候', message: '植物在冬天也会落叶，但根在生长，你也是' },
    { emoji: '🌙', title: '夜深有星光', message: '难熬的日子也是日子，走过它，你就多了一份力量' },
  ],
  year: [
    { emoji: '🛤️', title: '走过来了', message: '这一年不容易，但每一步都算数，辛苦了' },
    { emoji: '🦋', title: '蜕变中', message: '最难的日子往往在孕育最深的成长，给自己时间' },
  ],
};

// 好心情和差心情都多（情绪波动大，good >= 30% 且 bad >= 30%）
const volatileTips: Record<AnalysisPeriod, MoodTip[]> = {
  week: [
    { emoji: '🎢', title: '起伏的一周', message: '这周像坐过山车，但每一次低谷之后都有回升' },
    { emoji: '🌈', title: '雨后彩虹', message: '有起有落才是真实的生活，你正在经历完整的自己' },
  ],
  month: [
    { emoji: '🌤️', title: '阴晴圆缺', message: '这个月像天空一样多变，但每种天气都值得被看见' },
    { emoji: '🎨', title: '丰富的底色', message: '大起大落的月份画出了最丰富的色彩，这就是真实的你' },
  ],
  year: [
    { emoji: '🗺️', title: '丰富的旅程', message: '这一年的高低起伏，组成了独一无二的你' },
    { emoji: '🎭', title: '完整的自己', message: '能感受到快乐也能承认低落，这才是完整的你' },
  ],
};

// 数据太少（<=3天）
const sparseTips: Record<AnalysisPeriod, MoodTip[]> = {
  week: [
    { emoji: '📝', title: '开始记录吧', message: '多记几天心情，我就能更懂你了' },
    { emoji: '🌱', title: '小苗刚发芽', message: '记录本身就是关心自己的第一步，继续加油' },
  ],
  month: [
    { emoji: '🖋️', title: '慢慢来', message: '不着急，每天记一笔，时间会画出你的心情地图' },
    { emoji: '🧩', title: '拼图进行中', message: '每一天的心情都是一块拼图，慢慢拼出完整的你' },
  ],
  year: [
    { emoji: '🗺️', title: '旅程刚开始', message: '新的一年，让我们慢慢记录属于你的故事' },
  ],
};

// ---- 辅助函数 ----

// 简易伪随机（基于周期+记录总数，同一统计状态下返回同一条，避免每次渲染提示跳变）
function seededIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

/**
 * 根据心情统计和周期生成温馨小提示
 */
export function getMoodTip(stats: MoodStats, period: AnalysisPeriod): MoodTip | null {
  // 数据太少不给提示
  if (stats.total <= 1) return null;

  const goodRatio = stats.total > 0 ? stats.good / stats.total : 0;
  const badRatio = stats.total > 0 ? stats.bad / stats.total : 0;

  // 数据太少（<=3天），给鼓励提示
  if (stats.total <= 3) {
    const tips = sparseTips[period];
    const idx = seededIndex(`${period}-${stats.total}`, tips.length);
    return tips[idx];
  }

  // 情绪波动大（好和差都>=30%）
  if (goodRatio >= 0.3 && badRatio >= 0.3) {
    const tips = volatileTips[period];
    const idx = seededIndex(`${period}-${stats.total}`, tips.length);
    return tips[idx];
  }

  // 好心情占多数
  if (goodRatio >= 0.6) {
    const tips = goodMajorityTips[period];
    const idx = seededIndex(`${period}-${stats.total}`, tips.length);
    return tips[idx];
  }

  // 差心情占多数
  if (badRatio >= 0.4) {
    const tips = badMajorityTips[period];
    const idx = seededIndex(`${period}-${stats.total}`, tips.length);
    return tips[idx];
  }

  // 默认：中性心情占多数
  const tips = neutralMajorityTips[period];
  const idx = seededIndex(`${period}-${stats.total}`, tips.length);
  return tips[idx];
}
