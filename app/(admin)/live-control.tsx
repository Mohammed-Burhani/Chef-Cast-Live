/**
 * Admin Live Control — Live episode management + quiz question activation panel
 *
 * Shows:
 * - Currently live episode with question grid
 * - Each question: status badge + Activate button
 * - Real-time connection info
 * - End stream controls
 */

import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';

import { useColors } from '@/hooks/useColors';
import { useEpisodes } from '@/lib/api/hooks';
import { useToggleEpisodeLive } from '@/lib/api/admin-hooks';
import { useEpisodeQuestions, useActiveQuestion, useActivateQuestion, useCloseQuestion } from '@/lib/api/live';
import { useEpisodeChannel } from '@/lib/realtime/hooks';

export default function AdminLiveControl() {
  const colors = useColors();
  const { data: episodes = [], isLoading } = useEpisodes();
  const toggleLiveMutation = useToggleEpisodeLive();

  const liveEpisodes = episodes.filter((ep) => ep.is_live);
  const liveEpisode = liveEpisodes[0]; // Only one live at a time

  // Fetch questions and active state for the live episode
  const { data: questions = [], isLoading: questionsLoading } = useEpisodeQuestions(liveEpisode?.id || '');
  const { data: activeQuestion, refetch: refetchActive } = useActiveQuestion(liveEpisode?.id || '');
  const activateMutation = useActivateQuestion();
  const closeMutation = useCloseQuestion();

  // Show all non-live, non-ended episodes so admin can go live anytime
  const upcomingEpisodes = episodes.filter((ep) => {
    return !ep.is_live && !ep.ended_at;
  });

  // Subscribe to realtime changes on the live episode
  useEpisodeChannel(liveEpisode?.id || null);

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

  const handleGoLive = (episode: any) => {
    Alert.alert(
      'Go Live',
      `Start streaming "${episode.title}"?\n\nOnly one episode can be live at a time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go Live',
          style: 'default',
          onPress: async () => {
            try {
              await toggleLiveMutation.mutateAsync({
                episodeId: episode.id,
                isLive: true,
              });
              Alert.alert('Success', 'Episode is now live!');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleStopLive = (episode: any) => {
    Alert.alert(
      'Stop Stream',
      `End live streaming for "${episode.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
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
              Alert.alert('Success', 'Stream ended');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleActivateQuestion = async (questionId: string) => {
    if (!liveEpisode) return;

    try {
      await activateMutation.mutateAsync({
        episodeId: liveEpisode.id,
        questionId,
      });
      await refetchActive();
      Alert.alert('Success', 'Question activated!');
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
      Alert.alert('Success', 'Question closed');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Live Control</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* LIVE EPISODE */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Currently Live ({liveEpisodes.length})
          </Text>

          {liveEpisodes.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Feather name="radio" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No live episodes</Text>
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
                      {questions.length} question{questions.length !== 1 ? 's' : ''} — tap to activate
                    </Text>

                    {questions.map((q, idx) => {
                      const isActivated = q.has_been_activated;
                      const isCurrentlyActive = q.is_active;
                      const isActivating = activateMutation.isPending && activateMutation.variables?.questionId === q.id;

                      return (
                        <View
                          key={q.id}
                          style={[
                            styles.questionCard,
                            {
                              backgroundColor: isCurrentlyActive
                                ? `${colors.success}15`
                                : isActivated
                                ? `${colors.mutedForeground}10`
                                : colors.background,
                              borderColor: isCurrentlyActive
                                ? colors.success
                                : isActivated
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

                              {isCurrentlyActive ? (
                                <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
                                  <Feather name="play" size={10} color="#fff" />
                                  <Text style={styles.statusText}>ACTIVE</Text>
                                </View>
                              ) : isActivated ? (
                                <View style={[styles.statusBadge, { backgroundColor: colors.mutedForeground }]}>
                                  <Feather name="check" size={10} color="#fff" />
                                  <Text style={styles.statusText}>USED</Text>
                                </View>
                              ) : (
                                <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
                                  <Feather name="clock" size={10} color="#fff" />
                                  <Text style={styles.statusText}>READY</Text>
                                </View>
                              )}

                              {isCurrentlyActive && activationTimer && (
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
                            {isCurrentlyActive ? (
                              <TouchableOpacity
                                style={[styles.qActionBtn, { backgroundColor: colors.danger }]}
                                onPress={() => handleCloseQuestion(q.id)}
                              >
                                <Feather name="stop-circle" size={14} color="#fff" />
                                <Text style={styles.qActionText}>Close</Text>
                              </TouchableOpacity>
                            ) : isActivated ? (
                              <View style={[styles.qActionBtn, { backgroundColor: colors.mutedForeground, opacity: 0.5 }]}>
                                <Feather name="lock" size={14} color="#fff" />
                                <Text style={styles.qActionText}>Locked</Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={[
                                  styles.qActionBtn,
                                  { backgroundColor: colors.success },
                                  isActivating && { opacity: 0.6 },
                                ]}
                                onPress={() => handleActivateQuestion(q.id)}
                                disabled={isActivating}
                              >
                                {isActivating ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <>
                                    <Feather name="play-circle" size={14} color="#fff" />
                                    <Text style={styles.qActionText}>Activate</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            </>
          )}
        </View>

        {/* UPCOMING EPISODES */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ready to Go Live</Text>

          {upcomingEpisodes.length === 0 ? (
            <Text style={[styles.emptySmall, { color: colors.mutedForeground }]}>No upcoming episodes</Text>
          ) : (
            upcomingEpisodes.map((ep) => {
              const isPastDue = new Date(ep.scheduled_at) < new Date();
              return (
                <View key={ep.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={styles.cardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{ep.title}</Text>
                      {isPastDue && (
                        <View style={[{ backgroundColor: colors.warning, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }]}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>PAST DUE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                      Scheduled: {new Date(ep.scheduled_at).toLocaleString()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.goLiveBtn, { backgroundColor: colors.success }]}
                    onPress={() => handleGoLive(ep)}
                  >
                    <Feather name="play-circle" size={20} color="#fff" />
                    <Text style={styles.goLiveText}>Go Live</Text>
                  </TouchableOpacity>
                </View>
              );
            })
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
  content: { padding: 20 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  emptyCard: { padding: 48, borderRadius: 12, alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 16, fontWeight: '600' },
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
  goLiveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 8,
  },
  goLiveText: { color: '#fff', fontSize: 15, fontWeight: '700' },

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
});
