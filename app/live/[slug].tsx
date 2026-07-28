/**
 * Live Session Screen - /live/[slug]
 * Real-time live stream with YouTube embed and live quiz
 */

import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { VideoPlayer } from "@/components/live/VideoPlayer";
import { TabBar } from "@/components/live/TabBar";
import { QuizTab } from "@/components/live/QuizTab";
import { CommentsTab } from "@/components/live/CommentsTab";
import { ErrorState } from "@/components/ui/ErrorState";
import { useColors } from "@/hooks/useColors";
import { useLiveSession, useJoinLiveSession, fetchActiveQuestion } from "@/lib/api/live";
import { useLiveQuizStore } from "@/store/useLiveQuizStore";
import { useRealtimeStore } from "@/store/realtimeStore";
import { useEpisodeChannel, useQuestionEvents, useLeaderboardEvents, useQuestionDismissedEvent } from "@/lib/realtime/hooks";
import { useAuthStore } from "@/store/authStore";

export default function LiveSessionScreen() {
  const colors = useColors();
  const { height } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const episodeId = slug || '';

  // Data
  const { data: session, isLoading, error } = useLiveSession(episodeId);
  const joinMutation = useJoinLiveSession();

  // Poll for active question as Realtime fallback (polls every 2s)
  const { data: polledActive } = useQuery({
    queryKey: ['poll-active', episodeId],
    queryFn: () => fetchActiveQuestion(episodeId),
    enabled: !!episodeId,
    refetchInterval: 2000,
  });

  // Auth
  const user = useAuthStore((s) => s.user);

  // UI state
  const [activeTab, setActiveTab] = useState<'quiz' | 'comments'>('quiz');
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');

  // Live quiz store
  const setEpisodeId = useLiveQuizStore((s) => s.setEpisodeId);
  const handleQuestionActivated = useLiveQuizStore((s) => s.handleQuestionActivated);
  const handleQuestionClosed = useLiveQuizStore((s) => s.handleQuestionClosed);
  const updateLeaderboard = useLiveQuizStore((s) => s.updateLeaderboard);
  const updateScore = useLiveQuizStore((s) => s.updateScore);
  const reset = useLiveQuizStore((s) => s.reset);
  const phase = useLiveQuizStore((s) => s.phase);

  // Connect to the episode channel on mount
  useEpisodeChannel(episodeId);

  // Handle realtime question events
  useQuestionEvents(episodeId, {
    onActivated: useCallback((event) => {
      const question = {
        id: event.questionId,
        episode_id: episodeId,
        question_text: event.questionText,
        option_a: event.optionA,
        option_b: event.optionB,
        option_c: event.optionC,
        option_d: event.optionD,
        correct_option: 'a', // hidden from event until revealed
        timer_seconds: event.timerSeconds,
        is_active: true,
        has_been_activated: true,
        opened_at: event.openedAt,
        closed_at: null,
        sequence_number: event.sequenceNumber,
        created_at: '',
      };

      // totalQuestions is set by the session-loading useEffect below.
      // No need to set it here — session data loads before admin typically activates.

      handleQuestionActivated(question);
    }, [episodeId, handleQuestionActivated]),

    onClosed: useCallback((event) => {
      handleQuestionClosed(event.correctOption, event.questionId);
    }, [handleQuestionClosed]),
  });

  // Handle question dismissed — transitions from revealing → between/complete
  useQuestionDismissedEvent(episodeId, useCallback(() => {
    useLiveQuizStore.getState().handleQuestionDismissed();
  }, []));

  // Handle realtime leaderboard updates
  useLeaderboardEvents(episodeId, useCallback((event) => {
    const entries = event.topTen.map(entry => ({
      rank: entry.rank,
      userId: entry.userId,
      username: entry.username,
      avatarUrl: entry.avatarUrl,
      totalScore: entry.totalScore,
      correctCount: entry.correctCount,
      isCurrentUser: entry.userId === user?.id,
    }));

    const myEntry = entries.find(e => e.isCurrentUser);
    const viewerRank = myEntry?.rank ?? event.viewerEntry?.rank ?? null;

    updateLeaderboard(entries, viewerRank);

    if (event.viewerEntry) {
      updateScore(event.viewerEntry.totalScore, event.viewerEntry.correctCount);
    }
  }, [user?.id, updateLeaderboard, updateScore]));

  // Listen for leaderboard updates from channelManager
  useEffect(() => {
    // The channelManager handles leaderboard updates internally
    // We also poll via React Query as fallback
  }, [episodeId]);

  // Join session on mount + hydrate from existing active question
  useEffect(() => {
    if (episodeId && user?.id) {
      setEpisodeId(episodeId);
      joinMutation.mutate(episodeId);

      // Set total questions from session data
      if (session?.questions) {
        useLiveQuizStore.getState().setTotalQuestions(session.questions.length);

        // Hydrate: check if a question is already active (user joined late / reloaded)
        const activeQuestion = session.questions.find(q => q.is_active);
        const currentPhase = useLiveQuizStore.getState().phase;
        if (activeQuestion && currentPhase === 'idle') {
          const question = {
            id: activeQuestion.id,
            episode_id: episodeId,
            question_text: activeQuestion.question_text,
            option_a: activeQuestion.option_a,
            option_b: activeQuestion.option_b,
            option_c: activeQuestion.option_c,
            option_d: activeQuestion.option_d,
            correct_option: 'a', // hidden until revealed
            timer_seconds: activeQuestion.timer_seconds,
            is_active: true,
            has_been_activated: true,
            opened_at: activeQuestion.opened_at,
            closed_at: null,
            sequence_number: activeQuestion.sequence_number,
            created_at: activeQuestion.created_at,
          };
          useLiveQuizStore.getState().handleQuestionActivated(question);

          // Also check if the active question was already closed
          // (realtime QUESTION_CLOSED may have been missed during loading)
          if (activeQuestion.closed_at) {
            useLiveQuizStore.getState().handleQuestionClosed(activeQuestion.correct_option, activeQuestion.id);
          }
        }
      }
    }

    return () => {
      reset();
    };
  }, [episodeId, user?.id, session?.questions]);

  // Update total questions when session loads
  useEffect(() => {
    if (session?.questions) {
      useLiveQuizStore.getState().setTotalQuestions(session.questions.length);
    }
  }, [session?.questions]);

  // Polling fallback: when a polled active question is found and store is idle/between, hydrate
  useEffect(() => {
    if (!polledActive) return;
    const currentPhase = useLiveQuizStore.getState().phase;
    // Allow hydration from idle or between phases (next question started)
    // Also hydrate if the polled question differs from current (new question)
    const currentQ = useLiveQuizStore.getState().currentQuestion;
    const isSameQuestion = currentQ?.id === polledActive.id;
    if (isSameQuestion) return; // Already tracking this question
    if (currentPhase !== 'idle' && currentPhase !== 'between') return;

    const question = {
      id: polledActive.id,
      episode_id: episodeId,
      question_text: polledActive.question_text,
      option_a: polledActive.option_a,
      option_b: polledActive.option_b,
      option_c: polledActive.option_c,
      option_d: polledActive.option_d,
      correct_option: 'a',
      timer_seconds: polledActive.timer_seconds,
      is_active: true,
      has_been_activated: true,
      opened_at: polledActive.opened_at,
      closed_at: null,
      sequence_number: polledActive.sequence_number,
      created_at: polledActive.created_at,
    };
    useLiveQuizStore.getState().handleQuestionActivated(question);

    // If already closed, transition immediately
    if (polledActive.closed_at) {
      useLiveQuizStore.getState().handleQuestionClosed(polledActive.correct_option, polledActive.id);
    }
  }, [polledActive?.id, episodeId]);

  // Connection status polling
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const status = useRealtimeStore.getState().connectionStatuses?.[`episode:${episodeId}`];
        if (status) setConnectionStatus(status);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [episodeId]);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error || !session?.episode) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ErrorState
          title="Episode not found"
          message="This episode doesn't exist or is no longer available."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const episode = session.episode;
  const videoHeight = height * 0.35;
  const isQuizActive = phase === 'question' || phase === 'revealing';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {episode.title}
          </Text>
          <View style={[styles.livePill, { backgroundColor: colors.live }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        {connectionStatus === 'connected' && (
          <View style={styles.connectionStatus}>
            <View style={[styles.connectedDot, { backgroundColor: colors.success }]} />
          </View>
        )}
      </View>

      {/* Connection lost banner */}
      {connectionStatus === 'failed' && (
        <View style={[styles.connectionBanner, { backgroundColor: colors.danger }]}>
          <Feather name="wifi-off" size={14} color="#F5F5F5" />
          <Text style={styles.connectionBannerText}>Connection lost. Reconnecting...</Text>
        </View>
      )}

      {/* Video player */}
      <View style={{ height: videoHeight }}>
        <VideoPlayer
          streamUrl={episode.youtube_url}
          isQuizActive={isQuizActive}
        />
      </View>

      {/* Tab area */}
      <View style={styles.tabArea}>
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isQuizActive={isQuizActive}
        />

        <View style={styles.tabContent}>
          <View style={{ display: activeTab === 'quiz' ? 'flex' : 'none', flex: 1 }}>
            <QuizTab episodeId={episodeId} />
          </View>
          <View style={{ display: activeTab === 'comments' ? 'flex' : 'none', flex: 1 }}>
            <CommentsTab
              episodeId={episodeId}
              onSwitchToQuiz={() => setActiveTab('quiz')}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  connectionStatus: { width: 36, alignItems: 'center', justifyContent: 'center' },
  connectedDot: { width: 8, height: 8, borderRadius: 4 },
  connectionBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 10,
  },
  connectionBannerText: { color: '#F5F5F5', fontSize: 12, fontWeight: '600' },
  tabArea: { flex: 1 },
  tabContent: { flex: 1 },
});
