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

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { VideoPlayer } from "@/components/live/VideoPlayer";
import { TabBar } from "@/components/live/TabBar";
import { QuizTab } from "@/components/live/QuizTab";
import { CommentsTab } from "@/components/live/CommentsTab";
import { ErrorState } from "@/components/ui/ErrorState";
import { useColors } from "@/hooks/useColors";
import { useLiveSession, useJoinLiveSession } from "@/lib/api/live";
import { useLiveQuizStore } from "@/store/useLiveQuizStore";
import { useRealtimeStore } from "@/store/realtimeStore";
import { useEpisodeChannel, useQuestionEvents, useLeaderboardEvents } from "@/lib/realtime/hooks";
import { useAuthStore } from "@/store/authStore";

export default function LiveSessionScreen() {
  const colors = useColors();
  const { height } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const episodeId = slug || '';

  // Data
  const { data: session, isLoading, error } = useLiveSession(episodeId);
  const joinMutation = useJoinLiveSession();

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
  const setTotalQuestions = useLiveQuizStore((s) => s.setTotalQuestions);
  const reset = useLiveQuizStore((s) => s.reset);
  const phase = useLiveQuizStore((s) => s.phase);
  const totalQuestions = useLiveQuizStore((s) => s.totalQuestions);
  const currentQuestionNumber = useLiveQuizStore((s) => s.currentQuestionNumber);

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

      // If this is the first question, start quiz
      if (currentQuestionNumber === 0) {
        setTotalQuestions(totalQuestions || 0);
      }

      handleQuestionActivated(question);
    }, [episodeId, handleQuestionActivated, currentQuestionNumber, totalQuestions, setTotalQuestions]),

    onClosed: useCallback((event) => {
      handleQuestionClosed(event.correctOption);
    }, [handleQuestionClosed]),
  });

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

  // Join session on mount
  useEffect(() => {
    if (episodeId && user?.id) {
      setEpisodeId(episodeId);
      joinMutation.mutate(episodeId);

      // Set total questions from session data
      if (session?.questions) {
        useLiveQuizStore.getState().setTotalQuestions(session.questions.length);
      }
    }

    return () => {
      reset();
    };
  }, [episodeId, user?.id]);

  // Update total questions when session loads
  useEffect(() => {
    if (session?.questions) {
      useLiveQuizStore.getState().setTotalQuestions(session.questions.length);
    }
  }, [session?.questions]);

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
