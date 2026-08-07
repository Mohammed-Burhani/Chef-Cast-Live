/**
 * Responsive card wrapper for charts.
 *
 * Measures its own width via onLayout and only renders the chart children
 * once a non-zero width is known — the single source of responsive sizing for
 * web + native (no Dimensions needed).
 */

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

type ChartCardProps = {
  title: string;
  subtitle?: string;
  height?: number;
  children: (width: number) => React.ReactNode;
};

export function ChartCard({ title, subtitle, height = 200, children }: ChartCardProps) {
  const colors = useColors();
  const [width, setWidth] = useState(0);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View
        style={{ height }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && w !== width) setWidth(w);
        }}
      >
        {width > 0 ? children(width) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
