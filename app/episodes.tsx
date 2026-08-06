/**
 * Episodes Browse Screen
 * Shows upcoming and past episodes in tabbed view
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useColors } from "@/hooks/useColors";
import { useEpisodes } from "@/lib/api/hooks";
import type { Database } from '@/types/database';

type Episode = Database['public']['Tables']['episodes']['Row'];

function LiveBadge() {
  const colors = useColors();
  return (
    <View style={[styles.liveBadge, { backgroundColor: colors.live }]}>
      <View style={[styles.liveDot, { backgroundColor: "#fff" }]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

function CountdownTimer({ scheduledAt }: { scheduledAt: string }) {
  const colors = useColors();
  const diff = new Date(scheduledAt).getTime() - Date.now();

  if (diff < 0) {
    return (
      <Text style={[styles.countdownText, { color: colors.live }]}>
        Starting Soon
      </Text>
    );
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return (
      <Text style={[styles.countdownText, { color: colors.accent }]}>
        in {days}d {hours % 24}h
      </Text>
    );
  }
  return (
    <Text style={[styles.countdownText, { color: colors.accent }]}>
      in {hours}h {minutes}m
    </Text>
  );
}

function EpisodeCard({ episode }: { episode: Episode }) {
  const colors = useColors();
  const isPast = !!episode.ended_at; // Only ended if admin explicitly ended it
  const isLive = episode.is_live;
  const isUpcoming = !isLive && !isPast;

  return (
    <TouchableOpacity
      activeOpacity={isUpcoming ? 1 : 0.85}
      disabled={isUpcoming}
      onPress={() => router.push(`/episode/${episode.id}` as never)}
      style={[
        styles.episodeCard, 
        { backgroundColor: colors.surface },
        isUpcoming && { opacity: 0.6 }
      ]}
    >
      <View style={styles.episodeThumb}>
        <Image
          source={{ uri: episode.thumbnail_url || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800' }}
          style={styles.thumb}
          contentFit="cover"
          transition={200}
        />
        {episode.is_live && (
          <View style={styles.liveOverlay}>
            <LiveBadge />
          </View>
        )}
        {isUpcoming && (
          <View style={[styles.lockedOverlay, { backgroundColor: 'rgba(26,10,46,0.7)' }]}>
            <Feather name="lock" size={28} color="rgba(255,255,255,0.6)" />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(26,10,46,0.9)"]}
          style={styles.thumbGradient}
        />
      </View>

      <View style={styles.episodeInfo}>
        <Text style={[styles.episodeTitle, { color: colors.foreground }]} numberOfLines={2}>
          {episode.title}
        </Text>
        {episode.description && (
          <Text style={[styles.episodeDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {episode.description}
          </Text>
        )}

        <View style={styles.episodeMeta}>
          {episode.is_live ? (
            <LiveBadge />
          ) : isPast ? (
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              {new Date(episode.scheduled_at).toLocaleDateString()}
            </Text>
          ) : (
            <CountdownTimer scheduledAt={episode.scheduled_at} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EpisodesScreen() {
  const colors = useColors();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>(
    tab === 'past' ? 'past' : 'upcoming'
  );
  const { data: episodes = [], isLoading, refetch } = useEpisodes();

  // Upcoming = not live, not ended (regardless of scheduled_at)
  const upcomingEpisodes = episodes.filter(
    (ep) => !ep.is_live && !ep.ended_at
  );
  // Past = only episodes admin explicitly ended, most recent first
  const pastEpisodes = episodes
    .filter((ep) => ep.ended_at)
    .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime());

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  const displayEpisodes = activeTab === 'upcoming' ? upcomingEpisodes : pastEpisodes;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Episodes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'upcoming' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'upcoming' ? colors.primary : colors.mutedForeground }
          ]}>
            Upcoming ({upcomingEpisodes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'past' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'past' ? colors.primary : colors.mutedForeground }
          ]}>
            Past ({pastEpisodes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Episodes List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        {displayEpisodes.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="video-off" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeTab === 'upcoming' ? 'No upcoming episodes' : 'No past episodes'}
            </Text>
          </View>
        ) : (
          displayEpisodes.map((ep) => <EpisodeCard key={ep.id} episode={ep} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: { fontSize: 15, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  episodeCard: { borderRadius: 16, overflow: 'hidden' },
  episodeThumb: { position: 'relative' },
  thumb: { width: '100%', height: 200 },
  thumbGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  liveOverlay: { position: 'absolute', top: 12, left: 12 },
  lockedOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  episodeInfo: { padding: 14, gap: 6 },
  episodeTitle: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  episodeDesc: { fontSize: 13, lineHeight: 18 },
  episodeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  countdownText: { fontSize: 13, fontWeight: '600' },
  dateText: { fontSize: 13 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
