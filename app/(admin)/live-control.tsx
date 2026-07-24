/**
 * Admin Live Control — Live episode management + quiz question activation panel
 *
 * Flow (no "Go Live" button — episodes auto-live at scheduled time):
 *   1. When the page loads, auto-transitions any overdue scheduled episodes to live
 *   2. Shows currently live episode (if any) with "End Stream" button
 *   3. Questions lifecycle:
 *      Ready ─[Activate]→ Active ─[Close]→ Scored/Revealed ─[Dismiss]→ Finished
 *      - Dismiss requires confirmation (destructive action warning)
 *      - Only after dismissing a question can the next one be activated
 */

import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { useColors } from '@/hooks/useColors';
import { useEpisodes } from '@/lib/api/hooks';
import { useToggleEpisodeLive } from '@/lib/api/admin-hooks';
import {
  useEpisodeQuestions,
  useActiveQuestion,
  useActivateQuestion,
  useCloseQuestion,
  useDismissQuestion,
  useLiveLeaderboard,
} from '@/lib/api/live';
import { useAutoTransitionEpisodes } from '@/lib/api/admin-hooks';
import { useEpisodeChannel } from '@/lib/realtime/hooks';
import type { Database } from '@/types/database';

type Question = Database['public']['Tables']['questions']['Row'];

