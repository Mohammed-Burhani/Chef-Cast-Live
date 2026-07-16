/**
 * Admin Analytics - Episode stats and leaderboard
 */

import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useEpisodes } from '@/lib/api/hooks';
import { useEpisodeStats } from '@/lib/api/admin-hooks';
import { useState } from 'react';

export default function AdminAnalytics() {
  const colors = useColors();
  const params = useLocalSearchParams();
  const { data: episodes = [] } = useEpisodes();
  
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    (params.episodeId as string) || null
  );

  const { data: stats, isLoading } = useEpisodeStats(selectedEpisodeId);

  const handleSelectEpisode = (episodeId: string) => {
    setSelectedEpisodeId(episodeId);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Episode Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Episode</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.episodeList}>
            {episodes.filter(ep => ep.ended_at || ep.is_live).map((ep) => (
              <TouchableOpacity
                key={ep.id}
                style={[
                  styles.episodeChip,
                  { backgroundColor: selectedEpisodeId === ep.id ? colors.primary : colors.surface },
                ]}
                onPress={() => handleSelectEpisode(ep.id)}
              >
                <Text
                  style={[
                    styles.episodeChipText,
                    { color: selectedEpisodeId === ep.id ? '#fff' : colors.foreground },
                  ]}
                  numberOfLines={1}
                >
                  {ep.title}
                </Text>
                {ep.is_live && (
                  <View style={[styles.liveDot, { backgroundColor: colors.live }]} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stats */}
        {!selectedEpisodeId ? (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Select an episode to view analytics
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading stats...</Text>
          </View>
        ) : !stats ? (
          <View style={styles.emptyState}>
            <Feather name="alert-circle" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No data available for this episode
            </Text>
          </View>
        ) : (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Feather name="users" size={24} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {stats.totalParticipants}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Participants</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Feather name="help-circle" size={24} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {stats.totalQuestions}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Questions</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Feather name="check-circle" size={24} color={colors.success} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {stats.accuracy.toFixed(1)}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Accuracy</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Feather name="clock" size={24} color={colors.warning} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {(stats.avgResponseTime / 1000).toFixed(1)}s
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Avg Response</Text>
              </View>
            </View>

            {/* Leaderboard */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Top 10 Leaderboard
              </Text>

              {stats.leaderboard && stats.leaderboard.length > 0 ? (
                <View style={styles.leaderboard}>
                  {stats.leaderboard.map((entry: any, index: number) => (
                    <View key={entry.id} style={[styles.leaderboardRow, { backgroundColor: colors.surface }]}>
                      <View
                        style={[
                          styles.rank,
                          index === 0 && { backgroundColor: '#FFD700' },
                          index === 1 && { backgroundColor: '#C0C0C0' },
                          index === 2 && { backgroundColor: '#CD7F32' },
                          index > 2 && { backgroundColor: colors.muted },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankText,
                            { color: index < 3 ? '#000' : colors.foreground },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View style={styles.leaderboardInfo}>
                        <Text style={[styles.leaderboardName, { color: colors.foreground }]}>
                          {entry.profiles?.username || 'Unknown'}
                        </Text>
                        <Text style={[styles.leaderboardMeta, { color: colors.mutedForeground }]}>
                          {entry.correct_count} correct • {entry.total_score} pts
                        </Text>
                      </View>

                      <View style={styles.leaderboardScore}>
                        <Text style={[styles.scoreValue, { color: colors.primary }]}>
                          {entry.total_score}
                        </Text>
                        <Feather name="award" size={16} color={colors.mutedForeground} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No participants yet
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
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
  episodeList: {
    gap: 12,
    paddingBottom: 4,
  },
  episodeChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 250,
  },
  episodeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 20,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
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
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  leaderboard: {
    gap: 8,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 12,
  },
  rank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  leaderboardMeta: {
    fontSize: 12,
  },
  leaderboardScore: {
    alignItems: 'center',
    gap: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
  },
});
