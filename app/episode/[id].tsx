/**
 * Live Episode Screen
 * Full live session with video player, quiz, and comments
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
// import { supabase } from '@/lib/supabase'; // COMMENTED OUT FOR PROTOTYPE
import { useQuizStore, useQuizPhase } from '@/store/quizStore';
import { useCommentStore } from '@/store/commentStore';
// import { useRealtimeStore } from '@/store/realtimeStore'; // COMMENTED OUT FOR PROTOTYPE
import { MOCK_EPISODES, MOCK_QUIZ_QUESTIONS } from '@/constants/mockData';
/* REALTIME HOOKS COMMENTED OUT FOR PROTOTYPE
import {
  useEpisodeChannel,
  useQuestionEvents,
  useLeaderboardEvents,
  useEpisodeStateEvents,
} from '@/lib/realtime';
*/

import { VideoPlayer } from '@/components/live/VideoPlayer';
import { TabBar } from '@/components/live/TabBar';
import { QuizTab } from '@/components/live/QuizTab';
import { CommentsTab } from '@/components/live/CommentsTab';

interface Episode {
  id: string;
  title: string;
  youtube_stream_url: string | null;
}

export default function LiveEpisodeScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { height } = useWindowDimensions();

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quiz' | 'comments'>('quiz');

  const phase = useQuizPhase();
  const isQuizActive = phase === 'question' || phase === 'answered';
  // const isConnectionFailed = useRealtimeStore ((s) => s.isAnyChannelFailed()); // COMMENTED OUT
  const isConnectionFailed = false; // PROTOTYPE: no realtime

  const {
    joinEpisode,
    handleQuestionActivated, // Need for mock trigger
    // handleQuestionClosed,
    // handleLeaderboardUpdate,
    // handleEpisodeEnded,
    reset: resetQuiz,
  } = useQuizStore();

  const { reset: resetComments } = useCommentStore();

  // Fetch episode data
  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        // PROTOTYPE: Using mock data
        const mockEp = MOCK_EPISODES.find(ep => ep.id === id);
        if (mockEp) {
          setEpisode({
            id: mockEp.id,
            title: mockEp.title,
            // Mock YouTube live stream for ep-005
            youtube_stream_url: mockEp.id === 'ep-005' 
              ? 'https://www.youtube.com/watch?v=jfKfPfyJRdk' 
              : null,
          });
        }
        setIsLoading(false);

        /* SUPABASE CODE COMMENTED OUT
        const { data, error } = await supabase
          .from('episodes')
          .select('id, title, youtube_stream_url')
          .eq('id', id)
          .single();

        if (error) throw error;

        setEpisode(data);
        setIsLoading(false);
        */
      } catch (error) {
        console.error('[Episode] Fetch error:', error);
        setIsLoading(false);
      }
    };

    fetchEpisode();
  }, [id]);

  // Join episode and setup Realtime
  useEffect(() => {
    if (!episode) return;

    joinEpisode(episode.id);

    // PROTOTYPE: Mock quiz trigger for ep-005 after 3 seconds
    let quizTimer: NodeJS.Timeout;
    if (episode.id === 'ep-005') {
      quizTimer = setTimeout(() => {
        // Trigger mock question
        const mockQuestion = MOCK_QUIZ_QUESTIONS[0];
        useQuizStore.getState().handleQuestionActivated({
          type: 'QUESTION_ACTIVATED',
          questionId: mockQuestion.id,
          episodeId: episode.id,
          questionText: mockQuestion.text,
          optionA: mockQuestion.options[0].text,
          optionB: mockQuestion.options[1].text,
          optionC: mockQuestion.options[2].text,
          optionD: mockQuestion.options[3].text,
          timerSeconds: mockQuestion.timerSeconds,
          openedAt: new Date().toISOString(),
          sequenceNumber: 1,
        });
      }, 3000);
    }

    return () => {
      if (quizTimer) clearTimeout(quizTimer);
      resetQuiz();
      resetComments();
    };
  }, [episode]);

  // PROTOTYPE: Realtime subscriptions commented out
  /* SUPABASE REALTIME COMMENTED OUT
  useEpisodeChannel(episode?.id ?? '');

  useQuestionEvents(episode?.id ?? '', {
    onActivated: useCallback(handleQuestionActivated, []),
    onClosed: useCallback(handleQuestionClosed, []),
  });

  useLeaderboardEvents(episode?.id ?? '', useCallback(handleLeaderboardUpdate, []));

  useEpisodeStateEvents(episode?.id ?? '', {
    onEnded: useCallback(handleEpisodeEnded, []),
  });
  */

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!episode) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          Episode not found
        </Text>
      </View>
    );
  }

  const videoHeight = height * 0.4;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Connection lost banner */}
      {isConnectionFailed && (
        <View style={[styles.connectionBanner, { backgroundColor: colors.danger }]}>
          <Feather name="wifi-off" size={14} color="#F5F5F5" />
          <Text style={styles.connectionText}>Connection lost. Reconnecting...</Text>
        </View>
      )}

      {/* Video player */}
      <View style={{ height: videoHeight }}>
        <VideoPlayer streamUrl={episode.youtube_stream_url} isQuizActive={isQuizActive} />
      </View>

      {/* Tab area */}
      <View style={styles.tabArea}>
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isQuizActive={isQuizActive}
        />

        {/* Tab content - both rendered, display toggled */}
        <View style={styles.tabContent}>
          <View style={{ display: activeTab === 'quiz' ? 'flex' : 'none', flex: 1 }}>
            <QuizTab episodeId={episode.id} />
          </View>
          <View style={{ display: activeTab === 'comments' ? 'flex' : 'none', flex: 1 }}>
            <CommentsTab
              episodeId={episode.id}
              onSwitchToQuiz={() => setActiveTab('quiz')}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  connectionText: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '600',
  },
  tabArea: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
});
