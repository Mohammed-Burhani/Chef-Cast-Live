/**
 * Episode Detail screen — full episode info, recipe preview, and cook-along CTA.
 * Dynamic route: /episode/[id]
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOCK_EPISODES, MOCK_RECIPE } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";

export default function EpisodeDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const episode = MOCK_EPISODES.find((e) => e.id === id) ?? MOCK_EPISODES[0];
  const recipe = MOCK_RECIPE;

  const formatBroadcast = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const difficultyColors = { easy: colors.success, medium: colors.warning, hard: colors.danger };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: episode.thumbnailUrl }}
            style={styles.hero}
            contentFit="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "transparent", colors.background]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroHeader, { paddingTop: topPadding + 8 }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            >
              <Feather name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            {episode.isLive && (
              <View style={[styles.liveBadge, { backgroundColor: colors.live }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
        </View>

        {/* Episode info */}
        <View style={styles.infoSection}>
          <View style={styles.metaRow}>
            <Text style={[styles.seasonEp, { color: colors.mutedForeground }]}>
              Season {episode.season} · Episode {episode.episodeNumber}
            </Text>
            <View style={[styles.diffBadge, { backgroundColor: `${difficultyColors[episode.difficulty]}22` }]}>
              <Text style={[styles.diffText, { color: difficultyColors[episode.difficulty] }]}>
                {episode.difficulty}
              </Text>
            </View>
          </View>

          <Text style={[styles.episodeTitle, { color: colors.foreground }]}>{episode.title}</Text>
          <Text style={[styles.chefName, { color: colors.primary }]}>{episode.chefName}</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {episode.description}
          </Text>

          <View style={styles.statsRow}>
            {[
              { icon: "clock" as const, value: `${episode.duration} min`, label: "Duration" },
              { icon: "users" as const, value: `${recipe.servings}`, label: "Servings" },
              { icon: "list" as const, value: `${recipe.steps.length} steps`, label: "Steps" },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Feather name={s.icon} size={18} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.broadcastTime, { color: colors.mutedForeground }]}>
            {episode.isLive ? "🔴 Live now" : `Airs: ${formatBroadcast(episode.broadcastAt)}`}
          </Text>
        </View>

        {/* Recipe preview */}
        <View style={styles.recipeSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tonight's Recipe</Text>
          <View style={[styles.recipeCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.recipeTitle, { color: colors.foreground }]}>{recipe.title}</Text>
            <Text style={[styles.recipeDesc, { color: colors.mutedForeground }]}>{recipe.description}</Text>

            <Text style={[styles.ingredientsLabel, { color: colors.foreground }]}>
              Key Ingredients ({recipe.ingredients.filter(i => !i.isOptional).length})
            </Text>
            <View style={styles.ingredientChips}>
              {recipe.ingredients.slice(0, 6).map((ing) => (
                <View key={ing.id} style={[styles.chip, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.chipText, { color: colors.foreground }]}>
                    {ing.name}
                  </Text>
                </View>
              ))}
              {recipe.ingredients.length > 6 && (
                <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                    +{recipe.ingredients.length - 6} more
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* CTA button */}
      <View style={[styles.ctaContainer, { backgroundColor: colors.background, paddingBottom: bottomPadding + 12 }]}>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/cook-along" as never)}
          style={[styles.ctaBtn, { backgroundColor: episode.isLive ? colors.live : colors.primary }]}
        >
          <Feather name="play" size={20} color="#fff" />
          <Text style={styles.ctaBtnText}>
            {episode.isLive ? "Join Cook-Along Now" : "Preview Recipe"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  heroContainer: { height: 280, position: "relative" },
  hero: { width: "100%", height: "100%" },
  heroHeader: { position: "absolute", top: 0, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  infoSection: { padding: 20, gap: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seasonEp: { fontSize: 13 },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  diffText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  episodeTitle: { fontSize: 26, fontWeight: "800", lineHeight: 32 },
  chefName: { fontSize: 15, fontWeight: "600" },
  description: { fontSize: 15, lineHeight: 22 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center", gap: 4 },
  statValue: { fontSize: 15, fontWeight: "700" },
  statLabel: { fontSize: 11 },
  broadcastTime: { fontSize: 13, marginTop: 4 },
  recipeSection: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  recipeCard: { borderRadius: 18, padding: 16, gap: 10 },
  recipeTitle: { fontSize: 17, fontWeight: "700" },
  recipeDesc: { fontSize: 13, lineHeight: 19 },
  ingredientsLabel: { fontSize: 13, fontWeight: "600" },
  ingredientChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: "500" },
  ctaContainer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 12 },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  ctaBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
