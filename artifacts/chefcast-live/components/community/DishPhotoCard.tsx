/**
 * DishPhotoCard — community feed card showing a dish photo.
 * Features a spring like animation on heart press.
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { CommunityPost } from "@/types";

interface DishPhotoCardProps {
  post: CommunityPost;
  onLike: (postId: string) => void;
  width: number;
}

export function DishPhotoCard({ post, onLike, width }: DishPhotoCardProps) {
  const colors = useColors();
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.4,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
      }),
    ]).start();

    onLike(post.id);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <View style={[styles.card, { width, backgroundColor: colors.surface }]}>
      <Image
        source={{ uri: post.photoUrl }}
        style={[styles.photo, { width, height: width * 1.2 }]}
        contentFit="cover"
        transition={200}
      />

      <View style={styles.info}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            <Text style={[styles.avatarInitial, { color: colors.foreground }]}>
              {post.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.foreground }]}>
              {post.username}
            </Text>
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {timeAgo(post.createdAt)}
            </Text>
          </View>
        </View>

        {post.caption ? (
          <Text style={[styles.caption, { color: colors.foreground }]} numberOfLines={2}>
            {post.caption}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Feather
                name="heart"
                size={16}
                color={post.isLiked ? colors.live : colors.mutedForeground}
                style={{ fill: post.isLiked ? colors.live : "none" }}
              />
            </Animated.View>
            <Text
              style={[
                styles.likeCount,
                { color: post.isLiked ? colors.live : colors.mutedForeground },
              ]}
            >
              {post.likes}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  photo: {
    borderRadius: 0,
  },
  info: {
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 12,
    fontWeight: "600",
  },
  time: {
    fontSize: 10,
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    fontWeight: "500",
  },
});
