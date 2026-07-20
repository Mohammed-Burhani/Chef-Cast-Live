/**
 * Admin Questions Management - CRUD for episode questions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useQuestions } from '@/lib/api/hooks';
import {
  useCreateQuestion,
  useActivateQuestion,
  useDeactivateAllQuestions,
} from '@/lib/api/admin-hooks';

export default function AdminQuestions() {
  const colors = useColors();
  const { id: episodeId } = useLocalSearchParams<{ id: string }>();
  const { data: questions = [], isLoading } = useQuestions(episodeId!);
  const createMutation = useCreateQuestion();
  const activateMutation = useActivateQuestion();
  const deactivateMutation = useDeactivateAllQuestions();

  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'a',
    timer_seconds: 30,
  });

  const handleCreate = () => {
    setFormData({
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'a',
      timer_seconds: 30,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.question_text || !formData.option_a || !formData.option_b) {
      Alert.alert('Error', 'Question text and at least 2 options required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        episode_id: episodeId!,
        ...formData,
      });
      setModalVisible(false);
      Alert.alert('Success', 'Question created');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleActivate = async (questionId: string) => {
    try {
      await activateMutation.mutateAsync({
        episodeId: episodeId!,
        questionId,
      });
      Alert.alert('Success', 'Question activated');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeactivate = async (questionId: string) => {
    try {
      await deactivateMutation.mutateAsync(episodeId!);
      Alert.alert('Success', 'All questions deactivated');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Episode Questions</Text>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>Loading...</Text>
      ) : questions.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>No questions yet</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {questions.map((q, idx) => (
            <View key={q.id} style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.qNumber, { color: colors.mutedForeground }]}>Q{idx + 1}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {q.is_active && (
                    <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
                      <Text style={styles.activeText}>ACTIVE</Text>
                    </View>
                  )}
                  {q.dismissed_at && (
                    <View style={[styles.activeBadge, { backgroundColor: colors.mutedForeground }]}>
                      <Text style={styles.activeText}>FINISHED</Text>
                    </View>
                  )}
                  {q.has_been_activated && !q.is_active && !q.dismissed_at && (
                    <View style={[styles.activeBadge, { backgroundColor: colors.accent }]}>
                      <Text style={styles.activeText}>RESULTS</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={[styles.qText, { color: colors.foreground }]}>{q.question_text}</Text>

              <View style={styles.options}>
                {[
                  { label: 'A', text: q.option_a },
                  { label: 'B', text: q.option_b },
                  { label: 'C', text: q.option_c },
                  { label: 'D', text: q.option_d },
                ]
                  .filter((opt) => opt.text)
                  .map((opt) => (
                    <View
                      key={opt.label}
                      style={[
                        styles.option,
                        { borderColor: colors.border },
                        opt.label.toLowerCase() === q.correct_option && {
                          backgroundColor: `${colors.success}22`,
                          borderColor: colors.success,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color:
                              opt.label.toLowerCase() === q.correct_option
                                ? colors.success
                                : colors.mutedForeground,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={[styles.optionText, { color: colors.foreground }]}>{opt.text}</Text>
                    </View>
                  ))}
              </View>

              <View style={styles.cardActions}>
                {q.dismissed_at ? (
                  <View style={[styles.actionBtn, { backgroundColor: colors.mutedForeground, opacity: 0.6 }]}>
                    <Feather name="lock" size={16} color="#fff" />
                    <Text style={[styles.actionText, { color: '#fff' }]}>Finished</Text>
                  </View>
                ) : q.is_active ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                    onPress={() => handleDeactivate(q.id)}
                  >
                    <Feather name="stop-circle" size={16} color="#fff" />
                    <Text style={[styles.actionText, { color: '#fff' }]}>Deactivate</Text>
                  </TouchableOpacity>
                ) : q.has_been_activated ? (
                  <View style={[styles.actionBtn, { backgroundColor: colors.mutedForeground, opacity: 0.6 }]}>
                    <Feather name="lock" size={16} color="#fff" />
                    <Text style={[styles.actionText, { color: '#fff' }]}>Already Used</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.success }]}
                    onPress={() => handleActivate(q.id)}
                  >
                    <Feather name="play-circle" size={16} color="#fff" />
                    <Text style={[styles.actionText, { color: '#fff' }]}>Activate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Create Question</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.label, { color: colors.foreground }]}>Question *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.question_text}
                onChangeText={(text) => setFormData({ ...formData, question_text: text })}
                placeholder="What is the correct technique?"
                placeholderTextColor={colors.mutedForeground}
                multiline
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Option A *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.option_a}
                onChangeText={(text) => setFormData({ ...formData, option_a: text })}
                placeholder="First option"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Option B *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.option_b}
                onChangeText={(text) => setFormData({ ...formData, option_b: text })}
                placeholder="Second option"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Option C</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.option_c}
                onChangeText={(text) => setFormData({ ...formData, option_c: text })}
                placeholder="Third option (optional)"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Option D</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.option_d}
                onChangeText={(text) => setFormData({ ...formData, option_d: text })}
                placeholder="Fourth option (optional)"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Correct Option</Text>
              <View style={styles.radioGroup}>
                {['a', 'b', 'c', 'd'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.radio,
                      { borderColor: colors.border },
                      formData.correct_option === opt && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setFormData({ ...formData, correct_option: opt })}
                  >
                    <Text
                      style={[
                        styles.radioLabel,
                        {
                          color: formData.correct_option === opt ? '#fff' : colors.foreground,
                        },
                      ]}
                    >
                      {opt.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.foreground }]}>Timer (seconds)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={String(formData.timer_seconds)}
                onChangeText={(text) => setFormData({ ...formData, timer_seconds: parseInt(text) || 30 })}
                placeholder="30"
                keyboardType="number-pad"
                placeholderTextColor={colors.mutedForeground}
              />
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
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
  },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  qText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    width: 20,
  },
  optionText: {
    fontSize: 13,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalForm: {
    padding: 20,
    paddingTop: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radio: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
