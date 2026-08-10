/**
 * Admin Notifications Management — author, target, personalize and schedule
 * push notifications sent to users.
 *
 * Copy supports a `{name}` placeholder that is replaced with each recipient's
 * username at send time ("Hey Rahul, …"). Audience is either all users or a
 * hand-picked list. Campaigns are sent by the `send-admin-notification` edge
 * function when `scheduled_at` arrives (pg_cron), or immediately via "Send Now".
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useColors } from '@/hooks/useColors';
import { toast } from '@/utils/toast';
import { countWords } from '@/lib/api/announcements';
import {
  useAdminNotifications,
  useCreateAdminNotification,
  useUpdateAdminNotification,
  useDeleteAdminNotification,
  useCancelAdminNotification,
  useRetryAdminNotification,
  useSendNowAdminNotification,
} from '@/lib/api/admin-hooks';
import { useAllUsers } from '@/lib/api/admin-hooks';
import { MAX_TITLE_WORDS, MAX_BODY_WORDS } from '@/lib/api/admin-notifications';
import type { AdminNotificationStatus } from '@/lib/api/admin-notifications';
import { DataTable, Column } from '@/components/admin/DataTable';

type NotificationForm = {
  title: string;
  body: string;
  target_type: 'all' | 'specific';
  target_user_ids: string[];
  deep_link: string;
  scheduled_at: Date;
  send_now: boolean;
};

const emptyForm = (): NotificationForm => ({
  title: '',
  body: '',
  target_type: 'all',
  target_user_ids: [],
  deep_link: '',
  scheduled_at: new Date(Date.now() + 60 * 60 * 1000), // default: in 1 hour
  send_now: false,
});

const SAMPLE_NAME = 'Rahul';

export default function AdminNotifications() {
  const colors = useColors();
  const { data: notifications = [], isLoading } = useAdminNotifications();
  const createMutation = useCreateAdminNotification();
  const updateMutation = useUpdateAdminNotification();
  const deleteMutation = useDeleteAdminNotification();
  const cancelMutation = useCancelAdminNotification();
  const retryMutation = useRetryAdminNotification();
  const sendNowMutation = useSendNowAdminNotification();
  const { data: userData } = useAllUsers({ limit: 200 });
  const users = userData?.users ?? [];

  const [modalVisible, setModalVisible] = useState(false);
  const [editingNotification, setEditingNotification] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NotificationForm>(emptyForm());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const set = (patch: Partial<NotificationForm>) => setForm((f) => ({ ...f, ...patch }));

  const bodyWordCount = countWords(form.body);
  const overBodyLimit = bodyWordCount > MAX_BODY_WORDS;
  const overTitleLimit = countWords(form.title) > MAX_TITLE_WORDS;

  // Resolved preview of the personalization.
  const previewTitle = form.title.replace(/\{name\}/g, SAMPLE_NAME);
  const previewBody = form.body.replace(/\{name\}/g, SAMPLE_NAME);

  const filteredUsers = users.filter((u: any) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const toggleUser = (id: string) => {
    set({
      target_user_ids: form.target_user_ids.includes(id)
        ? form.target_user_ids.filter((x) => x !== id)
        : [...form.target_user_ids, id],
    });
  };

  const handleCreate = () => {
    setEditingNotification(null);
    setForm(emptyForm());
    setUserSearch('');
    setModalVisible(true);
  };

  const handleEdit = (notification: any) => {
    setEditingNotification(notification);
    setForm({
      title: notification.title ?? '',
      body: notification.body ?? '',
      target_type: notification.target_type === 'specific' ? 'specific' : 'all',
      target_user_ids: Array.isArray(notification.target_user_ids) ? notification.target_user_ids : [],
      deep_link: notification.deep_link ?? '',
      scheduled_at: notification.scheduled_at ? new Date(notification.scheduled_at) : new Date(),
      send_now: false,
    });
    setUserSearch('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return Alert.alert('Error', 'Title is required');
    if (!form.body.trim()) return Alert.alert('Error', 'Message is required');
    if (overBodyLimit) return Alert.alert('Error', `Message exceeds ${MAX_BODY_WORDS} words. Please shorten it.`);
    if (overTitleLimit) return Alert.alert('Error', `Title exceeds ${MAX_TITLE_WORDS} words. Please shorten it.`);
    if (form.target_type === 'specific' && form.target_user_ids.length === 0) {
      return Alert.alert('Error', 'Pick at least one user for a "Specific users" audience');
    }

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      target_type: form.target_type,
      target_user_ids: form.target_user_ids,
      deep_link: form.deep_link.trim() || null,
      scheduled_at: (form.send_now ? new Date() : form.scheduled_at).toISOString(),
    };

    setSaving(true);
    try {
      let id: string | undefined;
      if (editingNotification) {
        const updated = await updateMutation.mutateAsync({ id: editingNotification.id, updates: payload });
        id = updated.id;
      } else {
        const created = await createMutation.mutateAsync(payload);
        id = created.id;
      }

      if (form.send_now && id) {
        await sendNowMutation.mutateAsync(id);
        toast.success('Notification sent');
      } else {
        toast.success(form.send_now ? 'Notification sent' : 'Notification scheduled');
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save notification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (notification: any) => {
    Alert.alert('Delete Notification', `Delete "${notification.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(notification.id);
            toast.success('Notification deleted');
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleSendNow = (notification: any) => {
    Alert.alert('Send now?', `Send "${notification.title}" to everyone immediately?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          try {
            await sendNowMutation.mutateAsync(notification.id);
            toast.success('Notification sending…');
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleCancel = (notification: any) => {
    Alert.alert('Cancel notification?', `"${notification.title}" will not be sent.`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelMutation.mutateAsync(notification.id);
            toast.success('Notification cancelled');
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleRetry = (notification: any) => {
    Alert.alert('Retry failed notification?', `Re-queue "${notification.title}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Retry',
        onPress: async () => {
          try {
            await retryMutation.mutateAsync(notification.id);
            toast.success('Notification queued for retry');
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const statusColor = (status: AdminNotificationStatus) => {
    switch (status) {
      case 'sent': return colors.success;
      case 'sending': return colors.primary;
      case 'cancelled': return colors.mutedForeground;
      case 'failed': return colors.danger;
      default: return colors.warning;
    }
  };

  const formatDateTimeLocalValue = (date: Date) => {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d}T${h}:${mi}`;
  };

  const webDateInputStyle = {
    width: '100%',
    minHeight: 48,
    padding: '12px 14px',
    fontSize: 15,
    lineHeight: '20px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    color: colors.foreground,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      label: 'Notification',
      render: (n) => (
        <View style={styles.titleCell}>
          <View style={[styles.titleIcon, { backgroundColor: colors.primary }]}>
            <Feather name="bell" size={16} color="#fff" />
          </View>
          <View style={styles.titleTextWrap}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {n.title}
            </Text>
            <Text style={[styles.bodyPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
              {n.body}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: 'audience',
      label: 'Audience',
      width: 110,
      render: (n) => (
        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
          {n.target_type === 'all' ? 'All users' : `${n.target_user_ids?.length ?? 0} users`}
        </Text>
      ),
    },
    {
      key: 'scheduled_at',
      label: 'Scheduled',
      width: 150,
      render: (n) => (
        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
          {n.scheduled_at ? new Date(n.scheduled_at).toLocaleString() : '—'}
        </Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 110,
      render: (n) => (
        <View style={styles.statusWrap}>
          <View style={[styles.statusDot, { backgroundColor: statusColor(n.status) }]} />
          <Text style={[styles.statusText, { color: statusColor(n.status) }]}>{n.status}</Text>
        </View>
      ),
    },
    {
      key: 'sent_count',
      label: 'Sent',
      width: 70,
      render: (n) => (
        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
          {n.status === 'sent' ? `${n.sent_count}` : '—'}
        </Text>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 170,
      render: (n) => (
        <View style={styles.actions}>
          {n.status === 'scheduled' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => handleSendNow(n)}
            >
              <Feather name="send" size={13} color="#fff" />
            </TouchableOpacity>
          )}
          {(n.status === 'scheduled' || n.status === 'sending') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.warning }]}
              onPress={() => handleCancel(n)}
            >
              <Feather name="x-circle" size={13} color="#fff" />
            </TouchableOpacity>
          )}
          {n.status === 'failed' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleRetry(n)}
            >
              <Feather name="rotate-ccw" size={13} color="#fff" />
            </TouchableOpacity>
          )}
          {n.status === 'scheduled' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.accent }]}
              onPress={() => handleEdit(n)}
            >
              <Feather name="edit-2" size={13} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.danger }]}
            onPress={() => handleDelete(n)}
          >
            <Feather name="trash-2" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Notifications</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Schedule personalized push notifications — use {'{name}'} to greet each user
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.createBtnText}>New Notification</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <DataTable
          columns={columns}
          data={notifications}
          keyExtractor={(n) => n.id}
          emptyMessage="No notifications yet. Create your first one!"
        />
      </View>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingNotification ? 'Edit Notification' : 'New Notification'}
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
                placeholder="Hey {name}! We're live tonight 🍳"
                placeholderTextColor={colors.mutedForeground}
              />
              {overTitleLimit && (
                <Text style={[styles.warning, { color: colors.danger }]}>
                  Title exceeds {MAX_TITLE_WORDS} words
                </Text>
              )}

              <Text style={[styles.label, { color: colors.foreground }]}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={form.body}
                onChangeText={(text) => set({ body: text })}
                placeholder="Lets learn something fun tonight at my live..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.wordCountRow}>
                <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                  Use {'{name}'} to greet each user with their name
                </Text>
                <Text style={[styles.helper, { color: overBodyLimit ? colors.danger : colors.mutedForeground }]}>
                  {bodyWordCount}/{MAX_BODY_WORDS}
                </Text>
              </View>

              {/* Live personalization preview */}
              {(previewTitle || previewBody) ? (
                <View style={[styles.preview, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Preview</Text>
                  <Text style={[styles.previewTitle, { color: colors.foreground }]}>{previewTitle}</Text>
                  <Text style={[styles.previewBody, { color: colors.mutedForeground }]}>{previewBody}</Text>
                </View>
              ) : null}

              {/* Audience */}
              <Text style={[styles.label, { color: colors.foreground }]}>Audience *</Text>
              <View style={styles.segmentRow}>
                {(['all', 'specific'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.segment, {
                      backgroundColor: form.target_type === t ? colors.primary : colors.background,
                      borderColor: colors.border,
                    }]}
                    onPress={() => set({ target_type: t })}
                  >
                    <Text style={{ color: form.target_type === t ? '#fff' : colors.foreground, fontWeight: '600' }}>
                      {t === 'all' ? 'All users' : 'Specific users'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.target_type === 'specific' && (
                <View style={[styles.userPicker, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.userSearchRow}>
                    <Feather name="search" size={16} color={colors.mutedForeground} />
                    <TextInput
                      style={[styles.userSearchInput, { color: colors.foreground }]}
                      value={userSearch}
                      onChangeText={setUserSearch}
                      placeholder="Search users…"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <ScrollView style={styles.userList} nestedScrollEnabled>
                    {filteredUsers.length === 0 && (
                      <Text style={[styles.helper, { color: colors.mutedForeground, padding: 12 }]}>
                        No users match
                      </Text>
                    )}
                    {filteredUsers.map((u: any) => {
                      const selected = form.target_user_ids.includes(u.id);
                      return (
                        <TouchableOpacity
                          key={u.id}
                          style={styles.userRow}
                          onPress={() => toggleUser(u.id)}
                        >
                          <Feather
                            name={selected ? 'check-square' : 'square'}
                            size={18}
                            color={selected ? colors.primary : colors.mutedForeground}
                          />
                          <Text style={[styles.userName, { color: colors.foreground }]}>{u.username}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                    {form.target_user_ids.length} selected
                  </Text>
                </View>
              )}

              {/* Schedule */}
              <Text style={[styles.label, { color: colors.foreground }]}>Schedule</Text>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>Send now</Text>
                <Switch
                  value={form.send_now}
                  onValueChange={(v) => set({ send_now: v })}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>

              {!form.send_now && (
                Platform.OS === 'web' ? (
                  <input
                    type="datetime-local"
                    value={formatDateTimeLocalValue(form.scheduled_at)}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) set({ scheduled_at: d });
                    }}
                    min={formatDateTimeLocalValue(new Date())}
                    step={60}
                    style={webDateInputStyle}
                  />
                ) : (
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setDatePickerOpen(true)}
                  >
                    <Feather name="calendar" size={18} color={colors.primary} />
                    <Text style={[styles.dateButtonText, { color: colors.foreground }]}>
                      {form.scheduled_at.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                )
              )}

              {/* Deep link */}
              <Text style={[styles.label, { color: colors.foreground }]}>Deep link (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={form.deep_link}
                onChangeText={(text) => set({ deep_link: text })}
                placeholder="/episode/&lt;id&gt; or /episodes"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                Opens this screen when a user taps the notification.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker - Mobile Only */}
      {Platform.OS !== 'web' && datePickerOpen && (
        <DateTimePicker
          value={form.scheduled_at}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') setDatePickerOpen(false);
            if (selectedDate) set({ scheduled_at: selectedDate });
            if (event.type === 'dismissed' && Platform.OS === 'ios') setDatePickerOpen(false);
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2, maxWidth: 340 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: { color: '#fff', fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  // Row cells
  titleCell: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 220 },
  titleIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  titleTextWrap: { flex: 1 },
  title: { fontWeight: '600' },
  bodyPreview: { fontSize: 12, marginTop: 2 },
  metaText: { fontSize: 12 },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, textTransform: 'capitalize', fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 560, maxHeight: '90%', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalScroll: { flexGrow: 0 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 46,
  },
  textarea: { minHeight: 90 },
  wordCountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  helper: { fontSize: 12 },
  warning: { fontSize: 12, marginTop: 4 },
  preview: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12 },
  previewLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  previewTitle: { fontSize: 15, fontWeight: '700' },
  previewBody: { fontSize: 13, marginTop: 2 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  userPicker: { borderWidth: 1, borderRadius: 8, marginTop: 10 },
  userSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)' },
  userSearchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  userList: { maxHeight: 160 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  userName: { fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  switchLabel: { fontSize: 15 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 6,
  },
  dateButtonText: { fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  cancelBtnText: { fontWeight: '600' },
  saveBtn: { borderRadius: 8, paddingHorizontal: 22, paddingVertical: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
