/**
 * Reusable stat card component for admin dashboard
 */

import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type StatCardProps = {
  icon: keyof typeof Feather.glyphMap;
  value: string | number;
  label: string;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
};

export function StatCard({ icon, value, label, iconColor, trend }: StatCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.iconContainer}>
        <Feather name={icon} size={24} color={iconColor || colors.primary} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
        
        {trend && (
          <View style={styles.trend}>
            <Feather
              name={trend.isPositive ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend.isPositive ? colors.success : colors.danger}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend.isPositive ? colors.success : colors.danger },
              ]}
            >
              {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
