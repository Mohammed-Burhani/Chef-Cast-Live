/**
 * QuizTab Component
 * Live quiz interface driven by realtime Supabase events
 * State machine: idle → question → revealing → between → complete
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/useAuthStore';
import { useLiveQuizStore, useLiveQuizPhase, useLiveCurrentQuestion, useLiveTimerRemaining, useLiveSelectedOption, useLiveTotalScore, useLiveCorrectCount, useLiveLeaderboard, useLiveViewerRank, useLiveCurrentQuestionNumber, useLiveTotalQuestions } from '@/store/useLiveQuizStore';
import { useSubmitAnswerLive, useCloseQuestion, useUserAnswer } from '@/lib/api/live';
import { StartingSoon } from './StartingSoon';
import { LeaderboardPanel } from './LeaderboardPanel';
import type { Database } from '@/types/database';

type Question = Database['public']['Tables']['questions']['Row'];

interface QuizTabProps {
  episodeId: string;
}

function getOptionsFromQuestion(question: Question | null): Array<{ key: 'a' | 'b' | 'c' | 'd'; text: string }> {
  if (!question) return [];
  const options: Array<{ key: 'a' | 'b' | 'c' | 'd'; text: string }> = [];
  if (question.option_a) options.push({ key: 'a', text: question.option_a });
  if (question.option_b) options.push({ key: 'b', text: question.option_b });
  if (question.option_c) options.push({ key: 'c', text: question.option_c });
  if (question.option_d) options.push({ key: 'd', text: question.option_d });
  return options;
}

export function QuizTab({ episodeId }: QuizTabProps) {
  const colors = useColors();
  const user = useAuthStore((s) => s.user);

  const phase = useLiveQuizPhase();
  const currentQuestion = useLiveCurrentQuestion();
  const timerRemaining = useLiveTimerRemaining();
  const selectedOption = useLiveSelectedOption();
  const totalScore = useLiveTotalScore();
  const correctCount = useLiveCorrectCount();
  const leaderboard = useLiveLeaderboard();
  const viewerRank = useLiveViewerRank();
  const currentQuestionNumber = useLiveCurrentQuestionNumber();
  const totalQuestions = useLiveTotalQuestions();

  // Store actions
  const setSelectedOption = useLiveQuizStore((s) => s.setSelectedOption);
  const submitAnswer = useLiveQuizStore((s) => s.submitAnswer);
  const handleQuestionClosed = useLiveQuizStore((s) => s.handleQuestionClosed);

  // Mutations
  const submitAnswerMutation = useSubmitAnswerLive();
  const closeQuestionMutation = useCloseQuestion();

  // Track answer submission for current question
  const hasSubmitted = useRef(false);
  const questionStartTime = useRef<number>(0);
  const autoCloseTriggered = useRef(false);
  const handleAutoCloseRef = useRef<typeof handleAutoClose>(() => {});

  // Local state for immediate visual feedback on option selection
  // (bypasses any async delays from Zustand store updates)
  const [localSelectedOption, setLocalSelectedOption] = useState<string | null>(null);
  const prevQuestionId = useRef<string | null>(null);

  // Reset local state when question changes
  useEffect(() => {
    if (currentQuestion?.id && currentQuestion.id !== prevQuestionId.current) {
      setLocalSelectedOption(null);
      prevQuestionId.current = currentQuestion.id;
    }
  }, [currentQuestion?.id]);

  // Pulse animation for idle
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    if (phase === 'idle') {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 1200 }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [phase, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Record question start time when a new question activates
  useEffect(() => {
    if (phase === 'question' && currentQuestion) {
      questionStartTime.current = Date.now();
      hasSubmitted.current = false;
      autoCloseTriggered.current = false;
    }
  }, [phase, currentQuestion?.id]);

  // Timer interval
  useEffect(() => {
    if (phase === 'question') {
      const interval = setInterval(() => {
        const store = useLiveQuizStore.getState();
        store.tickTimer();

        // When timer hits 0, auto-close (guard against double-call)
        if (store.timerRemaining <= 1 && !autoCloseTriggered.current) {
          autoCloseTriggered.current = true;
          handleAutoCloseRef.current();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
    // NOTE: revealing → between/complete transition is now driven by
    // QUESTION_DISMISSED realtime events, NOT a timer. The admin must
    // dismiss the question before the leaderboard shows.
  }, [phase, currentQuestion?.id]);

  const handleAutoClose = useCallback(async () => {
    if (!currentQuestion || !episodeId) return;

    try {
      const result = await closeQuestionMutation.mutateAsync({
        episodeId,
        questionId: currentQuestion.id,
      });

      // If another client/admin already closed this question, the edge function
      // returns { alreadyClosed: true } without correctOption. In that case,
      // wait for the realtime QUESTION_CLOSED event which carries the real answer.
      if (result.alreadyClosed) {
        return;
      }

      // Use the real correctOption from the edge function response.
      // Never fall back to currentQuestion.correct_option — it's always the
      // placeholder 'a' from the QUESTION_ACTIVATED event (correct answer
      // is never included in that event for security).
      if (result.correctOption) {
        handleQuestionClosed(result.correctOption, currentQuestion.id);
      }
    } catch (err) {
      // Question might already be closed by another client or admin.
      // Don't use the placeholder correct_option ('a') — instead, wait for
      // the realtime QUESTION_CLOSED event which carries the real answer.
      // The event handler in LiveSessionScreen will call handleQuestionClosed()
      // with the correct option.
    }
  }, [currentQuestion, episodeId, closeQuestionMutation, handleQuestionClosed]);

  // Keep the ref in sync so the timer interval always calls the latest callback
  handleAutoCloseRef.current = handleAutoClose;

  const handleSelectAnswer = useCallback(async (optionKey: 'a' | 'b' | 'c' | 'd') => {
    if (hasSubmitted.current || !currentQuestion || !episodeId || !user) return;

    hasSubmitted.current = true;
    // Set local state immediately for instant visual feedback
    setLocalSelectedOption(optionKey);
    setSelectedOption(optionKey);

    const responseTimeMs = Date.now() - questionStartTime.current;

    try {
      const result = await submitAnswerMutation.mutateAsync({
        questionId: currentQuestion.id,
        episodeId,
        selectedOption: optionKey,
        responseTimeMs,
      });

      submitAnswer({
        questionId: currentQuestion.id,
        selectedOption: optionKey,
        isCorrect: result.isCorrect,
        pointsEarned: 0,
        position: result.position ?? null,
        responseTimeMs,
      });
    } catch (err) {
      // Duplicate answer or error — still mark as submitted
      submitAnswer({
        questionId: currentQuestion.id,
        selectedOption: optionKey,
        isCorrect: false,
        pointsEarned: 0,
        position: null,
        responseTimeMs,
      });
    }
  }, [currentQuestion, episodeId, user, setSelectedOption, submitAnswerMutation, submitAnswer]);

  // Get options from current question
  const options = getOptionsFromQuestion(currentQuestion);

  const timerProgress = currentQuestion
    ? timerRemaining / (currentQuestion.timer_seconds || 1)
    : 0;

  const timerBarStyle = useAnimatedStyle(() => ({
    width: withTiming(`${timerProgress * 100}%`, { duration: 250 }),
  }));

  const getTimerColor = () => {
    if (timerProgress > 0.5) return colors.success;
    if (timerProgress > 0.25) return colors.warning;
    return colors.danger;
  };

  // Last answer info (for revealing phase) — used for the earned points display
  const lastAnswer = useLiveQuizStore((s) => s.userAnswers[s.userAnswers.length - 1]);

  // Authoritative scored answer row from the DB. At reveal time (after
  // close-question has scored it) this carries the real total_points + rank.
  const { data: scoredAnswer } = useUserAnswer(episodeId, currentQuestion?.id ?? null);

  // The option the user locked in for the current question.
  const effectiveSelection = localSelectedOption ?? selectedOption;

  // Correctness for the revealing phase is derived synchronously from the
  // user's selection vs. the revealed correct option. Relying on
  // lastAnswer.isCorrect is unsafe: the score-answer mutation may still be in
  // flight when the question closes (e.g. an answer tapped at the last second),
  // which made a correct answer render as "Wrong" and broke the score.
  const wasCorrect =
    phase === 'revealing'
      ? effectiveSelection !== null && effectiveSelection === currentQuestion?.correct_option
      : (lastAnswer?.isCorrect ?? false);

  const getOptionStyle = (optionKey: string) => {
    if (!currentQuestion) return { bg: colors.surface, border: colors.border, textColor: colors.foreground, isDisabled: false };

    // Use local state for immediate visual feedback, fall back to store state
    const isSelected = effectiveSelection === optionKey;
    const isCorrectOpt = currentQuestion.correct_option === optionKey;
    const isRevealing = phase === 'revealing';
    const isWrong = isRevealing && isSelected && !wasCorrect;
    const isDisabled = effectiveSelection !== null || isRevealing;

    let bg = colors.surface;
    let border = colors.border;
    let textColor = colors.foreground;

    if (isCorrectOpt && isRevealing) {
      bg = `${colors.success}22`;
      border = colors.success;
      textColor = colors.success;
    } else if (isWrong && isRevealing) {
      bg = `${colors.danger}22`;
      border = colors.danger;
      textColor = colors.danger;
    } else if (isSelected && !isRevealing) {
      bg = `${colors.primary}22`;
      border = colors.primary;
      textColor = colors.primary;
    }

    return { bg, border, textColor, isDisabled };
  };

  // ============================================================================
  // PHASE: IDLE — "Starting Soon"
  // ============================================================================
  if (phase === 'idle') {
    return <StartingSoon />;
  }

  // ============================================================================
  // PHASE: REVEALING — Show correct/wrong + top 3
  // ============================================================================
  if (phase === 'revealing' && !currentQuestion) {
    return null;
  }

  // ============================================================================
  // PHASE: BETWEEN — Leaderboard snapshot
  // ============================================================================
  if (phase === 'between') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.betweenHeader, { color: colors.mutedForeground }]}>
            After Q{currentQuestionNumber}
          </Text>
          <Text style={[styles.betweenSubtitle, { color: colors.mutedForeground }]}>
            Next question coming up...
          </Text>

          <LeaderboardPanel
            entries={leaderboard}
            viewerRank={viewerRank}
            currentUserScore={totalScore}
            currentUserCorrect={correctCount}
            title=""
          />

          <View style={[styles.nextBanner, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
            <Feather name="clock" size={16} color={colors.primary} />
            <Text style={[styles.nextBannerText, { color: colors.primary }]}>
              Next question starting soon...
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ============================================================================
  // PHASE: COMPLETE — Final results
  // ============================================================================
  if (phase === 'complete') {
    const userEntry = leaderboard.find(e => e.isCurrentUser);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.completeHeader}>
            <View style={[styles.completeIcon, { backgroundColor: `${colors.accent}22` }]}>
              <Feather name="award" size={48} color={colors.accent} />
            </View>
            <Text style={[styles.completeTitle, { color: colors.foreground }]}>
              Quiz Complete!
            </Text>
          </View>

          <View style={[styles.finalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.finalStat}>
              <Text style={[styles.finalValue, { color: colors.accent }]}>
                #{userEntry?.rank || viewerRank || '—'}
              </Text>
              <Text style={[styles.finalLabel, { color: colors.mutedForeground }]}>Rank</Text>
            </View>
            <View style={styles.finalStat}>
              <Text style={[styles.finalValue, { color: colors.foreground }]}>
                {correctCount}/{totalQuestions}
              </Text>
              <Text style={[styles.finalLabel, { color: colors.mutedForeground }]}>Correct</Text>
            </View>
            <View style={styles.finalStat}>
              <Text style={[styles.finalValue, { color: colors.foreground }]}>
                {totalScore.toLocaleString()}
              </Text>
              <Text style={[styles.finalLabel, { color: colors.mutedForeground }]}>Points</Text>
            </View>
          </View>

          <LeaderboardPanel
            entries={leaderboard}
            viewerRank={viewerRank}
            currentUserScore={totalScore}
            currentUserCorrect={correctCount}
            title="Final Standings"
          />
        </ScrollView>
      </View>
    );
  }

  // ============================================================================
  // PHASE: QUESTION — Show question + timer + options
  // ============================================================================
  if (!currentQuestion) return null;

  // Real points/rank come from the scored answer row after the question closes.
  const pointsEarned = scoredAnswer?.total_points ?? lastAnswer?.pointsEarned ?? 0;
  const earnedRank = scoredAnswer?.rank ?? null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Revealing banner */}
        {phase === 'revealing' && (
          <View
            style={[
              styles.resultBanner,
              {
                backgroundColor: wasCorrect ? `${colors.success}22` : `${colors.danger}22`,
                borderColor: wasCorrect ? colors.success : colors.danger,
              },
            ]}
          >
            <View style={styles.resultLeft}>
              <Feather
                name={wasCorrect ? 'check-circle' : 'x-circle'}
                size={24}
                color={wasCorrect ? colors.success : colors.danger}
              />
              <View>
                <Text style={[styles.resultTitle, { color: wasCorrect ? colors.success : colors.danger }]}>
                  {wasCorrect ? 'Correct!' : 'Wrong'}
                </Text>
                {wasCorrect && (
                  <Text style={[styles.resultSubtitle, { color: colors.mutedForeground }]}>
                    +{pointsEarned.toLocaleString()} pts earned
                    {earnedRank != null ? ` · Rank #${earnedRank}` : ""}
                  </Text>
                )}
              </View>
            </View>
            {wasCorrect && (
              <Text style={[styles.resultPoints, { color: colors.success }]}>
                +{pointsEarned.toLocaleString()}
              </Text>
            )}
          </View>
        )}

        {/* Question number */}
        <View style={styles.qMetaRow}>
          <Text style={[styles.qNumber, { color: colors.mutedForeground }]}>
            Question {currentQuestionNumber} of {totalQuestions || '—'}
          </Text>
        </View>

        {/* Question text */}
        <Text style={[styles.questionText, { color: colors.foreground }]}>
          {currentQuestion.question_text}
        </Text>

        {/* Timer bar */}
        {phase === 'question' && (
          <View style={[styles.timerContainer, { backgroundColor: colors.surface }]}>
            <Animated.View
              style={[styles.timerBar, { backgroundColor: getTimerColor() }, timerBarStyle]}
            />
            <Text style={[styles.timerText, { color: colors.foreground }]}>
              {timerRemaining}s
            </Text>
          </View>
        )}

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map((opt) => {
            const { bg, border, textColor, isDisabled } = getOptionStyle(opt.key);

            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => handleSelectAnswer(opt.key)}
                disabled={isDisabled || hasSubmitted.current}
                activeOpacity={0.7}
                style={[styles.optionBtn, { backgroundColor: bg, borderColor: border, opacity: isDisabled ? 0.7 : 1 }]}
              >
                <View style={[styles.optionLabel, { backgroundColor: `${border}33` }]}>
                  <Text style={[styles.optionLabelText, { color: textColor }]}>
                    {opt.key.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>
                  {opt.text}
                </Text>
                {phase === 'revealing' && currentQuestion.correct_option === opt.key && (
                  <Feather name="check-circle" size={18} color={colors.success} />
                )}
                {phase === 'revealing' && (localSelectedOption ?? selectedOption) === opt.key && !wasCorrect && (
                  <Feather name="x-circle" size={18} color={colors.danger} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Locked indicator (question phase) */}
        {(localSelectedOption ?? selectedOption) && phase === 'question' && (
          <View style={[styles.lockedBox, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
            <Feather name="lock" size={14} color={colors.primary} />
            <View style={styles.lockedInfo}>
              <Text style={[styles.lockedText, { color: colors.primary }]}>
                Answer locked! Waiting for timer...
              </Text>
              {lastAnswer?.isCorrect && lastAnswer?.position != null && (
                <Text style={[styles.lockedSubtext, { color: colors.primary }]}>
                  {lastAnswer.position === 1
                    ? "🏆 You're #1 so far!"
                    : `You're #${lastAnswer.position} so far`}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* NOTE: Final score + rank only appear in the revealing phase. Points
            are position-based (20/15/10/5/0) and are finalized by
            score_question() when the question closes, so the reveal reads the
            authoritative scored answer row. */}

        {/* Stats + Top 3 (revealing phase) */}
        {phase === 'revealing' && (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Your Score</Text>
                <Text style={[styles.statValue, { color: colors.accent }]}>{totalScore.toLocaleString()}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Your Rank</Text>
                <Text style={[styles.statValue, { color: colors.accent }]}>#{viewerRank || '—'}</Text>
              </View>
            </View>

            <LeaderboardPanel
              entries={leaderboard}
              viewerRank={viewerRank}
              currentUserScore={totalScore}
              currentUserCorrect={correctCount}
              compact
              title="Top 3 Players"
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  scrollFull: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

  // Between phase
  betweenHeader: { fontSize: 24, fontWeight: '800' },
  betweenSubtitle: { fontSize: 14, marginBottom: 12 },
  nextBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: 12, borderWidth: 1.5, marginTop: 16,
  },
  nextBannerText: { fontSize: 14, fontWeight: '600' },

  // Complete phase
  completeHeader: { alignItems: 'center', gap: 12, marginBottom: 8 },
  completeIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  completeTitle: { fontSize: 26, fontWeight: '800' },
  finalCard: { flexDirection: 'row', borderRadius: 20, padding: 20, gap: 8 },
  finalStat: { flex: 1, alignItems: 'center', gap: 6 },
  finalValue: { fontSize: 26, fontWeight: '800' },
  finalLabel: { fontSize: 12 },

  // Question phase
  qMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qNumber: { fontSize: 13, fontWeight: '600' },
  questionText: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  timerContainer: {
    height: 32, borderRadius: 16, overflow: 'hidden', position: 'relative',
    alignItems: 'center', justifyContent: 'center',
  },
  timerBar: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  timerText: { fontSize: 14, fontWeight: '700', zIndex: 1 },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5,
    width: '48%',
  },
  optionLabel: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  optionLabelText: { fontSize: 12, fontWeight: '800' },
  optionText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  lockedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  lockedInfo: { flex: 1, gap: 2 },
  lockedText: { fontSize: 14, fontWeight: '600' },
  lockedSubtext: { fontSize: 12, fontWeight: '500' },

  // Revealing
  resultBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 16, borderWidth: 2,
  },
  resultLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultTitle: { fontSize: 18, fontWeight: '800' },
  resultSubtitle: { fontSize: 13, marginTop: 2 },
  resultPoints: { fontSize: 24, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 24, fontWeight: '800' },
});
