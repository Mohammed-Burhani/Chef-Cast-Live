/**
 * Community Feed screen — Instagram-like feed with stories, posts, and social interactions
 * Features: grouped stories bar, curated feed (algorithm), like/comment/share/save,
 * infinite scroll via FlatList.
 */

import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCommunityStore } from "@/store/communityStore";
import { useAuthStore } from "@/store/useAuthStore";
import { StoriesBar } from "@/components/community/StoriesBar";
import { PostCard } from "@/components/community/PostCard";
import { CreatePostModal } from "@/components/community/CreatePostModal";
import { CommentsSheet } from "@/components/community/CommentsSheet";
import { UserProfile } from "@/components/community/UserProfile";
import { StoryViewer } from "@/components/community/StoryViewer";
import { CreateStoryModal } from "@/components/community/CreateStoryModal";
import { ReportModal } from "@/components/community/ReportModal";
import { Story, StoryGroup } from "@/types";
import * as communityApi from "@/lib/api/community";

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const feedPosts = useCommunityStore((s) => s.feedPosts);
  const isLoadingFeed = useCommunityStore((s) => s.isLoadingFeed);
  const isLoadingMoreFeed = useCommunityStore((s) => s.isLoadingMoreFeed);
  const feedHasMore = useCommunityStore((s) => s.feedHasMore);
  const loadFeed = useCommunityStore((s) => s.loadFeed);
  const loadMoreFeed = useCommunityStore((s) => s.loadMoreFeed);
  const toggleLike = useCommunityStore((s) => s.toggleLike);
  const toggleSave = useCommunityStore((s) => s.toggleSave);
  const viewStory = useCommunityStore((s) => s.viewStory);
  const storyGroups = useCommunityStore((s) => s.storyGroups);
  const loadStories = useCommunityStore((s) => s.loadStories);

  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [viewerStories, setViewerStories] = useState<Story[]>([]);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);

  // Tab state: 'feed' = community feed, 'myPosts' = user's own posts for management
  const [activeTab, setActiveTab] = useState<'feed' | 'myPosts'>('feed');
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [loadingMyPosts, setLoadingMyPosts] = useState(false);

  const loadMyPosts = useCallback(async () => {
    const uid = useAuthStore.getState().user?.id;
    if (!uid) return;
    setLoadingMyPosts(true);
    try {
      const posts = await communityApi.fetchUserPosts(uid);
      setMyPosts(posts);
    } catch (error) {
      console.error('[Community] Load my posts error:', error);
    } finally {
      setLoadingMyPosts(false);
    }
  }, []);

  // Initial load: curated feed + stories.
  // Re-run when user loads (feed requires authenticated user).
  const userId = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (!userId) return;
    loadFeed();
    loadStories();
    loadMyPosts();
  }, [userId, loadFeed, loadStories, loadMyPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'feed') {
      await Promise.all([loadFeed(true), loadStories()]);
    } else {
      await loadMyPosts();
    }
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

  const handleReport = (postId: string) => {
    setReportPostId(postId);
  };

  const handleStoryPress = (group: StoryGroup) => {
    setViewerStories(group.stories);
    setShowStoryViewer(true);
  };

  const handleCreateStory = () => {
    setShowCreateStory(true);
  };

  const header = (
    <>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : 0 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Community</Text>
        <TouchableOpacity
          onPress={() => setShowCreatePost(true)}
          style={[styles.createPostBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'feed' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'feed' && styles.tabTextActive,
          ]}>
            Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'myPosts' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('myPosts')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'myPosts' && styles.tabTextActive,
          ]}>
            My Posts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stories Bar (only on Feed tab) */}
      {activeTab === 'feed' && (
        <StoriesBar onStoryPress={handleStoryPress} onCreateStory={handleCreateStory} />
      )}
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={{ paddingBottom: bottomPadding + 80 }}
        showsVerticalScrollIndicator={false}
        data={activeTab === 'feed' ? feedPosts : myPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onSave={handleSave}
            onUserPress={handleUserPress}
            onHashtagPress={handleHashtagPress}
            onReport={handleReport}
          />
        )}
        ListHeaderComponent={header}
        ListFooterComponent={
          activeTab === 'feed' ? (
            <>
              {isLoadingMoreFeed ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : !feedHasMore && feedPosts.length > 0 ? (
                <Text style={[styles.endText, { color: colors.mutedForeground }]}>
                  You're all caught up 🎉
                </Text>
              ) : null}
            </>
          ) : null
        }
        ListEmptyComponent={
          activeTab === 'feed' ? (
            isLoadingFeed ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="users" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No posts yet
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                  Be the first to share your culinary creation!
                </Text>
              </View>
            )
          ) : (
            loadingMyPosts ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : myPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="image" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No posts yet
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                  Tap the + button to share your first culinary creation!
                </Text>
              </View>
            ) : null
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        onEndReached={
          activeTab === 'feed'
            ? feedPosts.length > 0
              ? () => loadMoreFeed()
              : undefined
            : undefined
        }
        onEndReachedThreshold={0.5}
      />

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

      {/* Report Modal */}
      {reportPostId && (
        <ReportModal
          visible={!!reportPostId}
          targetType="post"
          targetId={reportPostId}
          onClose={() => setReportPostId(null)}
        />
      )}

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
        stories={viewerStories}
        initialIndex={0}
        onClose={() => setShowStoryViewer(false)}
        onUserPress={handleUserPress}
        onStoryViewed={viewStory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
    alignSelf: "center",
    width: "100%",
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
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "rgba(128,128,128,0.1)",
  },
  tabButtonActive: {
    backgroundColor: "#000",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  endText: {
    textAlign: "center",
    paddingVertical: 24,
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
