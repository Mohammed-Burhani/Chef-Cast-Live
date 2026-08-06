/**
 * Recipe detail — blog-style reader for admin-published recipes.
 * Shows hero image, meta chips, description, ingredients checklist and
 * numbered steps. Optionally seeds a cook-along session from the recipe.
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useColors } from "@/hooks/useColors";
import { useRecipe } from "@/lib/api/hooks";
import { getIngredients, getSteps, recipeRowToApp } from "@/lib/api/recipes";
import { useCookAlongStore } from "@/store/useCookAlongStore";

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function RecipeDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Array.isArray(id) ? id[0] : id;

  const { data: recipe, isLoading } = useRecipe(recipeId);

  const startCookAlong = () => {
    if (!recipe) return;
    useCookAlongStore.getState().startSession(recipeRowToApp(recipe));
    router.push("/cook-along" as never);
  };

  const ingredients = recipe ? getIngredients(recipe) : [];
  const steps = recipe ? getSteps(recipe) : [];

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          Recipe
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <LoadingSpinner fullScreen />
        </View>
      ) : !recipe ? (
        <View style={styles.emptyWrap}>
          <Feather name="book-open" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Recipe not found
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/recipes" as never)}
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.emptyBtnText}>Browse Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero image */}
          {recipe.image_url ? (
            <Image
              source={{ uri: recipe.image_url }}
              style={[styles.hero, { backgroundColor: colors.muted }]}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder, { backgroundColor: colors.muted }]}>
              <Feather name="book-open" size={56} color={colors.mutedForeground} />
            </View>
          )}

          <View style={styles.body}>
            {/* Title + author */}
            <Text style={[styles.title, { color: colors.foreground }]}>{recipe.title}</Text>
            {recipe.author_name ? (
              <Text style={[styles.author, { color: colors.mutedForeground }]}>
                by {recipe.author_name}
              </Text>
            ) : null}

            {/* Meta chips */}
            <View style={styles.metaRow}>
              {recipe.difficulty ? (
                <View style={[styles.metaChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="activity" size={13} color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.foreground }]}>
                    {DIFFICULTY_LABEL[recipe.difficulty] || recipe.difficulty}
                  </Text>
                </View>
              ) : null}
              {recipe.prep_time_minutes ? (
                <View style={[styles.metaChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="clock" size={13} color={colors.accent} />
                  <Text style={[styles.metaText, { color: colors.foreground }]}>
                    Prep {recipe.prep_time_minutes}m
                  </Text>
                </View>
              ) : null}
              {recipe.cook_time_minutes ? (
                <View style={[styles.metaChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="clock" size={13} color={colors.warning} />
                  <Text style={[styles.metaText, { color: colors.foreground }]}>
                    Cook {recipe.cook_time_minutes}m
                  </Text>
                </View>
              ) : null}
              {recipe.servings ? (
                <View style={[styles.metaChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="users" size={13} color={colors.success} />
                  <Text style={[styles.metaText, { color: colors.foreground }]}>
                    {recipe.servings} servings
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Description */}
            {recipe.description ? (
              <Text style={[styles.description, { color: colors.mutedForeground }]}>
                {recipe.description}
              </Text>
            ) : null}

            {/* Ingredients */}
            {ingredients.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ingredients</Text>
                <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
                  {ingredients.map((ing, index) => (
                    <View key={index} style={styles.listRow}>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: colors.border, backgroundColor: ing.isOptional ? "transparent" : colors.primary },
                        ]}
                      >
                        {!ing.isOptional && <Feather name="check" size={11} color="#fff" />}
                      </View>
                      <Text style={[styles.ingredientName, { color: colors.foreground }]}>
                        {ing.name}
                        {ing.isOptional ? (
                          <Text style={{ color: colors.mutedForeground }}> (optional)</Text>
                        ) : null}
                      </Text>
                      {ing.amount ? (
                        <Text style={[styles.ingredientAmount, { color: colors.mutedForeground }]}>
                          {ing.amount}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Steps */}
            {steps.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Steps</Text>
                <View style={styles.stepsList}>
                  {steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                      <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.stepBadgeText}>{step.stepNumber}</Text>
                      </View>
                      <View style={[styles.stepCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.stepText, { color: colors.foreground }]}>
                          {step.instruction}
                        </Text>
                        {step.durationSeconds ? (
                          <Text style={[styles.stepDuration, { color: colors.mutedForeground }]}>
                            ⏱ ~{step.durationSeconds}s
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      {/* Start cook-along CTA */}
      {recipe && (
        <View
          style={[
            styles.ctaWrap,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={startCookAlong}
            activeOpacity={0.9}
          >
            <Feather name="play" size={18} color="#fff" />
            <Text style={styles.ctaText}>Start Cook-Along</Text>
          </TouchableOpacity>
        </View>
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
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSpacer: { width: 40 },
  loadingWrap: { flex: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  hero: {
    width: "100%",
    height: 240,
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 20 },
  title: { fontSize: 26, fontWeight: "800", lineHeight: 32 },
  author: { fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  metaText: { fontSize: 12, fontWeight: "600" },
  description: { fontSize: 15, lineHeight: 22, marginTop: 16 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  listCard: { borderRadius: 14, padding: 8 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  ingredientName: { fontSize: 14, fontWeight: "500", flex: 1 },
  ingredientAmount: { fontSize: 13, fontWeight: "600" },
  stepsList: { gap: 10 },
  stepRow: { flexDirection: "row", gap: 12 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  stepCard: { flex: 1, borderRadius: 12, padding: 14 },
  stepText: { fontSize: 14, lineHeight: 20 },
  stepDuration: { fontSize: 12, marginTop: 6 },
  ctaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
