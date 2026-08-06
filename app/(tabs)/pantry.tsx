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
import { useAuthStore } from "@/store/useAuthStore";
import { useGamificationStore } from "@/store/useGamificationStore";
import { useEventHistory, useQuizHistory, useUserStats } from "@/lib/api/scoring";
import { Badge } from "@/types";

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

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

  const { currentStreak, longestStreak, badges } = useGamificationStore();
  const { user } = useAuthStore();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [activeSection, setActiveSection] = useState<"badges" | "xp" | "streak">("badges");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Real scoring data (replaces the dummy AsyncStorage values)
  const { data: stats } = useUserStats(user?.id);
  const { data: events, isLoading: eventsLoading } = useEventHistory(user?.id);
  const quizHistory = useQuizHistory(user?.id, expandedEventId);

  const xp = stats?.xp ?? 0;
  const currentLevel = getLevelForXP(xp);
  const nextLevel = getNextLevel(xp);
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
        contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: bottomPadding + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with neon red accent */}
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Pantry</Text>
          <View style={[styles.neonAccent, { backgroundColor: `${colors.neonRed}20`, borderColor: colors.neonRed }]}>
            <Feather name="zap" size={14} color={colors.neonRed} />
          </View>
        </View>

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

        {/* LEVEL SECTION — real scoring + event history */}
        {activeSection === "xp" && (
          <View style={styles.xpSection}>
            {/* Overall total experience/score */}
            <View style={[styles.xpCard, { backgroundColor: colors.surface }]}>
              <XPProgressRing xp={xp} size={160} />
              <View style={styles.levelInfo}>
                <Text style={[styles.levelName, { color: colors.foreground }]}>{currentLevel.name}</Text>
                {nextLevel ? (
                  <Text style={[styles.nextLevelText, { color: colors.mutedForeground }]}>
                    {nextLevel.minXP - xp} XP until {nextLevel.name}
                  </Text>
                ) : (
                  <Text style={[styles.nextLevelText, { color: colors.mutedForeground }]}>
                    Max level reached 🎉
                  </Text>
                )}
              </View>
            </View>

            {/* Stat chips */}
            <View style={styles.statRow}>
              <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statChipValue, { color: colors.foreground }]}>
                  {stats?.eventCount ?? 0}
                </Text>
                <Text style={[styles.statChipLabel, { color: colors.mutedForeground }]}>Events</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statChipValue, { color: colors.accent }]}>
                  {(stats?.lifetimePoints ?? 0).toLocaleString()}
                </Text>
                <Text style={[styles.statChipLabel, { color: colors.mutedForeground }]}>Points</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statChipValue, { color: colors.neonRed }]}>
                  {stats?.bestRank ? `#${stats.bestRank}` : "—"}
                </Text>
                <Text style={[styles.statChipLabel, { color: colors.mutedForeground }]}>Best Rank</Text>
              </View>
            </View>

            {/* Past live events participated in */}
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Past Live Events</Text>
            {eventsLoading && (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading events…</Text>
            )}
            {!eventsLoading && (events ?? []).length === 0 && (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                You haven't participated in any live events yet. Join the next live quiz to start earning points!
              </Text>
            )}
            <View style={styles.eventList}>
              {(events ?? []).map((event) => {
                const expanded = expandedEventId === event.episodeId;
                return (
                  <View key={event.episodeId} style={styles.eventItem}>
                    <TouchableOpacity
                      style={[styles.eventRow, { backgroundColor: colors.surface }]}
                      onPress={() => setExpandedEventId(expanded ? null : event.episodeId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.eventInfo}>
                        <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {event.title}
                        </Text>
                        <Text style={[styles.eventMeta, { color: colors.mutedForeground }]}>
                          {event.endedAt ? formatEventDate(event.endedAt) : ""} · {event.correctCount} correct
                        </Text>
                      </View>
                      <View style={styles.eventRight}>
                        <Text style={[styles.eventScore, { color: colors.accent }]}>
                          +{event.totalScore.toLocaleString()} pts
                        </Text>
                        {event.rank != null && (
                          <Text style={[styles.eventRank, { color: colors.mutedForeground }]}>
                            Rank #{event.rank}
                          </Text>
                        )}
                        <Feather
                          name={expanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color={colors.mutedForeground}
                        />
                      </View>
                    </TouchableOpacity>

                    {expanded && (
                      <View style={[styles.quizList, { backgroundColor: colors.surface }]}>
                        {quizHistory.isLoading && (
                          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                            Loading questions…
                          </Text>
                        )}
                        {(quizHistory.data ?? []).map((q, idx) => (
                          <View key={q.questionId} style={styles.quizRow}>
                            <Text style={[styles.quizIndex, { color: colors.mutedForeground }]}>
                              Q{idx + 1}
                            </Text>
                            <View style={styles.quizInfo}>
                              <Text style={[styles.quizText, { color: colors.foreground }]} numberOfLines={2}>
                                {q.questionText}
                              </Text>
                              <Text style={[styles.quizMeta, { color: colors.mutedForeground }]}>
                                {q.isCorrect
                                  ? `Correct${q.rank != null ? ` · Rank #${q.rank}` : ""}`
                                  : "Wrong"}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.quizPoints,
                                { color: q.isCorrect ? colors.success : colors.mutedForeground },
                              ]}
                            >
                              {q.isCorrect ? `+${q.points}` : "0"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
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

            <View style={[styles.streakTip, { backgroundColor: `${colors.neonRed}10`, borderColor: colors.neonRed }]}>
              <Feather name="alert-circle" size={16} color={colors.neonRed} />
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
  content: { paddingHorizontal: 20, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  screenTitle: { fontSize: 24, fontWeight: "800" },
  neonAccent: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  sectionSelector: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 3 },
  sectionTab: { flex: 1, alignItems: "center", paddingVertical: 8, paddingHorizontal: 4, borderRadius: 9, gap: 2 },
  sectionTabLabel: { fontSize: 12, fontWeight: "700" },
  sectionTabCount: { fontSize: 10, fontWeight: "500" },
  badgesSection: {},
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  xpSection: { gap: 14 },
  xpCard: { borderRadius: 18, padding: 20, alignItems: "center", gap: 14 },
  levelInfo: { alignItems: "center", gap: 3 },
  levelName: { fontSize: 18, fontWeight: "700" },
  nextLevelText: { fontSize: 12 },
  sectionLabel: { fontSize: 15, fontWeight: "700" },
  emptyText: { fontSize: 13, lineHeight: 19, paddingVertical: 6 },
  statRow: { flexDirection: "row", gap: 10 },
  statChip: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 3 },
  statChipValue: { fontSize: 18, fontWeight: "800" },
  statChipLabel: { fontSize: 11 },
  eventList: { gap: 10 },
  eventItem: { gap: 6 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14 },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: { fontSize: 14, fontWeight: "700" },
  eventMeta: { fontSize: 11 },
  eventRight: { alignItems: "flex-end", gap: 2 },
  eventScore: { fontSize: 14, fontWeight: "800" },
  eventRank: { fontSize: 11 },
  quizList: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, gap: 4 },
  quizRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  quizIndex: { fontSize: 11, fontWeight: "700", width: 26 },
  quizInfo: { flex: 1, gap: 2 },
  quizText: { fontSize: 13 },
  quizMeta: { fontSize: 11 },
  quizPoints: { fontSize: 13, fontWeight: "700" },
  streakSection: { gap: 12 },
  streakCard: { borderRadius: 18, padding: 20, alignItems: "center", gap: 16 },
  streakStats: { flexDirection: "row", alignItems: "center", gap: 14 },
  streakStat: { alignItems: "center", gap: 3, flex: 1 },
  streakStatValue: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  streakStatLabel: { fontSize: 11 },
  streakDivider: { width: 1, height: 45 },
  streakTip: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderRadius: 12, borderWidth: 1 },
  streakTipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  freezeCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  freezeInfo: { flex: 1, gap: 2 },
  freezeTitle: { fontSize: 13, fontWeight: "600" },
  freezeDesc: { fontSize: 11, lineHeight: 16 },
  premiumBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  premiumBadgeText: { color: "#0D0D0D", fontSize: 9, fontWeight: "800" },
  scanButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 12 },
  scanButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
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
