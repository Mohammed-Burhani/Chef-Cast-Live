/**
 * Compact quick-actions strip for common admin tasks.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type Action = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  route: string;
};

export function QuickActions() {
  const colors = useColors();

  const actions: Action[] = [
    { icon: 'plus-circle', label: 'Create Episode', color: colors.primary, route: '/(admin)/episodes' },
    { icon: 'radio', label: 'Live Control', color: colors.live, route: '/(admin)/live-control' },
    { icon: 'book-open', label: 'Manage Recipes', color: colors.neonRed, route: '/(admin)/recipes' },
    { icon: 'volume-2', label: 'Announcements', color: colors.warning, route: '/(admin)/announcements' },
    { icon: 'users', label: 'Community', color: colors.accent, route: '/(admin)/community' },
    { icon: 'user', label: 'Manage Users', color: colors.warning, route: '/(admin)/users' },
    { icon: 'trending-up', label: 'View Analytics', color: colors.success, route: '/(admin)/analytics' },
  ];

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.actionCard, { backgroundColor: action.color }]}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.8}
          >
            <Feather name={action.icon} size={22} color="#fff" />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    flexDirection: 'row',
  },
  actionLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
