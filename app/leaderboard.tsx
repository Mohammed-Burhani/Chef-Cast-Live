/**
 * Leaderboard screen — global episode and all-time rankings.
 * Top 3 get medal icons. Current user is highlighted at the bottom.
 */

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeaderboardRow } from "@/components/gamification/LeaderboardRow";
import { MOCK_LEADERBOARD } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";
import { useGamificationStore } from "@/store/useGamificationStore";
import { LeaderboardEntry } from "@/types";

type TimeFilter = "episode" | "alltime";
type ScopeFilter = "global" | "friends";

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const { xpTotal, currentStreak } = useGamificationStore();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("episode");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("global");

  const meEntry = MOCK_LEADERBOARD.find((e) => e.isCurrentUser);

  const topThree = MOCK_LEADERBOARD.slice(0, 3);
  const restEntries = MOCK_LEADERBOARD.slice(3);
  const myRank = meEntry?.rank ?? 7;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Leaderboard</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Time filters */}
      <View style={[styles.filterRow, { paddingHorizontal: 20 }]}>
        {(["episode", "alltime"] as TimeFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setTimeFilter(f)}
            style={[styles.filterBtn, { backgroundColor: timeFilter === f ? colors.primary : colors.surface }]}
          >
            <Text style={[styles.filterBtnText, { color: timeFilter === f ? "#fff" : colors.mutedForeground }]}>
              {f === "episode" ? "This Episode" : "All-Time"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scope filters */}
      <View style={[styles.scopeRow, { paddingHorizontal: 20 }]}>
        {(["global", "friends"] as ScopeFilter[]).map((s) => (
          <TouchableOpacity key={s} onPress={() => setScopeFilter(s)} style={styles.scopeBtn}>
            <Text style={[styles.scopeBtnText, {
              color: scopeFilter === s ? colors.foreground : colors.mutedForeground,
              borderBottomWidth: scopeFilter === s ? 2 : 0,
              borderBottomColor: colors.primary,
            }]}>
              {s === "global" ? "Global" : "Friends"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Top 3 podium */}
      <View style={[styles.podium, { paddingHorizontal: 20 }]}>
        {[topThree[1], topThree[0], topThree[2]].filter(Boolean).map((entry, displayIdx) => {
          const medals = ["#C0C0C0", "#F5A623", "#CD7F32"];
          const heights = [80, 100, 65];
          const rankOrder = [2, 1, 3];
          const rankIdx = rankOrder[displayIdx] - 1;
          return (
            <View key={entry.userId} style={[styles.podiumEntry, { height: heights[displayIdx] + 50 }]}>
              <View style={[styles.podiumAvatar, { backgroundColor: medals[rankIdx] + "33" }]}>
                <Text style={[styles.podiumInitial, { color: medals[rankIdx] }]}>
                  {entry.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.podiumUsername, { color: colors.foreground }]} numberOfLines={1}>
                {entry.username}
              </Text>
              <Text style={[styles.podiumScore, { color: medals[rankIdx] }]}>
                {entry.score.toLocaleString()}
              </Text>
              <View style={[styles.podiumBar, { height: heights[displayIdx], backgroundColor: medals[rankIdx] + "44" }]}>
                <Text style={[styles.podiumRank, { color: medals[rankIdx] }]}>
                  #{rankOrder[displayIdx]}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20 }}>
          {restEntries.map((entry) => (
            <LeaderboardRow key={entry.userId} entry={entry} />
          ))}
        </View>
      </ScrollView>

      {/* My rank pinned at bottom */}
      {meEntry && (
        <View style={[styles.myRankBar, { backgroundColor: `${colors.primary}22`, borderTopColor: colors.primary, paddingBottom: bottomPadding + 8 }]}>
          <View style={[styles.myRankBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.myRankText}>#{myRank}</Text>
          </View>
          <Text style={[styles.myRankName, { color: colors.foreground }]}>You</Text>
          <Text style={[styles.myRankScore, { color: colors.foreground }]}>
            {meEntry.score.toLocaleString()} pts
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 20, fontWeight: "800", textAlign: "center" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  filterBtnText: { fontSize: 13, fontWeight: "700" },
  scopeRow: { flexDirection: "row", marginBottom: 20 },
  scopeBtn: { flex: 1, alignItems: "center", paddingBottom: 10 },
  scopeBtnText: { fontSize: 14, fontWeight: "600", paddingBottom: 6 },
  podium: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 12, marginBottom: 24 },
  podiumEntry: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  podiumAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  podiumInitial: { fontSize: 20, fontWeight: "800" },
  podiumUsername: { fontSize: 11, fontWeight: "600", marginBottom: 2, maxWidth: 80, textAlign: "center" },
  podiumScore: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  podiumBar: { width: "100%", borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: "center", justifyContent: "center" },
  podiumRank: { fontSize: 22, fontWeight: "800", marginTop: 10 },
  listContent: { gap: 0 },
  myRankBar: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingHorizontal: 20, borderTopWidth: 1.5 },
  myRankBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  myRankText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  myRankName: { flex: 1, fontSize: 15, fontWeight: "600" },
  myRankScore: { fontSize: 15, fontWeight: "700" },
});
