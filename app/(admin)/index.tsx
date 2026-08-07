import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useDashboardStats } from '@/lib/api/admin-hooks';
import { StatGrid } from '@/components/admin/dashboard/StatGrid';
import { SignupGrowthCard } from '@/components/admin/dashboard/SignupGrowthCard';
import { AnswersPerDayCard } from '@/components/admin/dashboard/AnswersPerDayCard';
import { EpisodeStatusCard } from '@/components/admin/dashboard/EpisodeStatusCard';
import { TopScorers } from '@/components/admin/dashboard/TopScorers';
import { TopEpisodes } from '@/components/admin/dashboard/TopEpisodes';
import { QuickActions } from '@/components/admin/dashboard/QuickActions';

export default function AdminDashboard() {
  const colors = useColors();
  const { data: stats, isLoading, isError, refetch, dataUpdatedAt } = useDashboardStats();

  return (
    <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Dashboard Overview</Text>
          {dataUpdatedAt > 0 && (
            <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>
              Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={() => refetch()}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={18} color={colors.primary} />
          <Text style={[styles.refreshLabel, { color: colors.primary }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
            Loading analytics...
          </Text>
        </View>
      ) : isError || !stats ? (
        <View style={styles.centerState}>
          <Feather name="alert-circle" size={56} color={colors.danger} />
          <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
            Couldn't load dashboard data.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* KPI cards */}
          <StatGrid stats={stats} />

          {/* Signup growth — full width */}
          <View style={styles.fullWidth}>
            <SignupGrowthCard data={stats.signupsSeries} />
          </View>

          {/* Engagement + episode status side by side */}
          <View style={styles.chartsRow}>
            <View style={styles.chartCol}>
              <AnswersPerDayCard data={stats.answersDaily} />
            </View>
            <View style={styles.chartCol}>
              <EpisodeStatusCard status={stats.episodeStatus} />
            </View>
          </View>

          {/* Rankings */}
          <TopScorers scorers={stats.topScorers} />
          <TopEpisodes episodes={stats.topEpisodes} />

          {/* Quick actions */}
          <QuickActions />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1 },
  mainContent: {
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 60,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  lastUpdated: { fontSize: 12 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  refreshLabel: { fontSize: 13, fontWeight: '700' },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    gap: 16,
  },
  centerText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  fullWidth: {
    marginBottom: 16,
  },
  chartsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  chartCol: {
    flex: 1,
    minWidth: 320,
  },
});
