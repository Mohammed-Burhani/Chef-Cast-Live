/**
 * Community Management - Admin dashboard for managing community content
 * Features: Post moderation, comment management, user reports, community stats
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Platform } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useCommunityStore } from "@/store/communityStore";
import { CommunityPost, Comment } from "@/types";

type TabType = "posts" | "comments" | "reports" | "stats";

export default function CommunityManagement() {
  const colors = useColors();
  const posts = useCommunityStore((s) => s.posts);
  const comments = useCommunityStore((s) => s.comments);

  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "reported" | "flagged">("all");

  const TABS: Array<{ id: TabType; label: string; icon: keyof typeof Feather.glyphMap }> = [
    { id: "posts", label: "Posts", icon: "grid" },
    { id: "comments", label: "Comments", icon: "message-circle" },
    { id: "reports", label: "Reports", icon: "flag" },
    { id: "stats", label: "Stats", icon: "bar-chart-2" },
  ];

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "reported", label: "Reported" },
    { id: "flagged", label: "Flagged" },
  ];

  const handleDeletePost = (postId: string) => {
    // TODO: Implement delete post functionality
    console.log("Delete post:", postId);
  };

  const handleDeleteComment = (commentId: string) => {
    // TODO: Implement delete comment functionality
    console.log("Delete comment:", commentId);
  };

  const handleBanUser = (userId: string) => {
    // TODO: Implement ban user functionality
    console.log("Ban user:", userId);
  };

  const renderPosts = () => (
    <View style={styles.content}>
      <View style={styles.filterBar}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            onPress={() => setSelectedFilter(filter.id as any)}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === filter.id ? colors.primary : colors.surface,
                borderColor: selectedFilter === filter.id ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                { color: selectedFilter === filter.id ? "#fff" : colors.mutedForeground },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {posts.map((post) => (
        <View key={post.id} style={[styles.itemCard, { backgroundColor: colors.surface }]}>
          <View style={styles.itemHeader}>
            <View style={styles.itemUserInfo}>
              <Image
                source={{ uri: post.avatarUrl }}
                style={[styles.itemAvatar, { backgroundColor: colors.muted }]}
                contentFit="cover"
              />
              <View style={styles.itemUserDetails}>
                <Text style={[styles.itemUsername, { color: colors.foreground }]}>
                  {post.username}
                </Text>
                <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>
                  {new Date(post.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.itemStats}>
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {post.likes} likes · {post.comments} comments
              </Text>
            </View>
          </View>
          
          <Image
            source={{ uri: post.photoUrl }}
            style={styles.itemImage}
            contentFit="cover"
          />
          
          {post.caption && (
            <Text style={[styles.itemCaption, { color: colors.foreground }]} numberOfLines={2}>
              {post.caption}
            </Text>
          )}
          
          <View style={styles.itemActions}>
            <TouchableOpacity
              onPress={() => handleDeletePost(post.id)}
              style={[styles.actionButton, { backgroundColor: `${colors.danger}15` }]}
            >
              <Feather name="trash-2" size={16} color={colors.danger} />
              <Text style={[styles.actionButtonText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleBanUser(post.userId)}
              style={[styles.actionButton, { backgroundColor: `${colors.warning}15` }]}
            >
              <Feather name="shield" size={16} color={colors.warning} />
              <Text style={[styles.actionButtonText, { color: colors.warning }]}>Ban User</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderComments = () => (
    <View style={styles.content}>
      {comments.map((comment) => (
        <View key={comment.id} style={[styles.itemCard, { backgroundColor: colors.surface }]}>
          <View style={styles.itemHeader}>
            <View style={styles.itemUserInfo}>
              <View style={[styles.itemAvatar, { backgroundColor: colors.muted }]}>
                <Text style={[styles.avatarInitial, { color: colors.foreground }]}>
                  {comment.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.itemUserDetails}>
                <Text style={[styles.itemUsername, { color: colors.foreground }]}>
                  {comment.username}
                </Text>
                <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>
                  {new Date(comment.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.itemStats}>
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {comment.likes} likes
              </Text>
            </View>
          </View>
          
          <Text style={[styles.itemText, { color: colors.foreground }]}>
            {comment.text}
          </Text>
          
          <View style={styles.itemActions}>
            <TouchableOpacity
              onPress={() => handleDeleteComment(comment.id)}
              style={[styles.actionButton, { backgroundColor: `${colors.danger}15` }]}
            >
              <Feather name="trash-2" size={16} color={colors.danger} />
              <Text style={[styles.actionButtonText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleBanUser(comment.userId)}
              style={[styles.actionButton, { backgroundColor: `${colors.warning}15` }]}
            >
              <Feather name="shield" size={16} color={colors.warning} />
              <Text style={[styles.actionButtonText, { color: colors.warning }]}>Ban User</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderReports = () => (
    <View style={[styles.content, styles.emptyContent]}>
      <Feather name="flag" size={48} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        No reports yet
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
        Reported content will appear here
      </Text>
    </View>
  );

  const renderStats = () => (
    <View style={styles.content}>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Feather name="grid" size={24} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{posts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Posts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Feather name="message-circle" size={24} color={colors.accent} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{comments.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Comments</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Feather name="heart" size={24} color={colors.live} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {posts.reduce((sum, post) => sum + post.likes, 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Likes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Feather name="users" size={24} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {new Set(posts.map(post => post.userId)).size}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active Users</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 80 }}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Community Management</Text>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              activeTab === tab.id && { borderBottomColor: colors.primary },
            ]}
          >
            <Feather
              name={tab.icon}
              size={20}
              color={activeTab === tab.id ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.id ? colors.primary : colors.mutedForeground },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === "posts" && renderPosts()}
      {activeTab === "comments" && renderComments()}
      {activeTab === "reports" && renderReports()}
      {activeTab === "stats" && renderStats()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === "web" ? 24 : 60,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 24,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    gap: 16,
  },
  filterBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
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
  itemCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemUserDetails: {
    gap: 2,
  },
  itemUsername: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemTime: {
    fontSize: 12,
  },
  itemStats: {
    alignItems: "flex-end",
  },
  statText: {
    fontSize: 12,
  },
  itemImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  itemCaption: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContent: {
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
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 13,
  },
});