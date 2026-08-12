/**
 * UserProfile - Instagram-like user profile page
 * Shows a real user's profile (from `profiles`) and their posts grid.
 * Follow / message are NOT built yet (Community Mode scope: no follows for now).
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfile } from "@/lib/api/profiles";
import { useUserPosts } from "@/lib/api/community-hooks";

interface UserProfileProps {
  userId: string;
  onBack: () => void;
}

export function UserProfile({ userId, onBack }: UserProfileProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);

  const { data: profile, isLoading: loadingProfile } = useProfile(userId);
  const { data: userPosts = [], isLoading: loadingPosts } = useUserPosts(userId);

  const username = profile?.username ?? "user";
  const loading = loadingProfile || loadingPosts;

  const formatLevel = (level: string | null | undefined) =>
    level ? level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : undefined;

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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{username}</Text>
          <View style={styles.headerButton} />
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Profile Info */}
            <View style={styles.profileSection}>
              <View style={styles.profileHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.avatarImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={[styles.avatarText, { color: colors.foreground }]}>
                      {username[0]?.toUpperCase() ?? "?"}
                    </Text>
                  )}
                </View>
                <View style={styles.stats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>
                      {userPosts.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>posts</Text>
                  </View>
                </View>
              </View>

              <View style={styles.userInfo}>
                <Text style={[styles.displayName, { color: colors.foreground }]}>{username}</Text>
                {formatLevel(profile?.cooking_level) ? (
                  <Text style={[styles.bio, { color: colors.foreground }]}>
                    Level: {formatLevel(profile?.cooking_level)}
                  </Text>
                ) : null}
                {profile?.cuisines?.length ? (
                  <Text style={[styles.bio, { color: colors.mutedForeground }]}>
                    Loves: {profile.cuisines.join(", ")}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Posts Grid */}
            <View style={styles.postsGrid}>
              {userPosts.length > 0 ? (
                userPosts.map((post) => (
                  <TouchableOpacity key={post.id} style={styles.postItem} activeOpacity={0.8}>
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
          </>
        )}
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
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  loadingState: {
    paddingVertical: 80,
    alignItems: "center",
  },
  profileSection: {
    padding: 16,
    gap: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
  },
  stats: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 13,
  },
  userInfo: {
    gap: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "700",
  },
  bio: {
    fontSize: 14,
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 2,
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
    width: "100%",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
