import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MoodLevel } from '../types';
import { MOOD_CONFIG, COLORS } from '../constants';

interface MoodIconProps {
  /** 心情等级：差 / 中 / 好 */
  mood: MoodLevel;
  /** 图标尺寸，默认 40（与小组件原始尺寸一致） */
  size?: number;
  /** 是否选中，选中时主色加深 + 背景可被覆盖（用于融入选中按钮底色） */
  isSelected?: boolean;
  /** 覆盖圆形背景色（如选中态传半透明白，让图标融入按钮底色） */
  bgOverride?: string;
}

// 弱化描边色：与小组件原生矢量图标的描边一致（bad=#C5CAE9 / okay=#FFE0B2 / good=#C8E6C9）
const MOOD_ICON_STROKE: Record<MoodLevel, string> = {
  bad: '#C5CAE9',
  okay: '#FFE0B2',
  good: '#C8E6C9',
};

// 圆形背景色：与小组件原生一致（badBg/okayBg/goodBg）
const MOOD_ICON_BG: Record<MoodLevel, string> = {
  bad: COLORS.badBg,
  okay: COLORS.okayBg,
  good: COLORS.goodBg,
};

/**
 * 心情图标组件
 *
 * 使用 react-native-svg 复刻 Android 小组件的三套心情矢量图标。
 * 色彩单一数据源为 MOOD_CONFIG（主笔画）+ 小组件对齐的浅背景/弱描边：
 * - bad：淡靛蓝圆形 + 圆点眼 + 下弯嘴
 * - okay：淡琥珀圆形 + 圆点眼 + 直线嘴
 * - good：淡绿圆形 + 弯弯笑眼 + 上弯嘴
 *
 * 设计参数与小组件矢量保持一致：viewport 40x40，圆形半径 16，
 * 主笔画 strokeWidth=1.8，描边 strokeWidth=1，strokeLineCap="round"。
 */
function MoodIconBase({ mood, size = 40, isSelected = false, bgOverride }: MoodIconProps) {
  // 选中时颜色轻微加深系数，保持原配色基调
  const darken = isSelected ? 0.88 : 1;
  const mainColor = MOOD_CONFIG[mood].color;
  const bgColor = bgOverride ?? MOOD_ICON_BG[mood];
  const strokeColor = bgOverride ? 'transparent' : MOOD_ICON_STROKE[mood];

  // 差：圆点眼 + 下弯嘴
  if (mood === 'bad') {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {/* 圆形背景 */}
        <Circle cx="20" cy="20" r="16" fill={bgColor} />
        {/* 圆形描边 */}
        <Circle
          cx="20"
          cy="20"
          r="16"
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={1}
        />
        {/* 左眼 - 圆点 */}
        <Circle cx="14.5" cy="15.5" r="1.5" fill={mainColor} />
        {/* 右眼 - 圆点 */}
        <Circle cx="25.5" cy="15.5" r={1.5} fill={mainColor} />
        {/* 下弯嘴 */}
        <Path
          d="M14.5,27 Q20,22.5 25.5,27"
          fill="transparent"
          stroke={mainColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={darken}
        />
      </Svg>
    );
  }

  // 中：圆点眼 + 直线嘴
  if (mood === 'okay') {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {/* 圆形背景 */}
        <Circle cx="20" cy="20" r="16" fill={bgColor} />
        {/* 圆形描边 */}
        <Circle
          cx="20"
          cy="20"
          r="16"
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={1}
        />
        {/* 左眼 - 圆点 */}
        <Circle cx="14.5" cy="16" r={1.5} fill={mainColor} />
        {/* 右眼 - 圆点 */}
        <Circle cx="25.5" cy="16" r={1.5} fill={mainColor} />
        {/* 直线嘴 */}
        <Path
          d="M15,25 L25,25"
          stroke={mainColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={darken}
        />
      </Svg>
    );
  }

  // 好：弯弯笑眼 + 上弯嘴
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* 圆形背景 */}
      <Circle cx="20" cy="20" r="16" fill={bgColor} />
      {/* 圆形描边 */}
      <Circle
        cx="20"
        cy="20"
        r="16"
        fill="transparent"
        stroke={strokeColor}
        strokeWidth={1}
      />
      {/* 左眼 - 弯弯笑眼 */}
      <Path
        d="M12,17 Q14.5,13 17,17"
        fill="transparent"
        stroke={mainColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={darken}
      />
      {/* 右眼 - 弯弯笑眼 */}
      <Path
        d="M23,17 Q25.5,13 28,17"
        fill="transparent"
        stroke={mainColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={darken}
      />
      {/* 上弯嘴 */}
      <Path
        d="M14.5,24 Q20,30 25.5,24"
        fill="transparent"
        stroke={mainColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={darken}
      />
    </Svg>
  );
}

// 用 React.memo 包装避免父组件 re-render 时无差别重绘 SVG
const MoodIcon = React.memo(MoodIconBase);
export default MoodIcon;
