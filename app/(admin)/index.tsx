import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useEpisodes } from '@/lib/api/hooks';

export default function AdminDashboard() {
  const colors = useColors();
  const { data: episodes = [], isLoading } = useEpisodes();

  const liveEpisodes = episodes.filter(ep => ep.is_live);
  const upcomingEpisodes = episodes.filter(ep => !ep.is_live && !ep.ended_at);
  const pastEpisodes = episodes.filter(ep => ep.ended_at);

  return (
    <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Dashboard Overview</Text>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Feather name="radio" size={24} color={colors.live} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{liveEpisodes.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Live Now</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Feather name="calendar" size={24} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{upcomingEpisodes.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Upcoming</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Feather name="check-circle" size={24} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{pastEpisodes.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Completed</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Feather name="users" size={24} color={colors.accent} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>2.4k</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active Users</Text>
        </View>
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
            <Text style={styles.actionLabel}>Go Live</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/(admin)/analytics' as any)}
            activeOpacity={0.8}
          >
            <Feather name="trending-up" size={28} color="#fff" />
            <Text style={styles.actionLabel}>View Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Episodes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Episodes</Text>
        {isLoading ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading...</Text>
        ) : episodes.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No episodes yet</Text>
        ) : (
          episodes.slice(0, 5).map(ep => (
            <TouchableOpacity
              key={ep.id}
              style={[styles.episodeRow, { backgroundColor: colors.surface }]}
              onPress={() => router.push(`/(admin)/questions/${ep.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.episodeInfo}>
                <Text style={[styles.episodeTitle, { color: colors.foreground }]}>{ep.title}</Text>
                <Text style={[styles.episodeDate, { color: colors.mutedForeground }]}>
                  {new Date(ep.scheduled_at).toLocaleDateString()}
                </Text>
              </View>
              {ep.is_live && (
                <View style={[styles.liveBadge, { backgroundColor: colors.live }]}>
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  mainContent: {
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 60,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 12,
    gap: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeDate: {
    fontSize: 12,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
