/**
 * Live Quiz Screen - Production Realtime Quiz
 * Cook-along tab with live quiz functionality
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useCallback } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  useQuizStore,
  useCurrentQuestion,
  useTimerRemaining,
  useQuizPhase,
  useSelectedOption,
  useCorrectOption,
  useIsCorrect,
  useTotalScore,
} from "@/store/quizStore";
import { useRealtimeStore } from "@/store/realtimeStore";
import { useEpisodeStore } from "@/store/episodeStore";
import {
  useEpisodeChannel,
  useQuestionEvents,
  useLeaderboardEvents,
  useEpisodeStateEvents,
} from "@/lib/realtime";

// Timer Ring Component
function TimerRing({ remaining, total }: { remaining: number; total: number }) {
  const colors = useColors();
  const size = 72;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = total > 0 ? remaining / total : 0;
  const isUrgent = remaining <= 5;

  return (
    <View style={styles.timerRingWrap}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surface}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={isUrgent ? colors.neonRed : colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2},${size / 2}`}
        />
      </Svg>
      <Text
        style={[
          styles.timerNumber,
          { color: isUrgent ? colors.neonRed : colors.foreground },
        ]}
      >
        {remaining}
      </Text>
    </View>
  );
}

// Idle/Waiting Screen
function IdleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={[
        styles.fullCenter,
        { backgroundColor: colors.background, paddingTop: topPad },
      ]}
    >
      <View style={[styles.waitingIcon, { backgroundColor: `${colors.primary}22` }]}>
        <Feather name="clock" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.waitingTitle, { color: colors.foreground }]}>
        Waiting for next question...
      </Text>
      <Text style={[styles.waitingSub, { color: colors.mutedForeground }]}>
        The host will start the quiz soon
      </Text>
    </View>
  );
}

// Question Screen
function QuestionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const question = useCurrentQuestion();
  const timerRemaining = useTimerRemaining();
  const selectedOption = useSelectedOption();
  const phase = useQuizPhase();
  const totalScore = useTotalScore();
  const submitAnswer = useQuizStore((s) => s.submitAnswer);
  const isSubmitting = useQuizStore((s) => s.isSubmitting);

  const handleSelect = useCallback(
    (option: 'a' | 'b' | 'c' | 'd') => {
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      submitAnswer(option);
    },
    [submitAnswer]
  );

  if (!question) return <IdleScreen />;

  const options = [
    { key: 'a' as const, text: question.optionA },
    { key: 'b' as const, text: question.optionB },
    question.optionC ? { key: 'c' as const, text: question.optionC } : null,
    question.optionD ? { key: 'd' as const, text: question.optionD } : null,
  ].filter(Boolean) as Array<{ key: 'a' | 'b' | 'c' | 'd'; text: string }>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.questionContent,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.questionTopBar}>
          <View style={[styles.scoreChip, { backgroundColor: colors.surface }]}>
            <Feather name="star" size={14} color={colors.accent} />
            <Text style={[styles.scoreText, { color: colors.foreground }]}>
              {totalScore.toLocaleString()}
            </Text>
          </View>
          <TimerRing remaining={timerRemaining} total={question.timerSeconds} />
        </View>

        {/* Question */}
        <Text style={[styles.questionText, { color: colors.foreground }]}>
          {question.questionText}
        </Text>

        {/* Options */}
        <View style={styles.optionsGrid}>
          {options.map((opt) => {
            const isSelected = selectedOption === opt.key;
            const disabled = phase === 'answered' || isSubmitting;

            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => handleSelect(opt.key)}
                disabled={disabled}
                activeOpacity={0.85}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: isSelected
                      ? `${colors.primary}22`
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    opacity: disabled ? 0.6 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionLabel,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : `${colors.mutedForeground}22`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabelText,
                      { color: isSelected ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {opt.key.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    { color: isSelected ? colors.primary : colors.foreground },
                  ]}
                >
                  {opt.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Locked indicator */}
        {selectedOption && (
          <View
            style={[
              styles.lockedBox,
              { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
            ]}
          >
            <Feather name="lock" size={14} color={colors.primary} />
            <Text style={[styles.lockedText, { color: colors.primary }]}>
              Answer locked! Waiting for reveal...
            </Text>
          </View>
        )}

        {isSubmitting && (
          <View style={styles.submittingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.submittingText, { color: colors.mutedForeground }]}>
              Submitting answer...
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Revealed Screen
function RevealedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const question = useCurrentQuestion();
  const selectedOption = useSelectedOption();
  const correctOption = useCorrectOption();
  const isCorrect = useIsCorrect();
  const totalScore = useTotalScore();
  const correctCount = useQuizStore((s) => s.correctCount);

  useEffect(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        isCorrect
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    }
  }, [isCorrect]);

  if (!question || !correctOption) return <IdleScreen />;

  const options = [
    { key: 'a' as const, text: question.optionA },
    { key: 'b' as const, text: question.optionB },
    question.optionC ? { key: 'c' as const, text: question.optionC } : null,
    question.optionD ? { key: 'd' as const, text: question.optionD } : null,
  ].filter(Boolean) as Array<{ key: 'a' | 'b' | 'c' | 'd'; text: string }>;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.revealContainer,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Result banner */}
      <View
        style={[
          styles.resultBanner,
          {
            backgroundColor: isCorrect
              ? `${colors.success}20`
              : `${colors.danger}15`,
            borderColor: isCorrect ? colors.success : colors.danger,
          },
        ]}
      >
        <Feather
          name={isCorrect ? "check-circle" : selectedOption ? "x-circle" : "clock"}
          size={28}
          color={isCorrect ? colors.success : colors.danger}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.resultTitle,
              { color: isCorrect ? colors.success : colors.danger },
            ]}
          >
            {isCorrect ? "Correct!" : selectedOption ? "Wrong answer" : "Time's up!"}
          </Text>
          <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
            {isCorrect ? "Great job!" : "Better luck next time"}
          </Text>
        </View>
      </View>

      {/* Question with answers */}
      <Text style={[styles.revealQuestion, { color: colors.foreground }]}>
        {question.questionText}
      </Text>

      <View style={styles.optionsGrid}>
        {options.map((opt) => {
          const isSelectedOpt = selectedOption === opt.key;
          const isCorrectOpt = correctOption === opt.key;
          const isWrong = isSelectedOpt && !isCorrect;

          let bg = colors.surface;
          let border = colors.border;
          let textColor = colors.foreground;

          if (isCorrectOpt) {
            bg = `${colors.success}22`;
            border = colors.success;
            textColor = colors.success;
          } else if (isWrong) {
            bg = `${colors.danger}22`;
            border = colors.danger;
            textColor = colors.danger;
          }

          return (
            <View
              key={opt.key}
              style={[
                styles.optionBtn,
                { backgroundColor: bg, borderColor: border },
              ]}
            >
              <View
                style={[
                  styles.optionLabel,
                  { backgroundColor: `${border}33` },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabelText,
                    {
                      color:
                        border === colors.border ? colors.mutedForeground : border,
                    },
                  ]}
                >
                  {opt.key.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.optionText, { color: textColor }]}>
                {opt.text}
              </Text>
              {isCorrectOpt && (
                <Feather
                  name="check-circle"
                  size={18}
                  color={colors.success}
                  style={{ marginLeft: "auto" }}
                />
              )}
              {isWrong && (
                <Feather
                  name="x-circle"
                  size={18}
                  color={colors.danger}
                  style={{ marginLeft: "auto" }}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Score card */}
      <View style={[styles.scoreCard, { backgroundColor: colors.surface }]}>
        <View style={styles.scoreStat}>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
            Your Score
          </Text>
          <Text style={[styles.scoreValue, { color: colors.accent }]}>
            {totalScore.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />
        <View style={styles.scoreStat}>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
            Correct
          </Text>
          <Text style={[styles.scoreValue, { color: colors.primary }]}>
            {correctCount}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Episode Ended Screen
function EpisodeEndedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const totalScore = useTotalScore();
  const correctCount = useQuizStore((s) => s.correctCount);
  const questionCount = useQuizStore((s) => s.questionCount);
  const currentRank = useQuizStore((s) => s.currentRank);

  return (
    <View
      style={[
        styles.fullCenter,
        { backgroundColor: colors.background, paddingTop: topPad, padding: 20 },
      ]}
    >
      <View style={[styles.trophyIcon, { backgroundColor: `${colors.accent}22` }]}>
        <Feather name="award" size={48} color={colors.accent} />
      </View>
      <Text style={[styles.completeTitle, { color: colors.foreground }]}>
        Quiz Complete!
      </Text>

      <View style={[styles.finalScoreCard, { backgroundColor: colors.surface }]}>
        {currentRank && (
          <View style={styles.finalStat}>
            <Text style={[styles.finalStatVal, { color: colors.accent }]}>
              #{currentRank}
            </Text>
            <Text style={[styles.finalStatLabel, { color: colors.mutedForeground }]}>
              Rank
            </Text>
          </View>
        )}
        <View style={styles.finalStat}>
          <Text style={[styles.finalStatVal, { color: colors.foreground }]}>
            {correctCount}/{questionCount}
          </Text>
          <Text style={[styles.finalStatLabel, { color: colors.mutedForeground }]}>
            Correct
          </Text>
        </View>
        <View style={styles.finalStat}>
          <Text style={[styles.finalStatVal, { color: colors.foreground }]}>
            {totalScore.toLocaleString()}
          </Text>
          <Text style={[styles.finalStatLabel, { color: colors.mutedForeground }]}>
            Points
          </Text>
        </View>
      </View>
    </View>
  );
}

// Root Component
export default function CookAlongScreen() {
  const phase = useQuizPhase();
  const { joinEpisode, handleQuestionActivated, handleQuestionClosed, handleLeaderboardUpdate, handleEpisodeEnded, reset } = useQuizStore();
  const isConnectionFailed = useRealtimeStore((s) => s.isAnyChannelFailed());
  const currentLiveEpisodeId = useEpisodeStore((s) => s.currentLiveEpisodeId);
  const colors = useColors();

  // Connect Realtime (only if episode ID exists)
  useEpisodeChannel(currentLiveEpisodeId ?? '');

  useQuestionEvents(currentLiveEpisodeId ?? '', {
    onActivated: useCallback(handleQuestionActivated, []),
    onClosed: useCallback(handleQuestionClosed, []),
  });

  useLeaderboardEvents(currentLiveEpisodeId ?? '', useCallback(handleLeaderboardUpdate, []));

  useEpisodeStateEvents(currentLiveEpisodeId ?? '', {
    onEnded: useCallback(handleEpisodeEnded, []),
  });

  // Join episode on mount
  useEffect(() => {
    if (currentLiveEpisodeId) {
      joinEpisode(currentLiveEpisodeId);
    }
    return () => reset();
  }, [currentLiveEpisodeId]);

  return (
    <>
      {isConnectionFailed && (
        <View style={[styles.connectionBanner, { backgroundColor: colors.danger }]}>
          <Feather name="wifi-off" size={14} color="#fff" />
          <Text style={styles.connectionText}>Connection lost. Reconnecting...</Text>
        </View>
      )}

      {!currentLiveEpisodeId ? (
        <View style={[styles.fullCenter, { backgroundColor: colors.background }]}>
          <View style={[styles.waitingIcon, { backgroundColor: `${colors.mutedForeground}22` }]}>
            <Feather name="tv" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.waitingTitle, { color: colors.foreground }]}>
            No Live Episode
          </Text>
          <Text style={[styles.waitingSub, { color: colors.mutedForeground }]}>
            Check back when a show is live
          </Text>
        </View>
      ) : (
        <>
          {phase === 'idle' && <IdleScreen />}
          {phase === 'question' && <QuestionScreen />}
          {phase === 'answered' && <QuestionScreen />}
          {phase === 'revealed' && <RevealedScreen />}
          {phase === 'episode_ended' && <EpisodeEndedScreen />}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fullCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  waitingIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  waitingTitle: { fontSize: 24, fontWeight: "800" },
  waitingSub: { fontSize: 15 },

  questionContent: { paddingHorizontal: 20, gap: 20 },
  questionTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scoreChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  scoreText: { fontSize: 16, fontWeight: "700" },
  timerRingWrap: { width: 72, height: 72, alignItems: "center", justifyContent: "center", position: "relative" },
  timerNumber: { fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  questionText: { fontSize: 22, fontWeight: "700", lineHeight: 30 },
  optionsGrid: { gap: 10 },
  optionBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 2 },
  optionLabel: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  optionLabelText: { fontSize: 14, fontWeight: "800" },
  optionText: { flex: 1, fontSize: 15, fontWeight: "500", lineHeight: 21 },
  lockedBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  lockedText: { flex: 1, fontSize: 14, fontWeight: "600" },
  submittingBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 14 },
  submittingText: { fontSize: 14 },

  revealContainer: { paddingHorizontal: 20, gap: 16 },
  resultBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  resultTitle: { fontSize: 18, fontWeight: "800" },
  resultSub: { fontSize: 13, marginTop: 2 },
  revealQuestion: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  scoreCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14 },
  scoreStat: { flex: 1, alignItems: "center", gap: 4 },
  scoreLabel: { fontSize: 13 },
  scoreValue: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  scoreDivider: { width: 1, height: 40, marginHorizontal: 8 },

  trophyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  completeTitle: { fontSize: 28, fontWeight: "900", marginTop: 12 },
  finalScoreCard: { borderRadius: 20, padding: 20, marginTop: 24, width: "100%", flexDirection: "row" },
  finalStat: { flex: 1, alignItems: "center", gap: 6 },
  finalStatVal: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  finalStatLabel: { fontSize: 12 },

  connectionBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12 },
  connectionText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
