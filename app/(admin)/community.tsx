/**
 * Community Management - Admin dashboard for moderating community content.
 *
 * Tabs:
 *   - Overview    : DB-wide KPIs (posts, comments, likes, saves, reports…) + top posters
 *   - Top Posts   : posts ranked by engagement (likes + comments), with hide/delete
 *   - Top Comments: comments ranked by likes, with hide/delete
 *   - Reports     : moderation queue of reported posts/comments
 *
 * Backed by the admin-community RPCs + admin-only RLS policies from migration 015.
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  ContentReportRow,
  TopCommentRow,
  TopPosterRow,
  TopPostRow,
} from "@/lib/api/admin-community";
import {
  useCommunityAdminStats,
  useContentReports,
  useModerateComment,
  useModeratePost,
  useResolveReport,
  useSetUserBanned,
  useTopComments,
  useTopPosters,
  useTopPosts,
} from "@/lib/api/admin-community-hooks";

type TabType = "overview" | "posts" | "comments" | "reports";

export default function CommunityManagement() {
  const colors = useColors();

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Data
  const stats = useCommunityAdminStats();
  const topPosts = useTopPosts();
  const topComments = useTopComments();
  const topPosters = useTopPosters();
  const reports = useContentReports();

  // Mutations
  const moderatePost = useModeratePost();
  const moderateComment = useModerateComment();
  const setUserBanned = useSetUserBanned();
  const resolveReport = useResolveReport();

  const TABS: Array<{ id: TabType; label: string; icon: keyof typeof Feather.glyphMap; badge?: number }> = [
    { id: "overview", label: "Overview", icon: "bar-chart-2" },
    { id: "posts", label: "Top Posts", icon: "grid" },
    { id: "comments", label: "Top Comments", icon: "message-circle" },
    { id: "reports", label: "Reports", icon: "flag", badge: stats.data?.pending_reports },
  ];

  /** Run a mutation and surface any error, matching the admin-page idiom. */
  const run = async (fn: () => Promise<unknown>, okMsg?: string) => {
    try {
      await fn();
      if (okMsg) Alert.alert("Success", okMsg);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  // ── Post actions ──────────────────────────────────────────────────────────
  const toggleHidePost = (post: TopPostRow) =>
    run(() => moderatePost.mutateAsync({ postId: post.id, action: post.is_hidden ? "unhide" : "hide" }));

  const confirmDeletePost = (post: TopPostRow) =>
    Alert.alert(
      "Delete Post",
      `Delete ${post.username}'s post? Its comments and bookmarks are removed too. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            run(() => moderatePost.mutateAsync({ postId: post.id, action: "delete" }), "Post deleted"),
        },
      ]
    );

  // ── Comment actions ───────────────────────────────────────────────────────
  const toggleHideComment = (comment: TopCommentRow) =>
    run(() =>
      moderateComment.mutateAsync({
        commentId: comment.id,
        action: comment.is_hidden ? "unhide" : "hide",
      })
    );

  const confirmDeleteComment = (comment: TopCommentRow) =>
    Alert.alert("Delete Comment", `Delete ${comment.username}'s comment? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          run(
            () => moderateComment.mutateAsync({ commentId: comment.id, action: "delete" }),
            "Comment deleted"
          ),
      },
    ]);

  // ── User ban ──────────────────────────────────────────────────────────────
  const confirmBanUser = (userId: string | null, username: string | null, banned: boolean) => {
    if (!userId) return;
    Alert.alert(
      banned ? "Unban User" : "Ban User",
      `${banned ? "Unban" : "Ban"} ${username ?? "this user"}? Their ${
        banned ? "content will be visible again" : "posts and comments will be hidden from other users"
      }.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: banned ? "Unban" : "Ban",
          style: banned ? "default" : "destructive",
          onPress: () =>
            run(() => setUserBanned.mutateAsync({ userId, banned }), banned ? "User unbanned" : "User banned"),
        },
      ]
    );
  };

  // ── Report actions ────────────────────────────────────────────────────────
  const handleHideReported = (report: ContentReportRow) =>
    run(async () => {
      if (report.target_type === "post") {
        await moderatePost.mutateAsync({ postId: report.target_id, action: "hide" });
      } else {
        await moderateComment.mutateAsync({ commentId: report.target_id, action: "hide" });
      }
      await resolveReport.mutateAsync({ reportId: report.id, status: "resolved" });
    }, "Content hidden");

  const confirmDeleteReported = (report: ContentReportRow) =>
    Alert.alert("Delete Content", `Delete this reported ${report.target_type}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          run(async () => {
            if (report.target_type === "post") {
              await moderatePost.mutateAsync({ postId: report.target_id, action: "delete" });
            } else {
              await moderateComment.mutateAsync({ commentId: report.target_id, action: "delete" });
            }
            await resolveReport.mutateAsync({ reportId: report.id, status: "resolved" });
          }, "Content deleted"),
      },
    ]);

  const dismissReport = (report: ContentReportRow) =>
    run(() => resolveReport.mutateAsync({ reportId: report.id, status: "dismissed" }), "Report dismissed");

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const renderAvatar = (avatarUrl: string | null, username: string | null) => {
    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.avatar, { backgroundColor: colors.muted }]}
          contentFit="cover"
        />
      );
    }
    return (
      <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarInitial}>{getInitials(username)}</Text>
      </View>
    );
  };

  // ==========================================================================
  // OVERVIEW
  // ==========================================================================
  const renderOverview = () => {
    if (stats.isLoading) return <Loader text="Loading stats..." />;
    if (stats.isError || !stats.data) return <ErrorState onRetry={() => stats.refetch()} />;
    const s = stats.data;

    const kpis: Array<{ label: string; value: number; icon: keyof typeof Feather.glyphMap; color: string }> = [
      { label: "Total Posts", value: s.total_posts, icon: "grid", color: colors.primary },
      { label: "Total Comments", value: s.total_comments, icon: "message-circle", color: colors.accent },
      { label: "Total Likes", value: s.total_likes, icon: "heart", color: colors.live },
      { label: "Total Saves", value: s.total_saves, icon: "bookmark", color: colors.success },
      { label: "Stories", value: s.total_stories, icon: "zap", color: colors.warning },
      { label: "Active Posters", value: s.total_posters, icon: "users", color: colors.success },
      { label: "Pending Reports", value: s.pending_reports, icon: "flag", color: colors.danger },
      { label: "Posts This Week", value: s.posts_this_week, icon: "trending-up", color: colors.primary },
      { label: "Comments This Week", value: s.comments_this_week, icon: "message-square", color: colors.accent },
      { label: "Hidden Posts", value: s.hidden_posts, icon: "eye-off", color: colors.mutedForeground },
      { label: "Banned Users", value: s.banned_users, icon: "shield-off", color: colors.danger },
    ];

    return (
      <>
        <View style={styles.statsGrid}>
          {kpis.map((kpi) => (
            <View key={kpi.label} style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: kpi.color }]}>
              <View style={styles.statCardHeader}>
                <Feather name={kpi.icon} size={20} color={kpi.color} />
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{kpi.label}</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{(kpi.value ?? 0).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Posters</Text>
        {topPosters.isLoading ? (
          <Loader text="Loading posters..." />
        ) : !topPosters.data || topPosters.data.length === 0 ? (
          <Empty text="No posters yet" subtext="Posts from your users will show up here" icon="users" />
        ) : (
          <View style={styles.posterGrid}>
            {topPosters.data.map((poster, index) => (
              <View key={poster.user_id} style={[styles.posterCard, { backgroundColor: colors.surface }]}>
                <View style={styles.posterHeader}>
                  <View style={[styles.posterRank, { backgroundColor: index < 3 ? colors.primary : colors.muted }]}>
                    <Text style={[styles.posterRankText, { color: index < 3 ? "#fff" : colors.foreground }]}>
                      {index + 1}
                    </Text>
                  </View>
                  {poster.is_banned && (
                    <View style={[styles.badge, { backgroundColor: `${colors.danger}20` }]}>
                      <Text style={[styles.badgeText, { color: colors.danger }]}>BAN</Text>
                    </View>
                  )}
                </View>
                {renderAvatar(poster.avatar_url, poster.username)}
                <Text style={[styles.posterName, { color: colors.foreground }]} numberOfLines={1}>
                  {poster.username}
                </Text>
                <View style={styles.posterStats}>
                  <View style={styles.posterStatItem}>
                    <Text style={[styles.posterStatValue, { color: colors.primary }]}>{poster.post_count}</Text>
                    <Text style={[styles.posterStatLabel, { color: colors.mutedForeground }]}>posts</Text>
                  </View>
                  <View style={styles.posterStatItem}>
                    <Text style={[styles.posterStatValue, { color: colors.live }]}>{poster.likes_received}</Text>
                    <Text style={[styles.posterStatLabel, { color: colors.mutedForeground }]}>likes</Text>
                  </View>
                  <View style={styles.posterStatItem}>
                    <Text style={[styles.posterStatValue, { color: colors.accent }]}>{poster.engagement ?? 0}</Text>
                    <Text style={[styles.posterStatLabel, { color: colors.mutedForeground }]}>eng</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => confirmBanUser(poster.user_id, poster.username, !poster.is_banned)}
                  style={[styles.posterAction, { backgroundColor: `${colors.warning}15` }]}
                >
                  <Feather name={poster.is_banned ? "shield" : "shield-off"} size={14} color={colors.warning} />
                  <Text style={[styles.posterActionText, { color: colors.warning }]}>
                    {poster.is_banned ? "Unban" : "Ban"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </>
    );
  };

  // ==========================================================================
  // TOP POSTS
  // ==========================================================================
  const renderTopPosts = () => {
    if (topPosts.isLoading) return <Loader text="Loading posts..." />;
    if (topPosts.isError) return <ErrorState onRetry={() => topPosts.refetch()} />;
    if (!topPosts.data || topPosts.data.length === 0)
      return <Empty text="No posts yet" subtext="Posts ranked by engagement appear here" icon="grid" />;

    return (
      <View style={styles.postGrid}>
        {topPosts.data.map((post, index) => (
          <View key={post.id} style={[styles.postCard, { backgroundColor: colors.surface }]}>
            {post.image_url ? (
              <Image
                source={{ uri: post.image_url }}
                style={styles.itemImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.itemImage, styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
                <Feather name="image" size={48} color={colors.mutedForeground} />
              </View>
            )}
            <View style={{ padding: 12, gap: 10 }}>
              <View style={styles.itemHeader}>
                <View style={styles.itemUserInfo}>
                  {renderAvatar(post.avatar_url, post.username)}
                  <View style={styles.itemUserDetails}>
                    <Text style={[styles.itemUsername, { color: colors.foreground }]} numberOfLines={1}>
                      #{index + 1} · {post.username}
                    </Text>
                    <Text style={[styles.itemTime, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {new Date(post.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                {post.is_hidden && (
                  <View style={[styles.badge, { backgroundColor: `${colors.danger}20` }]}>
                    <Text style={[styles.badgeText, { color: colors.danger }]}>HID</Text>
                  </View>
                )}
              </View>

              {post.caption ? (
                <Text style={[styles.itemText, { color: colors.foreground }]} numberOfLines={2}>
                  {post.caption}
                </Text>
              ) : null}

              <Text style={[styles.itemMeta, { color: colors.mutedForeground, fontSize: 11 }]}>
                {post.like_count}♥ · {post.comment_count}💬 · {post.save_count}🔖
              </Text>

              <View style={styles.itemActions}>
                <TouchableOpacity
                  onPress={() => toggleHidePost(post)}
                  style={[styles.actionButton, { backgroundColor: `${colors.warning}15`, flex: 1 }]}
                >
                  <Feather name={post.is_hidden ? "eye" : "eye-off"} size={14} color={colors.warning} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmBanUser(post.user_id, post.username, false)}
                  style={[styles.actionButton, { backgroundColor: `${colors.warning}15`, flex: 1 }]}
                >
                  <Feather name="shield-off" size={14} color={colors.warning} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDeletePost(post)}
                  style={[styles.actionButton, { backgroundColor: `${colors.danger}15`, flex: 1 }]}
                >
                  <Feather name="trash-2" size={14} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ==========================================================================
  // TOP COMMENTS
  // ==========================================================================
  const renderTopComments = () => {
    if (topComments.isLoading) return <Loader text="Loading comments..." />;
    if (topComments.isError) return <ErrorState onRetry={() => topComments.refetch()} />;
    if (!topComments.data || topComments.data.length === 0)
      return <Empty text="No comments yet" subtext="Comments ranked by likes appear here" icon="message-circle" />;

    return (
      <View style={styles.list}>
        {topComments.data.map((comment, index) => (
          <View key={comment.id} style={[styles.itemCard, { backgroundColor: colors.surface }]}>
            <View style={styles.itemHeader}>
              <View style={styles.itemUserInfo}>
                {renderAvatar(comment.avatar_url, comment.username)}
                <View style={styles.itemUserDetails}>
                  <Text style={[styles.itemUsername, { color: colors.foreground }]}>
                    #{index + 1} · {comment.username}
                  </Text>
                  <Text style={[styles.itemTime, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {new Date(comment.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.itemStats}>
                <Feather name="heart" size={13} color={colors.live} />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                  {comment.like_count}
                </Text>
              </View>
            </View>

            <Text style={[styles.itemText, { color: colors.foreground }]} numberOfLines={3}>{comment.text}</Text>

            {comment.post_caption ? (
              <Text style={[styles.itemMeta, { color: colors.mutedForeground, fontSize: 11 }]} numberOfLines={1}>
                on: {comment.post_caption}
              </Text>
            ) : null}

            {comment.is_hidden && (
              <View style={[styles.badge, { backgroundColor: `${colors.danger}20` }]}>
                <Text style={[styles.badgeText, { color: colors.danger }]}>HID</Text>
              </View>
            )}

            <View style={styles.itemActions}>
              <TouchableOpacity
                onPress={() => toggleHideComment(comment)}
                style={[styles.actionButton, { backgroundColor: `${colors.warning}15`, flex: 1 }]}
              >
                <Feather name={comment.is_hidden ? "eye" : "eye-off"} size={14} color={colors.warning} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmBanUser(comment.user_id, comment.username, false)}
                style={[styles.actionButton, { backgroundColor: `${colors.warning}15`, flex: 1 }]}
              >
                <Feather name="shield-off" size={14} color={colors.warning} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmDeleteComment(comment)}
                style={[styles.actionButton, { backgroundColor: `${colors.danger}15`, flex: 1 }]}
              >
                <Feather name="trash-2" size={14} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ==========================================================================
  // REPORTS (moderation queue)
  // ==========================================================================
  const renderReports = () => {
    if (reports.isLoading) return <Loader text="Loading reports..." />;
    if (reports.isError) return <ErrorState onRetry={() => reports.refetch()} />;
    if (!reports.data || reports.data.length === 0)
      return <Empty text="No reports" subtext="Reported content will appear here" icon="flag" />;

    return (
      <View style={styles.list}>
        {reports.data.map((report) => {
          const pending = report.status === "pending";
          const isPost = report.target_type === "post";
          return (
            <View
              key={report.id}
              style={[
                styles.itemCard,
                { backgroundColor: colors.surface, opacity: pending ? 1 : 0.6 },
              ]}
            >
              <View style={styles.itemHeader}>
                <View style={styles.itemUserInfo}>
                  {renderAvatar(report.reporter_avatar_url, report.reporter_username)}
                  <View style={styles.itemUserDetails}>
                    <Text style={[styles.itemUsername, { color: colors.foreground }]} numberOfLines={1}>
                      {report.target_author_username ?? "Deleted user"}
                    </Text>
                    <Text style={[styles.itemTime, { color: colors.mutedForeground }]} numberOfLines={1}>
                      By {report.reporter_username} · {timeAgo(report.created_at)}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: pending ? `${colors.danger}20` : `${colors.mutedForeground}20`,
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: pending ? colors.danger : colors.mutedForeground }]}>
                    {pending ? "NEW" : report.status.toUpperCase().slice(0, 3)}
                  </Text>
                </View>
              </View>

              {isPost && report.target_image_url ? (
                <Image
                  source={{ uri: report.target_image_url }}
                  style={[styles.itemImage, { height: 120 }]}
                  contentFit="cover"
                />
              ) : isPost ? (
                <View style={[styles.itemImage, styles.imagePlaceholder, { backgroundColor: colors.muted, height: 120 }]}>
                  <Feather name="image" size={32} color={colors.mutedForeground} />
                </View>
              ) : null}

              <View style={[styles.reportTarget, { backgroundColor: colors.background }]}>
                <Text style={[styles.itemText, { color: colors.foreground, fontSize: 12 }]} numberOfLines={2}>
                  {report.target_content || "(deleted)"}
                </Text>
              </View>

              <View style={styles.reasonRow}>
                <Feather name="flag" size={12} color={colors.danger} />
                <Text style={[styles.reasonText, { color: colors.foreground, fontSize: 12 }]} numberOfLines={1}>
                  {report.reason}
                </Text>
              </View>

              {pending ? (
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    onPress={() => handleHideReported(report)}
                    style={[styles.actionButton, { backgroundColor: `${colors.warning}15`, flex: 1 }]}
                  >
                    <Feather name="eye-off" size={14} color={colors.warning} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDeleteReported(report)}
                    style={[styles.actionButton, { backgroundColor: `${colors.danger}15`, flex: 1 }]}
                  >
                    <Feather name="trash-2" size={14} color={colors.danger} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => dismissReport(report)}
                    style={[styles.actionButton, { backgroundColor: `${colors.primary}15`, flex: 1 }]}
                  >
                    <Feather name="x-circle" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.itemMeta, { color: colors.mutedForeground, fontSize: 11 }]}>
                  {report.status === "resolved" ? "Resolved" : "Dismissed"}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

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
            style={[styles.tab, activeTab === tab.id && { borderBottomColor: colors.primary }]}
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
            {tab.badge ? (
              <View style={[styles.tabBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === "overview" && renderOverview()}
      {activeTab === "posts" && renderTopPosts()}
      {activeTab === "comments" && renderTopComments()}
      {activeTab === "reports" && renderReports()}
    </ScrollView>
  );
}

// ============================================================================
// Shared state helpers
// ============================================================================

function Loader({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.centerText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

function Empty({
  text,
  subtext,
  icon,
}: {
  text: string;
  subtext: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  return (
    <View style={[styles.content, styles.emptyContent]}>
      <Feather name={icon} size={48} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{text}</Text>
      <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>{subtext}</Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.centerState}>
      <Feather name="alert-circle" size={48} color={colors.danger} />
      <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
        Couldn't load data.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.retryLabel}>Retry</Text>
      </TouchableOpacity>
    </View>
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
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  content: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    marginTop: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    gap: 12,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  postGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  postCard: {
    minWidth: 240,
    flex: 1,
    maxWidth: 320,
    borderRadius: 10,
    overflow: "hidden",
  },
  itemCard: {
    minWidth: 240,
    flex: 1,
    maxWidth: 320,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  itemUserDetails: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemUsername: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemTime: {
    fontSize: 12,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  itemMeta: {
    fontSize: 12,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
  },
  itemImage: {
    width: "100%",
    height: 160,
    borderRadius: 0,
  },
  itemActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "800",
  },
  engagement: {
    alignItems: "center",
  },
  engagementValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  engagementLabel: {
    fontSize: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  reportTarget: {
    borderRadius: 6,
    padding: 10,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reasonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  reasonMeta: {
    fontSize: 12,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  centerText: {
    fontSize: 15,
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
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  posterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  posterCard: {
    minWidth: 140,
    flex: 1,
    maxWidth: 180,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    gap: 8,
  },
  posterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  posterRank: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  posterRankText: {
    fontSize: 12,
    fontWeight: "800",
  },
  posterName: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  posterStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  posterStatItem: {
    alignItems: "center",
    gap: 2,
  },
  posterStatValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  posterStatLabel: {
    fontSize: 10,
  },
  posterAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  posterActionText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
