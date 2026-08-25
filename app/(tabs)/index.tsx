/**
 * Home Feed screen — the main landing screen after login.
 *
 * DESIGN DIRECTION (impeccable seed key 421b35c7, dealt index 6 — Sponsor-integrated Journey):
 * THE HOME PAGE IS A SPONSOR-INTEGRATED COOKING JOURNEY. Haier appliances are woven into the
 * cooking flow as a natural partner, not an interruption: the live episode banner carries a
 * Haier oven preheat countdown; a dedicated Haier sponsor hub sits between live/upcoming and
 * progress; recipes carry subtle Haier appliance tags; and a dismissible floating Haier product
 * carousel lives bottom-right. The first viewport demonstrates the live cooking mechanism with
 * sponsor presence, not a generic hero.
 *
 * THESIS: Sponsor-integrated journey that refuses the "ad banner slapped on content" default.
 * OWN-WORLD: White ground, Rigel red (#E3000F) primary, gold (#D4A017) accent, Haier red
 *   (#CC0000) sponsor distinct from Foodilicious neon red. Poppins display + Inter body.
 * STORY: User joins live cook-along, sees Haier oven syncing to episode start, browses sponsor
 *   kitchen hub, tracks progress, discovers recipes tagged with relevant appliances.
 * FIRST VIEWPORT: Live episode hero with Haier oven preheat timer → Haier sponsor hub → Progress
 *   → Episode rail → Recipes (Haier-tagged) → Community → Announcements → Floating Haier card.
 * FORM: Chosen from grounded candidate 6 (Sponsor-integrated Journey), seed key 421b35c7.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
 *   verdict, DESIGN.md, and every shipping raster carrying its provenance.
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { StreakFlame } from "@/components/gamification/StreakFlame";
import { XPProgressRing } from "@/components/gamification/XPProgressRing";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { HaierOven, HaierFridge, HaierCooktop, HaierDishwasher } from "@/components/haier/HaierProductSVGs";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/store/useAuthStore";
import { useGamificationStore } from "@/store/useGamificationStore";
import { useUnseenAnnouncementCount } from "@/store/useAnnouncementReadStore";
import { useEpisodeStore } from "@/store/episodeStore";
import { useLiveEpisode, useEpisodes, useDishPhotos, useRecipes, useAnnouncements, useUnreadNotificationCount, keys } from "@/lib/api/hooks";
import { useUpcomingEpisodes, liveKeys } from "@/lib/api/live";
import { useUserStats } from "@/lib/api/scoring";
import { useEpisodeFeedEvents } from "@/lib/realtime/hooks";
import { buildUpcomingRail } from "@/lib/home/upcomingRail";
import { formatRelativeTime } from "@/lib/utils/time";

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

// Haier product data for floating carousel + sponsor hub
const HAIER_PRODUCTS = [
  { id: 'oven', name: 'Series 7 Oven', tag: 'Precision Baking', Component: HaierOven },
  { id: 'fridge', name: 'FreshZone Fridge', tag: 'Smart Cooling', Component: HaierFridge },
  { id: 'cooktop', name: '5-Zone Cooktop', tag: 'PowerBoost', Component: HaierCooktop },
  { id: 'dishwasher', name: 'AutoSense Wash', tag: 'Eco Clean', Component: HaierDishwasher },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { currentStreak = 0, badges = [] } = useGamificationStore();
  const { data: stats } = useUserStats(user?.id);
  const xpTotal = stats?.xp ?? 0;
  const [episodeTab, setEpisodeTab] = React.useState<'upcoming' | 'past'>('upcoming');
  const queryClient = useQueryClient();

  // Floating ad state
  const [adVisible, setAdVisible] = useState(true);
  const [adIndex, setAdIndex] = useState(0);
  const adAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (adVisible) {
      Animated.timing(adAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 600, // Wait for content to load
      }).start();
    }
  }, [adVisible, adAnim]);

  const dismissAd = () => {
    Animated.timing(adAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setAdVisible(false));
  };

  const nextAd = () => {
    setAdIndex((prev) => (prev + 1) % HAIER_PRODUCTS.length);
  };

  // Live episodes we watched flip from a reminder during this session.
  const [transitionedLiveIds, setTransitionedLiveIds] = React.useState<ReadonlySet<string>>(new Set());
  const remindersRef = React.useRef<ReadonlySet<string>>(new Set());

  useEpisodeFeedEvents((event) => {
    queryClient.invalidateQueries({ queryKey: keys.episodes });
    queryClient.invalidateQueries({ queryKey: liveKeys.upcoming() });

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
  const { data: announcements = [] } = useAnnouncements();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();
  const unseenCount = useUnseenAnnouncementCount(announcements) + unreadNotifications;
  const railEpisodes = buildUpcomingRail(soonLive, transitionedLiveIds);
  const topRecipes = recipes.slice(0, 8);

  React.useEffect(() => {
    remindersRef.current = new Set(
      (soonLive ?? []).filter((ep) => !ep.is_live).map((ep) => ep.id)
    );
  }, [soonLive]);

  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const pastEpisodes = episodes
    .filter((e) => e.ended_at)
    .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())
    .slice(0, 5);

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

  const activeProduct = HAIER_PRODUCTS[adIndex];
  const screenWidth = Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 480;
  // Ultra-compact vertical ad - only ~100px wide, taller for product focus
  const adWidth = isSmallScreen ? 104 : 240;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: bottomPadding + 70 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLogos}>
            <Image
              source={require('@/assets/logos/G_Red.webp')}
              style={styles.headerLogo}
              contentFit="cover"
            />
            <Image
              source={require('@/assets/logos/G_Foodilicious_Clean.webp')}
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
                onPress={() => router.push('/notifications' as never)}
                activeOpacity={0.7}
              >
                <Feather name="bell" size={18} color={colors.foreground} />
                {unseenCount > 0 && (
                  <View style={[styles.notifBadge, { backgroundColor: colors.live }]}>
                    <Text style={styles.notifBadgeText}>
                      {unseenCount > 99 ? '99+' : unseenCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Live Episode Banner — with Haier oven preheat timer */}
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

              {/* Haier Oven Preheat Sync */}
              <View style={styles.haierOvenSync}>
                <View style={styles.haierOvenIconWrap}>
                  <HaierOven width={48} height={36} style={styles.haierOvenIcon} />
                </View>
                <View style={styles.haierOvenInfo}>
                  <Text style={styles.haierOvenLabel}>HAIER OVEN • PREHEATING</Text>
                  <Text style={[styles.haierOvenTemp, { color: colors.foreground }]}>220°C ready for the bake</Text>
                </View>
                <View style={[styles.haierOvenBadge, { backgroundColor: colors.haierRed || colors.live }]}>
                  <Text style={styles.haierOvenBadgeText}>SYNC</Text>
                </View>
              </View>

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

        {/* HAIER SPONSOR HUB — dedicated section above progress */}
        <View style={styles.section}>
          <View style={[styles.haierHub, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={[`${colors.haierRed || colors.live}15`, 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Hub header */}
            <View style={styles.haierHubHeader}>
              <View style={styles.haierHubLogoWrap}>
                <Image
                  source={require('@/assets/logos/sponsor-haier.png')}
                  style={styles.haierHubLogo}
                  contentFit="cover"
                />
              </View>
              <View style={styles.haierHubTitleWrap}>
                <Text style={[styles.haierHubKicker, { color: colors.haierRed || colors.live }]}>
                  PRESENTING PARTNER
                </Text>
                <Text style={[styles.haierHubTitle, { color: colors.foreground }]}>
                  Your Kitchen, Powered by Haier
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.haierHubCta, { backgroundColor: colors.haierRed || colors.live }]}
                onPress={() => {/* TODO: navigate to Haier partner page */}}
                activeOpacity={0.8}
              >
                <Text style={styles.haierHubCtaText}>Explore</Text>
              </TouchableOpacity>
            </View>

            {/* Appliance highlights */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.haierHubScroll}
            >
              {HAIER_PRODUCTS.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.haierProductCard, { backgroundColor: colors.background }]}
                  activeOpacity={0.85}
                >
                  <View style={styles.haierProductImageWrap}>
                    <product.Component width={140} height={105} style={styles.haierProductImage} />
                  </View>
                  <View style={styles.haierProductInfo}>
                    <Text style={[styles.haierProductName, { color: colors.foreground }]}>
                      {product.name}
                    </Text>
                    <Text style={[styles.haierProductTag, { color: colors.haierRed || colors.live }]}>
                      {product.tag}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

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

        {/* Top Recipes — with Haier appliance tags */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Recipes</Text>
            <TouchableOpacity onPress={() => router.push("/recipes" as never)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {topRecipes.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {topRecipes.map((recipe, index) => {
                // Subtly tag recipes with Haier appliances (deterministic by index)
                const haierAppliances = ['Oven', 'Cooktop', 'Fridge'][index % 3];
                return (
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
                      {/* Haier appliance tag */}
                      <View style={[styles.recipeHaierTag, { backgroundColor: `${colors.haierRed || colors.live}12` }]}>
                        <Feather name="zap" size={9} color={colors.haierRed || colors.live} />
                        <Text style={[styles.recipeHaierTagText, { color: colors.haierRed || colors.live }]}>
                          Haier {haierAppliances}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
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

        {/* What's Cooking — latest announcements from the team */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>What's Cooking</Text>
            {announcements.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/announcements' as never)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ gap: 12 }}>
            {announcements.length === 0 ? (
              <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.postText, { color: colors.mutedForeground }]}>
                  No announcements yet. Check back soon!
                </Text>
              </View>
            ) : (
              announcements.slice(0, 3).map((announcement) => (
                <View key={announcement.id} style={[styles.postCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.postHeader}>
                    <View style={[styles.postAvatarWrap, { backgroundColor: colors.primary }]}>
                      <Feather name="volume-2" size={16} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.postUsername, { color: colors.foreground }]}>Foodilicious Team</Text>
                      <Text style={[styles.postTime, { color: colors.mutedForeground }]}>
                        {formatRelativeTime(announcement.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.postTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {announcement.title}
                  </Text>
                  <Text style={[styles.postText, { color: colors.foreground }]} numberOfLines={3}>
                    {announcement.message}
                  </Text>
                </View>
              ))
            )}
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

        {/* Haier Sponsor Footer — compact vertical strip at the very end */}
       
      </ScrollView>

      {/* Floating Haier Product Carousel — bottom-right, dismissible, ultra-compact vertical */}
      {adVisible && (
        <Animated.View
          style={[
            styles.floatingAd,
            {
              width: adWidth,
              opacity: adAnim,
              transform: [
                { translateY: adAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [140, 0],
                }) },
              ],
              bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={[styles.floatingAdCard, { backgroundColor: colors.surface, shadowColor: colors.haierRed || colors.live }]}>
            {/* Dismiss button - top right, no overlap */}
            <TouchableOpacity style={styles.floatingAdClose} onPress={dismissAd} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Product carousel - vertical, product-focused */}
            <View style={styles.floatingAdBody}>
              <activeProduct.Component width={96} height={72} style={styles.floatingAdImage} />
              <View style={styles.floatingAdInfo}>
                <Text style={[styles.floatingAdName, { color: colors.foreground }]}>
                  {activeProduct.name}
                </Text>
                <Text style={[styles.floatingAdTag, { color: colors.haierRed || colors.live }]}>
                  {activeProduct.tag}
                </Text>
              </View>
            </View>

            {/* Footer: dots + nav only */}
            <View style={styles.floatingAdFooter}>
              <View style={styles.floatingAdDots}>
                {HAIER_PRODUCTS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.floatingAdDot,
                      { backgroundColor: i === adIndex ? (colors.haierRed || colors.live) : colors.border },
                    ]}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[styles.floatingAdNext, { backgroundColor: `${colors.haierRed || colors.live}15` }]}
                onPress={nextAd}
                activeOpacity={0.7}
              >
                <Feather name="chevron-right" size={14} color={colors.haierRed || colors.live} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, },
  content: { paddingHorizontal: 20, gap: 24 },
  header: { gap: 8 },
  headerLogos: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  headerLogo: { width: 140, height: 56 },
  headerLogoWide: { width: 140, height: 50 },
  greetingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { fontSize: 14 },
  username: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, fontFamily: 'Sora_700Bold' },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", position: "relative" },
  notifBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontWeight: "700", fontFamily: 'Sora_700Bold' },
  seeAll: { fontSize: 14, fontWeight: "600" },
  episodeEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 28, gap: 10 },
  episodeEmptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  liveBanner: { borderRadius: 20, padding: 16, borderWidth: 2, gap: 14 },
  liveBannerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBannerTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5, fontFamily: 'Sora_700Bold' },
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
  episodeTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20, fontFamily: 'Sora_600SemiBold' },
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
  postAvatarWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  postUsername: { fontSize: 13, fontWeight: '600' },
  postTime: { fontSize: 11 },
  postTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  postText: { fontSize: 14, lineHeight: 20 },

  // Haier Oven Sync (live banner)
  haierOvenSync: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(204,0,0,0.06)",
    borderRadius: 12,
    padding: 10,
  },
  haierOvenIconWrap: { width: 44, height: 44, borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" },
  haierOvenIcon: { width: 44, height: 44 },
  haierOvenInfo: { flex: 1, gap: 2 },
  haierOvenLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5, color: "#CC0000" },
  haierOvenTemp: { fontSize: 12, fontWeight: "600" },
  haierOvenBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  haierOvenBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  // Haier Sponsor Hub
  haierHub: { borderRadius: 20, padding: 16, gap: 14, borderWidth: 1, borderColor: "rgba(204,0,0,0.2)", overflow: "hidden" },
  haierHubHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  haierHubLogoWrap: { width: 56, height: 28, justifyContent: "center" },
  haierHubLogo: { width: 56, height: 28 },
  haierHubTitleWrap: { flex: 1, gap: 2 },
  haierHubKicker: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  haierHubTitle: { fontSize: 16, fontWeight: "700", lineHeight: 20 },
  haierHubCta: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  haierHubCtaText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  haierHubScroll: { paddingRight: 20, gap: 12 },
  haierProductCard: {
    width: 140,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(204,0,0,0.12)",
  },
  haierProductImageWrap: { width: "100%", height: 90, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  haierProductImage: { width: "100%", height: "100%" },
  haierProductInfo: { padding: 10, gap: 2 },
  haierProductName: { fontSize: 13, fontWeight: "700" },
  haierProductTag: { fontSize: 10, fontWeight: "600" },

  // Recipe Haier tag
  recipeHaierTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start", marginTop: 2 },
  recipeHaierTagText: { fontSize: 10, fontWeight: "700" },

  // Floating Haier Ad
  floatingAd: {
    position: "absolute",
    right: 16,
    zIndex: 1000,
  },
  floatingAdCard: {
    borderRadius: 16,
    paddingTop: 28, // space for close button
    paddingHorizontal: 8,
    paddingBottom: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(204,0,0,0.2)",
  },
  floatingAdClose: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  floatingAdBody: { alignItems: "center", gap: 6 },
  floatingAdImage: { width: 96, height: 72, borderRadius: 10, backgroundColor: "#fff" },
  floatingAdInfo: { alignItems: "center", gap: 2 },
  floatingAdName: { fontSize: 11, fontWeight: "700", lineHeight: 14, textAlign: "center" },
  floatingAdTag: { fontSize: 9, fontWeight: "600", textAlign: "center" },
  floatingAdFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingHorizontal: 4 },
  floatingAdDots: { flexDirection: "row", gap: 3 },
  floatingAdDot: { width: 4, height: 4, borderRadius: 2 },
  floatingAdNext: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  // Haier Footer Ad - compact vertical strip at end
  haierFooterAd: {
    marginTop: 24,
    marginBottom: 120, // space for floating ad + tab bar
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(204,0,0,0.15)",
  },
  haierFooterAdInner: {
    padding: 20,
    position: "relative",
  },
  haierFooterAdContent: { alignItems: "center", gap: 12 },
  haierFooterAdLogoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  haierFooterAdLogo: { width: 44, height: 18 },
  haierFooterAdKicker: { fontSize: 8, fontWeight: "800", letterSpacing: 1.5, color: "#CC0000" },
  haierFooterAdHeadline: { fontSize: 18, fontWeight: "800", textAlign: "center", color: "#1A1A1A" },
  haierFooterAdSubtext: { fontSize: 13, textAlign: "center", color: "#6B6B6B" },
  haierFooterAdProducts: { flexDirection: "row", justifyContent: "center", gap: 16, marginVertical: 8, flexWrap: "wrap" },
  haierFooterAdProduct: { alignItems: "center", gap: 4, width: 80 },
  haierFooterAdProductName: { fontSize: 9, fontWeight: "600", textAlign: "center", color: "#1A1A1A" },
  haierFooterAdCta: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  haierFooterAdCtaText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
