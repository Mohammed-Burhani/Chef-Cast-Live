/**
 * Mystery Box Challenge screen.
 * Dramatic reveal of the mystery ingredient with a 10-minute countdown.
 * Users submit their dish idea for a chance to be featured on TV.
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOCK_MYSTERY_BOX_SUBMISSIONS } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";
import { useGamificationStore } from "@/store/useGamificationStore";
import { MysteryBoxSubmission } from "@/types";

const MYSTERY_INGREDIENT = "Pomegranate";
const CHALLENGE_DURATION = 10 * 60;

export default function MysteryBoxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const { awardXP } = useGamificationStore();

  const [timeRemaining, setTimeRemaining] = useState(CHALLENGE_DURATION);
  const [dishIdea, setDishIdea] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submissions, setSubmissions] = useState<MysteryBoxSubmission[]>(MOCK_MYSTERY_BOX_SUBMISSIONS);
  const revealAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(revealAnim, { toValue: 1, useNativeDriver: true, speed: 2, bounciness: 8 }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.97, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const interval = setInterval(() => {
      setTimeRemaining((t) => Math.max(0, t - 1));
    }, 1000);

    return () => {
      clearInterval(interval);
      pulse.stop();
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const isUrgent = timeRemaining < 60;
  const timerColor = isUrgent ? colors.live : timeRemaining < 180 ? colors.warning : colors.accent;

  const handleSubmit = async () => {
    if (!dishIdea.trim() || dishIdea.length < 10) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const newSubmission: MysteryBoxSubmission = {
      id: `mb-${Date.now()}`,
      userId: "me-user",
      username: "you",
      mysteryIngredient: MYSTERY_INGREDIENT,
      dishIdea: dishIdea.trim(),
      isFeaturedOnTv: false,
      submittedAt: new Date().toISOString(),
    };

    setSubmissions((prev) => [...prev, newSubmission]);
    setSubmitted(true);
    await awardXP("MYSTERY_BOX_SUBMITTED", "Submitted mystery box idea");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.accent}22`, colors.background, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 8, paddingBottom: bottomPadding + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.episodeLabel, { color: colors.mutedForeground }]}>S3 · E8 Mystery Box</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerSection}>
          <Animated.Text style={[styles.timerText, { color: timerColor, transform: [{ scale: pulseAnim }] }]}>
            {formatTime(timeRemaining)}
          </Animated.Text>
          <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>
            {timeRemaining > 0 ? "remaining to submit" : "time's up!"}
          </Text>
        </View>

        {/* Mystery ingredient reveal */}
        <Animated.View
          style={[
            styles.revealCard,
            {
              backgroundColor: `${colors.accent}15`,
              borderColor: colors.accent,
              transform: [
                { scale: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
              ],
              opacity: revealAnim,
            },
          ]}
        >
          <Feather name="box" size={40} color={colors.accent} />
          <Text style={[styles.revealLabel, { color: colors.mutedForeground }]}>
            Tonight's Mystery Ingredient
          </Text>
          <Text style={[styles.ingredientName, { color: colors.accent }]}>{MYSTERY_INGREDIENT}</Text>
          <Text style={[styles.ingredientDesc, { color: colors.mutedForeground }]}>
            Create any dish that showcases this ingredient. Be creative!
          </Text>
        </Animated.View>

        {/* Submission form */}
        {!submitted ? (
          <View style={styles.formSection}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Your Dish Idea</Text>
            <View style={[styles.textAreaWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.textArea, { color: colors.foreground }]}
                placeholder={`Describe your ${MYSTERY_INGREDIENT} dish idea...`}
                placeholderTextColor={colors.mutedForeground}
                value={dishIdea}
                onChangeText={(t) => setDishIdea(t.slice(0, 280))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: dishIdea.length > 250 ? colors.warning : colors.mutedForeground }]}>
                {dishIdea.length}/280
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={dishIdea.length < 10 || timeRemaining === 0}
              style={[styles.submitBtn, {
                backgroundColor: colors.primary,
                opacity: dishIdea.length >= 10 && timeRemaining > 0 ? 1 : 0.4
              }]}
            >
              <Feather name="send" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Idea (+50 XP)</Text>
            </TouchableOpacity>

            <View style={styles.xpHint}>
              <Feather name="star" size={13} color={colors.accent} />
              <Text style={[styles.xpHintText, { color: colors.mutedForeground }]}>
                If featured on TV: +200 XP bonus!
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.successCard, { backgroundColor: `${colors.success}15`, borderColor: colors.success }]}>
            <Feather name="check-circle" size={36} color={colors.success} />
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Idea Submitted!</Text>
            <Text style={[styles.successText, { color: colors.mutedForeground }]}>
              Watch live to see if your idea gets featured on TV!
            </Text>
            <View style={[styles.xpEarned, { backgroundColor: `${colors.accent}22` }]}>
              <Text style={[styles.xpEarnedText, { color: colors.accent }]}>+50 XP earned</Text>
            </View>
          </View>
        )}

        {/* All submissions */}
        <View style={styles.submissionsSection}>
          <Text style={[styles.submissionsTitle, { color: colors.foreground }]}>
            All Submissions ({submissions.length})
          </Text>
          {submissions.map((sub) => (
            <View key={sub.id} style={[styles.submissionCard, { backgroundColor: colors.surface, borderColor: sub.isFeaturedOnTv ? colors.accent : "transparent" }]}>
              {sub.isFeaturedOnTv && (
                <View style={[styles.featuredBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.featuredText}>FEATURED ON TV</Text>
                </View>
              )}
              <View style={styles.submissionHeader}>
                <Text style={[styles.submissionUser, { color: colors.primary }]}>@{sub.username}</Text>
                <Text style={[styles.submissionTime, { color: colors.mutedForeground }]}>
                  {Math.floor((Date.now() - new Date(sub.submittedAt).getTime()) / 60000)}m ago
                </Text>
              </View>
              <Text style={[styles.submissionIdea, { color: colors.foreground }]}>{sub.dishIdea}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  episodeLabel: { fontSize: 13, fontWeight: "600" },
  timerSection: { alignItems: "center", gap: 6 },
  timerText: { fontSize: 64, fontWeight: "800", letterSpacing: -2, fontVariant: ["tabular-nums"] },
  timerLabel: { fontSize: 14 },
  revealCard: { borderRadius: 24, borderWidth: 1.5, padding: 24, alignItems: "center", gap: 12 },
  revealLabel: { fontSize: 13, letterSpacing: 0.5 },
  ingredientName: { fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  ingredientDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  formSection: { gap: 14 },
  formTitle: { fontSize: 18, fontWeight: "700" },
  textAreaWrapper: { borderRadius: 16, borderWidth: 1, padding: 14 },
  textArea: { fontSize: 15, lineHeight: 22, minHeight: 100 },
  charCount: { fontSize: 11, textAlign: "right", marginTop: 8 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  xpHint: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  xpHintText: { fontSize: 13 },
  successCard: { borderRadius: 24, borderWidth: 1.5, padding: 24, alignItems: "center", gap: 12 },
  successTitle: { fontSize: 22, fontWeight: "800" },
  successText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  xpEarned: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  xpEarnedText: { fontSize: 15, fontWeight: "700" },
  submissionsSection: { gap: 12 },
  submissionsTitle: { fontSize: 16, fontWeight: "700" },
  submissionCard: { borderRadius: 16, padding: 14, gap: 8, borderWidth: 1.5 },
  featuredBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  featuredText: { color: "#0D0D0D", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  submissionHeader: { flexDirection: "row", justifyContent: "space-between" },
  submissionUser: { fontSize: 13, fontWeight: "700" },
  submissionTime: { fontSize: 12 },
  submissionIdea: { fontSize: 14, lineHeight: 20 },
});
