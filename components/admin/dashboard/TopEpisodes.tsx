/**
 * Top watched episodes — ranked by participant count. Tap a row to open that
 * episode's analytics page with it pre-selected.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { TopEpisode } from '@/lib/utils/analytics';

type TopEpisodesProps = {
  episodes: TopEpisode[];
};

function StatusPill({ status }: { status: TopEpisode['status'] }) {
  const colors = useColors();
  const color =
    status === 'live' ? colors.live : status === 'ended' ? colors.accent : colors.mutedForeground;

  return (
    <View style={[styles.pill, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.pillText, { color }]}>
        {status === 'live' ? 'LIVE' : status === 'ended' ? 'Ended' : 'Scheduled'}
      </Text>
    </View>
  );
}

export function TopEpisodes({ episodes }: TopEpisodesProps) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Top Watched Episodes — All Time
      </Text>

      {episodes.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <Feather name="tv" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No episodes with players yet
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {episodes.map((ep, index) => (
            <TouchableOpacity
              key={ep.episodeId}
              style={[styles.row, { backgroundColor: colors.surface }]}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/(admin)/analytics',
                  params: { episodeId: ep.episodeId },
                } as any)
              }
            >
              <View style={[styles.rank, { backgroundColor: colors.muted }]}>
                <Text style={[styles.rankText, { color: colors.foreground }]}>{index + 1}</Text>
              </View>

              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
                    {ep.title}
                  </Text>
                  <StatusPill status={ep.status} />
                </View>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {ep.participants} players · {ep.totalAnswers} answers · {ep.accuracyPct}% accuracy
                </Text>
              </View>

              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
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
  info: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  pill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  meta: {
    fontSize: 12,
    marginTop: 4,
  },
});
