/**
 * Global top scorers — leaderboard by lifetime XP (rank 1-3 medal colors).
 * Mirrors the row style used in the episode analytics page.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { TopScorer } from '@/lib/api/admin';

type TopScorersProps = {
  scorers: TopScorer[];
};

const MEDALS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export function TopScorers({ scorers }: TopScorersProps) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Top Scorers — All Time
      </Text>

      {scorers.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <Feather name="award" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No players yet
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {scorers.map((scorer, index) => (
            <View key={scorer.id} style={[styles.row, { backgroundColor: colors.surface }]}>
              <View
                style={[
                  styles.rank,
                  index < 3 ? { backgroundColor: MEDALS[index] } : { backgroundColor: colors.muted },
                ]}
              >
                <Text style={[styles.rankText, { color: index < 3 ? '#000' : colors.foreground }]}>
                  {scorer.rank}
                </Text>
              </View>

              <View style={[styles.avatar, { backgroundColor: `${colors.primary}33` }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {scorer.username?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>

              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {scorer.username}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {scorer.level_title} · {scorer.total_correct} correct · {scorer.episodes_participated} episodes
                </Text>
              </View>

              <View style={styles.score}>
                <Text style={[styles.xpValue, { color: colors.primary }]}>
                  {scorer.xp.toLocaleString()}
                </Text>
                <Feather name="zap" size={16} color={colors.mutedForeground} />
              </View>
            </View>
          ))}
        </View>
      )}
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
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    gap: 8,
  },
  row: {
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: '800',
  },
});
