import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useDashboardStats } from '@/lib/api/admin-hooks';
import { StatCard } from '@/components/admin/StatCard';

export default function AdminDashboard() {
  const colors = useColors();
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Dashboard Overview</Text>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="users"
          value={stats?.totalUsers || 0}
          label="Total Users"
          iconColor={colors.primary}
          trend={stats?.newUsersThisWeek ? { value: stats.newUsersThisWeek, isPositive: true } : undefined}
        />
        <StatCard
          icon="radio"
          value={stats?.liveEpisodes || 0}
          label="Live Now"
          iconColor={colors.live}
        />
        <StatCard
          icon="calendar"
          value={stats?.upcomingEpisodes || 0}
          label="Upcoming"
          iconColor={colors.accent}
        />
        <StatCard
          icon="check-circle"
          value={stats?.completedEpisodes || 0}
          label="Completed"
          iconColor={colors.success}
        />
        <StatCard
          icon="message-circle"
          value={stats?.totalAnswers || 0}
          label="Total Answers"
          iconColor={colors.warning}
        />
        <StatCard
          icon="image"
          value={stats?.totalPhotos || 0}
          label="Community Posts"
          iconColor={colors.neonRed}
        />
        <StatCard
          icon="book-open"
          value={stats?.publishedRecipes ?? stats?.totalRecipes ?? 0}
          label="Published Recipes"
          iconColor={colors.primary}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(admin)/episodes' as any)}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={28} color="#fff" />
            <Text style={styles.actionLabel}>Create Episode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.live }]}
            onPress={() => router.push('/(admin)/live-control' as any)}
            activeOpacity={0.8}
          >
            <Feather name="radio" size={28} color="#fff" />
            <Text style={styles.actionLabel}>Live Control</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.neonRed }]}
            onPress={() => router.push('/(admin)/recipes' as any)}
            activeOpacity={0.8}
          >
            <Feather name="book-open" size={28} color="#fff" />
            <Text style={styles.actionLabel}>Manage Recipes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/(admin)/community' as any)}
            activeOpacity={0.8}
          >
            <Feather name="users" size={28} color="#fff" />
            <Text style={styles.actionLabel}>Community</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.warning }]}
            onPress={() => router.push('/(admin)/users' as any)}
            activeOpacity={0.8}
          >
            <Feather name="user" size={28} color="#fff" />
            <Text style={styles.actionLabel}>Manage Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.success }]}
            onPress={() => router.push('/(admin)/analytics' as any)}
            activeOpacity={0.8}
          >
            <Feather name="trending-up" size={28} color="#fff" />
            <Text style={styles.actionLabel}>View Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Engagement Stats */}
      {stats && stats.totalAnswers > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Engagement</Text>
          <View style={[styles.engagementCard, { backgroundColor: colors.surface }]}>
            <View style={styles.engagementRow}>
              <View style={styles.engagementItem}>
                <Text style={[styles.engagementValue, { color: colors.success }]}>
                  {((stats.correctAnswers / stats.totalAnswers) * 100).toFixed(1)}%
                </Text>
                <Text style={[styles.engagementLabel, { color: colors.mutedForeground }]}>
                  Correct Answers
                </Text>
              </View>
              <View style={styles.engagementItem}>
                <Text style={[styles.engagementValue, { color: colors.primary }]}>
                  {stats.totalAnswers.toLocaleString()}
                </Text>
                <Text style={[styles.engagementLabel, { color: colors.mutedForeground }]}>
                  Total Responses
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1 },
  mainContent: {
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 60,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', marginBottom: 24 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    minWidth: 150,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  actionLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  engagementCard: {
    padding: 20,
    borderRadius: 12,
  },
  engagementRow: {
    flexDirection: 'row',
    gap: 24,
  },
  engagementItem: {
    flex: 1,
    alignItems: 'center',
  },
  engagementValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
  },
  engagementLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
