/**
 * Admin Analytics - View stats and insights
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';

export default function AdminAnalytics() {
  const colors = useColors();

  // Placeholder data - replace with real API calls
  const stats = {
    totalUsers: 2456,
    activeUsers: 1823,
    totalEpisodes: 48,
    totalQuestions: 284,
    avgEngagement: 82,
    avgResponseTime: 4.2,
  };

  const topEpisodes = [
    { title: 'Perfect Pasta Techniques', views: 3421, engagement: 94 },
    { title: 'Sushi Master Class', views: 3102, engagement: 91 },
    { title: 'French Pastry Basics', views: 2874, engagement: 88 },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Feather name="users" size={24} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {stats.totalUsers.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Users</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Feather name="activity" size={24} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {stats.activeUsers.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active Users</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Feather name="tv" size={24} color={colors.accent} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.totalEpisodes}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Episodes</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Feather name="help-circle" size={24} color={colors.warning} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.totalQuestions}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Questions</Text>
            </View>
          </View>
        </View>

        {/* Engagement Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Engagement</Text>
          <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
                Average Engagement Rate
              </Text>
              <Text style={[styles.metricValue, { color: colors.foreground }]}>{stats.avgEngagement}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.success, width: `${stats.avgEngagement}%` },
                ]}
              />
            </View>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
                Average Response Time
              </Text>
              <Text style={[styles.metricValue, { color: colors.foreground }]}>{stats.avgResponseTime}s</Text>
            </View>
          </View>
        </View>

        {/* Top Episodes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Episodes</Text>
          {topEpisodes.map((ep, idx) => (
            <View key={idx} style={[styles.episodeCard, { backgroundColor: colors.surface }]}>
              <View style={styles.episodeRank}>
                <Text style={[styles.rankText, { color: colors.primary }]}>#{idx + 1}</Text>
              </View>
              <View style={styles.episodeInfo}>
                <Text style={[styles.episodeTitle, { color: colors.foreground }]}>{ep.title}</Text>
                <View style={styles.episodeStats}>
                  <View style={styles.episodeStat}>
                    <Feather name="eye" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.episodeStatText, { color: colors.mutedForeground }]}>
                      {ep.views.toLocaleString()} views
                    </Text>
                  </View>
                  <View style={styles.episodeStat}>
                    <Feather name="zap" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.episodeStatText, { color: colors.mutedForeground }]}>
                      {ep.engagement}% engagement
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.comingSoon, { backgroundColor: colors.surface }]}>
          <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
          <Text style={[styles.comingSoonText, { color: colors.foreground }]}>More analytics coming soon</Text>
          <Text style={[styles.comingSoonDesc, { color: colors.mutedForeground }]}>
            Charts, graphs, and detailed reports will be added in future updates
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 12,
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  episodeRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: '800',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  episodeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  episodeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  episodeStatText: {
    fontSize: 12,
  },
  comingSoon: {
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  comingSoonDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
});
