/**
 * Admin Settings — app configuration with real persistence.
 *
 * Every control here is functional:
 *   - Account   : username + email-notifications (saved to `profiles`)
 *   - General   : app display name + support email (saved to `app_settings`)
 *   - Episodes  : toggles that gate the server-side pg_cron / trigger behavior
 *   - Community : toggles that gate dish-photo posting and comments in the app
 *   - Data      : export a JSON snapshot + clear the local cache
 *   - System    : live version / DB / counts / pg_cron scheduler status
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/useAuthStore';
import { useCurrentProfile, useUpdateProfile } from '@/lib/api/profiles';
import {
  useAppSettings,
  useCronStatus,
  useSystemSnapshot,
  useUpdateAppSetting,
} from '@/lib/api/admin-hooks';
import { downloadJsonFile, exportAdminData, AppSettings } from '@/lib/api/settings';
import { toast } from '@/utils/toast';

export default function AdminSettings() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // ── Settings (persisted app_settings) ────────────────────────────────────
  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsError,
    refetch: refetchSettings,
  } = useAppSettings();
  const updateSetting = useUpdateAppSetting();
  const { data: cronJobs = [], refetch: refetchCron } = useCronStatus();
  const { data: system, refetch: refetchSystem } = useSystemSnapshot();

  // ── Profile (admin's own row) ─────────────────────────────────────────────
  const { data: profile } = useCurrentProfile();
  const updateProfile = useUpdateProfile();

  // Local mirrors for instant UI feedback.
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [username, setUsername] = useState('');
  const [emailNotifs, setEmailNotifs] = useState(false);
  const hydrated = useRef(false);

  // Sync the toggle state whenever the server settings arrive / change.
  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  // Hydrate the text forms once (so the user can edit them freely).
  useEffect(() => {
    if (!settings || hydrated.current) return;
    hydrated.current = true;
    setDisplayName(settings.app_display_name);
    setSupportEmail(settings.support_email);
    setUsername(user?.username ?? '');
  }, [settings, user]);

  useEffect(() => {
    if (profile) setEmailNotifs(profile.email_notifications_enabled);
  }, [profile]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleSetting = (key: keyof AppSettings, next: boolean) => {
    setLocalSettings((s) => (s ? { ...s, [key]: next } : s));
    updateSetting.mutate(
      { key, value: next },
      {
        onError: () => {
          setLocalSettings((s) => (s ? { ...s, [key]: !next } : s));
          Alert.alert('Error', 'Failed to save setting. Check your connection.');
        },
      },
    );
  };

  const saveGeneral = () => {
    const name = displayName.trim();
    const email = supportEmail.trim();
    if (!name) {
      Alert.alert('Error', 'App display name cannot be empty');
      return;
    }
    if (name !== settings?.app_display_name) updateSetting.mutate({ key: 'app_display_name', value: name });
    if (email !== settings?.support_email) updateSetting.mutate({ key: 'support_email', value: email });
    toast.success('Settings saved');
  };

  const saveUsername = async () => {
    const next = username.trim();
    if (!next) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
    if (next === user?.username) return;
    try {
      await useAuthStore.getState().updateUser({ username: next });
      toast.success('Profile updated');
    } catch {
      Alert.alert('Error', 'Failed to update username');
    }
  };

  const toggleEmailNotifs = (next: boolean) => {
    setEmailNotifs(next);
    updateProfile.mutate(
      { email_notifications_enabled: next },
      {
        onError: () => {
          setEmailNotifs(!next);
          Alert.alert('Error', 'Failed to update email notifications');
        },
      },
    );
  };

  // ── Data actions ──────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await exportAdminData();
      const downloaded = downloadJsonFile(`foodilicious-export-${new Date().toISOString().slice(0, 10)}.json`, json);
      if (downloaded) {
        toast.success('Export downloaded');
      } else {
        setExportJson(json);
        setExportModalVisible(true);
      }
    } catch {
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert('Clear cache?', 'This clears cached data and reloads the app.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            queryClient.clear();
            await AsyncStorage.multiRemove([
              '@foodilicious:gamification',
              '@foodilicious:quizResults',
              '@foodilicious:announcements-seen-at',
            ]);
            if (Platform.OS === 'web') {
              window.location.reload();
            } else {
              toast.success('Cache cleared');
            }
          } catch {
            Alert.alert('Error', 'Failed to clear cache');
          }
        },
      },
    ]);
  };

  const refreshAll = () => {
    refetchSettings();
    refetchSystem();
    refetchCron();
  };

  const projectRef =
    (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace('https://', '').split('.')[0] || '—';

  // ── Loading / error ───────────────────────────────────────────────────────
  if (settingsLoading && !settings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <LoadingSpinner fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Configure the app, notifications, and community behavior
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={refreshAll}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={18} color={colors.primary} />
          <Text style={[styles.refreshLabel, { color: colors.primary }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {settingsError && !settings && (
        <View style={[styles.errorBanner, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
          <Feather name="alert-circle" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            Couldn't load settings. Check your connection and refresh.
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshAll} tintColor={colors.primary} />
        }
      >
        {/* ── ACCOUNT ─────────────────────────────────────────────────────── */}
        <SectionCard title="Account" icon="user" colors={colors}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{(user?.username ?? 'A')[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.foreground }]} numberOfLines={1}>
                {user?.username}
              </Text>
              <Text style={[styles.profileMeta, { color: colors.mutedForeground }]}>
                {user?.role === 'admin' ? 'Administrator' : 'User'}
                {user?.createdAt ? ` · Joined ${new Date(user.createdAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Username</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Your username"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
              />
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={saveUsername}>
                <Text style={styles.smallBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ToggleRow
            colors={colors}
            icon="mail"
            label="Email me when an episode goes live"
            description="Sends the live-goes-out email to this account"
            value={emailNotifs}
            onValueChange={toggleEmailNotifs}
          />
        </SectionCard>

        {/* ── GENERAL ────────────────────────────────────────────────────── */}
        <SectionCard title="General" icon="settings" colors={colors}>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>App display name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Foodilicious Live"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
              Shown in the admin sidebar. Try "Hey {`{name}`}"-style personalization.
            </Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Support email</Text>
            <TextInput
              value={supportEmail}
              onChangeText={setSupportEmail}
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="support@yourbrand.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={saveGeneral}>
            <Text style={styles.primaryBtnText}>Save general settings</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── EPISODES & NOTIFICATIONS ───────────────────────────────────── */}
        <SectionCard title="Episodes & Notifications" icon="radio" colors={colors}>
          <ToggleRow
            colors={colors}
            icon="calendar"
            label="Auto-publish episodes"
            description="Automatically go live at the scheduled time (server-side cron)"
            value={localSettings?.auto_publish_episodes ?? true}
            onValueChange={(v) => toggleSetting('auto_publish_episodes', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            colors={colors}
            icon="bell"
            label="Notify on episode live"
            description="Send push + email to everyone when an episode goes live"
            value={localSettings?.notify_on_episode_live ?? true}
            onValueChange={(v) => toggleSetting('notify_on_episode_live', v)}
          />
        </SectionCard>

        {/* ── COMMUNITY ──────────────────────────────────────────────────── */}
        <SectionCard title="Community" icon="users" colors={colors}>
          <ToggleRow
            colors={colors}
            icon="camera"
            label="Allow dish photos"
            description="Let users post their dishes to the community feed"
            value={localSettings?.allow_dish_photos ?? true}
            onValueChange={(v) => toggleSetting('allow_dish_photos', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            colors={colors}
            icon="message-circle"
            label="Allow comments"
            description="Let users comment on community posts"
            value={localSettings?.allow_comments ?? true}
            onValueChange={(v) => toggleSetting('allow_comments', v)}
          />
        </SectionCard>

        {/* ── DATA ───────────────────────────────────────────────────────── */}
        <SectionCard title="Data" icon="database" colors={colors}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.7}
          >
            <Feather name="download" size={18} color={colors.primary} />
            <View style={styles.actionBtnTextWrap}>
              <Text style={[styles.actionBtnTitle, { color: colors.foreground }]}>
                {exporting ? 'Exporting…' : 'Export data'}
              </Text>
              <Text style={[styles.actionBtnDesc, { color: colors.mutedForeground }]}>
                Download users, episodes, recipes, and notifications as JSON
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleClearCache}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={18} color={colors.danger} />
            <View style={styles.actionBtnTextWrap}>
              <Text style={[styles.actionBtnTitle, { color: colors.foreground }]}>Clear cache</Text>
              <Text style={[styles.actionBtnDesc, { color: colors.mutedForeground }]}>
                Reset local cached data and reload the app
              </Text>
            </View>
          </TouchableOpacity>
        </SectionCard>

        {/* ── SYSTEM ─────────────────────────────────────────────────────── */}
        <SectionCard
          title="System"
          icon="info"
          colors={colors}
          action={
            <TouchableOpacity onPress={refreshAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="rotate-ccw" size={16} color={colors.primary} />
            </TouchableOpacity>
          }
        >
          <InfoRow colors={colors} label="App version" value={Constants.expoConfig?.version ?? '1.0.0'} />
          <InfoRow colors={colors} label="Platform" value={Platform.OS} />
          <InfoRow colors={colors} label="Supabase project" value={projectRef} />
          <InfoRow
            colors={colors}
            label="Database"
            value={system ? (system.dbConnected ? 'Connected' : `Error: ${system.dbError ?? 'unavailable'}`) : 'Checking…'}
            color={system?.dbConnected ? colors.success : colors.danger}
          />

          {system && (
            <View style={styles.countGrid}>
              <CountBox colors={colors} label="Users" value={system.counts.users} />
              <CountBox colors={colors} label="Episodes" value={system.counts.episodes} />
              <CountBox colors={colors} label="Recipes" value={system.counts.recipes} />
              <CountBox colors={colors} label="Push tokens" value={system.counts.pushTokens} />
            </View>
          )}

          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Scheduler (pg_cron)</Text>
          {cronJobs.length === 0 ? (
            <Text style={[styles.cronEmpty, { color: colors.mutedForeground }]}>
              No cron jobs found — migration may not be applied yet.
            </Text>
          ) : (
            cronJobs.map((job) => (
              <View key={job.jobname} style={styles.cronRow}>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                <View style={styles.cronInfo}>
                  <Text style={[styles.cronName, { color: colors.foreground }]}>{job.jobname}</Text>
                  <Text style={[styles.cronSchedule, { color: colors.mutedForeground }]}>
                    {job.schedule} · {job.command}
                  </Text>
                </View>
              </View>
            ))
          )}
        </SectionCard>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Foodilicious Admin · Settings
        </Text>
      </ScrollView>

      {/* Native export fallback: show the JSON in a scrollable modal */}
      <Modal visible={exportModalVisible} animationType="slide" transparent>
        <View style={styles.exportOverlay}>
          <View style={[styles.exportModal, { backgroundColor: colors.surface }]}>
            <View style={styles.exportHeader}>
              <Text style={[styles.exportTitle, { color: colors.foreground }]}>Exported data</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.exportBody}>
              <Text style={[styles.exportText, { color: colors.foreground }]}>{exportJson}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// Small building blocks
// ============================================================================

type Colors = ReturnType<typeof useColors>;

function SectionCard({
  title,
  icon,
  colors,
  action,
  children,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  colors: Colors;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.cardIcon, { backgroundColor: `${colors.primary}22` }]}>
            <Feather name={icon} size={14} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

function ToggleRow({
  colors,
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  colors: Colors;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIconWrap}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.toggleInfo}>
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
        {description ? (
          <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

function InfoRow({
  colors,
  label,
  value,
  color,
}: {
  colors: Colors;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: color ?? colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function CountBox({ colors, label, value }: { colors: Colors; label: string; value: number }) {
  return (
    <View style={[styles.countBox, { backgroundColor: colors.background }]}>
      <Text style={[styles.countValue, { color: colors.foreground }]}>{value.toLocaleString()}</Text>
      <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
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
  headerLeft: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2, maxWidth: 340 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshLabel: { fontSize: 13, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  errorText: { fontSize: 13, flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 12, gap: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileMeta: { fontSize: 12, marginTop: 2 },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fieldHint: { fontSize: 11, marginTop: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  smallBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  smallBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  primaryBtn: {
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 2,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  toggleIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleInfo: { flex: 1, minWidth: 0 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  divider: { height: 1, backgroundColor: 'rgba(128,128,128,0.15)', marginVertical: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  actionBtnTextWrap: { flex: 1 },
  actionBtnTitle: { fontSize: 14, fontWeight: '600' },
  actionBtnDesc: { fontSize: 12, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%' },
  countGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  countBox: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  countValue: { fontSize: 20, fontWeight: '800' },
  countLabel: { fontSize: 11, marginTop: 2 },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 4,
  },
  cronEmpty: { fontSize: 12, paddingVertical: 8 },
  cronRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cronInfo: { flex: 1, minWidth: 0 },
  cronName: { fontSize: 13, fontWeight: '600' },
  cronSchedule: { fontSize: 11, marginTop: 1 },
  footer: { textAlign: 'center', fontSize: 11, paddingVertical: 8 },
  exportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  exportModal: { borderRadius: 16, padding: 16, maxHeight: '80%' },
  exportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  exportTitle: { fontSize: 16, fontWeight: '700' },
  exportBody: { flexGrow: 0 },
  exportText: { fontSize: 11, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
});
