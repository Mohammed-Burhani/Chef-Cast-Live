/**
 * CommentsSheet - Instagram-like comments bottom sheet
 * Shows comments for a post and allows adding new comments
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCommunityStore } from "@/store/communityStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Comment } from "@/types";

interface CommentsSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
}

export function CommentsSheet({ visible, postId, onClose }: CommentsSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const comments = useCommunityStore((s) => s.comments);
  const isLoadingComments = useCommunityStore((s) => s.isLoadingComments);
  const loadComments = useCommunityStore((s) => s.loadComments);
  const addComment = useCommunityStore((s) => s.addComment);
  const toggleLikeComment = useCommunityStore((s) => s.toggleLikeComment);
  const subscribeToComments = useCommunityStore((s) => s.subscribeToComments);
  const unsubscribeFromComments = useCommunityStore((s) => s.unsubscribeFromComments);

  const [newComment, setNewComment] = useState("");

  React.useEffect(() => {
    if (!visible || !postId) return;

    loadComments(postId);
    subscribeToComments(postId);

    return () => unsubscribeFromComments();
  }, [visible, postId, loadComments, subscribeToComments, unsubscribeFromComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment(postId, newComment.trim());
      setNewComment("");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to add comment");
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Feather name="x" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Comments</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Comments List */}
        <ScrollView
          style={styles.commentsList}
          contentContainerStyle={[styles.commentsContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoadingComments ? (
            <View style={styles.loadingState}>
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Loading comments...
              </Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No comments yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                Be the first to comment!
              </Text>
            </View>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={[styles.commentItem, { backgroundColor: colors.surface }]}>
                <Image
                  source={{ uri: comment.avatarUrl }}
                  style={[styles.commentAvatar, { backgroundColor: colors.muted }]}
                  contentFit="cover"
                />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={[styles.commentUsername, { color: colors.foreground }]}>
                      {comment.username}
                    </Text>
                    <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                      {timeAgo(comment.createdAt)}
                    </Text>
                  </View>
                  <Text style={[styles.commentText, { color: colors.foreground }]}>
                    {comment.text}
                  </Text>
                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      onPress={() => toggleLikeComment(comment.id)}
                      style={styles.commentAction}
                    >
                      <Feather
                        name="heart"
                        size={14}
                        color={comment.isLiked ? colors.live : colors.mutedForeground}
                        fill={comment.isLiked ? colors.live : "none"}
                      />
                      <Text
                        style={[
                          styles.commentActionText,
                          { color: comment.isLiked ? colors.live : colors.mutedForeground },
                        ]}
                      >
                        {comment.likes}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.commentAction}>
                      <Text style={[styles.replyText, { color: colors.primary }]}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Comment Input */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 8,
              paddingTop: 8,
            },
          ]}
        >
          <Image
            source={{ uri: user?.avatarUrl }}
            style={[styles.userAvatar, { backgroundColor: colors.muted }]}
            contentFit="cover"
          />
          <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.mutedForeground}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={2200}
            />
          </View>
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={!newComment.trim()}
            style={[
              styles.sendButton,
              { opacity: newComment.trim() ? 1 : 0.4 },
            ]}
          >
            <Feather name="send" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 40,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    padding: 16,
    gap: 12,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
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
  },
  commentItem: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
    gap: 4,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 11,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  replyText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
});