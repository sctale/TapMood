import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { MoodLevel } from '../types';

interface MoodIconProps {
  /** 心情等级：差 / 中 / 好 */
  mood: MoodLevel;
  /** 图标尺寸，默认 40（与小组件原始尺寸一致） */
  size?: number;
  /** 是否选中，选中时略微加深主色以提供视觉反馈，但不破坏原有配色 */
  isSelected?: boolean;
}

/**
 * 心情图标组件
 *
 * 使用 react-native-svg 复刻 Android 小组件的三套心情矢量图标：
 * - bad：淡紫圆形 + 圆点眼 + 下弯嘴
 * - okay：暖灰圆形 + 圆点眼 + 直线嘴
 * - good：薄荷绿圆形 + 弯弯笑眼 + 上弯嘴
 *
 * 设计参数与小组件 SVG 保持一致：viewport 40x40，圆形半径 16，
 * 主笔画 strokeWidth=1.8，描边 strokeWidth=1，strokeLineCap="round"。
 */
export default function MoodIcon({ mood, size = 40, isSelected = false }: MoodIconProps) {
  // 选中时颜色轻微加深系数，保持原配色基调
  const darken = isSelected ? 0.88 : 1;

  // 差：淡紫色系
  if (mood === 'bad') {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {/* 圆形背景 */}
        <Circle cx="20" cy="20" r="16" fill="#EDE7F6" />
        {/* 圆形描边 */}
        <Circle
          cx="20"
          cy="20"
          r="16"
          fill="transparent"
          stroke="#D1C4E9"
          strokeWidth={1}
        />
        {/* 左眼 - 圆点 */}
        <Circle cx="14.5" cy="15.5" r="1.5" fill="#7E57C2" />
        {/* 右眼 - 圆点 */}
        <Circle cx="25.5" cy="15.5" r="1.5" fill="#7E57C2" />
        {/* 下弯嘴 */}
        <Path
          d="M14.5,27 Q20,22.5 25.5,27"
          fill="transparent"
          stroke="#7E57C2"
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={darken}
        />
      </Svg>
    );
  }

  // 中：暖灰色系
  if (mood === 'okay') {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {/* 圆形背景 */}
        <Circle cx="20" cy="20" r="16" fill="#ECEFF1" />
        {/* 圆形描边 */}
        <Circle
          cx="20"
          cy="20"
          r="16"
          fill="transparent"
          stroke="#CFD8DC"
          strokeWidth={1}
        />
        {/* 左眼 - 圆点 */}
        <Circle cx="14.5" cy="16" r="1.5" fill="#78909C" />
        {/* 右眼 - 圆点 */}
        <Circle cx="25.5" cy="16" r="1.5" fill="#78909C" />
        {/* 直线嘴 */}
        <Path
          d="M15,25 L25,25"
          stroke="#78909C"
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={darken}
        />
      </Svg>
    );
  }

  // 好：薄荷绿色系
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* 圆形背景 */}
      <Circle cx="20" cy="20" r="16" fill="#E0F2F1" />
      {/* 圆形描边 */}
      <Circle
        cx="20"
        cy="20"
        r="16"
        fill="transparent"
        stroke="#B2DFDB"
        strokeWidth={1}
      />
      {/* 左眼 - 弯弯笑眼 */}
      <Path
        d="M12,17 Q14.5,13 17,17"
        fill="transparent"
        stroke="#26A69A"
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={darken}
      />
      {/* 右眼 - 弯弯笑眼 */}
      <Path
        d="M23,17 Q25.5,13 28,17"
        fill="transparent"
        stroke="#26A69A"
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={darken}
      />
      {/* 上弯嘴 */}
      <Path
        d="M14.5,24 Q20,30 25.5,24"
        fill="transparent"
        stroke="#26A69A"
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={darken}
      />
    </Svg>
  );
}
