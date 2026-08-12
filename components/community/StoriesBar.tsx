/**
 * StoriesBar - Instagram-like stories carousel
 * Shows one ring per author (grouped unexpired stories), with view indicators.
 */

import { Image } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useCommunityStore } from "@/store/communityStore";
import { StoryGroup } from "@/types";

interface StoriesBarProps {
  onStoryPress: (group: StoryGroup) => void;
  onCreateStory?: () => void;
}

export function StoriesBar({ onStoryPress, onCreateStory }: StoriesBarProps) {
  const colors = useColors();
  const storyGroups = useCommunityStore((s) => s.storyGroups);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {/* Create Story Button */}
        <TouchableOpacity style={styles.storyItem} onPress={onCreateStory}>
          <View style={[styles.storyAvatar, { borderColor: colors.border }]}>
            <View style={[styles.storyAvatarInner, { backgroundColor: colors.muted }]}>
              <Text style={[styles.avatarText, { color: colors.foreground }]}>+</Text>
            </View>
          </View>
          <Text style={[styles.storyUsername, { color: colors.foreground }]}>Your Story</Text>
        </TouchableOpacity>

        {/* Grouped stories: one ring per author */}
        {storyGroups.map((group) => {
          const latest = group.stories[0];
          const allViewed = group.stories.every((s) => s.isViewed);
          return (
            <TouchableOpacity
              key={group.userId}
              style={styles.storyItem}
              onPress={() => onStoryPress(group)}
            >
              <View
                style={[
                  styles.storyAvatar,
                  {
                    borderColor: allViewed ? colors.border : colors.primary,
                    borderWidth: allViewed ? 1 : 2,
                  },
                ]}
              >
                <View style={[styles.storyAvatarInner, { backgroundColor: colors.muted }]}>
                  {latest?.avatarUrl ? (
                    <Image
                      source={{ uri: latest.avatarUrl }}
                      style={styles.storyAvatarImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={[styles.avatarText, { color: colors.foreground }]}>
                      {latest?.username?.[0]?.toUpperCase() ?? "?"}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={[styles.storyUsername, { color: colors.foreground }]} numberOfLines={1}>
                {latest?.username ?? "user"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  scroll: {
    paddingHorizontal: 16,
  },
  storyItem: {
    alignItems: "center",
    marginRight: 12,
    width: 64,
  },
  storyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    marginBottom: 4,
  },
  storyAvatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
  },
  storyAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  storyUsername: {
    fontSize: 11,
    fontWeight: "500",
  },
});
