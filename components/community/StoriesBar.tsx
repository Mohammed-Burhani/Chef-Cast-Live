/**
 * StoriesBar - Instagram-like stories carousel
 * Shows user stories with view indicators
 */

import { Image } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useCommunityStore } from "@/store/communityStore";
import { Story } from "@/types";

interface StoriesBarProps {
  onStoryPress: (story: Story) => void;
  onCreateStory?: () => void;
}

export function StoriesBar({ onStoryPress, onCreateStory }: StoriesBarProps) {
  const colors = useColors();
  const stories = useCommunityStore((s) => s.stories);
  const user = { id: "me", username: "you", avatarUrl: undefined }; // Current user

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

        {/* Stories */}
        {stories.map((story) => (
          <TouchableOpacity
            key={story.id}
            style={styles.storyItem}
            onPress={() => onStoryPress(story)}
          >
            <View
              style={[
                styles.storyAvatar,
                {
                  borderColor: story.isViewed ? colors.border : colors.primary,
                  borderWidth: story.isViewed ? 1 : 2,
                },
              ]}
            >
              <Image
                source={{ uri: story.avatarUrl }}
                style={styles.storyAvatarImage}
                contentFit="cover"
              />
            </View>
            <Text style={[styles.storyUsername, { color: colors.foreground }]} numberOfLines={1}>
              {story.username}
            </Text>
          </TouchableOpacity>
        ))}
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