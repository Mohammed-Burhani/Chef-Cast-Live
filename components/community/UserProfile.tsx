/**
 * UserProfile - Instagram-like user profile page
 * Shows user info, stats, posts grid, and follow/unfollow functionality
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCommunityStore } from "@/store/communityStore";
import { useAuthStore } from "@/store/authStore";
import { CommunityPost } from "@/types";

interface UserProfileProps {
  userId: string;
  onBack: () => void;
}

export function UserProfile({ userId, onBack }: UserProfileProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);

  const posts = useCommunityStore((s) => s.posts);
  const following = useCommunityStore((s) => s.following);
  const followers = useCommunityStore((s) => s.followers);
  const toggleFollow = useCommunityStore((s) => s.toggleFollow);
  const loadUserRelations = useCommunityStore((s) => s.loadUserRelations);

  const [isFollowing, setIsFollowing] = useState(false);
  const [userPosts, setUserPosts] = useState<CommunityPost[]>([]);

  // Mock user data - in real app, this would come from API
  const userData = {
    id: userId,
    username: userId === "me" ? (currentUser?.username ?? "you") : "chef_marco",
    displayName: userId === "me" ? "Your Name" : "Chef Marco",
    avatarUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&h=200&fit=crop",
    bio: "🍳 Professional chef | Sharing culinary adventures | DM for collaborations",
    website: "chefmarco.com",
    postsCount: 142,
    followersCount: 24500,
    followingCount: 892,
  };

  useEffect(() => {
    // Load user relations
    loadUserRelations(userId);
    
    // Check if current user is following this user
    setIsFollowing(following.includes(userId));
    
    // Filter posts by this user
    const userPostsFiltered = posts.filter(post => post.userId === userId);
    setUserPosts(userPostsFiltered);
  }, [userId, following, posts, loadUserRelations]);

  const handleFollowToggle = async () => {
    await toggleFollow(userId);
    setIsFollowing(!isFollowing);
  };

  const handleMessage = () => {
    // TODO: Open messaging interface
    console.log("Message user:", userId);
  };

  const isOwnProfile = userId === "me" || userId === currentUser?.id;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
          <TouchableOpacity onPress={onBack} style={styles.headerButton}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {userData.username}
          </Text>
          <TouchableOpacity style={styles.headerButton}>
            <Feather name="more-horizontal" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Image
              source={{ uri: userData.avatarUrl }}
              style={[styles.avatar, { backgroundColor: colors.muted }]}
              contentFit="cover"
            />
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {userData.postsCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>posts</Text>
              </View>
              <TouchableOpacity style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {userData.followersCount.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>followers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {userData.followingCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>following</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {userData.displayName}
            </Text>
            <Text style={[styles.bio, { color: colors.foreground }]}>{userData.bio}</Text>
            {userData.website && (
              <TouchableOpacity>
                <Text style={[styles.website, { color: colors.primary }]}>
                  {userData.website}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleFollowToggle}
                style={[
                  styles.followButton,
                  {
                    backgroundColor: isFollowing ? colors.surface : colors.primary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    { color: isFollowing ? colors.foreground : "#fff" },
                  ]}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleMessage}
                style={[styles.messageButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.messageButtonText, { color: colors.foreground }]}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.tab}>
            <Feather name="grid" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Feather name="user" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <View style={styles.postsGrid}>
          {userPosts.length > 0 ? (
            userPosts.map((post) => (
              <TouchableOpacity key={post.id} style={styles.postItem}>
                <Image
                  source={{ uri: post.photoUrl }}
                  style={styles.postImage}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="grid" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No posts yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  profileSection: {
    padding: 16,
    gap: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  stats: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  userInfo: {
    gap: 4,
  },
  displayName: {
    fontSize: 14,
    fontWeight: "700",
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  website: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  followButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  messageButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  postItem: {
    width: "33.33%",
    aspectRatio: 1,
    padding: 1,
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  emptyState: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});