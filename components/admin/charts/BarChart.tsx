/**
 * Vertical bar chart for engagement (e.g. answers per day).
 * Zero-count buckets still render a stub so the day stays visible.
 */

import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import type { SeriesPoint } from '@/lib/utils/analytics';
import { niceMax, buildTicks, formatCompact } from './scale';

type BarChartProps = {
  data: SeriesPoint[];
  width: number;
  height?: number;
  color: string;
  highlightLast?: boolean;
  highlightColor?: string;
  yTicks?: number;
};

const PAD = { top: 16, right: 12, bottom: 24, left: 40 };

export function BarChart({
  data,
  width,
  height = 200,
  color,
  highlightLast = false,
  highlightColor,
  yTicks = 4,
}: BarChartProps) {
  const colors = useColors();

  if (data.length === 0 || width <= 0) return null;

  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const maxValue = Math.max(1, ...data.map((d) => d.count));
  const maxY = niceMax(maxValue);
  const ticks = buildTicks(maxY, yTicks);

  const yFor = (v: number) => PAD.top + plotH - (v / maxY) * plotH;
  const slot = plotW / data.length;
  const barW = Math.max(2, slot * 0.6);

  return (
    <Svg width={width} height={height}>
      {/* Gridlines + y labels */}
      {ticks.map((t) => (
        <SvgText
          key={`tick-${t}`}
          x={PAD.left - 6}
          y={yFor(t) + 3}
          fontSize={10}
          fill={colors.mutedForeground}
          textAnchor="end"
        >
          {formatCompact(t)}
        </SvgText>
      ))}
      {ticks.map((t) => (
        <Line
          key={`line-${t}`}
          x1={PAD.left}
          y1={yFor(t)}
          x2={PAD.left + plotW}
          y2={yFor(t)}
          stroke={colors.border}
          strokeWidth={1}
        />
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const h = d.count === 0 ? 2 : Math.max(2, yFor(0) - yFor(d.count));
        const x = PAD.left + slot * i + (slot - barW) / 2;
        const y = d.count === 0 ? yFor(0) - 2 : yFor(d.count);
        const barColor = highlightLast && i === data.length - 1
          ? highlightColor ?? color
          : color;
        return (
          <Rect
            key={d.key}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={3}
            fill={barColor}
          />
        );
      })}

      {/* X labels — every other bucket */}
      {data.map((d, i) =>
        i % 2 === 0 || i === data.length - 1 ? (
          <SvgText
            key={d.key}
            x={PAD.left + slot * i + slot / 2}
            y={height - 6}
            fontSize={10}
            fill={colors.mutedForeground}
            textAnchor="middle"
          >
            {d.label}
          </SvgText>
        ) : null
      )}
    </Svg>
  );
}
