/**
 * Line + area chart for time series (e.g. signup growth).
 * Pure react-native-svg; gridlines + tick labels styled with the brand tokens.
 */

import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import type { SeriesPoint } from '@/lib/utils/analytics';
import { niceMax, buildTicks, formatCompact, buildLinePath, buildAreaPath } from './scale';

type LineAreaChartProps = {
  data: SeriesPoint[];
  width: number;
  height?: number;
  lineColor: string;
  fillColor: string;
  strokeWidth?: number;
  yTicks?: number;
};

const PAD = { top: 16, right: 12, bottom: 24, left: 40 };

export function LineAreaChart({
  data,
  width,
  height = 200,
  lineColor,
  fillColor,
  strokeWidth = 2,
  yTicks = 4,
}: LineAreaChartProps) {
  const colors = useColors();

  if (data.length === 0 || width <= 0) return null;

  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const maxValue = Math.max(1, ...data.map((d) => d.count));
  const maxY = niceMax(maxValue);
  const ticks = buildTicks(maxY, yTicks);

  const yFor = (v: number) => PAD.top + plotH - (v / maxY) * plotH;
  const xFor = (i: number) =>
    data.length === 1
      ? PAD.left + plotW / 2
      : PAD.left + (i / (data.length - 1)) * plotW;

  const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.count) }));
  const baselineY = PAD.top + plotH;

  return (
    <Svg width={width} height={height}>
      {/* Horizontal gridlines + y labels */}
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

      {/* Area + line */}
      <Path d={buildAreaPath(points, baselineY)} fill={fillColor} />
      <Path
        d={buildLinePath(points)}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Endpoint dot */}
      <Circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3.5}
        fill={lineColor}
      />

      {/* X labels — every other bucket to avoid crowding */}
      {data.map((d, i) =>
        i % 2 === 0 || i === data.length - 1 ? (
          <SvgText
            key={d.key}
            x={xFor(i)}
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
