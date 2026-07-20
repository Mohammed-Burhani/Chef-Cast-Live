/**
 * LeaderboardPanel Component
 * Shows top N players + current user's position
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { LeaderboardEntry } from '@/store/useLiveQuizStore';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  viewerRank: number | null;
  currentUserScore?: number;
  currentUserCorrect?: number;
  compact?: boolean; // Show only top 3 (for revealing phase)
  title?: string;
}

export function LeaderboardPanel({
  entries,
  viewerRank,
  currentUserScore,
  currentUserCorrect,
  compact = false,
  title = 'Leaderboard',
}: LeaderboardPanelProps) {
  const colors = useColors();

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return colors.mutedForeground;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const isUserInTopSection = compact
    ? entries.slice(0, 3).some(e => e.isCurrentUser)
    : entries.slice(0, 5).some(e => e.isCurrentUser);

  const displayedEntries = compact ? entries.slice(0, 3) : entries.slice(0, 5);

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      )}

      {/* Compact: horizontal top 3 */}
      {compact ? (
        <View style={styles.topThreeRow}>
          {displayedEntries.map((entry, idx) => (
            <View
              key={entry.userId}
              style={[
                styles.topCard,
                {
                  backgroundColor: entry.isCurrentUser
                    ? `${colors.accent}20`
                    : colors.surface,
                  borderColor: entry.isCurrentUser ? colors.accent : 'transparent',
                },
              ]}
            >
              <Text style={styles.medalEmoji}>{getRankIcon(idx + 1)}</Text>
              <Text style={[styles.topUsername, { color: colors.foreground }]} numberOfLines={1}>
                {entry.username}
              </Text>
              <Text style={[styles.topScore, { color: colors.accent }]}>
                {entry.totalScore.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          scrollEnabled={entries.length > 5}
          showsVerticalScrollIndicator={false}
        >
          {/* Full list: top 5 */}
          <View style={styles.list}>
            {displayedEntries.map((entry, idx) => (
              <View
                key={entry.userId}
                style={[
                  styles.row,
                  {
                    backgroundColor: entry.isCurrentUser
                      ? `${colors.accent}15`
                      : colors.surface,
                    borderColor: entry.isCurrentUser ? colors.accent : 'transparent',
                    borderWidth: entry.isCurrentUser ? 2 : 0,
                  },
                ]}
              >
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.rankBadge,
                      { backgroundColor: idx < 3 ? getMedalColor(idx + 1) : `${colors.mutedForeground}22` },
                    ]}
                  >
                    <Text style={[styles.rankText, { color: idx < 3 ? '#1A1A1A' : colors.foreground }]}>
                      {getRankIcon(idx + 1)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.username, { color: entry.isCurrentUser ? colors.accent : colors.foreground }]}
                    numberOfLines={1}
                  >
                    {entry.username}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.scoreValue, { color: entry.isCurrentUser ? colors.accent : colors.accent }]}>
                    {entry.totalScore.toLocaleString()}
                  </Text>
                  <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
                    pts
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* User's position if not in top section */}
      {!isUserInTopSection && viewerRank && (
        <View style={[styles.userFooter, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
          <View style={styles.footerLeft}>
            <View style={[styles.rankBadge, { backgroundColor: `${colors.accent}22` }]}>
              <Text style={[styles.rankText, { color: colors.accent }]}>#{viewerRank}</Text>
            </View>
            <Text style={[styles.footerLabel, { color: colors.foreground }]}>You</Text>
          </View>
          {currentUserScore !== undefined && (
            <Text style={[styles.footerScore, { color: colors.accent }]}>
              {currentUserScore.toLocaleString()} pts
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  topThreeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  topCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  medalEmoji: {
    fontSize: 24,
  },
  topUsername: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  topScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankBadge: {
    width: 34,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '800',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 10,
  },
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerScore: {
    fontSize: 16,
    fontWeight: '800',
  },
});
