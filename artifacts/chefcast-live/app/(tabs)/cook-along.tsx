/**
 * Cook-Along screen — the core interactive cooking experience.
 * Split-screen layout: video player (top 55%) + interactive tabs (bottom 45%).
 * Tabs: Steps | Ingredients | Tips
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CookTimer } from "@/components/cook-along/CookTimer";
import { StepCard } from "@/components/cook-along/StepCard";
import { MOCK_EPISODES, MOCK_RECIPE } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";
import { useCookAlongStore } from "@/store/useCookAlongStore";
import { useGamificationStore } from "@/store/useGamificationStore";
import { Ingredient } from "@/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const VIDEO_HEIGHT = SCREEN_HEIGHT * 0.38;

function IngredientRow({ ingredient, isChecked, onToggle }: { ingredient: Ingredient; isChecked: boolean; onToggle: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      style={[styles.ingredientRow, { borderBottomColor: colors.border }]}
    >
      <View style={[
        styles.checkbox,
        {
          backgroundColor: isChecked ? colors.primary : "transparent",
          borderColor: isChecked ? colors.primary : colors.border,
        }
      ]}>
        {isChecked && <Feather name="check" size={12} color="#fff" />}
      </View>
      <Text style={[
        styles.ingredientName,
        {
          color: isChecked ? colors.mutedForeground : colors.foreground,
          textDecorationLine: isChecked ? "line-through" : "none",
        }
      ]}>
        {ingredient.name}
      </Text>
      <Text style={[styles.ingredientQty, { color: colors.mutedForeground }]}>
        {ingredient.quantity} {ingredient.unit}
      </Text>
      {ingredient.isOptional && (
        <Text style={[styles.optionalTag, { color: colors.mutedForeground }]}>opt</Text>
      )}
    </TouchableOpacity>
  );
}

export default function CookAlongScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const {
    recipe, currentStepIndex, completedStepIds, checkedIngredientIds,
    activeTab, startSession, nextStep, prevStep, toggleIngredient, setActiveTab,
  } = useCookAlongStore();
  const { awardXP } = useGamificationStore();

  useEffect(() => {
    if (!recipe) {
      startSession(MOCK_RECIPE);
    }
  }, []);

  const episode = MOCK_EPISODES[0];
  const currentRecipe = recipe ?? MOCK_RECIPE;
  const currentStep = currentRecipe.steps[currentStepIndex];
  const totalSteps = currentRecipe.steps.length;
  const completedCount = completedStepIds.size;
  const progressPercent = totalSteps > 0 ? completedCount / totalSteps : 0;

  const handleNextStep = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    awardXP("STEP_COMPLETED", `Step ${currentStepIndex + 1} completed`);
    nextStep();
  };

  const TABS: Array<{ id: "steps" | "ingredients" | "tips"; label: string }> = [
    { id: "steps", label: "Steps" },
    { id: "ingredients", label: "Ingredients" },
    { id: "tips", label: "Tips" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Video section */}
      <View style={[styles.videoSection, { height: VIDEO_HEIGHT }]}>
        <Image
          source={{ uri: episode.thumbnailUrl }}
          style={styles.videoPlaceholder}
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.5)", "transparent", "rgba(0,0,0,0.7)"]}
          style={StyleSheet.absoluteFill}
        />

        {/* Live badge */}
        {episode.isLive && (
          <View style={[styles.liveBadge, { backgroundColor: colors.live }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {/* Episode title overlay */}
        <View style={[styles.videoOverlay, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 8 }]}>
          <Text style={styles.episodeTitle}>{episode.title}</Text>
          <Text style={styles.chefName}>{episode.chefName}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.progressLabel, { color: "rgba(255,255,255,0.7)" }]}>
          {completedCount}/{totalSteps} steps
        </Text>
      </View>

      {/* Bottom interactive section */}
      <View style={[styles.bottomSection, { flex: 1, backgroundColor: colors.background }]}>
        {/* Tab bar */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, activeTab === tab.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.tabLabel, { color: activeTab === tab.id ? colors.primary : colors.mutedForeground }]}>
                {tab.label}
              </Text>
              {tab.id === "ingredients" && (
                <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.tabBadgeText}>{currentRecipe.ingredients.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={[styles.tabContentInner, { paddingBottom: bottomPadding + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* STEPS TAB */}
          {activeTab === "steps" && currentStep && (
            <View style={styles.stepsTab}>
              <StepCard
                step={currentStep}
                stepNumber={currentStepIndex + 1}
                totalSteps={totalSteps}
                isCompleted={completedStepIds.has(currentStep.id)}
              />

              {currentStep.durationSeconds && (
                <View style={[styles.timerContainer, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>Step Timer</Text>
                  <CookTimer totalSeconds={currentStep.durationSeconds} />
                </View>
              )}

              {/* Navigation */}
              <View style={styles.stepNav}>
                <TouchableOpacity
                  onPress={prevStep}
                  disabled={currentStepIndex === 0}
                  style={[styles.navBtn, { backgroundColor: colors.surface, opacity: currentStepIndex === 0 ? 0.4 : 1 }]}
                >
                  <Feather name="arrow-left" size={20} color={colors.foreground} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleNextStep}
                  style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                  disabled={currentStepIndex === totalSteps - 1}
                >
                  <Text style={styles.nextBtnText}>
                    {currentStepIndex === totalSteps - 1 ? "Done!" : "Next Step"}
                  </Text>
                  {currentStepIndex < totalSteps - 1 && (
                    <Feather name="arrow-right" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* INGREDIENTS TAB */}
          {activeTab === "ingredients" && (
            <View style={[styles.ingredientsContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.ingredientsHeader}>
                <Text style={[styles.ingredientsTitle, { color: colors.foreground }]}>
                  {currentRecipe.ingredients.filter(i => !i.isOptional).length} ingredients
                </Text>
                <Text style={[styles.checkedCount, { color: colors.mutedForeground }]}>
                  {checkedIngredientIds.size} prepped
                </Text>
              </View>
              {currentRecipe.ingredients.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  ingredient={ing}
                  isChecked={checkedIngredientIds.has(ing.id)}
                  onToggle={() => toggleIngredient(ing.id)}
                />
              ))}
            </View>
          )}

          {/* TIPS TAB */}
          {activeTab === "tips" && currentStep && (
            <View style={styles.tipsTab}>
              {currentStep.tip ? (
                <View style={[styles.tipCard, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
                  <Feather name="info" size={20} color={colors.primary} />
                  <View style={styles.tipContent}>
                    <Text style={[styles.tipTitle, { color: colors.primary }]}>Chef's Tip for Step {currentStepIndex + 1}</Text>
                    <Text style={[styles.tipText, { color: colors.foreground }]}>{currentStep.tip}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noTip}>
                  <Feather name="coffee" size={32} color={colors.mutedForeground} />
                  <Text style={[styles.noTipText, { color: colors.mutedForeground }]}>
                    No tips for this step — just cook!
                  </Text>
                </View>
              )}

              {currentStep.techniqueTag && (
                <View style={[styles.techniqueCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.techniqueTitle, { color: colors.foreground }]}>
                    Technique: {currentStep.techniqueTag.replace("_", " ")}
                  </Text>
                  <Text style={[styles.techniqueDesc, { color: colors.mutedForeground }]}>
                    Master this technique to unlock the {currentStep.techniqueTag === "knife_work" ? "Knife Master" : "Sauce Expert"} badge!
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  videoSection: { position: "relative", overflow: "hidden" },
  videoPlaceholder: { width: "100%", height: "100%" },
  liveBadge: { position: "absolute", top: 60, left: 16, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  videoOverlay: { position: "absolute", bottom: 24, left: 16, right: 16 },
  episodeTitle: { color: "#fff", fontSize: 18, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  chefName: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  progressBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabel: { position: "absolute", bottom: 8, right: 16, fontSize: 11 },
  bottomSection: {},
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, flexDirection: "row", gap: 6 },
  tabLabel: { fontSize: 14, fontWeight: "600" },
  tabBadge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  tabContent: { flex: 1 },
  tabContentInner: { padding: 16, gap: 16 },
  stepsTab: { gap: 16 },
  timerContainer: { borderRadius: 16, padding: 16, alignItems: "center", gap: 8 },
  timerLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  stepNav: { flexDirection: "row", gap: 12 },
  navBtn: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  nextBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 26 },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  ingredientsContainer: { borderRadius: 16, overflow: "hidden" },
  ingredientsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12 },
  ingredientsTitle: { fontSize: 15, fontWeight: "700" },
  checkedCount: { fontSize: 13 },
  ingredientRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  ingredientName: { flex: 1, fontSize: 15 },
  ingredientQty: { fontSize: 13 },
  optionalTag: { fontSize: 10, fontWeight: "600" },
  tipsTab: { gap: 14 },
  tipCard: { flexDirection: "row", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1.5, alignItems: "flex-start" },
  tipContent: { flex: 1, gap: 6 },
  tipTitle: { fontSize: 13, fontWeight: "700" },
  tipText: { fontSize: 15, lineHeight: 22 },
  noTip: { alignItems: "center", paddingVertical: 40, gap: 12 },
  noTipText: { fontSize: 15, textAlign: "center" },
  techniqueCard: { borderRadius: 16, padding: 16, gap: 6 },
  techniqueTitle: { fontSize: 14, fontWeight: "700" },
  techniqueDesc: { fontSize: 13, lineHeight: 19 },
});
