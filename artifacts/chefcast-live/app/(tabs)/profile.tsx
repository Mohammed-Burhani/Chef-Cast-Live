/**
 * Profile screen — user stats, settings, subscription status, cook history.
 */

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getLevelForXP } from "@/constants/gamification";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/store/useAuthStore";
import { useGamificationStore } from "@/store/useGamificationStore";

interface SettingRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
  onPress?: () => void;
}

function SettingRow({ icon, label, value, hasToggle, toggleValue, onToggle, danger, onPress }: SettingRowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !hasToggle}
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? `${colors.danger}15` : `${colors.primary}15` }]}>
        <Feather name={icon} size={16} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: danger ? colors.danger : colors.foreground }]}>{label}</Text>
      {value && <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text>}
      {hasToggle && (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={toggleValue ? "#fff" : colors.mutedForeground}
        />
      )}
      {!hasToggle && onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { xpTotal, currentStreak, longestStreak, badges } = useGamificationStore();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const currentLevel = getLevelForXP(xpTotal);
  const unlockedBadges = badges.filter((b) => b.isUnlocked).length;

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
      router.replace("/(auth)/welcome");
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/(auth)/welcome");
          },
        },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={[styles.profileHeader, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarInitial}>
              {user?.displayName?.charAt(0)?.toUpperCase() ?? "C"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {user?.displayName ?? "Chef"}
            </Text>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>
              @{user?.username ?? "user"}
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.levelText}>{currentLevel.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.muted }]}>
            <Feather name="edit-2" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Stats grid */}
        <View style={[styles.statsGrid, { backgroundColor: colors.surface }]}>
          {[
            { label: "Total XP", value: xpTotal.toLocaleString(), icon: "star" as const, color: colors.accent },
            { label: "Badges", value: `${unlockedBadges}/10`, icon: "award" as const, color: colors.primary },
            { label: "Best Streak", value: `${longestStreak}d`, icon: "zap" as const, color: colors.warning },
            { label: "Sessions", value: "12", icon: "coffee" as const, color: colors.success },
          ].map((stat, idx) => (
            <View key={idx} style={styles.statItem}>
              <Feather name={stat.icon} size={18} color={stat.color} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Subscription card */}
        {user?.subscriptionTier === "free" && (
          <TouchableOpacity
            style={[styles.subscriptionCard, { backgroundColor: colors.surface, borderColor: colors.accent }]}
            activeOpacity={0.85}
          >
            <View style={styles.subCardContent}>
              <View style={styles.subCardHeader}>
                <Feather name="zap" size={20} color={colors.accent} />
                <Text style={[styles.subCardTitle, { color: colors.foreground }]}>
                  Upgrade to Premium
                </Text>
              </View>
              <Text style={[styles.subCardDesc, { color: colors.mutedForeground }]}>
                HD cook-along, early recipe access, streak freeze, and more
              </Text>
            </View>
            <View style={[styles.subCardBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.subCardBadgeText}>$4.99/mo</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Settings */}
        <View style={[styles.settingsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.settingsSectionTitle, { color: colors.mutedForeground }]}>PREFERENCES</Text>
          <SettingRow
            icon="bell"
            label="Notifications"
            hasToggle
            toggleValue={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
          <SettingRow
            icon="mic"
            label="Voice Commands"
            hasToggle
            toggleValue={voiceEnabled}
            onToggle={setVoiceEnabled}
          />
          <SettingRow
            icon="moon"
            label="Dark Mode"
            hasToggle
            toggleValue={darkMode}
            onToggle={setDarkMode}
          />
          <SettingRow
            icon="sliders"
            label="Units"
            value="Metric"
            onPress={() => {}}
          />
        </View>

        <View style={[styles.settingsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.settingsSectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
          <SettingRow icon="shield" label="Privacy" onPress={() => {}} />
          <SettingRow icon="help-circle" label="Help & Support" onPress={() => {}} />
          <SettingRow icon="info" label="About ChefCast" value="v1.0.0" onPress={() => {}} />
          <SettingRow icon="log-out" label="Sign Out" danger onPress={handleLogout} />
        </View>

        {/* Cook history preview */}
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: colors.foreground }]}>Cook History</Text>
          {[
            { title: "Italian Risotto Night", date: "Today", steps: "8/8", score: 4200 },
            { title: "Pan-Seared Duck Breast", date: "Yesterday", steps: "7/8", score: 3800 },
            { title: "Classic French Onion Soup", date: "3 days ago", steps: "6/6", score: 3200 },
          ].map((session, idx) => (
            <View key={idx} style={[styles.historyRow, { backgroundColor: colors.surface }]}>
              <View style={[styles.historyIcon, { backgroundColor: `${colors.primary}22` }]}>
                <Feather name="coffee" size={16} color={colors.primary} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={[styles.historyEpisode, { color: colors.foreground }]}>{session.title}</Text>
                <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>
                  {session.date} · {session.steps} steps
                </Text>
              </View>
              <Text style={[styles.historyScore, { color: colors.accent }]}>
                {session.score.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 28, fontWeight: "800", color: "#fff" },
  profileInfo: { flex: 1, gap: 4 },
  displayName: { fontSize: 20, fontWeight: "800" },
  username: { fontSize: 13 },
  levelBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 2 },
  levelText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  editBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statsGrid: { flexDirection: "row", borderRadius: 20, padding: 16 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 10, textAlign: "center" },
  subscriptionCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 18, borderWidth: 1.5, gap: 12 },
  subCardContent: { flex: 1, gap: 4 },
  subCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  subCardTitle: { fontSize: 15, fontWeight: "700" },
  subCardDesc: { fontSize: 12, lineHeight: 17 },
  subCardBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  subCardBadgeText: { color: "#0D0D0D", fontSize: 12, fontWeight: "800" },
  settingsSection: { borderRadius: 18, overflow: "hidden" },
  settingsSectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1, padding: 14, paddingBottom: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  settingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontSize: 15 },
  settingValue: { fontSize: 13 },
  historySection: { gap: 12 },
  historyTitle: { fontSize: 18, fontWeight: "700" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14 },
  historyIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  historyInfo: { flex: 1, gap: 2 },
  historyEpisode: { fontSize: 14, fontWeight: "600" },
  historyMeta: { fontSize: 12 },
  historyScore: { fontSize: 15, fontWeight: "700" },
});
