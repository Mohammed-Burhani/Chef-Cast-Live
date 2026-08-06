/**
 * Admin Announcements Management — admin-published announcements shown on the
 * homepage "What's Cooking" section and the user-facing listing page.
 * Messages are capped at 50 words (enforced with a live word counter).
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { toast } from '@/utils/toast';
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from '@/lib/api/hooks';
import { MAX_WORDS, countWords } from '@/lib/api/announcements';
import type { AnnouncementInput } from '@/lib/api/announcements';
import { DataTable, Column } from '@/components/admin/DataTable';

type AnnouncementForm = {
  title: string;
  message: string;
  is_published: boolean;
};

const emptyForm = (): AnnouncementForm => ({
  title: '',
  message: '',
  is_published: true,
});

export default function AdminAnnouncements() {
  const colors = useColors();
  const { data: announcements = [], isLoading } = useAdminAnnouncements();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm());

  const set = (patch: Partial<AnnouncementForm>) => setForm((f) => ({ ...f, ...patch }));

  const messageWordCount = countWords(form.message);
  const overWordLimit = messageWordCount > MAX_WORDS;

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setForm(emptyForm());
    setModalVisible(true);
  };

  const handleEdit = (announcement: any) => {
    setEditingAnnouncement(announcement);
    setForm({
      title: announcement.title ?? '',
      message: announcement.message ?? '',
      is_published: announcement.is_published !== false,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!form.message.trim()) {
      Alert.alert('Error', 'Message is required');
      return;
    }
    if (overWordLimit) {
      Alert.alert('Error', `Message exceeds ${MAX_WORDS} words. Please shorten it.`);
      return;
    }

    const payload: AnnouncementInput = {
      title: form.title.trim(),
      message: form.message.trim(),
      is_published: form.is_published,
    };

    setSaving(true);
    try {
      if (editingAnnouncement) {
        await updateMutation.mutateAsync({ id: editingAnnouncement.id, updates: payload });
        setModalVisible(false);
        toast.success('Announcement updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        setModalVisible(false);
        toast.success('Announcement created successfully');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (announcement: any) => {
    Alert.alert(
      'Delete Announcement',
      `Delete "${announcement.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(announcement.id);
              toast.success('Announcement deleted');
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
      render: (announcement) => (
        <View style={styles.titleCell}>
          <View style={[styles.titleIcon, { backgroundColor: colors.primary }]}>
            <Feather name="volume-2" size={16} color="#fff" />
          </View>
          <View style={styles.titleTextWrap}>
            <Text style={[styles.announcementTitle, { color: colors.foreground }]} numberOfLines={1}>
              {announcement.title}
            </Text>
            <Text style={[styles.messagePreview, { color: colors.mutedForeground }]} numberOfLines={1}>
              {announcement.message}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: 'published',
      label: 'Published',
      width: 100,
      render: (announcement) => (
        <Text
          style={[
            styles.publishedText,
            { color: announcement.is_published ? colors.success : colors.mutedForeground },
          ]}
        >
          {announcement.is_published ? 'Yes' : 'Draft'}
        </Text>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      width: 160,
      render: (announcement) => (
        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
          {new Date(announcement.created_at).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 90,
      render: (announcement) => (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={() => handleEdit(announcement)}
          >
            <Feather name="edit-2" size={14} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.danger }]}
            onPress={() => handleDelete(announcement)}
          >
            <Feather name="trash-2" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Announcements</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Posts shown on the homepage "What's Cooking" — max {MAX_WORDS} words each
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.createBtnText}>New Announcement</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <DataTable
          columns={columns}
          data={announcements}
          keyExtractor={(announcement) => announcement.id}
          emptyMessage="No announcements yet. Create your first one!"
        />
      </View>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={form.title}
                onChangeText={(text) => set({ title: text })}
                placeholder="New episode tomorrow!"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={form.message}
                onChangeText={(text) => set({ message: text })}
                placeholder="Full announcement text — maximum 50 words..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              <View style={styles.wordCountRow}>
                <Text
                  style={[
                    styles.wordCount,
                    { color: overWordLimit ? colors.danger : colors.mutedForeground },
                  ]}
                >
                  {messageWordCount} / {MAX_WORDS} words
                </Text>
                {overWordLimit && (
                  <Text style={[styles.wordCountError, { color: colors.danger }]}>
                    Too long — please shorten the message
                  </Text>
                )}
              </View>

              <View style={[styles.publishRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.publishInfo}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Published</Text>
                  <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>
                    {form.is_published
                      ? 'Visible on the homepage'
                      : 'Saved as a draft — hidden from homepage'}
                  </Text>
                </View>
                <Switch
                  value={form.is_published}
                  onValueChange={(v) => set({ is_published: v })}
                  trackColor={{ true: colors.success, false: colors.muted }}
                  thumbColor="#fff"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                  {saving ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  titleCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  titleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextWrap: { flex: 1, gap: 2 },
  announcementTitle: { fontSize: 15, fontWeight: '700' },
  messagePreview: { fontSize: 12 },
  metaText: { fontSize: 13 },
  publishedText: { fontSize: 13, fontWeight: '600' },
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
    maxWidth: 600,
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
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  textarea: { minHeight: 120 },
  wordCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  wordCount: { fontSize: 12, fontWeight: '600' },
  wordCountError: { fontSize: 12, fontWeight: '600' },
  publishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 8,
  },
  publishInfo: { flex: 1, paddingRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  toggleDesc: { fontSize: 13 },
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
