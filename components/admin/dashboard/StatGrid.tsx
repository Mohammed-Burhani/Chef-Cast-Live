/**
 * Top-of-page stat cards for the admin dashboard.
 * Primary KPI row (users, live, engagement) + compact secondary row
 * (recipes, community, follows, badges). Reuses the existing StatCard.
 */

import { View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { StatCard } from '@/components/admin/StatCard';
import type { AdminDashboardStats } from '@/lib/api/admin';

type StatGridProps = {
  stats: AdminDashboardStats;
};

export function StatGrid({ stats }: StatGridProps) {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      {/* Primary KPIs */}
      <View style={styles.grid}>
        <StatCard
          icon="users"
          value={stats.totalUsers}
          label="Total Users"
          iconColor={colors.primary}
          trend={
            stats.usersGrowthPct !== null
              ? { value: Math.abs(stats.usersGrowthPct), isPositive: stats.usersGrowthPct >= 0 }
              : undefined
          }
        />
        <StatCard
          icon="user-plus"
          value={stats.newUsersThisWeek}
          label="New Users (7d)"
          iconColor={colors.accent}
          subtitle={`Today ${stats.newUsersToday} · Month ${stats.newUsersThisMonth}`}
        />
        <StatCard
          icon="radio"
          value={stats.liveEpisodes}
          label="Live Now"
          iconColor={colors.live}
        />
        <StatCard
          icon="activity"
          value={stats.activeToday}
          label="Active Today"
          iconColor={colors.success}
        />
        <StatCard
          icon="message-circle"
          value={stats.totalAnswers}
          label="Total Answers"
          iconColor={colors.warning}
        />
        <StatCard
          icon="target"
          value={`${stats.accuracyPct}%`}
          label="Accuracy"
          iconColor={colors.success}
        />
        <StatCard
          icon="clock"
          value={`${(stats.avgResponseTimeMs / 1000).toFixed(1)}s`}
          label="Avg Response"
          iconColor={colors.warning}
        />
        <StatCard
          icon="image"
          value={stats.totalPhotos}
          label="Community Posts"
          iconColor={colors.neonRed}
          subtitle={stats.newPhotosThisWeek > 0 ? `+${stats.newPhotosThisWeek} this week` : undefined}
        />
      </View>

      {/* Secondary stats */}
      <View style={styles.grid}>
        <StatCard
          icon="book-open"
          value={stats.publishedRecipes}
          label="Published Recipes"
          iconColor={colors.primary}
          subtitle={stats.totalRecipes > stats.publishedRecipes ? `${stats.totalRecipes} total` : undefined}
        />
        <StatCard
          icon="heart"
          value={stats.totalLikes}
          label="Total Likes"
          iconColor={colors.danger}
        />
        <StatCard
          icon="message-square"
          value={stats.totalComments}
          label="Comments"
          iconColor={colors.accent}
        />
        <StatCard
          icon="users"
          value={stats.totalFollows}
          label="Follows"
          iconColor={colors.warning}
        />
        <StatCard
          icon="award"
          value={stats.totalBadgesAwarded}
          label="Badges Awarded"
          iconColor={colors.success}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
    marginBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
});
