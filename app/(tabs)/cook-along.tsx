/**
 * Live Quiz screen — the core real-time game experience.
 *
 * State machine:
 *   idle  →  countdown (3-2-1)  →  question (timer)
 *         →  revealing (correct/wrong shown)
 *         →  between (mini leaderboard)
 *         →  (loop for each question)
 *         →  complete (final leaderboard)
 *
 * In production, the host pushes questions via Supabase Realtime.
 * Here we simulate with mock data and a local timer.
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOCK_QUIZ_EVENT } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";
import { useGamificationStore } from "@/store/useGamificationStore";
import { useQuizStore } from "@/store/useQuizStore";
import { QuizLeaderboardEntry, QuizOption } from "@/types";

const { width: SW, height: SH } = Dimensions.get("window");
const MEDAL_COLORS = ["#F5A623", "#C0C0C0", "#CD7F32"];

// ─── Sub-components ────────────────────────────────────────────────────────────

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
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={isUrgent ? colors.neonRed : colors.primary}
          strokeWidth={stroke} fill="none"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2},${size / 2}`}
        />
      </Svg>
      <Text style={[styles.timerNumber, { color: isUrgent ? colors.neonRed : colors.foreground }]}>
        {remaining}
      </Text>
    </View>
  );
}

function OptionButton({
  option, selected, correctId, phase, onPress,
}: {
  option: QuizOption;
  selected: string | null;
  correctId: string;
  phase: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isRevealing = phase === "revealing";
  const isCorrect = option.id === correctId;
  const isSelected = option.id === selected;
  const isWrong = isSelected && !isCorrect;

  let bg = colors.surface;
  let border = colors.border;
  let textColor = colors.foreground;

  if (isRevealing) {
    if (isCorrect) { bg = `${colors.success}22`; border = colors.success; textColor = colors.success; }
    else if (isWrong) { bg = `${colors.danger}22`; border = colors.danger; textColor = colors.danger; }
  } else if (isSelected) {
    bg = `${colors.primary}22`; border = colors.primary; textColor = colors.primary;
  }

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        disabled={phase !== "question" || selected !== null}
        style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}
      >
        <View style={[styles.optionLabel, { backgroundColor: `${border}33` }]}>
          <Text style={[styles.optionLabelText, { color: border === colors.border ? colors.mutedForeground : border }]}>
            {option.label}
          </Text>
        </View>
        <Text style={[styles.optionText, { color: textColor }]}>{option.text}</Text>
        {isRevealing && isCorrect && (
          <Feather name="check-circle" size={18} color={colors.success} style={{ marginLeft: "auto" }} />
        )}
        {isRevealing && isWrong && (
          <Feather name="x-circle" size={18} color={colors.danger} style={{ marginLeft: "auto" }} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function MiniLeaderboard({ entries }: { entries: QuizLeaderboardEntry[] }) {
  const colors = useColors();
  const top5 = entries.slice(0, 5);
  const me = entries.find((e) => e.isCurrentUser);
  const meIsTop5 = me && me.rank <= 5;

  return (
    <View style={styles.miniLb}>
      {top5.map((entry) => (
        <View
          key={entry.userId}
          style={[
            styles.miniLbRow,
            {
              backgroundColor: entry.isCurrentUser ? `${colors.primary}20` : colors.surface,
              borderColor: entry.isCurrentUser ? colors.primary : "transparent",
              borderWidth: entry.isCurrentUser ? 1.5 : 0,
            },
          ]}
        >
          <Text style={[styles.miniLbRank, { color: entry.rank <= 3 ? MEDAL_COLORS[entry.rank - 1] : colors.mutedForeground }]}>
            #{entry.rank}
          </Text>
          <Text style={[styles.miniLbName, { color: entry.isCurrentUser ? colors.primary : colors.foreground }]}>
            {entry.username}{entry.isCurrentUser ? " (you)" : ""}
          </Text>
          <Text style={[styles.miniLbScore, { color: entry.rank <= 3 ? MEDAL_COLORS[entry.rank - 1] : colors.foreground }]}>
            {entry.score.toLocaleString()}
          </Text>
        </View>
      ))}
      {!meIsTop5 && me && (
        <>
          <Text style={[styles.ellipsis, { color: colors.mutedForeground }]}>· · ·</Text>
          <View style={[styles.miniLbRow, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary, borderWidth: 1.5 }]}>
            <Text style={[styles.miniLbRank, { color: colors.primary }]}>#{me.rank}</Text>
            <Text style={[styles.miniLbName, { color: colors.primary }]}>you</Text>
            <Text style={[styles.miniLbScore, { color: colors.primary }]}>{me.score.toLocaleString()}</Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Phase screens ──────────────────────────────────────────────────────────

function IdleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { startQuiz, pastResults, loadPastResults } = useQuizStore();

  useEffect(() => { loadPastResults(); }, []);

  const event = MOCK_QUIZ_EVENT;
  const timeToStart = new Date(event.scheduledAt).getTime() - Date.now();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.idleContent, { paddingTop: topPad + 16, paddingBottom: bottomPad + 80 }]}
        showsVerticalScrollIndicator={false}
      >
      {/* Live event card */}
      <View style={[styles.eventCard, { backgroundColor: colors.surface }]}>
        <Image source={{ uri: event.thumbnailUrl }} style={styles.eventThumb} contentFit="cover" />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.eventCardOverlay}>
          <View style={[styles.livePill, { backgroundColor: colors.live }]}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>LIVE QUIZ</Text>
          </View>
          <Text style={styles.eventTitle}>{event.episodeTitle}</Text>
          <Text style={styles.eventChef}>{event.chefName}</Text>
          <View style={styles.eventMeta}>
            <View style={styles.eventMetaItem}>
              <Feather name="users" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.eventMetaText}>{event.participantCount.toLocaleString()} playing</Text>
            </View>
            <View style={styles.eventMetaItem}>
              <Feather name="help-circle" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.eventMetaText}>{event.totalQuestions} questions</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Join button */}
      <TouchableOpacity
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          startQuiz();
        }}
        style={[styles.joinBtn, { backgroundColor: colors.neonRed }]}
      >
        <Feather name="zap" size={20} color="#fff" />
        <Text style={styles.joinBtnText}>Join Live Quiz</Text>
      </TouchableOpacity>

      <View style={[styles.hintCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="info" size={15} color={colors.neonRed} />
        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
          Answer faster for more points. A correct answer in 2 seconds beats the same answer in 10.
        </Text>
      </View>

      {/* Past results */}
      {pastResults.length > 0 && (
        <View style={styles.pastSection}>
          <Text style={[styles.pastTitle, { color: colors.foreground }]}>Your Quiz History</Text>
          {pastResults.map((r) => (
            <View key={r.eventId} style={[styles.pastCard, { backgroundColor: colors.surface }]}>
              <View style={styles.pastCardHeader}>
                <Text style={[styles.pastCardTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {r.eventTitle}
                </Text>
                <Text style={[styles.pastCardDate, { color: colors.mutedForeground }]}>
                  {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
              <View style={styles.pastCardStats}>
                <View style={styles.pastStat}>
                  <Text style={[styles.pastStatVal, { color: colors.accent }]}>
                    #{r.rank}
                  </Text>
                  <Text style={[styles.pastStatLabel, { color: colors.mutedForeground }]}>
                    of {r.totalParticipants.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.pastStat}>
                  <Text style={[styles.pastStatVal, { color: colors.foreground }]}>
                    {r.correctAnswers}/{r.totalQuestions}
                  </Text>
                  <Text style={[styles.pastStatLabel, { color: colors.mutedForeground }]}>correct</Text>
                </View>
                <View style={styles.pastStat}>
                  <Text style={[styles.pastStatVal, { color: colors.foreground }]}>
                    {r.totalScore.toLocaleString()}
                  </Text>
                  <Text style={[styles.pastStatLabel, { color: colors.mutedForeground }]}>pts</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
    </View>
  );
}

function CountdownScreen() {
  const colors = useColors();
  const { countdownValue, tickCountdown } = useQuizStore();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true, speed: 30 }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [countdownValue]);

  useEffect(() => {
    const t = setTimeout(() => tickCountdown(), 1000);
    return () => clearTimeout(t);
  }, [countdownValue]);

  return (
    <View style={[styles.fullCenter, { backgroundColor: colors.background }]}>
      <Text style={[styles.countdownLabel, { color: colors.mutedForeground }]}>Get ready!</Text>
      <Animated.Text
        style={[styles.countdownNumber, { color: colors.primary, transform: [{ scale: scaleAnim }] }]}
      >
        {countdownValue}
      </Animated.Text>
      <Text style={[styles.countdownSub, { color: colors.mutedForeground }]}>Quiz starting…</Text>
    </View>
  );
}

function QuestionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const {
    questions, currentQuestionIndex, timerRemaining, selectedOptionId,
    phase, selectAnswer, tickTimer,
  } = useQuizStore();

  const question = questions[currentQuestionIndex];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (phase !== "question") return;
    const t = setInterval(() => tickTimer(), 1000);
    return () => clearInterval(t);
  }, [phase, currentQuestionIndex]);

  if (!question) return null;

  const handleSelect = (optionId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectAnswer(optionId);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={[
          styles.questionContent,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.questionTopBar}>
          <View style={[styles.qProgressPills, { gap: 4 }]}>
            {questions.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.progressPill,
                  {
                    backgroundColor:
                      idx < currentQuestionIndex
                        ? colors.success
                        : idx === currentQuestionIndex
                        ? colors.primary
                        : colors.surface,
                    flex: 1,
                  },
                ]}
              />
            ))}
          </View>
          <TimerRing remaining={timerRemaining} total={question.timerSeconds} />
        </View>

        {/* Question meta */}
        <View style={styles.questionMeta}>
          <View style={[styles.categoryPill, { backgroundColor: `${colors.accent}20` }]}>
            <Text style={[styles.categoryText, { color: colors.accent }]}>{question.category}</Text>
          </View>
          <Text style={[styles.questionCounter, { color: colors.mutedForeground }]}>
            Q{currentQuestionIndex + 1} of {questions.length}
          </Text>
        </View>

        {/* Question text */}
        <Text style={[styles.questionText, { color: colors.foreground }]}>{question.text}</Text>

        {/* Options */}
        <View style={styles.optionsGrid}>
          {question.options.map((opt) => (
            <OptionButton
              key={opt.id}
              option={opt}
              selected={selectedOptionId}
              correctId={question.correctOptionId}
              phase={phase}
              onPress={() => handleSelect(opt.id)}
            />
          ))}
        </View>

        {/* Show locked answer indicator */}
        {selectedOptionId && (
          <View style={[styles.lockedAnswerBox, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
            <Feather name="lock" size={14} color={colors.primary} />
            <Text style={[styles.lockedAnswerText, { color: colors.primary }]}>
              Answer locked! Waiting for reveal...
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

function RevealingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { questions, currentQuestionIndex, selectedOptionId, userAnswers, sessionScore, liveLeaderboard, showBetweenLeaderboard } = useQuizStore();
  const { awardXP } = useGamificationStore();

  const question = questions[currentQuestionIndex];
  const lastAnswer = userAnswers[userAnswers.length - 1];
  const isCorrect = lastAnswer?.isCorrect ?? false;
  const pointsEarned = lastAnswer?.pointsEarned ?? 0;
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const myEntry = liveLeaderboard.find((e) => e.isCurrentUser);
  const top3 = liveLeaderboard.slice(0, 3);

  useEffect(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        isCorrect
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    }
    Animated.parallel([
      Animated.timing(pointsAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 15 }),
    ]).start();
  }, []);

  // Auto-advance after 8s to show leaderboard
  useEffect(() => {
    const t = setTimeout(() => showBetweenLeaderboard(), 8000);
    return () => clearTimeout(t);
  }, []);

  if (!question) return null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.revealContainer, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Result banner */}
      <Animated.View
        style={[
          styles.resultBanner,
          {
            backgroundColor: isCorrect ? `${colors.success}20` : `${colors.danger}15`,
            borderColor: isCorrect ? colors.success : colors.danger,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Feather
          name={isCorrect ? "check-circle" : selectedOptionId ? "x-circle" : "clock"}
          size={28}
          color={isCorrect ? colors.success : colors.danger}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.resultTitle, { color: isCorrect ? colors.success : colors.danger }]}>
            {isCorrect ? "Correct!" : selectedOptionId ? "Wrong answer" : "Time's up!"}
          </Text>
          {isCorrect ? (
            <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
              +{pointsEarned.toLocaleString()} pts earned
            </Text>
          ) : (
            <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>No points this round</Text>
          )}
        </View>
        <Animated.Text style={[styles.pointsBurst, { color: colors.accent, opacity: pointsAnim, transform: [{ scale: pointsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>
          {isCorrect ? `+${pointsEarned.toLocaleString()}` : ""}
        </Animated.Text>
      </Animated.View>

      {/* Re-show options with correct highlighted */}
      <Text style={[styles.revealQuestion, { color: colors.foreground }]}>{question.text}</Text>
      <View style={styles.optionsGrid}>
        {question.options.map((opt) => (
          <OptionButton
            key={opt.id}
            option={opt}
            selected={selectedOptionId}
            correctId={question.correctOptionId}
            phase="revealing"
            onPress={() => {}}
          />
        ))}
      </View>

      {/* Explanation */}
      {question.explanation && (
        <View style={[styles.explanationBox, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
          <Feather name="info" size={14} color={colors.primary} />
          <Text style={[styles.explanationText, { color: colors.foreground }]}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Chef says: </Text>
            {question.explanation}
          </Text>
        </View>
      )}

      {/* Your score + rank */}
      <View style={[styles.revealScoreCard, { backgroundColor: colors.surface }]}>
        <View style={styles.revealScoreStat}>
          <Text style={[styles.revealScoreLabel, { color: colors.mutedForeground }]}>Your Score</Text>
          <Text style={[styles.revealScoreValue, { color: colors.accent }]}>{sessionScore.toLocaleString()}</Text>
        </View>
        <View style={[styles.revealScoreDivider, { backgroundColor: colors.border }]} />
        <View style={styles.revealScoreStat}>
          <Text style={[styles.revealScoreLabel, { color: colors.mutedForeground }]}>Your Rank</Text>
          <Text style={[styles.revealScoreValue, { color: colors.primary }]}>#{myEntry?.rank ?? "—"}</Text>
        </View>
      </View>

      {/* Top 3 leaderboard */}
      <Text style={[styles.revealLeaderboardTitle, { color: colors.foreground }]}>Top 3 Players</Text>
      <View style={styles.top3Grid}>
        {top3.map((entry, idx) => (
          <View
            key={entry.userId}
            style={[
              styles.top3Card,
              {
                backgroundColor: entry.isCurrentUser ? `${colors.primary}20` : colors.surface,
                borderColor: entry.isCurrentUser ? colors.primary : "transparent",
                borderWidth: entry.isCurrentUser ? 1.5 : 0,
              },
            ]}
          >
            <View style={[styles.top3Medal, { backgroundColor: `${MEDAL_COLORS[idx]}22` }]}>
              <Text style={[styles.top3MedalText, { color: MEDAL_COLORS[idx] }]}>#{idx + 1}</Text>
            </View>
            <Text style={[styles.top3Name, { color: entry.isCurrentUser ? colors.primary : colors.foreground }]} numberOfLines={1}>
              {entry.username}
            </Text>
            <Text style={[styles.top3Score, { color: MEDAL_COLORS[idx] }]}>
              {entry.score.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function BetweenScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { liveLeaderboard, sessionScore, nextQuestion, currentQuestionIndex, questions } = useQuizStore();

  const isLastQuestion = currentQuestionIndex >= questions.length - 1;

  // Auto-advance after 7 seconds
  useEffect(() => {
    const t = setTimeout(() => nextQuestion(), 7000);
    return () => clearTimeout(t);
  }, []);

  const myEntry = liveLeaderboard.find((e) => e.isCurrentUser);

  return (
    <View style={[styles.betweenContainer, { backgroundColor: colors.background, paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}>
      <Text style={[styles.betweenTitle, { color: colors.foreground }]}>After Q{currentQuestionIndex + 1}</Text>
      <Text style={[styles.betweenSub, { color: colors.mutedForeground }]}>
        {isLastQuestion ? "Final question! Leaderboard loading..." : `Next question in a moment…`}
      </Text>

      {myEntry && (
        <View style={[styles.myScoreCard, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}>
          <Text style={[styles.myScoreRank, { color: colors.primary }]}>#{myEntry.rank}</Text>
          <View>
            <Text style={[styles.myScoreLabel, { color: colors.mutedForeground }]}>Your rank</Text>
            <Text style={[styles.myScoreVal, { color: colors.foreground }]}>{sessionScore.toLocaleString()} pts</Text>
          </View>
        </View>
      )}

      <MiniLeaderboard entries={liveLeaderboard} />

      <View style={[styles.autoAdvanceHint, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
        <Feather name="clock" size={14} color={colors.primary} />
        <Text style={[styles.autoAdvanceText, { color: colors.primary }]}>
          {isLastQuestion ? "Final results loading..." : "Next question starting soon..."}
        </Text>
      </View>
    </View>
  );
}

function CompleteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { liveLeaderboard, sessionScore, userAnswers, questions, participantCount, resetQuiz } = useQuizStore();
  const { awardXP } = useGamificationStore();

  const correctCount = userAnswers.filter((a) => a.isCorrect).length;
  const myEntry = liveLeaderboard.find((e) => e.isCurrentUser);
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    awardXP("QUIZ_COMPLETED", "Completed live quiz");
    if (myEntry && myEntry.rank <= 10) awardXP("QUIZ_TOP_10", "Finished top 10!");
    Animated.timing(confettiAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.completeContent,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Trophy header */}
      <Animated.View style={[styles.trophySection, { opacity: confettiAnim }]}>
        <View style={[styles.trophyIcon, { backgroundColor: `${colors.accent}22` }]}>
          <Feather name="award" size={48} color={colors.accent} />
        </View>
        <Text style={[styles.completeTitle, { color: colors.foreground }]}>Quiz Complete!</Text>
        <Text style={[styles.completeEpisode, { color: colors.mutedForeground }]}>
          Italian Risotto Night · S3 E8
        </Text>
      </Animated.View>

      {/* Your result */}
      <View style={[styles.myResultCard, { backgroundColor: colors.surface }]}>
        <View style={styles.myResultRow}>
          <View style={styles.myResultStat}>
            <Text style={[styles.myResultVal, { color: colors.accent, fontSize: 36 }]}>
              #{myEntry?.rank ?? "—"}
            </Text>
            <Text style={[styles.myResultLabel, { color: colors.mutedForeground }]}>
              of {participantCount.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.myResultDivider, { backgroundColor: colors.border }]} />
          <View style={styles.myResultStat}>
            <Text style={[styles.myResultVal, { color: colors.foreground }]}>
              {correctCount}/{questions.length}
            </Text>
            <Text style={[styles.myResultLabel, { color: colors.mutedForeground }]}>correct</Text>
          </View>
          <View style={[styles.myResultDivider, { backgroundColor: colors.border }]} />
          <View style={styles.myResultStat}>
            <Text style={[styles.myResultVal, { color: colors.foreground }]}>
              {sessionScore.toLocaleString()}
            </Text>
            <Text style={[styles.myResultLabel, { color: colors.mutedForeground }]}>pts</Text>
          </View>
        </View>
      </View>

      {/* Question-by-question review */}
      <Text style={[styles.reviewTitle, { color: colors.foreground }]}>Question Review</Text>
      <View style={styles.reviewList}>
        {questions.map((q, idx) => {
          const answer = userAnswers[idx];
          const isCorrect = answer?.isCorrect;
          const selectedOpt = q.options.find((o) => o.id === answer?.selectedOptionId);
          const correctOpt = q.options.find((o) => o.id === q.correctOptionId);
          return (
            <View key={q.id} style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
              <View style={styles.reviewCardHeader}>
                <View style={[styles.reviewQNum, { backgroundColor: isCorrect ? `${colors.success}22` : `${colors.danger}15` }]}>
                  <Feather name={isCorrect ? "check" : "x"} size={12} color={isCorrect ? colors.success : colors.danger} />
                </View>
                <Text style={[styles.reviewQText, { color: colors.foreground }]} numberOfLines={2}>{q.text}</Text>
              </View>
              <View style={styles.reviewAnswers}>
                {selectedOpt && !isCorrect && (
                  <Text style={[styles.reviewYourAnswer, { color: colors.danger }]}>
                    Your answer: {selectedOpt.label}. {selectedOpt.text}
                  </Text>
                )}
                {!answer?.selectedOptionId && (
                  <Text style={[styles.reviewYourAnswer, { color: colors.danger }]}>No answer — time ran out</Text>
                )}
                <Text style={[styles.reviewCorrect, { color: colors.success }]}>
                  Correct: {correctOpt?.label}. {correctOpt?.text}
                </Text>
              </View>
              <Text style={[styles.reviewPoints, { color: isCorrect ? colors.accent : colors.mutedForeground }]}>
                {isCorrect ? `+${answer.pointsEarned.toLocaleString()} pts` : "0 pts"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Full leaderboard */}
      <Text style={[styles.reviewTitle, { color: colors.foreground }]}>Final Leaderboard</Text>
      <MiniLeaderboard entries={liveLeaderboard} />

      <View style={[styles.quizEndHint, { backgroundColor: `${colors.mutedForeground}15` }]}>
        <Feather name="tv" size={16} color={colors.mutedForeground} />
        <Text style={[styles.quizEndText, { color: colors.mutedForeground }]}>
          Quiz complete! Watch for the next live episode.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function QuizScreen() {
  const { phase } = useQuizStore();

  switch (phase) {
    case "idle":      return <IdleScreen />;
    case "countdown": return <CountdownScreen />;
    case "question":  return <QuestionScreen />;
    case "revealing": return <RevealingScreen />;
    case "between":   return <BetweenScreen />;
    case "complete":  return <CompleteScreen />;
    default:          return <IdleScreen />;
  }
}

const styles = StyleSheet.create({
  // Idle
  idleContent: { paddingHorizontal: 20, gap: 16 },
  eventCard: { height: 240, borderRadius: 22, overflow: "hidden", position: "relative" },
  eventThumb: { width: "100%", height: "100%" },
  eventCardOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, gap: 4 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  livePillText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  eventTitle: { color: "#fff", fontSize: 20, fontWeight: "800", lineHeight: 26 },
  eventChef: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  eventMeta: { flexDirection: "row", gap: 14, marginTop: 4 },
  eventMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventMetaText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  joinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 16 },
  joinBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  hintCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 19 },
  pastSection: { gap: 12 },
  pastTitle: { fontSize: 18, fontWeight: "700" },
  pastCard: { borderRadius: 16, padding: 14, gap: 12 },
  pastCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pastCardTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  pastCardDate: { fontSize: 12 },
  pastCardStats: { flexDirection: "row", gap: 8 },
  pastStat: { flex: 1, alignItems: "center", gap: 2 },
  pastStatVal: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  pastStatLabel: { fontSize: 11 },

  // Countdown
  fullCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  countdownLabel: { fontSize: 18, fontWeight: "600" },
  countdownNumber: { fontSize: 120, fontWeight: "900", letterSpacing: -4 },
  countdownSub: { fontSize: 15 },

  // Question
  questionContent: { paddingHorizontal: 20, gap: 20 },
  questionTopBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  qProgressPills: { flex: 1, flexDirection: "row", height: 6 },
  progressPill: { height: 6, borderRadius: 3 },
  timerRingWrap: { width: 72, height: 72, alignItems: "center", justifyContent: "center", position: "relative" },
  timerNumber: { fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  questionMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  categoryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  categoryText: { fontSize: 11, fontWeight: "700" },
  questionCounter: { fontSize: 13 },
  questionText: { fontSize: 22, fontWeight: "700", lineHeight: 30 },
  optionsGrid: { gap: 10 },
  optionBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 2 },
  optionLabel: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  optionLabelText: { fontSize: 14, fontWeight: "800" },
  optionText: { flex: 1, fontSize: 15, fontWeight: "500", lineHeight: 21 },
  lockedAnswerBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  lockedAnswerText: { flex: 1, fontSize: 14, fontWeight: "600" },

  // Revealing
  revealContainer: { flex: 1, paddingHorizontal: 20, gap: 16 },
  resultBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  resultTitle: { fontSize: 18, fontWeight: "800" },
  resultSub: { fontSize: 13, marginTop: 2 },
  pointsBurst: { fontSize: 22, fontWeight: "900" },
  revealQuestion: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  explanationBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, borderLeftWidth: 3, alignItems: "flex-start" },
  explanationText: { flex: 1, fontSize: 14, lineHeight: 20 },
  runningScore: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 14 },
  runningScoreLabel: { fontSize: 14 },
  runningScoreValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  revealScoreCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14 },
  revealScoreStat: { flex: 1, alignItems: "center", gap: 4 },
  revealScoreLabel: { fontSize: 13 },
  revealScoreValue: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  revealScoreDivider: { width: 1, height: 40, marginHorizontal: 8 },
  revealLeaderboardTitle: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  top3Grid: { flexDirection: "row", gap: 8 },
  top3Card: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center", gap: 6 },
  top3Medal: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  top3MedalText: { fontSize: 14, fontWeight: "800" },
  top3Name: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  top3Score: { fontSize: 16, fontWeight: "800" },

  // Between
  betweenContainer: { flex: 1, paddingHorizontal: 20, gap: 16 },
  betweenTitle: { fontSize: 22, fontWeight: "800" },
  betweenSub: { fontSize: 14, marginTop: -8 },
  myScoreCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  myScoreRank: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  myScoreLabel: { fontSize: 12 },
  myScoreVal: { fontSize: 20, fontWeight: "700" },
  autoAdvanceHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, marginTop: 4 },
  autoAdvanceText: { fontSize: 14, fontWeight: "600" },

  // Mini leaderboard
  miniLb: { gap: 6 },
  miniLbRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12 },
  miniLbRank: { width: 28, fontSize: 13, fontWeight: "700" },
  miniLbName: { flex: 1, fontSize: 14, fontWeight: "600" },
  miniLbScore: { fontSize: 15, fontWeight: "700" },
  ellipsis: { textAlign: "center", fontSize: 16, letterSpacing: 4 },

  // Complete
  completeContent: { paddingHorizontal: 20, gap: 20 },
  trophySection: { alignItems: "center", gap: 10 },
  trophyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  completeTitle: { fontSize: 28, fontWeight: "900" },
  completeEpisode: { fontSize: 14 },
  myResultCard: { borderRadius: 20, padding: 20 },
  myResultRow: { flexDirection: "row", alignItems: "center" },
  myResultStat: { flex: 1, alignItems: "center", gap: 3 },
  myResultVal: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  myResultLabel: { fontSize: 11 },
  myResultDivider: { width: 1, height: 50, marginHorizontal: 8 },
  reviewTitle: { fontSize: 18, fontWeight: "700" },
  reviewList: { gap: 10 },
  reviewCard: { borderRadius: 14, padding: 14, gap: 10 },
  reviewCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  reviewQNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 1 },
  reviewQText: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  reviewAnswers: { gap: 4, paddingLeft: 34 },
  reviewYourAnswer: { fontSize: 13 },
  reviewCorrect: { fontSize: 13, fontWeight: "600" },
  reviewPoints: { fontSize: 13, fontWeight: "700", textAlign: "right" },
  quizEndHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, marginTop: 8 },
  quizEndText: { fontSize: 14, fontWeight: "500", textAlign: "center" },
});
