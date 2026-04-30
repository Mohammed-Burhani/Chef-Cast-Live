/**
 * Home Feed screen — the main landing screen after login.
 * Shows: live episode banner, upcoming episodes, user progress summary,
 * community highlights, and mystery box status.
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StreakFlame } from "@/components/gamification/StreakFlame";
import { XPProgressRing } from "@/components/gamification/XPProgressRing";
import { MOCK_COMMUNITY_POSTS, MOCK_EPISODES } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/store/useAuthStore";
import { useGamificationStore } from "@/store/useGamificationStore";
import { usePollStore } from "@/store/usePollStore";
import { Episode } from "@/types";

function LiveBadge() {
  const colors = useColors();
  return (
    <View style={[styles.liveBadge, { backgroundColor: colors.live }]}>
      <View style={[styles.liveDot, { backgroundColor: "#fff" }]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

function CountdownTimer({ broadcastAt }: { broadcastAt: string }) {
  const colors = useColors();
  const diff = new Date(broadcastAt).getTime() - Date.now();
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

function EpisodeCard({ episode, compact }: { episode: Episode; compact?: boolean }) {
  const colors = useColors();
  const difficultyColors = { easy: colors.success, medium: colors.accent, hard: colors.danger };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/episode/${episode.id}` as never)}
      style={[
        styles.episodeCard,
        compact && styles.episodeCardCompact,
        { backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.episodeThumb}>
        <Image
          source={{ uri: episode.thumbnailUrl }}
          style={compact ? styles.thumbCompact : styles.thumb}
          contentFit="cover"
          transition={200}
        />
        {episode.isLive && (
          <View style={styles.liveOverlay}>
            <LiveBadge />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={compact ? styles.thumbGradientCompact : styles.thumbGradient}
        />
      </View>

      <View style={[styles.episodeInfo, compact && styles.episodeInfoCompact]}>
        <Text style={[styles.episodeTitle, { color: colors.foreground }]} numberOfLines={2}>
          {episode.title}
        </Text>
        <Text style={[styles.chefName, { color: colors.mutedForeground }]}>
          {episode.chefName}
        </Text>

        <View style={styles.episodeMeta}>
          <View style={[styles.difficultyBadge, { backgroundColor: `${difficultyColors[episode.difficulty]}22` }]}>
            <Text style={[styles.difficultyText, { color: difficultyColors[episode.difficulty] }]}>
              {episode.difficulty}
            </Text>
          </View>
          {!episode.isLive && new Date(episode.broadcastAt) > new Date() && (
            <CountdownTimer broadcastAt={episode.broadcastAt} />
          )}
          <Text style={[styles.duration, { color: colors.mutedForeground }]}>
            {episode.duration}min
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { xpTotal, currentStreak, badges } = useGamificationStore();
  const showPoll = usePollStore((s) => s.showPoll);
  const [refreshing, setRefreshing] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const liveEpisode = MOCK_EPISODES.find((e) => e.isLive);
  const upcomingEpisodes = MOCK_EPISODES.filter((e) => !e.isLive);
  const unlockedBadges = badges.filter((b) => b.isUnlocked).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const triggerMockPoll = () => {
    showPoll({
      id: "poll-live-001",
      episodeId: "ep-001",
      question: "Which wine should Chef Marco use for the risotto?",
      isActive: true,
      options: [
        { id: "opt-1", label: "Dry Vermouth", votes: 234 },
        { id: "opt-2", label: "Pinot Grigio", votes: 189 },
        { id: "opt-3", label: "Chardonnay", votes: 156 },
        { id: "opt-4", label: "Sauvignon Blanc", votes: 98 },
      ],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{getGreeting()},</Text>
              <Text style={[styles.username, { color: colors.foreground }]}>
                {user?.displayName ?? "Chef"}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <StreakFlame streak={currentStreak} size="sm" />
              <TouchableOpacity
                style={[styles.notifBtn, { backgroundColor: colors.surface }]}
                onPress={triggerMockPoll}
              >
                <Feather name="bell" size={18} color={colors.foreground} />
                <View style={[styles.notifDot, { backgroundColor: colors.live }]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Live Episode Banner */}
        {liveEpisode && (
          <View style={styles.section}>
            <View style={[styles.liveBanner, { backgroundColor: `${colors.live}15`, borderColor: `${colors.live}40` }]}>
              <View style={styles.liveBannerHeader}>
                <LiveBadge />
                <Text style={[styles.liveBannerTitle, { color: colors.live }]}>
                  On Air Now
                </Text>
              </View>
              <EpisodeCard episode={liveEpisode} />
              <TouchableOpacity
                style={[styles.joinButton, { backgroundColor: colors.live }]}
                onPress={() => router.push("/(tabs)/cook-along" as never)}
              >
                <Feather name="zap" size={16} color="#fff" />
                <Text style={styles.joinButtonText}>Join Live Quiz</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Your Progress */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Progress</Text>
          <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
            <XPProgressRing xp={xpTotal} size={130} />
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{unlockedBadges}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Badges</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{currentStreak}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Streak</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.accent }]}>{xpTotal.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>XP</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Upcoming Episodes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Coming Up</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {upcomingEpisodes.map((ep) => (
              <EpisodeCard key={ep.id} episode={ep} compact />
            ))}
          </ScrollView>
        </View>

        {/* Community Highlights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Community Highlights</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/community" as never)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {MOCK_COMMUNITY_POSTS.slice(0, 3).map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.communityThumb}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: post.photoUrl }}
                  style={styles.communityImage}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.7)"]}
                  style={styles.communityGradient}
                />
                <View style={styles.communityMeta}>
                  <Text style={styles.communityUsername}>@{post.username}</Text>
                  <View style={styles.communityLikes}>
                    <Feather name="heart" size={10} color="#fff" />
                    <Text style={styles.communityLikeCount}>{post.likes}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Mystery Box Teaser */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => router.push("/mystery-box" as never)}
            style={[styles.mysteryBanner, { backgroundColor: colors.surface, borderColor: colors.accent }]}
          >
            <LinearGradient
              colors={[`${colors.accent}22`, "transparent"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Feather name="box" size={28} color={colors.accent} />
            <View style={styles.mysteryText}>
              <Text style={[styles.mysteryTitle, { color: colors.foreground }]}>
                Mystery Box Challenge
              </Text>
              <Text style={[styles.mysterySubtitle, { color: colors.mutedForeground }]}>
                Tonight's secret ingredient revealed — can you create a dish?
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 24 },
  header: { gap: 8 },
  greetingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { fontSize: 14 },
  username: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", position: "relative" },
  notifDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  seeAll: { fontSize: 14, fontWeight: "600" },
  liveBanner: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 14 },
  liveBannerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBannerTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  joinButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 14 },
  joinButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  episodeCard: { borderRadius: 16, overflow: "hidden" },
  episodeCardCompact: { width: 200, marginRight: 12 },
  episodeThumb: { position: "relative" },
  thumb: { width: "100%", height: 180 },
  thumbCompact: { width: 200, height: 130 },
  thumbGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
  thumbGradientCompact: { position: "absolute", bottom: 0, left: 0, right: 0, height: 60 },
  liveOverlay: { position: "absolute", top: 10, left: 10 },
  episodeInfo: { padding: 12, gap: 4 },
  episodeInfoCompact: { padding: 10 },
  episodeTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  chefName: { fontSize: 12 },
  episodeMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  difficultyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  difficultyText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  countdownText: { fontSize: 12, fontWeight: "600" },
  duration: { fontSize: 12 },
  progressCard: { borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 24 },
  statsRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: 40 },
  horizontalScroll: { paddingRight: 20 },
  communityThumb: { width: 140, height: 180, borderRadius: 14, overflow: "hidden", marginRight: 10, position: "relative" },
  communityImage: { width: "100%", height: "100%" },
  communityGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
  communityMeta: { position: "absolute", bottom: 8, left: 10, right: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  communityUsername: { color: "#fff", fontSize: 11, fontWeight: "600" },
  communityLikes: { flexDirection: "row", alignItems: "center", gap: 3 },
  communityLikeCount: { color: "#fff", fontSize: 10 },
  mysteryBanner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  mysteryText: { flex: 1, gap: 3 },
  mysteryTitle: { fontSize: 15, fontWeight: "700" },
  mysterySubtitle: { fontSize: 12, lineHeight: 17 },
});
