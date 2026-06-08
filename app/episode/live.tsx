/**
 * Live Episode Screen (Current Live Stream)
 * Route: /episode/live
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
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useQuizStore, useQuizPhase } from '@/store/useQuizStore';
import { useCommentStore } from '@/store/commentStore';
import { MOCK_EPISODES } from '@/constants/mockData';

import { VideoPlayer } from '@/components/live/VideoPlayer';
import { TabBar } from '@/components/live/TabBar';
import { QuizTab } from '@/components/live/QuizTab';
import { CommentsTab } from '@/components/live/CommentsTab';

export default function LiveEpisodeScreen() {
  const colors = useColors();
  const { height } = useWindowDimensions();

  const [episode, setEpisode] = useState<typeof MOCK_EPISODES[0] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quiz' | 'comments'>('quiz');

  const phase = useQuizPhase();
  const isQuizActive = phase === 'question' || phase === 'revealing';
  const isConnectionFailed = false; // PROTOTYPE: no realtime

  const resetQuiz = useQuizStore((s) => s.resetQuiz);
  const { reset: resetComments } = useCommentStore();

  // Fetch current live episode (ep-005 for prototype)
  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        // PROTOTYPE: Using ep-005 as current live
        const liveEp = MOCK_EPISODES.find(ep => ep.id === 'ep-005');
        if (liveEp) {
          setEpisode(liveEp);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('[LiveEpisode] Fetch error:', error);
        setIsLoading(false);
      }
    };

    fetchEpisode();
  }, []);

  // Start quiz simulation after 3s
  useEffect(() => {
    if (!episode) return;

    const timeout = setTimeout(() => {
      useQuizStore.getState().startQuiz();
    }, 3000);

    return () => {
      clearTimeout(timeout);
      resetQuiz();
      resetComments();
    };
  }, [episode, resetQuiz, resetComments]);

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
          No live episode active
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
        <VideoPlayer 
          streamUrl="https://www.youtube.com/watch?v=jfKfPfyJRdk" 
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

        {/* Tab content */}
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
