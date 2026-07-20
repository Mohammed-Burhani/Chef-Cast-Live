/**
 * Admin Episodes Management - Table view with inline question creation
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useColors } from '@/hooks/useColors';
import { useEpisodes } from '@/lib/api/hooks';
import { supabase } from '@/lib/supabase';
import { toast } from '@/utils/toast';
import {
  useCreateEpisode,
  useUpdateEpisode,
  useToggleEpisodeLive,
  useDeleteEpisode,
  useCreateQuestion,
} from '@/lib/api/admin-hooks';
import { DataTable, Column } from '@/components/admin/DataTable';

type QuestionForm = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  timer_seconds: number;
};

export default function AdminEpisodes() {
  const colors = useColors();
  const { data: episodes = [], isLoading } = useEpisodes();
  const createMutation = useCreateEpisode();
  const updateMutation = useUpdateEpisode();
  const toggleLiveMutation = useToggleEpisodeLive();
  const deleteMutation = useDeleteEpisode();
  const createQuestionMutation = useCreateQuestion();

  const [modalVisible, setModalVisible] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_at: new Date(),
    thumbnail_url: '',
    youtube_url: '',
    default_timer_seconds: 30,
  });

  // Questions state
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [useCustomTimers, setUseCustomTimers] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionForm>({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'a',
    timer_seconds: 30,
  });

  const handleCreate = () => {
    setEditingEpisode(null);
    setFormData({
      title: '',
      description: '',
      scheduled_at: new Date(),
      thumbnail_url: '',
      youtube_url: '',
      default_timer_seconds: 30,
    });
    setQuestions([]);
    setUseCustomTimers(false);
    setModalVisible(true);
  };

  const handleEdit = (episode: any) => {
    setEditingEpisode(episode);
    setFormData({
      title: episode.title,
      description: episode.description,
      scheduled_at: new Date(episode.scheduled_at),
      thumbnail_url: episode.thumbnail_url || '',
      youtube_url: episode.youtube_url || '',
      default_timer_seconds: episode.default_timer_seconds || 30,
    });
    setQuestions([]);
    setUseCustomTimers(false);
    setModalVisible(true);
    
    // Load existing questions
    loadEpisodeQuestions(episode.id);
  };

  const loadEpisodeQuestions = async (episodeId: string) => {
    try {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('episode_id', episodeId)
        .order('sequence_number', { ascending: true });

      if (data) {
        setQuestions(data.map(q => ({
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c || '',
          option_d: q.option_d || '',
          correct_option: q.correct_option,
          timer_seconds: q.timer_seconds,
        })));
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.question_text || !currentQuestion.option_a || !currentQuestion.option_b) {
      Alert.alert('Error', 'Question and at least 2 options required');
      return;
    }

    setQuestions([...questions, { ...currentQuestion }]);
    setCurrentQuestion({
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'a',
      timer_seconds: 30,
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formData.title) {
      Alert.alert('Error', 'Title required');
      return;
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        scheduled_at: formData.scheduled_at.toISOString(),
        thumbnail_url: formData.thumbnail_url || null,
        youtube_url: formData.youtube_url || null,
        default_timer_seconds: formData.default_timer_seconds,
      };

      let episodeId: string;

      if (editingEpisode) {
        const updated = await updateMutation.mutateAsync({
          id: editingEpisode.id,
          updates: payload,
        });
        episodeId = updated.id;
        
        setModalVisible(false);
        toast.success('Episode updated successfully');
      } else {
        const created = await createMutation.mutateAsync(payload);
        episodeId = created.id;

        // Create questions if any - use custom timer or episode default
        for (const q of questions) {
          await createQuestionMutation.mutateAsync({
            episode_id: episodeId,
            ...q,
            timer_seconds: useCustomTimers ? q.timer_seconds : formData.default_timer_seconds,
          });
        }
        
        setModalVisible(false);
        toast.success(
          `Episode created${questions.length > 0 ? ` with ${questions.length} questions` : ''}`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleGoLive = (episode: any) => {
    Alert.alert(
      'Go Live',
      `Start streaming "${episode.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go Live',
          onPress: async () => {
            try {
              await toggleLiveMutation.mutateAsync({ episodeId: episode.id, isLive: true });
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
              await toggleLiveMutation.mutateAsync({ episodeId: episode.id, isLive: false });
              Alert.alert('Success', 'Stream ended');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (episode: any) => {
    Alert.alert(
      'Delete Episode',
      `Delete "${episode.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(episode.id);
              Alert.alert('Success', 'Episode deleted');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      label: 'Title',
      render: (ep) => (
        <View>
          <Text style={[styles.epTitle, { color: colors.foreground }]}>{ep.title}</Text>
          {ep.is_live && (
            <View style={[styles.liveBadge, { backgroundColor: colors.live }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
      ),
    },
    {
      key: 'scheduled_at',
      label: 'Scheduled',
      width: 180,
      render: (ep) => (
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {new Date(ep.scheduled_at).toLocaleString()}
        </Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      render: (ep) => {
        const status = ep.ended_at ? 'ended' : ep.is_live ? 'live' : 'upcoming';
        const statusColors: Record<string, string> = {
          live: colors.live,
          ended: colors.success,
          upcoming: colors.accent,
        };

        return (
          <View style={[styles.statusBadge, { backgroundColor: `${statusColors[status]}22` }]}>
            <Text style={[styles.statusText, { color: statusColors[status] }]}>
              {status.toUpperCase()}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 320,
      render: (ep) => (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/(admin)/questions/${ep.id}` as any)}
          >
            <Feather name="help-circle" size={14} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push({ pathname: '/(admin)/analytics', params: { episodeId: ep.id } } as any)}
          >
            <Feather name="bar-chart-2" size={14} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.muted }]}
            onPress={() => handleEdit(ep)}
          >
            <Feather name="edit-2" size={14} color="#fff" />
          </TouchableOpacity>

          {ep.is_live ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.danger }]}
              onPress={() => handleStopLive(ep)}
            >
              <Feather name="stop-circle" size={14} color="#fff" />
            </TouchableOpacity>
          ) : !ep.ended_at && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => handleGoLive(ep)}
            >
              <Feather name="play-circle" size={14} color="#fff" />
            </TouchableOpacity>
          )}

          {!ep.is_live && !ep.ended_at && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.danger }]}
              onPress={() => handleDelete(ep)}
            >
              <Feather name="trash-2" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Episodes</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Manage your live cooking episodes
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.createBtnText}>New Episode</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <DataTable
          columns={columns}
          data={episodes}
          keyExtractor={(ep) => ep.id}
          emptyMessage="No episodes yet. Create your first one!"
        />
      </View>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingEpisode ? 'Edit Episode' : 'Create New Episode'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Episode Details */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Episode Details</Text>

                <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  placeholder="Mastering French Onion Soup"
                  placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textarea, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Learn the secrets to perfect caramelized onions..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Scheduled Date & Time *</Text>
                {Platform.OS === 'web' ? (
                  // Web: Native HTML datetime-local input
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at.toISOString().slice(0, 16)}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      if (!isNaN(newDate.getTime())) {
                        setFormData({ ...formData, scheduled_at: newDate });
                      }
                    }}
                    min={new Date().toISOString().slice(0, 16)}
                    style={{
                      width: '100%',
                      padding: 12,
                      fontSize: 16,
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  // Mobile: TouchableOpacity to trigger native picker
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setDatePickerOpen(true)}
                  >
                    <Feather name="calendar" size={18} color={colors.primary} />
                    <Text style={[styles.dateButtonText, { color: colors.foreground }]}>
                      {formData.scheduled_at.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.label, { color: colors.foreground }]}>YouTube Live URL (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={formData.youtube_url}
                  onChangeText={(text) => setFormData({ ...formData, youtube_url: text })}
                  placeholder="https://youtube.com/watch?v=..."
                  placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Thumbnail URL (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={formData.thumbnail_url}
                  onChangeText={(text) => setFormData({ ...formData, thumbnail_url: text })}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor={colors.mutedForeground}
                />

                <View style={styles.timerCompact}>
                  <Text style={[styles.label, { color: colors.foreground, marginBottom: 8 }]}>
                    Default Timer
                  </Text>
                  <View style={[styles.timerCompactInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Feather name="clock" size={16} color={colors.mutedForeground} />
                    <TextInput
                      style={[styles.timerValue, { color: colors.foreground }]}
                      value={String(formData.default_timer_seconds)}
                      onChangeText={(text) => setFormData({ ...formData, default_timer_seconds: parseInt(text) || 30 })}
                      keyboardType="number-pad"
                      placeholder="30"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    <Text style={[styles.timerUnit, { color: colors.mutedForeground }]}>sec</Text>
                  </View>
                  <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                    Default for all questions
                  </Text>
                </View>
              </View>

              {/* Questions Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quiz Questions</Text>
                    <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
                      {editingEpisode ? 'View and manage questions' : 'Add questions now or later'}
                    </Text>
                  </View>
                  <View style={[styles.questionCount, { backgroundColor: colors.primary }]}>
                    <Text style={styles.questionCountText}>{questions.length}</Text>
                  </View>
                </View>

                {editingEpisode ? (
                  <>
                    {/* Edit Mode: Read-only questions with Edit CTA */}
                    {questions.length > 0 ? (
                      <>
                        <View style={styles.questionsList}>
                          {questions.map((q, idx) => (
                            <View key={idx} style={[styles.questionItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                              <View style={styles.questionItemHeader}>
                                <Text style={[styles.questionNumber, { color: colors.primary }]}>Q{idx + 1}</Text>
                              </View>
                              <Text style={[styles.questionText, { color: colors.foreground }]}>{q.question_text}</Text>
                              <Text style={[styles.questionMini, { color: colors.mutedForeground }]}>
                                Correct: {q.correct_option.toUpperCase()} • {q.timer_seconds}s
                              </Text>
                            </View>
                          ))}
                        </View>
                        <TouchableOpacity
                          style={[styles.manageQuestionsBtn, { backgroundColor: colors.accent }]}
                          onPress={() => {
                            setModalVisible(false);
                            router.push(`/(admin)/questions/${editingEpisode.id}` as any);
                          }}
                        >
                          <Feather name="edit-3" size={18} color="#fff" />
                          <Text style={styles.manageQuestionsText}>Edit Questions</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={[styles.emptyQuestions, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Feather name="help-circle" size={32} color={colors.mutedForeground} />
                        <Text style={[styles.emptyQuestionsText, { color: colors.mutedForeground }]}>
                          No questions yet
                        </Text>
                        <TouchableOpacity
                          style={[styles.manageQuestionsBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                          onPress={() => {
                            setModalVisible(false);
                            router.push(`/(admin)/questions/${editingEpisode.id}` as any);
                          }}
                        >
                          <Feather name="plus" size={18} color="#fff" />
                          <Text style={styles.manageQuestionsText}>Add Questions</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    {/* Create Mode: Full question form */}
                    {/* Custom Timer Toggle */}
                    <TouchableOpacity
                      style={[styles.toggleRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => setUseCustomTimers(!useCustomTimers)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.toggleInfo}>
                        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Custom Timer Per Question</Text>
                        <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>
                          {useCustomTimers ? 'Each question has its own timer' : `All questions use ${formData.default_timer_seconds}s timer`}
                        </Text>
                      </View>
                      <View style={[styles.toggle, { backgroundColor: useCustomTimers ? colors.success : colors.muted }]}>
                        <View style={[styles.toggleThumb, { transform: [{ translateX: useCustomTimers ? 20 : 0 }] }]} />
                      </View>
                    </TouchableOpacity>

                  {/* Current Question Form */}
                  <View style={[styles.questionForm, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                      value={currentQuestion.question_text}
                      onChangeText={(text) => setCurrentQuestion({ ...currentQuestion, question_text: text })}
                      placeholder="Question text"
                      placeholderTextColor={colors.mutedForeground}
                    />

                    <View style={styles.optionsGrid}>
                      <TextInput
                        style={[styles.optionInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                        value={currentQuestion.option_a}
                        onChangeText={(text) => setCurrentQuestion({ ...currentQuestion, option_a: text })}
                        placeholder="Option A"
                        placeholderTextColor={colors.mutedForeground}
                      />
                      <TextInput
                        style={[styles.optionInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                        value={currentQuestion.option_b}
                        onChangeText={(text) => setCurrentQuestion({ ...currentQuestion, option_b: text })}
                        placeholder="Option B"
                        placeholderTextColor={colors.mutedForeground}
                      />
                      <TextInput
                        style={[styles.optionInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                        value={currentQuestion.option_c}
                        onChangeText={(text) => setCurrentQuestion({ ...currentQuestion, option_c: text })}
                        placeholder="Option C (optional)"
                        placeholderTextColor={colors.mutedForeground}
                      />
                      <TextInput
                        style={[styles.optionInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                        value={currentQuestion.option_d}
                        onChangeText={(text) => setCurrentQuestion({ ...currentQuestion, option_d: text })}
                        placeholder="Option D (optional)"
                        placeholderTextColor={colors.mutedForeground}
                      />
                    </View>

                    <View style={styles.questionMeta}>
                      <View style={styles.correctOption}>
                        <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Correct:</Text>
                        <View style={styles.radioGroup}>
                          {['a', 'b', 'c', 'd'].map((opt) => (
                            <TouchableOpacity
                              key={opt}
                              style={[
                                styles.radio,
                                { borderColor: colors.border },
                                currentQuestion.correct_option === opt && { backgroundColor: colors.success },
                              ]}
                              onPress={() => setCurrentQuestion({ ...currentQuestion, correct_option: opt as any })}
                            >
                              <Text style={[styles.radioText, { color: currentQuestion.correct_option === opt ? '#fff' : colors.foreground }]}>
                                {opt.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {useCustomTimers && (
                        <View style={styles.timer}>
                          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Timer (s):</Text>
                          <TextInput
                            style={[styles.timerInputSmall, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                            value={String(currentQuestion.timer_seconds)}
                            onChangeText={(text) => setCurrentQuestion({ ...currentQuestion, timer_seconds: parseInt(text) || 30 })}
                            keyboardType="number-pad"
                          />
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.addQuestionBtn, { backgroundColor: colors.primary }]}
                      onPress={handleAddQuestion}
                    >
                      <Feather name="plus" size={18} color="#fff" />
                      <Text style={styles.addQuestionText}>Add Question</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Added Questions List */}
                  {questions.length > 0 && (
                    <View style={styles.questionsList}>
                      {questions.map((q, idx) => (
                        <View key={idx} style={[styles.questionItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <View style={styles.questionItemHeader}>
                            <Text style={[styles.questionNumber, { color: colors.primary }]}>Q{idx + 1}</Text>
                            <TouchableOpacity onPress={() => handleRemoveQuestion(idx)}>
                              <Feather name="trash-2" size={16} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                          <Text style={[styles.questionText, { color: colors.foreground }]}>{q.question_text}</Text>
                          <Text style={[styles.questionMini, { color: colors.mutedForeground }]}>
                            Correct: {q.correct_option.toUpperCase()} • {q.timer_seconds}s
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                  {editingEpisode ? 'Update' : `Create${questions.length > 0 ? ` with ${questions.length} questions` : ''}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker - Mobile Only */}
      {Platform.OS !== 'web' && datePickerOpen && (
        <DateTimePicker
          value={formData.scheduled_at}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setDatePickerOpen(false);
            }
            if (selectedDate) {
              setFormData({ ...formData, scheduled_at: selectedDate });
            }
            if (event.type === 'dismissed' && Platform.OS === 'ios') {
              setDatePickerOpen(false);
            }
          }}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 24 },
  epTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  liveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  date: { fontSize: 13 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 700,
    maxHeight: '90%',
    borderRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalScroll: { paddingHorizontal: 24 },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionDesc: { fontSize: 13 },
  questionCount: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionCountText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
  },
  dateButtonText: { fontSize: 15, flex: 1 },
  questionForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  optionsGrid: { gap: 8 },
  optionInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  questionMeta: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  correctOption: { flex: 1 },
  metaLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  radioGroup: { flexDirection: 'row', gap: 6 },
  radio: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  radioText: { fontSize: 13, fontWeight: '700' },
  timer: { width: 100 },
  timerInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    textAlign: 'center',
  },
  timerInputSmall: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    textAlign: 'center',
  },
  timerCompact: { marginTop: 12 },
  timerCompactInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  timerValue: {
    fontSize: 16,
    fontWeight: '600',
    width: 40,
    textAlign: 'center',
  },
  timerUnit: { fontSize: 14 },
  manageQuestionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  manageQuestionsText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  helperText: { fontSize: 12, marginTop: 6 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  toggleDesc: { fontSize: 13 },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  addQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addQuestionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  questionsList: { gap: 10, marginTop: 12 },
  questionItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  questionItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionNumber: { fontSize: 13, fontWeight: '800' },
  questionText: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  questionMini: { fontSize: 12 },
  emptyQuestions: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyQuestionsText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 16, fontWeight: '700' },
});
