/**
 * BadgeCard component — displays a badge in the collection grid.
 * Locked badges appear in grayscale with a lock icon overlay.
 * Unlocked badges show full color with the earned date.
 */

import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { Badge } from "@/types";

interface BadgeCardProps {
  badge: Badge;
  onPress: (badge: Badge) => void;
}

const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  scissors: "scissors",
  droplet: "droplet",
  zap: "zap",
  flame: "zap",
  calendar: "calendar",
  award: "award",
  star: "star",
  heart: "heart",
  "bar-chart-2": "bar-chart-2",
  "chef-hat": "coffee",
  camera: "camera",
  sunrise: "sunrise",
};

export function BadgeCard({ badge, onPress }: BadgeCardProps) {
  const colors = useColors();
  const iconName = ICON_MAP[badge.iconName] ?? "award";

  const progress = badge.progress ?? 0;
  const maxProgress = badge.maxProgress ?? 1;
  const progressPercent = Math.min(progress / maxProgress, 1);

  return (
    <TouchableOpacity
      onPress={() => onPress(badge)}
      activeOpacity={0.75}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: badge.isUnlocked ? colors.primary : colors.border,
          borderWidth: badge.isUnlocked ? 1.5 : 1,
          opacity: badge.isUnlocked ? 1 : 0.55,
        },
      ]}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconWrapper,
          {
            backgroundColor: badge.isUnlocked
              ? `${colors.primary}22`
              : colors.muted,
          },
        ]}
      >
        <Feather
          name={iconName}
          size={24}
          color={badge.isUnlocked ? colors.primary : colors.mutedForeground}
        />
        {!badge.isUnlocked && (
          <View style={[styles.lockOverlay, { backgroundColor: colors.surface }]}>
            <Feather name="lock" size={10} color={colors.mutedForeground} />
          </View>
        )}
      </View>

      {/* Name */}
      <Text
        style={[
          styles.name,
          { color: badge.isUnlocked ? colors.foreground : colors.mutedForeground },
        ]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>

      {/* Progress bar */}
      {!badge.isUnlocked && (
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${progressPercent * 100}%`,
              },
            ]}
          />
        </View>
      )}

      {badge.isUnlocked && (
        <View style={[styles.xpBadge, { backgroundColor: `${colors.accent}22` }]}>
          <Text style={[styles.xpText, { color: colors.accent }]}>+{badge.xpReward} XP</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: "48%",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  lockOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
  progressTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  xpText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
