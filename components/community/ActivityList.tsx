/**
 * ActivityList - unified feed of a user's own community actions
 * (Settings → Activities): posts created, comments written, likes and saves given.
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { ActivityItem } from "@/types";

const TYPE_LABEL: Record<ActivityItem["type"], string> = {
  post: "You posted",
  comment: "You commented",
  like: "You liked a post",
  save: "You saved a post",
};

const TYPE_ICON: Record<ActivityItem["type"], keyof typeof Feather.glyphMap> = {
  post: "image",
  comment: "message-circle",
  like: "heart",
  save: "bookmark",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface ActivityListProps {
  items: ActivityItem[];
  isLoading?: boolean;
}

export function ActivityList({ items, isLoading }: ActivityListProps) {
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading activity...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Feather name="activity" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No activity yet</Text>
        <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
          Your posts, comments, likes, and saves will show up here.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {items.map((item) => (
        <View key={item.id} style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Feather name={TYPE_ICON[item.type]} size={18} color={colors.primary} />
          </View>

          <View style={styles.body}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              {TYPE_LABEL[item.type]}
            </Text>
            {item.type === "comment" && item.text ? (
              <Text style={[styles.detail, { color: colors.mutedForeground }]} numberOfLines={2}>
                "{item.text}"
              </Text>
            ) : item.type === "post" && item.caption ? (
              <Text style={[styles.detail, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.caption}
              </Text>
            ) : null}
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {timeAgo(item.createdAt)}
            </Text>
          </View>

          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={styles.thumbPlaceholder} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  detail: {
    fontSize: 13,
  },
  time: {
    fontSize: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  thumbPlaceholder: {
    width: 48,
    height: 48,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
