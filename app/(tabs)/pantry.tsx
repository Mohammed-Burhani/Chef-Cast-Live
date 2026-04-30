/**
 * Virtual Pantry & Gamification screen.
 * Sections: Badge Collection, XP & Level System, Streak Tracker, Virtual Pantry.
 */

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BadgeCard } from "@/components/gamification/BadgeCard";
import { StreakFlame } from "@/components/gamification/StreakFlame";
import { XPProgressRing } from "@/components/gamification/XPProgressRing";
import { getLevelForXP, getNextLevel } from "@/constants/gamification";
import { useColors } from "@/hooks/useColors";
import { useGamificationStore } from "@/store/useGamificationStore";
import { Badge } from "@/types";

function BadgeDetailModal({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const colors = useColors();
  const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
    scissors: "scissors", droplet: "droplet", zap: "zap", flame: "zap",
    calendar: "calendar", award: "award", star: "star", heart: "heart",
    "bar-chart-2": "bar-chart-2", "chef-hat": "coffee", camera: "camera", sunrise: "sunrise",
  };

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <View style={[styles.modalIcon, { backgroundColor: badge.isUnlocked ? `${colors.primary}22` : colors.muted }]}>
            <Feather name={ICON_MAP[badge.iconName] ?? "award"} size={36} color={badge.isUnlocked ? colors.primary : colors.mutedForeground} />
          </View>
          <Text style={[styles.modalBadgeName, { color: colors.foreground }]}>{badge.name}</Text>
          <Text style={[styles.modalBadgeDesc, { color: colors.mutedForeground }]}>{badge.description}</Text>

          {badge.isUnlocked ? (
            <View style={[styles.unlockedInfo, { backgroundColor: `${colors.success}15` }]}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.unlockedText, { color: colors.success }]}>
                Earned on {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : "Unknown"}
              </Text>
            </View>
          ) : (
            <View style={[styles.progressSection, { backgroundColor: colors.muted }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: colors.mutedForeground }]}>Progress</Text>
                <Text style={[styles.progressValue, { color: colors.foreground }]}>
                  {badge.progress ?? 0}/{badge.maxProgress ?? 1}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, {
                  width: `${((badge.progress ?? 0) / (badge.maxProgress ?? 1)) * 100}%`,
                  backgroundColor: colors.primary
                }]} />
              </View>
            </View>
          )}

          <View style={[styles.xpReward, { backgroundColor: `${colors.accent}15` }]}>
            <Feather name="star" size={14} color={colors.accent} />
            <Text style={[styles.xpRewardText, { color: colors.accent }]}>
              +{badge.xpReward} XP reward
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function PantryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const { xpTotal, currentStreak, longestStreak, badges, xpLog } = useGamificationStore();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [activeSection, setActiveSection] = useState<"badges" | "xp" | "streak">("badges");

  const currentLevel = getLevelForXP(xpTotal);
  const nextLevel = getNextLevel(xpTotal);
  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  const SECTIONS = [
    { id: "badges" as const, label: "Badges", count: `${unlockedCount}/${badges.length}` },
    { id: "xp" as const, label: "Level", count: currentLevel.name },
    { id: "streak" as const, label: "Streak", count: `${currentStreak}d` },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Pantry</Text>

        {/* Section selector */}
        <View style={[styles.sectionSelector, { backgroundColor: colors.surface }]}>
          {SECTIONS.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setActiveSection(s.id)}
              style={[styles.sectionTab, activeSection === s.id && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.sectionTabLabel, { color: activeSection === s.id ? "#fff" : colors.mutedForeground }]}>
                {s.label}
              </Text>
              <Text style={[styles.sectionTabCount, { color: activeSection === s.id ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                {s.count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* BADGES SECTION */}
        {activeSection === "badges" && (
          <View style={styles.badgesSection}>
            <View style={styles.badgesGrid}>
              {badges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  onPress={(b) => setSelectedBadge(b)}
                />
              ))}
            </View>
          </View>
        )}

        {/* XP / LEVEL SECTION */}
        {activeSection === "xp" && (
          <View style={styles.xpSection}>
            <View style={[styles.xpCard, { backgroundColor: colors.surface }]}>
              <XPProgressRing xp={xpTotal} size={160} />
              <View style={styles.levelInfo}>
                <Text style={[styles.levelName, { color: colors.foreground }]}>{currentLevel.name}</Text>
                {nextLevel && (
                  <Text style={[styles.nextLevelText, { color: colors.mutedForeground }]}>
                    {nextLevel.minXP - xpTotal} XP until {nextLevel.name}
                  </Text>
                )}
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Recent XP Events</Text>
            <View style={styles.xpLogList}>
              {xpLog.map((entry) => (
                <View key={entry.id} style={[styles.xpLogRow, { backgroundColor: colors.surface }]}>
                  <View style={[styles.xpLogDot, { backgroundColor: `${colors.accent}22` }]}>
                    <Feather name="star" size={12} color={colors.accent} />
                  </View>
                  <Text style={[styles.xpLogLabel, { color: colors.foreground }]} numberOfLines={1}>
                    {entry.label}
                  </Text>
                  <Text style={[styles.xpLogAmount, { color: colors.accent }]}>+{entry.amount}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* STREAK SECTION */}
        {activeSection === "streak" && (
          <View style={styles.streakSection}>
            <View style={[styles.streakCard, { backgroundColor: colors.surface }]}>
              <StreakFlame streak={currentStreak} size="lg" />
              <View style={styles.streakStats}>
                <View style={styles.streakStat}>
                  <Text style={[styles.streakStatValue, { color: colors.foreground }]}>{currentStreak}</Text>
                  <Text style={[styles.streakStatLabel, { color: colors.mutedForeground }]}>Current Streak</Text>
                </View>
                <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
                <View style={styles.streakStat}>
                  <Text style={[styles.streakStatValue, { color: colors.foreground }]}>{longestStreak}</Text>
                  <Text style={[styles.streakStatLabel, { color: colors.mutedForeground }]}>Best Streak</Text>
                </View>
              </View>
            </View>

            <View style={[styles.streakTip, { backgroundColor: `${colors.warning}15`, borderColor: colors.warning }]}>
              <Feather name="alert-circle" size={16} color={colors.warning} />
              <Text style={[styles.streakTipText, { color: colors.foreground }]}>
                Cook tonight to keep your {currentStreak}-day streak alive!
              </Text>
            </View>

            <View style={[styles.freezeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="shield" size={20} color={colors.mutedForeground} />
              <View style={styles.freezeInfo}>
                <Text style={[styles.freezeTitle, { color: colors.foreground }]}>Streak Freeze</Text>
                <Text style={[styles.freezeDesc, { color: colors.mutedForeground }]}>
                  Premium members get 2 streak freezes per month
                </Text>
              </View>
              <View style={[styles.premiumBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/scanner" as never)}
              style={[styles.scanButton, { backgroundColor: colors.primary }]}
            >
              <Feather name="camera" size={18} color="#fff" />
              <Text style={styles.scanButtonText}>Scan My Fridge</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {selectedBadge && (
        <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  screenTitle: { fontSize: 26, fontWeight: "800" },
  sectionSelector: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4 },
  sectionTab: { flex: 1, alignItems: "center", paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10, gap: 2 },
  sectionTabLabel: { fontSize: 13, fontWeight: "700" },
  sectionTabCount: { fontSize: 11, fontWeight: "500" },
  badgesSection: {},
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  xpSection: { gap: 16 },
  xpCard: { borderRadius: 20, padding: 24, alignItems: "center", gap: 16 },
  levelInfo: { alignItems: "center", gap: 4 },
  levelName: { fontSize: 20, fontWeight: "700" },
  nextLevelText: { fontSize: 13 },
  sectionLabel: { fontSize: 16, fontWeight: "700" },
  xpLogList: { gap: 8 },
  xpLogRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12 },
  xpLogDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  xpLogLabel: { flex: 1, fontSize: 13 },
  xpLogAmount: { fontSize: 14, fontWeight: "700" },
  streakSection: { gap: 14 },
  streakCard: { borderRadius: 20, padding: 24, alignItems: "center", gap: 20 },
  streakStats: { flexDirection: "row", alignItems: "center", gap: 16 },
  streakStat: { alignItems: "center", gap: 4, flex: 1 },
  streakStatValue: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  streakStatLabel: { fontSize: 12 },
  streakDivider: { width: 1, height: 50 },
  streakTip: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  streakTipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  freezeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  freezeInfo: { flex: 1, gap: 2 },
  freezeTitle: { fontSize: 14, fontWeight: "600" },
  freezeDesc: { fontSize: 12, lineHeight: 17 },
  premiumBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  premiumBadgeText: { color: "#0D0D0D", fontSize: 10, fontWeight: "800" },
  scanButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  scanButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, alignItems: "center", gap: 14 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 8 },
  modalIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  modalBadgeName: { fontSize: 22, fontWeight: "800" },
  modalBadgeDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  unlockedInfo: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  unlockedText: { fontSize: 13, fontWeight: "600" },
  progressSection: { width: "100%", padding: 14, borderRadius: 14, gap: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressTitle: { fontSize: 13 },
  progressValue: { fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  xpReward: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  xpRewardText: { fontSize: 14, fontWeight: "700" },
});
