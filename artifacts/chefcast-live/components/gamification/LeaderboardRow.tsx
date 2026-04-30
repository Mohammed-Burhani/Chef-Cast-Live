/**
 * LeaderboardRow component — shows a single leaderboard entry.
 * The top 3 entries get special medal colors. The current user is highlighted.
 */

import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { LeaderboardEntry } from "@/types";

const MEDAL_COLORS = ["#F5A623", "#C0C0C0", "#CD7F32"];

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
}

export function LeaderboardRow({ entry }: LeaderboardRowProps) {
  const colors = useColors();
  const isTop3 = entry.rank <= 3;
  const medalColor = isTop3 ? MEDAL_COLORS[entry.rank - 1] : null;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: entry.isCurrentUser
            ? `${colors.primary}18`
            : colors.surface,
          borderColor: entry.isCurrentUser ? colors.primary : colors.border,
          borderWidth: entry.isCurrentUser ? 1.5 : 1,
        },
      ]}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {medalColor ? (
          <Feather name="award" size={18} color={medalColor} />
        ) : (
          <Text style={[styles.rank, { color: colors.mutedForeground }]}>
            #{entry.rank}
          </Text>
        )}
      </View>

      {/* Avatar placeholder */}
      <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
        <Text style={[styles.avatarInitial, { color: colors.foreground }]}>
          {entry.username.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Username + streak */}
      <View style={styles.info}>
        <Text style={[styles.username, { color: colors.foreground }]}>
          {entry.username}
          {entry.isCurrentUser && (
            <Text style={{ color: colors.primary }}> (you)</Text>
          )}
        </Text>
        <View style={styles.streakRow}>
          <Feather name="zap" size={11} color={colors.accent} />
          <Text style={[styles.streak, { color: colors.mutedForeground }]}>
            {entry.currentStreak} day streak
          </Text>
        </View>
      </View>

      {/* Score */}
      <Text style={[styles.score, { color: medalColor ?? colors.foreground }]}>
        {entry.score.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  rankContainer: {
    width: 28,
    alignItems: "center",
  },
  rank: {
    fontSize: 13,
    fontWeight: "600",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  streak: {
    fontSize: 11,
  },
  score: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
});
