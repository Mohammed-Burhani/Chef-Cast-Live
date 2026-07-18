/**
 * Community Feed screen — Instagram-like feed with stories, posts, and social interactions
 * Features: Stories bar, post feed, like/comment/share/save functionality
 */

import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCommunityStore } from "@/store/communityStore";
import { StoriesBar } from "@/components/community/StoriesBar";
import { PostCard } from "@/components/community/PostCard";
import { CreatePostModal } from "@/components/community/CreatePostModal";
import { CommentsSheet } from "@/components/community/CommentsSheet";
import { UserProfile } from "@/components/community/UserProfile";
import { StoryViewer } from "@/components/community/StoryViewer";
import { CreateStoryModal } from "@/components/community/CreateStoryModal";
import { Story, CommunityPost } from "@/types";

type FilterType = "all" | "following";

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const posts = useCommunityStore((s) => s.posts);
  const isLoadingPosts = useCommunityStore((s) => s.isLoadingPosts);
  const loadPosts = useCommunityStore((s) => s.loadPosts);
  const toggleLike = useCommunityStore((s) => s.toggleLike);
  const toggleSave = useCommunityStore((s) => s.toggleSave);
  const viewStory = useCommunityStore((s) => s.viewStory);
  const stories = useCommunityStore((s) => s.stories);

  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts(filter);
    setRefreshing(false);
  };

  const handleLike = (postId: string) => {
    toggleLike(postId);
  };

  const handleSave = (postId: string) => {
    toggleSave(postId);
  };

  const handleComment = (postId: string) => {
    setSelectedPostId(postId);
    setShowComments(true);
  };

  const handleShare = (postId: string) => {
    // TODO: Open share modal
    console.log("Share post:", postId);
  };

  const handleUserPress = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserProfile(true);
  };

  const handleHashtagPress = (tag: string) => {
    // TODO: Navigate to hashtag feed
    console.log("Navigate to hashtag:", tag);
  };

  const handleStoryPress = (story: Story) => {
    const stories = useCommunityStore.getState().stories;
    const index = stories.findIndex(s => s.id === story.id);
    setStoryViewerIndex(index >= 0 ? index : 0);
    setShowStoryViewer(true);
    viewStory(story.id);
  };

  const handleCreateStory = () => {
    setShowCreateStory(true);
  };

  const FILTERS: Array<{ id: FilterType; label: string }> = [
    { id: "all", label: "All" },
    { id: "following", label: "Following" },
  ];

  const filteredPosts = filter === "following" 
    ? posts.filter(post => {
        const following = useCommunityStore.getState().following;
        return following.includes(post.userId);
      })
    : posts;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPadding + 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Community</Text>
          <TouchableOpacity
            onPress={() => setShowCreatePost(true)}
            style={[styles.createPostBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Filter bar */}
        <View style={styles.filterBar}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => {
                setFilter(f.id);
                loadPosts(f.id);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f.id ? colors.primary : colors.surface,
                  borderColor: filter === f.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: filter === f.id ? "#fff" : colors.mutedForeground },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stories Bar */}
        <StoriesBar
          onStoryPress={handleStoryPress}
          onCreateStory={handleCreateStory}
        />

        {/* Posts Feed */}
        {filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onSave={handleSave}
            onUserPress={handleUserPress}
            onHashtagPress={handleHashtagPress}
          />
        ))}

        {filteredPosts.length === 0 && !isLoadingPosts && (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No posts yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              Be the first to share your culinary creation!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
      />

      {/* Create Story Modal */}
      <CreateStoryModal
        visible={showCreateStory}
        onClose={() => setShowCreateStory(false)}
      />

      {/* Comments Sheet */}
      {selectedPostId && (
        <CommentsSheet
          visible={showComments}
          postId={selectedPostId}
          onClose={() => {
            setShowComments(false);
            setSelectedPostId(null);
          }}
        />
      )}

      {/* User Profile Modal */}
      {selectedUserId && (
        <Modal
          visible={showUserProfile}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            setShowUserProfile(false);
            setSelectedUserId(null);
          }}
        >
          <UserProfile
            userId={selectedUserId}
            onBack={() => {
              setShowUserProfile(false);
              setSelectedUserId(null);
            }}
          />
        </Modal>
      )}

      {/* Story Viewer */}
      <StoryViewer
        visible={showStoryViewer}
        stories={stories}
        initialIndex={storyViewerIndex}
        onClose={() => setShowStoryViewer(false)}
        onUserPress={handleUserPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    // maxWidth: "70%",
    alignSelf: "center"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  createPostBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
});