/**
 * Episode Details Screen - /episode/[id]
 * Shows episode info, a watch/join action, the full quiz with a per-question
 * reveal-answer toggle, the top-3 leaderboard, and the current user's
 * rank + points from that episode.
 */

import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useColors } from "@/hooks/useColors";
import { useEpisode, useQuestions, useLeaderboard } from "@/lib/api/hooks";
import { fetchMyEpisodeScore } from "@/lib/api/live";
import { useAuthStore } from "@/store/useAuthStore";
import type { Database } from "@/types/database";

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

const MEDAL_COLORS = ["#F5A623", "#C0C0C0", "#CD7F32"];

// ============================================================================
// Quiz question — compact card with a per-question reveal-answer toggle
// ============================================================================

function QuizQuestionCard({ question, index }: { question: QuestionRow; index: number }) {
  const colors = useColors();
  const [revealed, setRevealed] = React.useState(false);

  const options = [
    { key: "a", label: question.option_a },
    { key: "b", label: question.option_b },
    { key: "c", label: question.option_c },
    { key: "d", label: question.option_d },
  ].filter((o) => !!o.label);

  return (
    <View style={[styles.qCard, { backgroundColor: colors.surface }]}>
      <View style={styles.qHeader}>
        <View style={[styles.qNumber, { backgroundColor: colors.primary }]}>
          <Text style={styles.qNumberText}>{index + 1}</Text>
        </View>
        <Text style={[styles.qQuestion, { color: colors.foreground }]}>
          {question.question_text}
        </Text>
      </View>

      <View style={styles.qOptions}>
        {options.map((opt) => {
          const isCorrect = revealed && opt.key === question.correct_option;
          const dimmed = revealed && opt.key !== question.correct_option;
          return (
            <View
              key={opt.key}
              style={[
                styles.qOption,
                { borderColor: colors.border, backgroundColor: colors.background },
                isCorrect && {
                  borderColor: colors.success,
                  backgroundColor: `${colors.success}18`,
                },
                dimmed && { opacity: 0.45 },
              ]}
            >
              <View
                style={[
                  styles.qOptionKey,
                  { backgroundColor: isCorrect ? colors.success : colors.muted },
                ]}
              >
                <Text
                  style={[
                    styles.qOptionKeyText,
                    { color: isCorrect ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {opt.key.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.qOptionText, { color: colors.foreground }]}>{opt.label}</Text>
              {isCorrect && <Feather name="check-circle" size={15} color={colors.success} />}
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.revealBtn,
          {
            backgroundColor: revealed ? colors.background : colors.primary,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setRevealed((v) => !v)}
        activeOpacity={0.8}
      >
        <Feather
          name={revealed ? "eye-off" : "eye"}
          size={14}
          color={revealed ? colors.foreground : "#fff"}
        />
        <Text style={[styles.revealBtnText, { color: revealed ? colors.foreground : "#fff" }]}>
          {revealed ? "Hide answer" : "Reveal answer"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Top 3 leaderboard
// ============================================================================

function TopThree({ leaderboard }: { leaderboard: any[] }) {
  const colors = useColors();
  const top3 = leaderboard.slice(0, 3);

  return (
    <View style={[styles.leaderboardCard, { backgroundColor: colors.surface }]}>
      {top3.map((entry, i) => (
        <View key={entry.id} style={styles.lbRow}>
          <View
            style={[
              styles.lbRank,
              { backgroundColor: MEDAL_COLORS[i] ?? colors.muted },
            ]}
          >
            <Text style={styles.lbRankText}>{i + 1}</Text>
          </View>
          {entry.profiles?.avatar_url ? (
            <Image
              source={{ uri: entry.profiles.avatar_url }}
              style={styles.lbAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.lbAvatar, { backgroundColor: colors.muted }]}>
              <Feather name="user" size={16} color={colors.mutedForeground} />
            </View>
          )}
          <Text style={[styles.lbName, { color: colors.foreground }]} numberOfLines={1}>
            {entry.profiles?.username ?? "Player"}
          </Text>
          <View style={styles.lbPoints}>
            <Feather name="zap" size={13} color={colors.accent} />
            <Text style={[styles.lbPointsText, { color: colors.foreground }]}>
              {entry.total_score} pts
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// Main screen
// ============================================================================

export default function EpisodeDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const episodeId = Array.isArray(id) ? id[0] : id;
  const user = useAuthStore((s) => s.user);

  const { data: episode, isLoading } = useEpisode(episodeId);
  const { data: questions = [] } = useQuestions(episodeId);
  const { data: leaderboard = [] } = useLeaderboard(episodeId);
  const { data: myScore } = useQuery({
    queryKey: ["episode", episodeId, "my-score", user?.id ?? "anon"],
    queryFn: () => (episodeId ? fetchMyEpisodeScore(episodeId) : null),
    enabled: !!episodeId && !!user?.id,
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!episode) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>Episode not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPast = !!episode.ended_at; // Only past if admin explicitly ended
  const isLive = episode.is_live;
  const isUpcoming = !isLive && !isPast;

  const handleWatch = () => {
    if (episode.youtube_url) {
      Linking.openURL(episode.youtube_url);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Episode Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.hero}>
          <Image
            source={{
              uri: episode.thumbnail_url || "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800",
            }}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
          />
          {isLive && (
            <View style={[styles.liveBadge, { backgroundColor: colors.live }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE NOW</Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(26,10,46,0.9)"]}
            style={styles.heroGradient}
          />
        </View>

        {/* Episode Info */}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]}>{episode.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {new Date(episode.scheduled_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>

          {episode.description && (
            <Text style={[styles.description, { color: colors.foreground }]}>
              {episode.description}
            </Text>
          )}
        </View>

        {/* Watch / Join action */}
        {isLive && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.neonRed }]}
            onPress={() => router.push(`/live/${episode.id}` as never)}
            activeOpacity={0.9}
          >
            <Feather name="zap" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Join Live Session</Text>
          </TouchableOpacity>
        )}

        {isUpcoming && (
          <View
            style={[
              styles.noticeCard,
              { backgroundColor: `${colors.accent}15`, borderColor: colors.accent },
            ]}
          >
            <Feather name="clock" size={18} color={colors.accent} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              This episode hasn't started yet.
              {new Date(episode.scheduled_at) > new Date()
                ? ` Scheduled for ${new Date(episode.scheduled_at).toLocaleDateString()}.`
                : " The host will start it shortly."}
            </Text>
          </View>
        )}

        {isPast && (
          <>
            {episode.youtube_url ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleWatch}
                activeOpacity={0.9}
              >
                <Feather name="play" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Watch Episode</Text>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.noticeCard,
                  { backgroundColor: `${colors.accent}15`, borderColor: colors.accent },
                ]}
              >
                <Feather name="video-off" size={18} color={colors.accent} />
                <Text style={[styles.noticeText, { color: colors.foreground }]}>
                  The recording for this episode isn't available yet.
                </Text>
              </View>
            )}

            {/* Quiz — all questions with per-question reveal */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quiz</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
                  {questions.length} {questions.length === 1 ? "question" : "questions"}
                </Text>
              </View>

              {questions.length > 0 ? (
                <View style={styles.quizList}>
                  {questions.map((q, i) => (
                    <QuizQuestionCard key={q.id} question={q} index={i} />
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No quiz questions were played in this episode.
                </Text>
              )}
            </View>

            {/* Leaderboard + user performance */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Top Scorers
                </Text>
              </View>

              {leaderboard.length > 0 ? (
                <TopThree leaderboard={leaderboard} />
              ) : (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No scores recorded yet.
                </Text>
              )}

              {myScore ? (
                <View style={[styles.perfCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.perfItem}>
                    <Text style={[styles.perfValue, { color: colors.primary }]}>#{myScore.rank}</Text>
                    <Text style={[styles.perfLabel, { color: colors.mutedForeground }]}>
                      Your Rank
                    </Text>
                  </View>
                  <View style={[styles.perfDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.perfItem}>
                    <Text style={[styles.perfValue, { color: colors.accent }]}>{myScore.score}</Text>
                    <Text style={[styles.perfLabel, { color: colors.mutedForeground }]}>Points</Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  You didn't join this episode's quiz.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  errorText: { fontSize: 16, fontWeight: "600" },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  backButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  hero: {
    width: "100%",
    height: 220,
    position: "relative",
  },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
  },
  liveBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  info: { padding: 20 },
  title: { fontSize: 24, fontWeight: "800", lineHeight: 30 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13 },
  description: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  noticeText: { fontSize: 14, flex: 1 },
  section: { padding: 20, paddingBottom: 0, marginTop: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  sectionCount: { fontSize: 13, fontWeight: "600" },
  emptyText: { fontSize: 14, lineHeight: 20, paddingBottom: 12 },

  // Quiz card
  quizList: { gap: 12 },
  qCard: { borderRadius: 16, padding: 16 },
  qHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  qNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  qNumberText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  qQuestion: { flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 21 },
  qOptions: { gap: 8, marginTop: 12 },
  qOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  qOptionKey: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  qOptionKeyText: { fontSize: 12, fontWeight: "800" },
  qOptionText: { flex: 1, fontSize: 14, lineHeight: 19 },
  revealBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  revealBtnText: { fontSize: 13, fontWeight: "700" },

  // Leaderboard
  leaderboardCard: { borderRadius: 16, padding: 8 },
  lbRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 6 },
  lbRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  lbRankText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  lbAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  lbName: { flex: 1, fontSize: 14, fontWeight: "600" },
  lbPoints: { flexDirection: "row", alignItems: "center", gap: 4 },
  lbPointsText: { fontSize: 13, fontWeight: "700" },

  // User performance
  perfCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 20,
    borderRadius: 16,
    marginTop: 14,
  },
  perfItem: { alignItems: "center", gap: 4 },
  perfValue: { fontSize: 26, fontWeight: "800" },
  perfLabel: { fontSize: 13 },
  perfDivider: { width: 1, height: 40 },
});
