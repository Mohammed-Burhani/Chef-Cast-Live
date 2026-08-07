/**
 * Donut chart for category shares (e.g. episode status distribution).
 * Uses the same strokeDasharray / rotation / origin arc technique as
 * XPProgressRing; the center value is plain RN Text for crisp rendering.
 */

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
};

export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 22,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const colors = useColors();
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const frac = total > 0 ? seg.value / total : 0;
    const arc = {
      ...seg,
      dash: frac * circumference,
      gap: circumference - frac * circumference,
      offset: -offset * circumference,
    };
    offset += frac;
    return arc;
  });

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={styles.svg}>
          {total === 0 ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.border}
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : (
            arcs.map((arc) => (
              <Circle
                key={arc.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={arc.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={arc.offset}
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            ))
          )}
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.centerValue, { color: colors.foreground }]}>
            {centerValue ?? total}
          </Text>
          {centerLabel ? (
            <Text style={[styles.centerLabel, { color: colors.mutedForeground }]}>
              {centerLabel}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={[styles.legendLabel, { color: colors.foreground }]}>
              {seg.label}
            </Text>
            <Text style={[styles.legendValue, { color: colors.mutedForeground }]}>
              {seg.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});
