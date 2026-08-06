/**
 * Recipes — grid of all published recipes, reachable from the homepage
 * "Top Recipes → See all".
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useColors } from "@/hooks/useColors";
import { useRecipes } from "@/lib/api/hooks";

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function RecipesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: recipes = [], isLoading } = useRecipes();

  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface },
      ]}
      activeOpacity={0.85}
      onPress={() => router.push(`/recipe/${item.id}` as never)}
    >
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={[styles.cardImage, { backgroundColor: colors.muted }]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder, { backgroundColor: colors.muted }]}>
          <Feather name="book-open" size={28} color={colors.mutedForeground} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.cardAuthor, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.author_name ? `by ${item.author_name}` : "Foodilicious"}
        </Text>
        {(item.difficulty || item.cook_time_minutes) && (
          <View style={styles.cardMeta}>
            {item.difficulty ? (
              <Text style={[styles.cardMetaText, { color: colors.primary }]}>
                {DIFFICULTY_LABEL[item.difficulty] || item.difficulty}
              </Text>
            ) : null}
            {item.cook_time_minutes ? (
              <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
                {item.cook_time_minutes}m
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Recipes</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            Cook along with Foodilicious
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <LoadingSpinner fullScreen />
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Feather name="book-open" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No recipes published yet. Check back soon!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  headerSpacer: { width: 40 },
  loadingWrap: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  gridRow: { gap: 12 },
  card: {
    flex: 1,
    marginBottom: 12,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: 110 },
  cardImagePlaceholder: { alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 10, gap: 3 },
  cardTitle: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
  cardAuthor: { fontSize: 11 },
  cardMeta: { flexDirection: "row", gap: 8, marginTop: 2 },
  cardMetaText: { fontSize: 11, fontWeight: "600" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 48,
  },
  emptyText: { fontSize: 15, fontWeight: "600", textAlign: "center" },
});
