/**
 * Admin Episodes Management - CRUD for episodes
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

import { useColors } from '@/hooks/useColors';
import { useEpisodes } from '@/lib/api/hooks';
import {
  useCreateEpisode,
  useUpdateEpisode,
  useToggleEpisodeLive,
  usePostponeEpisode,
} from '@/lib/api/admin-hooks';

export default function AdminEpisodes() {
  const colors = useColors();
  const { data: episodes = [], isLoading } = useEpisodes();
  const createMutation = useCreateEpisode();
  const updateMutation = useUpdateEpisode();
  const toggleLiveMutation = useToggleEpisodeLive();
  const postponeMutation = usePostponeEpisode();

  const [modalVisible, setModalVisible] = useState(false);
  const [postponeModalVisible, setPostponeModalVisible] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<any>(null);
  const [postponingEpisode, setPostponingEpisode] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    video_url: '',
    thumbnail_url: '',
  });
  const [newScheduledDate, setNewScheduledDate] = useState('');

  const handleCreate = () => {
    setEditingEpisode(null);
    setFormData({
      title: '',
      description: '',
      scheduled_at: '',
      video_url: '',
      thumbnail_url: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (episode: any) => {
    setEditingEpisode(episode);
    setFormData({
      title: episode.title,
      description: episode.description,
      scheduled_at: episode.scheduled_at,
      video_url: episode.video_url || '',
      thumbnail_url: episode.thumbnail_url || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.scheduled_at) {
      Alert.alert('Error', 'Title and scheduled time required');
      return;
    }

    try {
      if (editingEpisode) {
        await updateMutation.mutateAsync({
          id: editingEpisode.id,
          updates: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setModalVisible(false);
      Alert.alert('Success', `Episode ${editingEpisode ? 'updated' : 'created'}`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

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

  const handlePostponePrompt = (episode: any) => {
    setPostponingEpisode(episode);
    setNewScheduledDate(episode.scheduled_at);
    setPostponeModalVisible(true);
  };

  const handlePostpone = async () => {
    if (!newScheduledDate) {
      Alert.alert('Error', 'Please select a new date');
      return;
    }

    try {
      await postponeMutation.mutateAsync({
        id: postponingEpisode.id,
        newScheduledAt: newScheduledDate,
      });
      setPostponeModalVisible(false);
      Alert.alert('Success', 'Episode postponed');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const isPastEpisode = (scheduledAt: string) => {
    return new Date(scheduledAt) < new Date();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Episodes</Text>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>Loading...</Text>
      ) : episodes.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>No episodes yet</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {episodes.map((ep) => {
            const isPast = isPastEpisode(ep.scheduled_at);
            
            return (
              <View key={ep.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{ep.title}</Text>
                    <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
                      {new Date(ep.scheduled_at).toLocaleString()}
                      {isPast && ' (Past)'}
                    </Text>
                  </View>
                  {ep.is_live && (
                    <View style={[styles.liveBadge, { backgroundColor: colors.live }]}>
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                    onPress={() => router.push(`/(admin)/questions/${ep.id}` as any)}
                  >
                    <Feather name="help-circle" size={16} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>Questions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                    onPress={() => handleEdit(ep)}
                  >
                    <Feather name="edit-2" size={16} color={colors.foreground} />
                    <Text style={[styles.actionText, { color: colors.foreground }]}>Edit</Text>
                  </TouchableOpacity>

                  {!isPast && (
                    <>
                      {ep.is_live ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                          onPress={() => handleStopLive(ep)}
                        >
                          <Feather name="stop-circle" size={16} color="#fff" />
                          <Text style={[styles.actionText, { color: '#fff' }]}>Stop</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.success }]}
                            onPress={() => handleGoLive(ep)}
                          >
                            <Feather name="play-circle" size={16} color="#fff" />
                            <Text style={[styles.actionText, { color: '#fff' }]}>Go Live</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.warning }]}
                            onPress={() => handlePostponePrompt(ep)}
                          >
                            <Feather name="clock" size={16} color="#fff" />
                            <Text style={[styles.actionText, { color: '#fff' }]}>Postpone</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingEpisode ? 'Edit Episode' : 'Create Episode'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Episode title"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Episode description"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Scheduled At *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.scheduled_at}
                onChangeText={(text) => setFormData({ ...formData, scheduled_at: text })}
                placeholder="YYYY-MM-DD HH:MM:SS"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Video URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.video_url}
                onChangeText={(text) => setFormData({ ...formData, video_url: text })}
                placeholder="https://..."
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Thumbnail URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={formData.thumbnail_url}
                onChangeText={(text) => setFormData({ ...formData, thumbnail_url: text })}
                placeholder="https://..."
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

      {/* Postpone Modal */}
      <Modal visible={postponeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Postpone Episode</Text>
              <TouchableOpacity onPress={() => setPostponeModalVisible(false)}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={[styles.label, { color: colors.foreground }]}>New Scheduled Date *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
                value={newScheduledDate}
                onChangeText={setNewScheduledDate}
                placeholder="YYYY-MM-DD HH:MM:SS"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                Enter a future date and time
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setPostponeModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.warning }]}
                onPress={handlePostpone}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Postpone</Text>
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
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
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
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
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
