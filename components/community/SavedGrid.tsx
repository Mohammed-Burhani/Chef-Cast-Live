/**
 * SavedGrid - 3-column grid of a user's bookmarked posts (Settings → Saved).
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { SavedPost } from "@/types";

interface SavedGridProps {
  posts: SavedPost[];
  isLoading?: boolean;
  onPostPress?: (postId: string) => void;
}

export function SavedGrid({ posts, isLoading, onPostPress }: SavedGridProps) {
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.center}>
        <Feather name="bookmark" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No saved posts yet</Text>
        <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
          Tap the bookmark on any post to save it here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {posts.map((saved) => (
        <TouchableOpacity
          key={saved.id}
          style={styles.tile}
          activeOpacity={0.8}
          onPress={() => onPostPress?.(saved.post.id)}
        >
          <Image source={{ uri: saved.post.photoUrl }} style={styles.image} contentFit="cover" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 2,
  },
  tile: {
    width: "33.33%",
    aspectRatio: 1,
    padding: 1,
  },
  image: {
    width: "100%",
    height: "100%",
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
