/**
 * PostCard - Instagram-like post component
 * Features: header with user info, image, action buttons, likes, caption, comments
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { CommunityPost } from "@/types";

interface PostCardProps {
  post: CommunityPost;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onSave: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onHashtagPress: (tag: string) => void;
}

export function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onSave,
  onUserPress,
  onHashtagPress,
}: PostCardProps) {
  const colors = useColors();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    onLike(post.id);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave(post.id);
  };

  const formatCaption = (caption: string) => {
    const hashtagRegex = /#(\w+)/g;
    const parts = caption.split(hashtagRegex);

    return parts.map((part, index) => {
      if (part.match(hashtagRegex)) {
        return null;
      }
      const isHashtag = index % 2 === 1;
      if (isHashtag && part) {
        return (
          <Text
            key={index}
            style={[styles.hashtag, { color: colors.primary }]}
            onPress={() => onHashtagPress(part)}
          >
            #{part}
          </Text>
        );
      }
      return (
        <Text key={index} style={[styles.captionText, { color: colors.foreground }]}>
          {part}
        </Text>
      );
    });
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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => onUserPress(post.userId)}
        >
          <Image
            source={{ uri: post.avatarUrl }}
            style={[styles.avatar, { backgroundColor: colors.muted }]}
            contentFit="cover"
          />
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: colors.foreground }]}>
              {post.username}
            </Text>
            {post.location && (
              <Text style={[styles.location, { color: colors.mutedForeground }]}>
                {post.location}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton}>
          <Feather name="more-horizontal" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Image */}
      <Image
        source={{ uri: post.photoUrl }}
        style={styles.image}
        contentFit="cover"
      />

      {/* Action Buttons */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
            <Feather
              name="heart"
              size={24}
              color={isLiked ? colors.live : colors.foreground}
              fill={isLiked ? colors.live : "none"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onComment(post.id)}
            style={styles.actionButton}
          >
            <Feather name="message-circle" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onShare(post.id)}
            style={styles.actionButton}
          >
            <Feather name="send" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSave} style={styles.actionButton}>
          <Feather
            name="bookmark"
            size={24}
            color={isSaved ? colors.primary : colors.foreground}
            fill={isSaved ? colors.primary : "none"}
          />
        </TouchableOpacity>
      </View>

      {/* Likes */}
      <View style={styles.likesSection}>
        <Text style={[styles.likes, { color: colors.foreground }]}>
          {likeCount.toLocaleString()} likes
        </Text>
      </View>

      {/* Caption */}
      <View style={styles.captionSection}>
        <Text style={[styles.captionUsername, { color: colors.foreground }]}>
          {post.username}
        </Text>
        <Text style={styles.caption}>{formatCaption(post.caption)}</Text>
      </View>

      {/* Comments */}
      {post.comments > 0 && (
        <TouchableOpacity
          onPress={() => onComment(post.id)}
          style={styles.commentsSection}
        >
          <Text style={[styles.comments, { color: colors.mutedForeground }]}>
            View all {post.comments} comments
          </Text>
        </TouchableOpacity>
      )}

      {/* Time */}
      <View style={styles.timeSection}>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {timeAgo(post.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userDetails: {
    gap: 2,
  },
  username: {
    fontSize: 13,
    fontWeight: "600",
  },
  location: {
    fontSize: 11,
  },
  moreButton: {
    padding: 4,
  },
  image: {
    width: "100%",
    aspectRatio: 1.2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  likesSection: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  likes: {
    fontSize: 13,
    fontWeight: "600",
  },
  captionSection: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  captionUsername: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  caption: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  captionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  hashtag: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  commentsSection: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  comments: {
    fontSize: 13,
  },
  timeSection: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  time: {
    fontSize: 11,
  },
});