export default function AdminLiveControl() {
  const colors = useColors();
  const { data: episodes = [], isLoading } = useEpisodes();
  const toggleLiveMutation = useToggleEpisodeLive();
  const autoTransition = useAutoTransitionEpisodes();

  const liveEpisodes = episodes.filter((ep) => ep.is_live);
  const liveEpisode = liveEpisodes[0]; // Only one live at a time

  // Fetch questions and active state for the live episode
  const { data: questions = [], isLoading: questionsLoading } = useEpisodeQuestions(liveEpisode?.id || '');
  const { data: activeQuestion, refetch: refetchActive } = useActiveQuestion(liveEpisode?.id || '');
  const activateMutation = useActivateQuestion();
  const closeMutation = useCloseQuestion();
  const dismissMutation = useDismissQuestion();
  const { data: leaderboard = [] } = useLiveLeaderboard(liveEpisode?.id || '');

  // Subscribe to realtime changes on the live episode
  useEpisodeChannel(liveEpisode?.id || null);

  // Auto-transition episodes when page loads — scheduled → live
  useEffect(() => {
    autoTransition.mutate();
  }, []);

  // Periodic check every 30s for auto-transition
  useEffect(() => {
    const interval = setInterval(() => {
      autoTransition.mutate();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Track activation timer
  const [activationTimer, setActivationTimer] = useState<{ questionId: string; remaining: number } | null>(null);

  // Timer countdown for active question
  useEffect(() => {
    if (!activeQuestion || !activeQuestion.opened_at) {
      setActivationTimer(null);
      return;
    }

    const interval = setInterval(() => {
      const openedAt = new Date(activeQuestion.opened_at!).getTime();
      const timerSeconds = activeQuestion.timer_seconds;
      const elapsed = (Date.now() - openedAt) / 1000;
      const remaining = Math.max(0, Math.ceil(timerSeconds - elapsed));

      setActivationTimer({
        questionId: activeQuestion.id,
        remaining,
      });

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeQuestion?.id, activeQuestion?.opened_at, activeQuestion?.timer_seconds]);

  // Find the first question that has been activated but not yet dismissed
  // This is used to determine if we can activate a new question
  const lastNonDismissedQuestion = questions
    .filter(q => q.has_been_activated && !q.dismissed_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const hasUndismissedQuestion = !!lastNonDismissedQuestion;

  // Get the most recently dismissed question (for display purposes)
  const dismissedQuestions = questions.filter(q => q.dismissed_at);
  const lastDismissedQuestion = dismissedQuestions[dismissedQuestions.length - 1];

  // Find the latest closed-but-not-dismissed question (showing results)
  const questionShowingResults = questions.find(q =>
    q.has_been_activated && !q.is_active && !q.dismissed_at
  );

  const handleStopLive = async (episode: any) => {
    try {
      // Deactivate any active question first
      if (activeQuestion) {
        await closeMutation.mutateAsync({
          episodeId: episode.id,
          questionId: activeQuestion.id,
        });
      }
      await toggleLiveMutation.mutateAsync({
        episodeId: episode.id,
        isLive: false,
      });
      await refetchActive();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleActivateQuestion = async (questionId: string) => {
    if (!liveEpisode) return;

    // Check if there's an undismissed question
    if (hasUndismissedQuestion) {
      Alert.alert(
        'Previous Question Not Dismissed',
        'The previous question has been answered but not yet dismissed. Please dismiss it first before activating a new question.\n\n' +
        'Find the question showing results below and tap "Dismiss Question" to proceed.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await activateMutation.mutateAsync({
        episodeId: liveEpisode.id,
        questionId,
      });
      await refetchActive();
      Alert.alert('Success', 'Question is now live for all viewers!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCloseQuestion = async (questionId: string) => {
    if (!liveEpisode) return;

    try {
      await closeMutation.mutateAsync({
        episodeId: liveEpisode.id,
        questionId,
      });
      await refetchActive();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDismissQuestion = async (questionId: string) => {
    if (!liveEpisode) return;

    try {
      await dismissMutation.mutateAsync({
        episodeId: liveEpisode.id,
        questionId,
      });
      await refetchActive();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleEndStreamWhileResultsShowing = async () => {
    if (!liveEpisode) return;
    try {
      if (activeQuestion) {
        await closeMutation.mutateAsync({
          episodeId: liveEpisode.id,
          questionId: activeQuestion.id,
        });
      }
      await toggleLiveMutation.mutateAsync({
        episodeId: liveEpisode.id,
        isLive: false,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Helper to classify question state
  const getQuestionState = (q: Question) => {
    if (q.dismissed_at) return 'dismissed';
    if (q.is_active) return 'active';
    if (q.has_been_activated && !q.is_active) return 'completed'; // closed but not dismissed
    return 'ready';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Live Control</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Episodes auto-go-live at their scheduled time
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* LIVE EPISODE */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Currently Live
          </Text>

          {liveEpisodes.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Feather name="radio" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No live episodes right now</Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                Episodes will automatically go live at their scheduled time. Check the Episodes page to see upcoming ones.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(admin)/episodes' as any)}
              >
                <Feather name="calendar" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>View Episodes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View key={liveEpisode.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.liveDot, { backgroundColor: colors.live }]} />
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{liveEpisode.title}</Text>
                    <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                      Started: {new Date(liveEpisode.scheduled_at).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/(admin)/questions/${liveEpisode.id}` as any)}
                  >
                    <Feather name="help-circle" size={18} color="#fff" />
                    <Text style={styles.actionText}>Manage Questions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                    onPress={() => handleStopLive(liveEpisode)}
                  >
                    <Feather name="stop-circle" size={18} color="#fff" />
                    <Text style={styles.actionText}>End Stream</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* QUIZ CONTROL PANEL */}
              <View style={[styles.quizPanel, { backgroundColor: colors.surface }]}>
                <View style={styles.quizPanelHeader}>
                  <Feather name="zap" size={20} color={colors.accent} />
                  <Text style={[styles.quizPanelTitle, { color: colors.foreground }]}>Quiz Control</Text>
                </View>

                {questionsLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading questions...</Text>
                  </View>
                ) : questions.length === 0 ? (
                  <View style={styles.noQuestions}>
                    <Feather name="alert-circle" size={24} color={colors.warning} />
                    <Text style={[styles.noQuestionsText, { color: colors.mutedForeground }]}>
                      No questions created for this episode.{'\n'}Add questions in the "Manage Questions" screen first.
                    </Text>
                    <TouchableOpacity
                      style={[styles.addQuestionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => router.push(`/(admin)/questions/${liveEpisode.id}` as any)}
                    >
                      <Feather name="plus" size={16} color="#fff" />
                      <Text style={styles.addQuestionText}>Add Questions</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.questionCount, { color: colors.mutedForeground }]}>
                      {questions.length} question{questions.length !== 1 ? 's' : ''}
                    </Text>

                    {/* RESULTS BEING SHOWN BANNER */}
                    {questionShowingResults && (
                      <View style={[styles.resultsBanner, { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }]}>
                        <Feather name="bar-chart-2" size={18} color={colors.accent} />
                        <Text style={[styles.resultsBannerText, { color: colors.accent }]}>
                          Results showing — dismiss the current question to activate the next one
                        </Text>
                      </View>
                    )}

                    {questions.map((q, idx) => {
                      const state = getQuestionState(q);
                      const isActivating = activateMutation.isPending && activateMutation.variables?.questionId === q.id;
                      const isClosing = closeMutation.isPending && closeMutation.variables?.questionId === q.id;
                      const isDismissing = dismissMutation.isPending && dismissMutation.variables?.questionId === q.id;
                      const isBusy = isActivating || isClosing || isDismissing;

                      return (
                        <View
                          key={q.id}
                          style={[
                            styles.questionCard,
                            {
                              backgroundColor:
                                state === 'active'
                                  ? `${colors.success}15`
                                  : state === 'completed'
                                  ? `${colors.accent}12`
                                  : state === 'dismissed'
                                  ? `${colors.mutedForeground}10`
                                  : colors.background,
                              borderColor:
                                state === 'active'
                                  ? colors.success
                                  : state === 'completed'
                                  ? colors.accent
                                  : state === 'dismissed'
                                  ? colors.border
                                  : colors.border,
                            },
                          ]}
                        >
                          <View style={styles.questionTop}>
                            <View style={styles.questionNumRow}>
                              <Text style={[styles.questionNumber, { color: colors.mutedForeground }]}>
                                Q{idx + 1}
                              </Text>

                              {state === 'active' && (
                                <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
                                  <Feather name="play" size={10} color="#fff" />
                                  <Text style={styles.statusText}>ACTIVE</Text>
                                </View>
                              )}

                              {state === 'completed' && (
                                <View style={[styles.statusBadge, { backgroundColor: colors.accent }]}>
                                  <Feather name="bar-chart-2" size={10} color="#fff" />
                                  <Text style={styles.statusText}>RESULTS</Text>
                                </View>
                              )}

                              {state === 'dismissed' && (
                                <View style={[styles.statusBadge, { backgroundColor: colors.mutedForeground }]}>
                                  <Feather name="check" size={10} color="#fff" />
                                  <Text style={styles.statusText}>FINISHED</Text>
                                </View>
                              )}

                              {state === 'ready' && (
                                <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
                                  <Feather name="clock" size={10} color="#fff" />
                                  <Text style={styles.statusText}>READY</Text>
                                </View>
                              )}

                              {state === 'active' && activationTimer && (
                                <View style={[styles.timerBadge, { backgroundColor: colors.warning }]}>
                                  <Feather name="clock" size={10} color="#fff" />
                                  <Text style={styles.timerText}>{activationTimer.remaining}s</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <Text
                            style={[styles.questionText, { color: colors.foreground }]}
                            numberOfLines={2}
                          >
                            {q.question_text}
                          </Text>

                          <View style={styles.questionActions}>
                            {state === 'active' && (
                              <>
                                {/* QUESTION IS LIVE — close it */}
                                <TouchableOpacity
                                  style={[styles.qActionBtn, { backgroundColor: colors.accent }]}
                                  onPress={() => handleCloseQuestion(q.id)}
                                  disabled={isBusy}
                                >
                                  {isClosing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <>
                                      <Feather name="stop-circle" size={14} color="#fff" />
                                      <Text style={styles.qActionText}>Close & Score</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              </>
                            )}

                            {state === 'completed' && (
                              <>
                                {/* QUESTION CLOSED — results showing, dismiss it */}
                                <TouchableOpacity
                                  style={[styles.qActionBtn, { backgroundColor: colors.danger }]}
                                  onPress={() => handleDismissQuestion(q.id)}
                                  disabled={isBusy}
                                >
                                  {isDismissing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <>
                                      <Feather name="x-circle" size={14} color="#fff" />
                                      <Text style={styles.qActionText}>Dismiss Question</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              </>
                            )}

                            {state === 'dismissed' && (
                              <>
                                {/* QUESTION FINISHED — locked */}
                                <View style={[styles.qActionBtn, { backgroundColor: colors.mutedForeground, opacity: 0.5 }]}>
                                  <Feather name="lock" size={14} color="#fff" />
                                  <Text style={styles.qActionText}>Finished</Text>
                                </View>
                              </>
                            )}

                            {state === 'ready' && (
                              <>
                                {/* QUESTION READY — can be activated (only if no undismissed question) */}
                                <TouchableOpacity
                                  style={[
                                    styles.qActionBtn,
                                    { backgroundColor: colors.success },
                                    (isBusy || hasUndismissedQuestion) && { opacity: 0.6 },
                                  ]}
                                  onPress={() => handleActivateQuestion(q.id)}
                                  disabled={isBusy || hasUndismissedQuestion}
                                >
                                  {isActivating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <>
                                      <Feather name="play-circle" size={14} color="#fff" />
                                      <Text style={styles.qActionText}>
                                        {hasUndismissedQuestion ? 'Waiting...' : 'Activate'}
                                      </Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>

              {/* LEADERBOARD SNIPPET */}
              {leaderboard.length > 0 && questionShowingResults && (
                <View style={[styles.leaderboardSection, { backgroundColor: colors.surface }]}>
                  <View style={styles.leaderboardHeader}>
                    <Feather name="award" size={18} color={colors.accent} />
                    <Text style={[styles.leaderboardTitle, { color: colors.foreground }]}>
                      Current Standings ({leaderboard.length})
                    </Text>
                  </View>
                  {leaderboard.slice(0, 5).map((entry: any, idx: number) => (
                    <View key={entry.id || idx} style={styles.lbRow}>
                      <View style={[styles.lbRank, {
                        backgroundColor: idx === 0 ? colors.warning : idx < 3 ? colors.muted : 'transparent'
                      }]}>
                        <Text style={[styles.lbRankText, {
                          color: idx < 3 ? '#fff' : colors.mutedForeground
                        }]}>{idx + 1}</Text>
                      </View>
                      <Text style={[styles.lbName, { color: colors.foreground }]} numberOfLines={1}>
                        {entry.profiles?.username || 'Anonymous'}
                      </Text>
                      <Text style={[styles.lbScore, { color: colors.primary }]}>
                        {entry.total_score} pts
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  content: { padding: 20 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  emptyCard: { padding: 48, borderRadius: 12, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptySmall: { fontSize: 14, textAlign: 'center' },
  card: { padding: 16, borderRadius: 12, gap: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  liveDot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardMeta: { fontSize: 13 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 8,
  },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Quiz panel
  quizPanel: { padding: 16, borderRadius: 12, gap: 12, marginBottom: 12 },
  quizPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quizPanelTitle: { fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 20, justifyContent: 'center' },
  loadingText: { fontSize: 14 },
  noQuestions: { alignItems: 'center', gap: 12, padding: 20 },
  noQuestionsText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  addQuestionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
  },
  addQuestionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  questionCount: { fontSize: 12 },

  // Results banner
  resultsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 8, borderWidth: 1,
  },
  resultsBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Question cards
  questionCard: { padding: 14, borderRadius: 10, borderWidth: 1, gap: 10 },
  questionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionNumRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  questionNumber: { fontSize: 12, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  statusText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4,
  },
  timerText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  questionText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  questionActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  qActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6,
  },
  qActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Leaderboard snippet
  leaderboardSection: { padding: 16, borderRadius: 12, gap: 8, marginTop: 4 },
  leaderboardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  leaderboardTitle: { fontSize: 14, fontWeight: '700' },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lbRank: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lbRankText: { fontSize: 12, fontWeight: '800' },
  lbName: { flex: 1, fontSize: 13, fontWeight: '600' },
  lbScore: { fontSize: 13, fontWeight: '700' },
});
