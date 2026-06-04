/**
 * Admin Panel
 * Manage episodes, questions, and live streams
 * Admin-only access
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
// import { supabase } from '@/lib/supabase'; // COMMENTED OUT FOR PROTOTYPE
import { MOCK_EPISODES } from '@/constants/mockData';

interface Episode {
  id: string;
  title: string;
  is_live: boolean;
  scheduled_at: string;
  youtube_stream_url: string | null;
}

interface Question {
  id: string;
  question_text: string;
  is_active: boolean;
  sequence_number: number;
}

export default function AdminScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check admin access
  useEffect(() => {
    if (!profile?.is_admin) {
      Alert.alert('Access Denied', 'Admin access required');
      router.back();
      return;
    }

    fetchEpisodes();
  }, [profile]);

  const fetchEpisodes = async () => {
    try {
      // PROTOTYPE: Using mock data
      const mockEpisodes = MOCK_EPISODES.map(ep => ({
        id: ep.id,
        title: ep.title,
        is_live: ep.isLive,
        scheduled_at: ep.broadcastAt,
        youtube_stream_url: null,
      }));
      setEpisodes(mockEpisodes);

      /* SUPABASE CODE COMMENTED OUT
      const { data, error } = await supabase
        .from('episodes')
        .select('id, title, is_live, scheduled_at, youtube_stream_url')
        .order('scheduled_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setEpisodes(data || []);
      */
    } catch (error) {
      console.error('[Admin] Fetch episodes error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestions = async (episodeId: string) => {
    try {
      // PROTOTYPE: Mock questions data
      setQuestions([
        { id: 'q1', question_text: 'What type of rice is used for risotto?', is_active: false, sequence_number: 1 },
        { id: 'q2', question_text: 'What is mantecatura?', is_active: true, sequence_number: 2 },
        { id: 'q3', question_text: 'Why add stock gradually?', is_active: false, sequence_number: 3 },
      ]);

      /* SUPABASE CODE COMMENTED OUT
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, is_active, sequence_number')
        .eq('episode_id', episodeId)
        .order('sequence_number', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
      */
    } catch (error) {
      console.error('[Admin] Fetch questions error:', error);
    }
  };

  const toggleLive = async (episodeId: string, currentState: boolean) => {
    try {
      // PROTOTYPE: Mock toggle
      Alert.alert('Success', `Episode ${!currentState ? 'is now LIVE!' : 'ended'}`);
      fetchEpisodes();

      /* SUPABASE CODE COMMENTED OUT
      const { error } = await supabase
        .from('episodes')
        .update({ is_live: !currentState })
        .eq('id', episodeId);

      if (error) throw error;

      Alert.alert('Success', `Episode ${!currentState ? 'is now LIVE!' : 'ended'}`);
      fetchEpisodes();
      */
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const activateQuestion = async (questionId: string, episodeId: string) => {
    try {
      // PROTOTYPE: Mock activation
      Alert.alert('Success', 'Question activated!');
      fetchQuestions(episodeId);

      /* SUPABASE CODE COMMENTED OUT
      // Close all active questions first
      await supabase
        .from('questions')
        .update({ is_active: false, closed_at: new Date().toISOString() })
        .eq('episode_id', episodeId)
        .eq('is_active', true);

      // Activate selected question
      const { error } = await supabase
        .from('questions')
        .update({ 
          is_active: true, 
          opened_at: new Date().toISOString(),
          closed_at: null 
        })
        .eq('id', questionId);

      if (error) throw error;

      Alert.alert('Success', 'Question activated!');
      fetchQuestions(episodeId);
      */
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const closeQuestion = async (questionId: string, episodeId: string) => {
    try {
      // PROTOTYPE: Mock close
      Alert.alert('Success', 'Question closed!');
      fetchQuestions(episodeId);

      /* SUPABASE CODE COMMENTED OUT
      const { error } = await supabase
        .from('questions')
        .update({ 
          is_active: false, 
          closed_at: new Date().toISOString() 
        })
        .eq('id', questionId);

      if (error) throw error;

      Alert.alert('Success', 'Question closed!');
      fetchQuestions(episodeId);
      */
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (!profile?.is_admin) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Admin Panel
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Episodes Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Episodes
          </Text>

          {episodes.map((episode) => (
            <View
              key={episode.id}
              style={[
                styles.episodeCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: episode.is_live ? colors.live : colors.border,
                },
              ]}
            >
              <View style={styles.episodeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.episodeTitle, { color: colors.foreground }]}>
                    {episode.title}
                  </Text>
                  {episode.is_live && (
                    <View style={[styles.liveBadge, { backgroundColor: colors.live }]}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.episodeActions}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: episode.is_live
                        ? `${colors.danger}22`
                        : `${colors.success}22`,
                      borderColor: episode.is_live ? colors.danger : colors.success,
                    },
                  ]}
                  onPress={() => toggleLive(episode.id, episode.is_live)}
                >
                  <Feather
                    name={episode.is_live ? 'stop-circle' : 'play-circle'}
                    size={18}
                    color={episode.is_live ? colors.danger : colors.success}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      {
                        color: episode.is_live ? colors.danger : colors.success,
                      },
                    ]}
                  >
                    {episode.is_live ? 'End Stream' : 'Go Live'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: `${colors.primary}22`,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setSelectedEpisode(episode.id);
                    fetchQuestions(episode.id);
                  }}
                >
                  <Feather name="list" size={18} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                    Questions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Questions Section */}
        {selectedEpisode && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Quiz Questions
            </Text>

            {questions.map((question) => (
              <View
                key={question.id}
                style={[
                  styles.questionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: question.is_active ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={styles.questionHeader}>
                  <Text style={[styles.questionNumber, { color: colors.mutedForeground }]}>
                    Q{question.sequence_number}
                  </Text>
                  {question.is_active && (
                    <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.questionText, { color: colors.foreground }]}>
                  {question.question_text}
                </Text>

                <View style={styles.questionActions}>
                  {!question.is_active ? (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: `${colors.success}22`,
                          borderColor: colors.success,
                        },
                      ]}
                      onPress={() => activateQuestion(question.id, selectedEpisode)}
                    >
                      <Feather name="play" size={16} color={colors.success} />
                      <Text style={[styles.actionBtnText, { color: colors.success }]}>
                        Activate
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: `${colors.danger}22`,
                          borderColor: colors.danger,
                        },
                      ]}
                      onPress={() => closeQuestion(question.id, selectedEpisode)}
                    >
                      <Feather name="x" size={16} color={colors.danger} />
                      <Text style={[styles.actionBtnText, { color: colors.danger }]}>
                        Close
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  section: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  episodeCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 2,
  },
  episodeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  episodeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  questionCard: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 2,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  questionActions: {
    flexDirection: 'row',
  },
});
