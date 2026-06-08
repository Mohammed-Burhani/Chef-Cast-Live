/**
 * QuizTab Component
 * Live quiz interface with timer, questions, and scoring
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import {
  useQuizStore,
  useQuizPhase,
  useCurrentQuestion,
  useTimerRemaining,
  useSelectedOption,
  useCorrectOption,
  useIsCorrect,
  useTotalScore,
  useCorrectCount,
  useCurrentRank,
} from '@/store/useQuizStore';

interface QuizTabProps {
  episodeId: string;
}

export function QuizTab({ episodeId }: QuizTabProps) {
  const colors = useColors();
  const phase = useQuizPhase();
  const currentQuestion = useCurrentQuestion();
  const timerRemaining = useTimerRemaining();
  const selectedOption = useSelectedOption();
  const correctOption = useCorrectOption();
  const isCorrect = useIsCorrect();
  const totalScore = useTotalScore();
  const correctCount = useCorrectCount();
  const currentRank = useCurrentRank();
  const selectAnswer = useQuizStore((s) => s.selectAnswer);
  const tickTimer = useQuizStore((s) => s.tickTimer);
  const tickCountdown = useQuizStore((s) => s.tickCountdown);
  const showBetweenLeaderboard = useQuizStore((s) => s.showBetweenLeaderboard);
  const nextQuestion = useQuizStore((s) => s.nextQuestion);
  const countdownValue = useQuizStore((s) => s.countdownValue);
  const leaderboard = useQuizStore((s) => s.liveLeaderboard);
  const currentQuestionIndex = useQuizStore((s) => s.currentQuestionIndex);
  const currentAnswer = useQuizStore((s) => s.userAnswers[s.userAnswers.length - 1]);

  const pulseOpacity = useSharedValue(1);

  // Timer interval for question + countdown
  useEffect(() => {
    if (phase === 'countdown') {
      const interval = setInterval(tickCountdown, 1000);
      return () => clearInterval(interval);
    }
    
    if (phase === 'question') {
      const interval = setInterval(tickTimer, 1000);
      return () => clearInterval(interval);
    }

    // Auto-advance from revealing to between after 3s
    if (phase === 'revealing') {
      const timeout = setTimeout(showBetweenLeaderboard, 3000);
      return () => clearTimeout(timeout);
    }

    // Auto-advance from between to next question after 3s
    if (phase === 'between') {
      const timeout = setTimeout(nextQuestion, 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase, tickTimer, tickCountdown, showBetweenLeaderboard, nextQuestion]);

  // Idle pulse animation
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

  // Timer bar animation
  const timerProgress = currentQuestion
    ? timerRemaining / currentQuestion.timerSeconds
    : 0;

  const timerBarStyle = useAnimatedStyle(() => ({
    width: withTiming(`${timerProgress * 100}%`, { duration: 250 }),
  }));

  const getTimerColor = () => {
    if (timerProgress > 0.5) return colors.success;
    if (timerProgress > 0.25) return colors.warning;
    return colors.danger;
  };

  // IDLE PHASE
  if (phase === 'idle') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.idleContainer}>
          <Animated.View style={pulseStyle}>
            <View style={[styles.idleIcon, { backgroundColor: `${colors.primary}22` }]}>
              <Feather name="clock" size={48} color={colors.primary} />
            </View>
          </Animated.View>
          <Animated.Text
            style={[styles.idleText, { color: colors.foreground }, pulseStyle]}
          >
            Waiting for the next question...
          </Animated.Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: colors.accent }]}>
                {totalScore.toLocaleString()}
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
                Score
              </Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: colors.primary }]}>
                {correctCount}
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
                Correct
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // COUNTDOWN PHASE
  if (phase === 'countdown') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.idleContainer}>
          <View style={[styles.countdownCircle, { borderColor: colors.primary }]}>
            <Text style={[styles.countdownText, { color: colors.primary }]}>
              {countdownValue}
            </Text>
          </View>
          <Text style={[styles.idleText, { color: colors.foreground }]}>
            Get ready...
          </Text>
        </View>
      </View>
    );
  }

  // COMPLETE PHASE
  if (phase === 'complete') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.idleContainer}>
          <View style={[styles.idleIcon, { backgroundColor: `${colors.accent}22` }]}>
            <Feather name="award" size={48} color={colors.accent} />
          </View>
          <Text style={[styles.endedTitle, { color: colors.foreground }]}>
            Quiz Complete!
          </Text>
          <View style={[styles.finalCard, { backgroundColor: colors.surface }]}>
            {currentRank && (
              <View style={styles.finalStat}>
                <Text style={[styles.finalValue, { color: colors.accent }]}>
                  #{currentRank}
                </Text>
                <Text style={[styles.finalLabel, { color: colors.mutedForeground }]}>
                  Rank
                </Text>
              </View>
            )}
            <View style={styles.finalStat}>
              <Text style={[styles.finalValue, { color: colors.foreground }]}>
                {correctCount}
              </Text>
              <Text style={[styles.finalLabel, { color: colors.mutedForeground }]}>
                Correct
              </Text>
            </View>
            <View style={styles.finalStat}>
              <Text style={[styles.finalValue, { color: colors.foreground }]}>
                {totalScore.toLocaleString()}
              </Text>
              <Text style={[styles.finalLabel, { color: colors.mutedForeground }]}>
                Points
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // BETWEEN PHASE (leaderboard snapshot)
  if (phase === 'between') {
    const userEntry = leaderboard.find(e => e.isCurrentUser);
    
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.betweenHeader, { color: colors.mutedForeground }]}>
            After Q{currentQuestionIndex}
          </Text>
          <Text style={[styles.betweenSubtitle, { color: colors.mutedForeground }]}>
            Next question in a moment...
          </Text>

          {/* User rank card */}
          {userEntry && (
            <View
              style={[
                styles.userRankCard,
                { backgroundColor: colors.surface, borderColor: colors.accent },
              ]}
            >
              <View style={styles.userRankLeft}>
                <Text style={[styles.userRankNumber, { color: colors.accent }]}>
                  #{userEntry.rank}
                </Text>
                <View>
                  <Text style={[styles.userRankLabel, { color: colors.mutedForeground }]}>
                    Your rank
                  </Text>
                  <Text style={[styles.userRankScore, { color: colors.foreground }]}>
                    {userEntry.score.toLocaleString()} pts
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Full leaderboard list */}
          <View style={styles.leaderboardList}>
            {leaderboard.slice(0, 10).map((entry) => (
              <View
                key={entry.userId}
                style={[
                  styles.leaderboardRow,
                  {
                    backgroundColor: entry.isCurrentUser
                      ? `${colors.accent}15`
                      : colors.surface,
                    borderColor: entry.isCurrentUser ? colors.accent : 'transparent',
                  },
                ]}
              >
                <View style={styles.leaderboardLeft}>
                  <View
                    style={[
                      styles.rankBadge,
                      {
                        backgroundColor:
                          entry.rank === 1
                            ? '#FFD700'
                            : entry.rank === 2
                            ? '#C0C0C0'
                            : entry.rank === 3
                            ? '#CD7F32'
                            : `${colors.mutedForeground}22`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rankBadgeText,
                        {
                          color: entry.rank <= 3 ? '#1A1A1A' : colors.foreground,
                        },
                      ]}
                    >
                      #{entry.rank}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.leaderboardUsername,
                      { color: entry.isCurrentUser ? colors.accent : colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {entry.username}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.leaderboardScore,
                    { color: entry.isCurrentUser ? colors.accent : colors.accent },
                  ]}
                >
                  {entry.score.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          {/* User position reminder at bottom if not in top 10 */}
          {userEntry && userEntry.rank > 10 && (
            <View
              style={[
                styles.userPositionFooter,
                { backgroundColor: colors.surface, borderColor: colors.accent },
              ]}
            >
              <Text style={[styles.userPositionRank, { color: colors.accent }]}>
                #{userEntry.rank}
              </Text>
              <Text style={[styles.userPositionName, { color: colors.foreground }]}>
                you
              </Text>
              <Text style={[styles.userPositionScore, { color: colors.accent }]}>
                {userEntry.score.toLocaleString()}
              </Text>
            </View>
          )}

          {/* Next question timer */}
          <View
            style={[
              styles.nextQuestionBanner,
              { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
            ]}
          >
            <Feather name="clock" size={16} color={colors.primary} />
            <Text style={[styles.nextQuestionText, { color: colors.primary }]}>
              Next question starting soon...
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // QUESTION / REVEALING PHASES
  if (!currentQuestion) return null;

  const options = currentQuestion.options.map((opt, idx) => ({
    key: opt.label.toLowerCase() as 'a' | 'b' | 'c' | 'd',
    text: opt.text,
    id: opt.id,
  }));

  const getOptionStyle = (optionId: string) => {
    const isSelected = selectedOption === optionId;
    const isCorrectOpt = phase === 'revealing' && currentQuestion.correctOptionId === optionId;
    const isWrong = phase === 'revealing' && isSelected && !isCorrect;
    const isDisabled = selectedOption !== null || phase === 'revealing';

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
    } else if (isSelected && phase !== 'revealing') {
      bg = `${colors.primary}22`;
      border = colors.primary;
      textColor = colors.primary;
    }

    return { bg, border, textColor, isDisabled };
  };

  // Get points earned for current question (already at top)
  const pointsEarned = phase === 'revealing' ? (currentAnswer?.pointsEarned ?? 0) : 0;
  const wasCorrect = phase === 'revealing' ? (currentAnswer?.isCorrect ?? false) : false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Result banner (revealing phase only) */}
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
                <Text
                  style={[
                    styles.resultTitle,
                    { color: wasCorrect ? colors.success : colors.danger },
                  ]}
                >
                  {wasCorrect ? 'Correct!' : 'Wrong'}
                </Text>
                {wasCorrect && (
                  <Text style={[styles.resultSubtitle, { color: colors.mutedForeground }]}>
                    +{pointsEarned.toLocaleString()} pts earned
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

        {/* Question text */}
        <Text style={[styles.questionText, { color: colors.foreground }]}>
          {currentQuestion.text}
        </Text>

        {/* Timer bar */}
        {phase === 'question' && (
          <View style={[styles.timerContainer, { backgroundColor: colors.surface }]}>
            <Animated.View
              style={[
                styles.timerBar,
                { backgroundColor: getTimerColor() },
                timerBarStyle,
              ]}
            />
            <Text style={[styles.timerText, { color: colors.foreground }]}>
              {timerRemaining}s
            </Text>
          </View>
        )}

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map((opt) => {
            const { bg, border, textColor, isDisabled } = getOptionStyle(opt.id);

            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => selectAnswer(opt.id)}
                disabled={isDisabled}
                activeOpacity={0.7}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: bg,
                    borderColor: border,
                    opacity: isDisabled ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionLabel,
                    { backgroundColor: `${border}33` },
                  ]}
                >
                  <Text style={[styles.optionLabelText, { color: textColor }]}>
                    {opt.key.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>
                  {opt.text}
                </Text>
                {phase === 'revealing' && currentQuestion.correctOptionId === opt.id && (
                  <Feather name="check-circle" size={18} color={colors.success} />
                )}
                {phase === 'revealing' &&
                  selectedOption === opt.id &&
                  !isCorrect && (
                    <Feather name="x-circle" size={18} color={colors.danger} />
                  )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explanation (revealing phase only) */}
        {phase === 'revealing' && currentQuestion.explanation && (
          <View
            style={[
              styles.explanationBox,
              { backgroundColor: `${colors.accent}15`, borderColor: colors.accent },
            ]}
          >
            <View style={styles.explanationHeader}>
              <Feather name="info" size={16} color={colors.accent} />
              <Text style={[styles.explanationTitle, { color: colors.accent }]}>
                Chef says:
              </Text>
            </View>
            <Text style={[styles.explanationText, { color: colors.foreground }]}>
              {currentQuestion.explanation}
            </Text>
          </View>
        )}

        {/* Locked indicator when answered but timer still running */}
        {selectedOption && phase === 'question' && (
          <View
            style={[
              styles.lockedBox,
              { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
            ]}
          >
            <Feather name="lock" size={14} color={colors.primary} />
            <Text style={[styles.lockedText, { color: colors.primary }]}>
              Answer locked! Waiting for timer...
            </Text>
          </View>
        )}

        {/* Score cards (revealing phase) */}
        {phase === 'revealing' && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                Your Score
              </Text>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {totalScore.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                Your Rank
              </Text>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                #{currentRank || '—'}
              </Text>
            </View>
          </View>
        )}

        {/* Top 3 leaderboard (revealing phase) */}
        {phase === 'revealing' && (
          <View style={styles.leaderboardSection}>
            <Text style={[styles.leaderboardTitle, { color: colors.foreground }]}>
              Top 3 Players
            </Text>
            <View style={styles.topThree}>
              {leaderboard
                .slice(0, 3)
                .map((entry, idx) => (
                  <View
                    key={entry.userId}
                    style={[styles.topCard, { backgroundColor: colors.surface }]}
                  >
                    <View
                      style={[
                        styles.topBadge,
                        {
                          backgroundColor:
                            idx === 0
                              ? '#FFD700'
                              : idx === 1
                              ? '#C0C0C0'
                              : '#CD7F32',
                        },
                      ]}
                    >
                      <Text style={styles.topBadgeText}>#{idx + 1}</Text>
                    </View>
                    <Text
                      style={[styles.topUsername, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {entry.username}
                    </Text>
                    <Text style={[styles.topScore, { color: colors.accent }]}>
                      {entry.score.toLocaleString()}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Score row (question phase only) */}
        {phase === 'question' && (
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: colors.accent }]}>
                {totalScore.toLocaleString()}
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
                Score
              </Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: colors.primary }]}>
                {correctCount}
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
                Correct
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  idleIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 64,
    fontWeight: '900',
  },
  betweenTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  betweenHeader: {
    fontSize: 24,
    fontWeight: '800',
  },
  betweenSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  betweenHint: {
    fontSize: 14,
    marginTop: 16,
  },
  userRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24,
  },
  userRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userRankNumber: {
    fontSize: 40,
    fontWeight: '900',
  },
  userRankLabel: {
    fontSize: 13,
  },
  userRankScore: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  leaderboardList: {
    gap: 8,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankBadge: {
    width: 36,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  leaderboardUsername: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  leaderboardScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  userPositionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 16,
  },
  userPositionRank: {
    fontSize: 16,
    fontWeight: '800',
  },
  userPositionName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  userPositionScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  nextQuestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 24,
  },
  nextQuestionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  endedTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  finalCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    width: '100%',
  },
  finalStat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  finalValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  finalLabel: {
    fontSize: 12,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  timerContainer: {
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    zIndex: 1,
  },
  optionsContainer: {
    gap: 12,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  optionLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabelText: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 12,
  },
  lockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  lockedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  resultSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  resultPoints: {
    fontSize: 24,
    fontWeight: '900',
  },
  explanationBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 16,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  leaderboardSection: {
    marginTop: 20,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  topThree: {
    flexDirection: 'row',
    gap: 12,
  },
  topCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  topBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  topUsername: {
    fontSize: 13,
    fontWeight: '600',
  },
  topScore: {
    fontSize: 16,
    fontWeight: '800',
  },
});
