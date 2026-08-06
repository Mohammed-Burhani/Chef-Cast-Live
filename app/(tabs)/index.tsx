/**
 * Home Feed screen — the main landing screen after login.
 * Shows: live episode banner, upcoming episodes, user progress summary,
 * community highlights, and mystery box status.
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
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
import { useQueryClient } from "@tanstack/react-query";

import { StreakFlame } from "@/components/gamification/StreakFlame";
import { XPProgressRing } from "@/components/gamification/XPProgressRing";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/store/useAuthStore";
import { useGamificationStore } from "@/store/useGamificationStore";
import { usePollStore } from "@/store/usePollStore";
import { useEpisodeStore } from "@/store/episodeStore";
import { useLiveEpisode, useEpisodes, useDishPhotos, useRecipes, keys } from "@/lib/api/hooks";
import { useUpcomingEpisodes, liveKeys } from "@/lib/api/live";
import { useUserStats } from "@/lib/api/scoring";
import { useEpisodeFeedEvents } from "@/lib/realtime/hooks";
import { buildUpcomingRail } from "@/lib/home/upcomingRail";

interface Episode {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  is_live: boolean;
  status?: 'scheduled' | 'live' | 'ended';
  ended_at: string | null;
  thumbnail_url: string | null;
  youtube_url: string | null;
}

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
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const diff = new Date(scheduledAt).getTime() - now;
  const isOverdue = diff < 0;

  if (isOverdue) {
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

function EpisodeCard({ episode, compact }: { episode: Episode; compact?: boolean }) {
  const colors = useColors();

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
          source={{ uri: episode.thumbnail_url || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800' }}
          style={compact ? styles.thumbCompact : styles.thumb}
          contentFit="cover"
          transition={200}
        />
        {episode.is_live && (
          <View style={styles.liveOverlay}>
            <LiveBadge />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(26,10,46,0.9)"]}
          style={compact ? styles.thumbGradientCompact : styles.thumbGradient}
        />
      </View>

      <View style={[styles.episodeInfo, compact && styles.episodeInfoCompact]}>
        <Text style={[styles.episodeTitle, { color: colors.foreground }]} numberOfLines={2}>
          {episode.title}
        </Text>
        {episode.description && (
          <Text style={[styles.chefName, { color: colors.mutedForeground }]} numberOfLines={1}>
            {episode.description}
          </Text>
        )}

        <View style={styles.episodeMeta}>
          {!episode.is_live && new Date(episode.scheduled_at) > new Date() && (
            <CountdownTimer scheduledAt={episode.scheduled_at} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { currentStreak = 0, badges = [] } = useGamificationStore();
  const { data: stats } = useUserStats(user?.id);
  const xpTotal = stats?.xp ?? 0;
  const showPoll = usePollStore((s) => s.showPoll);
  const [episodeTab, setEpisodeTab] = React.useState<'upcoming' | 'past'>('upcoming');
  const queryClient = useQueryClient();

  // Live episodes we watched flip from a reminder during this session. Keeps
  // their card in the rail so it visibly becomes "Join the quiz" the moment the
  // episode goes live, instead of vanishing on the next refetch.
  const [transitionedLiveIds, setTransitionedLiveIds] = React.useState<ReadonlySet<string>>(new Set());
  // Episode ids currently shown as reminders (non-live) in the rail — only
  // those are allowed to "transform" when they go live. Episodes that were
  // already live on mount stay out of the rail (the ON AIR banner covers them).
  const remindersRef = React.useRef<ReadonlySet<string>>(new Set());

  // Real-time: when any episode row changes, refresh the rail + banner at once
  // (no 30s poll wait) and remember the episode so its card transforms in place.
  useEpisodeFeedEvents((event) => {
    queryClient.invalidateQueries({ queryKey: keys.episodes });
    queryClient.invalidateQueries({ queryKey: liveKeys.upcoming() });

    // Only flip the card if we were actually reminding about this episode.
    if (event.isLive && remindersRef.current.has(event.episodeId)) {
      setTransitionedLiveIds((prev) => {
        if (prev.has(event.episodeId)) return prev;
        const next = new Set(prev);
        next.add(event.episodeId);
        return next;
      });
    }
  });

  const { data: liveEpisode } = useLiveEpisode();
  const { data: episodes = [], isLoading, refetch } = useEpisodes();
  const { data: dishPhotos = [] } = useDishPhotos();
  const { data: soonLive } = useUpcomingEpisodes();
  const { data: recipes = [] } = useRecipes();
  const railEpisodes = buildUpcomingRail(soonLive, transitionedLiveIds);
  const topRecipes = recipes.slice(0, 8);

  // Keep remindersRef in sync with the latest upcoming data.
  React.useEffect(() => {
    remindersRef.current = new Set(
      (soonLive ?? []).filter((ep) => !ep.is_live).map((ep) => ep.id)
    );
  }, [soonLive]);

  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  // Past = only episodes explicitly ended by admin, most recent first, latest 5
  const pastEpisodes = episodes
    .filter((e) => e.ended_at)
    .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())
    .slice(0, 5);

  // Upcoming = not live, not ended (regardless of whether scheduled_at is in the past)
  const episodesNotEnded = episodes.filter((e) => !e.is_live && !e.ended_at);

  const unlockedBadges = badges.filter((b) => b.isUnlocked).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

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
        contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: bottomPadding + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLogos}>
            <Image
              source={require('@/assets/logos/G_Red.png')}
              style={styles.headerLogo}
              contentFit="cover"
            />
            <Image
              source={require('@/assets/logos/G_Foodilicious_Clean.png')}
              style={styles.headerLogoWide}
              contentFit="cover"
            />
          </View>
          <View style={styles.greetingRow}>
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{getGreeting()},</Text>
              <Text style={[styles.username, { color: colors.foreground }]}>
                {user?.username ?? "Chef"}
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
            <View style={[styles.liveBanner, { backgroundColor: `${colors.neonRed}15`, borderColor: colors.neonRed }]}>
              <View style={styles.liveBannerHeader}>
                <LiveBadge />
                <Text style={[styles.liveBannerTitle, { color: colors.neonRed }]}>
                  🔴 ON AIR NOW — JOIN LIVE!
                </Text>
              </View>
              <EpisodeCard episode={liveEpisode} />
              <TouchableOpacity
                style={[styles.joinButton, { backgroundColor: colors.neonRed }]}
                onPress={() => {
                  router.push(`/live/${liveEpisode.id}` as never);
                }}
              >
                <Feather name="zap" size={16} color="#fff" />
                <Text style={styles.joinButtonText}>Join the quiz</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Going Live Soon — reminder rail that flips to "Join the quiz" live */}
        {railEpisodes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Going Live Soon</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {railEpisodes.map((ep) => {
                const isLive = ep.is_live;
                const isOverdue = !isLive && new Date(ep.scheduled_at) <= new Date();
                const accent = isLive ? colors.neonRed : isOverdue ? colors.live : colors.accent;
                const badgeText = isLive ? 'LIVE' : isOverdue ? 'OVERDUE' : 'SOON';
                const buttonText = isLive ? 'Join the quiz' : isOverdue ? 'Join Now' : 'Set Reminder';
                return (
                  <TouchableOpacity
                    key={ep.id}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/live/${ep.id}` as never)}
                    style={[styles.episodeCard, styles.episodeCardCompact, { backgroundColor: colors.surface }]}
                  >
                    <View style={styles.episodeThumb}>
                      <Image
                        source={{ uri: ep.thumbnail_url || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800' }}
                        style={styles.thumbCompact}
                        contentFit="cover"
                        transition={200}
                      />
                      {/* Accent border: red once live */}
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: accent, borderRadius: 16 }} />
                      <View style={{ position: 'absolute', top: 8, right: 8 }}>
                        <View style={[{ backgroundColor: accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }]}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                            {badgeText}
                          </Text>
                        </View>
                      </View>
                      <LinearGradient
                        colors={["transparent", "rgba(26,10,46,0.9)"]}
                        style={styles.thumbGradientCompact}
                      />
                    </View>
                    <View style={styles.episodeInfoCompact}>
                      <Text style={[styles.episodeTitle, { color: colors.foreground }]} numberOfLines={2}>
                        {ep.title}
                      </Text>
                      <View style={styles.episodeMeta}>
                        {isLive ? (
                          <Text style={[styles.countdownText, { color: colors.live }]}>LIVE NOW</Text>
                        ) : (
                          <CountdownTimer scheduledAt={ep.scheduled_at} />
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[{ backgroundColor: accent, paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginHorizontal: 10, marginBottom: 10 }]}
                      onPress={() => router.push(`/live/${ep.id}` as never)}
                    >
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                        {buttonText}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
                <Text style={[styles.statValue, { color: colors.neonRed }]}>{currentStreak}</Text>
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

        {/* Episodes List */}
        {!isLoading && (episodesNotEnded.length > 0 || pastEpisodes.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Episodes</Text>
              <TouchableOpacity onPress={() => router.push("/episodes?tab=past" as never)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 12 }}>
              <TouchableOpacity onPress={() => setEpisodeTab('upcoming')} style={{ paddingBottom: 8, borderBottomWidth: episodeTab === 'upcoming' ? 2 : 0, borderBottomColor: colors.primary }}>
                <Text style={[{ fontSize: 14, fontWeight: '600', color: episodeTab === 'upcoming' ? colors.primary : colors.mutedForeground }]}>Upcoming</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEpisodeTab('past')} style={{ paddingBottom: 8, borderBottomWidth: episodeTab === 'past' ? 2 : 0, borderBottomColor: colors.primary }}>
                <Text style={[{ fontSize: 14, fontWeight: '600', color: episodeTab === 'past' ? colors.primary : colors.mutedForeground }]}>Past</Text>
              </TouchableOpacity>
            </View>

            {episodeTab === 'upcoming' ? (
              episodesNotEnded.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {episodesNotEnded.map((ep) => (
                    <EpisodeCard key={ep.id} episode={ep} compact />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.episodeEmpty}>
                  <Feather name="calendar" size={32} color={colors.mutedForeground} />
                  <Text style={[styles.episodeEmptyText, { color: colors.mutedForeground }]}>
                    No upcoming episodes yet. Check back soon!
                  </Text>
                </View>
              )
            ) : pastEpisodes.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {pastEpisodes.map((ep) => (
                  <EpisodeCard key={ep.id} episode={ep} compact />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.episodeEmpty}>
                <Feather name="check-circle" size={32} color={colors.mutedForeground} />
                <Text style={[styles.episodeEmptyText, { color: colors.mutedForeground }]}>
                  No past episodes yet. Check back soon!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Top Recipes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Recipes</Text>
            <TouchableOpacity onPress={() => router.push("/recipes" as never)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {topRecipes.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {topRecipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={{ width: 160, borderRadius: 14, overflow: 'hidden', marginRight: 12, backgroundColor: colors.surface }}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/recipe/${recipe.id}` as never)}
                >
                  {recipe.image_url ? (
                    <Image source={{ uri: recipe.image_url }} style={{ width: 160, height: 120 }} contentFit="cover" />
                  ) : (
                    <View style={{ width: 160, height: 120, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="book-open" size={32} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={{ padding: 10, gap: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', lineHeight: 18, color: colors.foreground }} numberOfLines={2}>{recipe.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }} numberOfLines={1}>
                      {recipe.author_name ? `by ${recipe.author_name}` : 'Foodilicious'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
              No recipes published yet. Check back soon!
            </Text>
          )}
        </View>

        {/* Top Scorer of the Week */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🏆 Top Scorer This Week</Text>
          </View>
          <TouchableOpacity
            style={[styles.topScorerCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/leaderboard' as never)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[`${colors.primary}10`, 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.topScorerLeft}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=33' }}
                style={styles.topScorerAvatar}
                contentFit="cover"
              />
              <View style={styles.topScorerInfo}>
                <Text style={[styles.topScorerName, { color: colors.foreground }]}>@culinary_queen</Text>
                <Text style={[styles.topScorerStats, { color: colors.mutedForeground }]}>8,450 XP • 12 wins</Text>
              </View>
            </View>
            <View style={[styles.crownBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Admin Posts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>What's Cooking</Text>
          </View>
          <View style={{ gap: 12 }}>
            {[
              { id: 1, text: '🔥 New episode tomorrow: "Italian Risotto Night" with Chef Marco!', time: '2h ago' },
              { id: 2, text: '📢 Mystery Box challenge opens tonight at 8 PM EST. Are you ready?', time: '5h ago' },
            ].map((post) => (
              <View key={post.id} style={[styles.postCard, { backgroundColor: colors.surface }]}>
                <View style={styles.postHeader}>
                  <Image
                    source={{ uri: 'https://i.pravatar.cc/150?img=68' }}
                    style={styles.postAvatar}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.postUsername, { color: colors.foreground }]}>Foodilicious Team</Text>
                    <Text style={[styles.postTime, { color: colors.mutedForeground }]}>{post.time}</Text>
                  </View>
                </View>
                <Text style={[styles.postText, { color: colors.foreground }]}>{post.text}</Text>
              </View>
            ))}
          </View>
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
            {(dishPhotos || []).slice(0, 3).map((photo) => (
              <TouchableOpacity
                key={photo.id}
                style={styles.communityThumb}
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)/community')}
              >
                <Image
                  source={{ uri: photo.image_url }}
                  style={styles.communityImage}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={["transparent", "rgba(26,10,46,0.85)"]}
                  style={styles.communityGradient}
                />
                <View style={styles.communityMeta}>
                  <Text style={styles.communityUsername}>@{photo.profiles?.username}</Text>
                  <View style={styles.communityLikes}>
                    <Feather name="heart" size={10} color="#fff" />
                    <Text style={styles.communityLikeCount}>{photo.like_count}</Text>
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
            style={[styles.mysteryBanner, { backgroundColor: colors.surface, borderColor: colors.neonRed }]}
          >
            <LinearGradient
              colors={[`${colors.neonRed}15`, "transparent"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Feather name="box" size={28} color={colors.neonRed} />
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
  scroll: { flex: 1, },
  content: { paddingHorizontal: 20, gap: 24 },
  header: { gap: 8 },
  headerLogos: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  headerLogo: { width: 110, height: 44 },
  headerLogoWide: { width: 110, height: 32 },
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
  episodeEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 28, gap: 10 },
  episodeEmptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  liveBanner: { borderRadius: 20, padding: 16, borderWidth: 2, gap: 14 },
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
  topScorerCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  topScorerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  topScorerAvatar: { width: 50, height: 50, borderRadius: 25 },
  topScorerInfo: { flex: 1, gap: 2 },
  topScorerName: { fontSize: 16, fontWeight: '700' },
  topScorerStats: { fontSize: 12 },
  crownBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  crownEmoji: { fontSize: 22 },
  postCard: { borderRadius: 14, padding: 14, gap: 10 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: { width: 36, height: 36, borderRadius: 18 },
  postUsername: { fontSize: 13, fontWeight: '600' },
  postTime: { fontSize: 11 },
  postText: { fontSize: 14, lineHeight: 20 },
});
