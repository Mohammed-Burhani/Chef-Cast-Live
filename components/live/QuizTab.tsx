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
} from '@/store/quizStore';

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
  const correctCount = useQuizStore((s) => s.correctCount);
  const currentRank = useQuizStore((s) => s.currentRank);
  const submitAnswer = useQuizStore((s) => s.submitAnswer);

  const pulseOpacity = useSharedValue(1);

  // Idle pulse animation
  useEffect(() => {
    if (phase === 'idle') {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 1200 }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [phase]);

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

  // EPISODE ENDED PHASE
  if (phase === 'episode_ended') {
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

  // QUESTION / ANSWERED / REVEALED PHASES
  if (!currentQuestion) return null;

  const options = [
    { key: 'a' as const, text: currentQuestion.optionA },
    { key: 'b' as const, text: currentQuestion.optionB },
    currentQuestion.optionC ? { key: 'c' as const, text: currentQuestion.optionC } : null,
    currentQuestion.optionD ? { key: 'd' as const, text: currentQuestion.optionD } : null,
  ].filter(Boolean) as Array<{ key: 'a' | 'b' | 'c' | 'd'; text: string }>;

  const getOptionStyle = (optionKey: 'a' | 'b' | 'c' | 'd') => {
    const isSelected = selectedOption === optionKey;
    const isCorrectOpt = phase === 'revealed' && correctOption === optionKey;
    const isWrong = phase === 'revealed' && isSelected && !isCorrect;
    const isDisabled = phase === 'answered' || phase === 'revealed';

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
    } else if (isSelected) {
      bg = `${colors.primary}22`;
      border = colors.primary;
      textColor = colors.primary;
    }

    return { bg, border, textColor, isDisabled };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Question text */}
        <Text style={[styles.questionText, { color: colors.foreground }]}>
          {currentQuestion.questionText}
        </Text>

        {/* Timer bar */}
        {phase !== 'idle' && phase !== 'episode_ended' && (
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
            const { bg, border, textColor, isDisabled } = getOptionStyle(opt.key);

            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => submitAnswer(opt.key)}
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
                {phase === 'revealed' && correctOption === opt.key && (
                  <Feather name="check-circle" size={18} color={colors.success} />
                )}
                {phase === 'revealed' &&
                  selectedOption === opt.key &&
                  !isCorrect && (
                    <Feather name="x-circle" size={18} color={colors.danger} />
                  )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Score row */}
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
});
