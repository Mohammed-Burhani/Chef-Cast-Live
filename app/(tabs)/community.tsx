/**
 * Community Feed screen — masonry grid of dish photos + Q&A section.
 * Users can view, like, and submit their own dish photos.
 * Ask the Chef input saves questions to the QA thread.
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOCK_COMMUNITY_POSTS, MOCK_QA } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";
import { useGamificationStore } from "@/store/useGamificationStore";
import { CommunityPost, QAQuestion } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_GAP = 8;
const PADDING = 16;
const COLUMN_WIDTH = (SCREEN_WIDTH - PADDING * 2 - COLUMN_GAP) / 2;

type FilterType = "episode" | "all" | "following";

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const awardXP = useGamificationStore((s) => s.awardXP);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [posts, setPosts] = useState<CommunityPost[]>(MOCK_COMMUNITY_POSTS);
  const [questions, setQuestions] = useState<QAQuestion[]>(MOCK_QA);
  const [filter, setFilter] = useState<FilterType>("episode");
  const [question, setQuestion] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleLike = (postId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  const handleAskChef = () => {
    if (!question.trim()) return;
    const newQ: QAQuestion = {
      id: `qa-${Date.now()}`,
      userId: "me-user",
      username: "you",
      question: question.trim(),
      upvotes: 0,
      isAnswered: false,
      createdAt: new Date().toISOString(),
    };
    setQuestions((prev) => [newQ, ...prev]);
    awardXP("QA_QUESTION_SUBMITTED", "Asked the chef a question");
    setQuestion("");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  const FILTERS: Array<{ id: FilterType; label: string }> = [
    { id: "episode", label: "This Episode" },
    { id: "all", label: "All Time" },
    { id: "following", label: "Following" },
  ];

  // Split posts into two columns for masonry layout
  const leftColumn = posts.filter((_, i) => i % 2 === 0);
  const rightColumn = posts.filter((_, i) => i % 2 === 1);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Community</Text>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.neonRed }]}>
            <Feather name="camera" size={16} color="#fff" />
            <Text style={styles.shareBtnText}>Share Dish</Text>
          </TouchableOpacity>
        </View>

        {/* Filter bar */}
        <View style={styles.filterBar}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
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

        {/* Masonry photo grid */}
        <View style={styles.masonryGrid}>
          <View style={styles.masonryColumn}>
            {leftColumn.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={[styles.photoCard, { backgroundColor: colors.surface }]}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: post.photoUrl }}
                  style={[styles.photoImage, { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.3 }]}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.photoMeta}>
                  <Text style={[styles.photoUsername, { color: colors.foreground }]}>
                    @{post.username}
                  </Text>
                  {post.caption ? (
                    <Text style={[styles.photoCaption, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {post.caption}
                    </Text>
                  ) : null}
                  <TouchableOpacity onPress={() => handleLike(post.id)} style={styles.likeRow}>
                    <Feather name="heart" size={13} color={post.isLiked ? colors.neonRed : colors.mutedForeground} />
                    <Text style={[styles.likeCount, { color: post.isLiked ? colors.neonRed : colors.mutedForeground }]}>
                      {post.likes}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.masonryColumn}>
            {rightColumn.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={[styles.photoCard, { backgroundColor: colors.surface }]}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: post.photoUrl }}
                  style={[styles.photoImage, { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.1 }]}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.photoMeta}>
                  <Text style={[styles.photoUsername, { color: colors.foreground }]}>
                    @{post.username}
                  </Text>
                  {post.caption ? (
                    <Text style={[styles.photoCaption, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {post.caption}
                    </Text>
                  ) : null}
                  <TouchableOpacity onPress={() => handleLike(post.id)} style={styles.likeRow}>
                    <Feather name="heart" size={13} color={post.isLiked ? colors.neonRed : colors.mutedForeground} />
                    <Text style={[styles.likeCount, { color: post.isLiked ? colors.neonRed : colors.mutedForeground }]}>
                      {post.likes}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ask the Chef section */}
        <View style={styles.qaSection}>
          <Text style={[styles.qaTitle, { color: colors.foreground }]}>Ask the Chef</Text>
          <View style={[styles.qaInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.qaTextInput, { color: colors.foreground }]}
              placeholder="Ask Chef Marco anything about tonight's recipe..."
              placeholderTextColor={colors.mutedForeground}
              value={question}
              onChangeText={setQuestion}
              multiline
            />
            <TouchableOpacity
              onPress={handleAskChef}
              disabled={!question.trim()}
              style={[styles.qaSendBtn, { backgroundColor: colors.primary, opacity: question.trim() ? 1 : 0.4 }]}
            >
              <Feather name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* QA list */}
          <View style={styles.qaList}>
            {questions.map((q) => (
              <View key={q.id} style={[styles.qaCard, { backgroundColor: colors.surface }]}>
                <View style={styles.qaHeader}>
                  <Text style={[styles.qaUsername, { color: colors.primary }]}>@{q.username}</Text>
                  {q.isAnswered && (
                    <View style={[styles.answeredBadge, { backgroundColor: `${colors.success}22` }]}>
                      <Text style={[styles.answeredText, { color: colors.success }]}>Answered</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.qaQuestion, { color: colors.foreground }]}>{q.question}</Text>
                {q.answer && (
                  <View style={[styles.answerBox, { backgroundColor: `${colors.primary}15`, borderLeftColor: colors.primary }]}>
                    <Text style={[styles.answerText, { color: colors.foreground }]}>
                      <Text style={{ color: colors.primary, fontWeight: "700" }}>Chef: </Text>
                      {q.answer}
                    </Text>
                  </View>
                )}
                <View style={styles.qaFooter}>
                  <Feather name="arrow-up" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.upvotes, { color: colors.mutedForeground }]}>{q.upvotes}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: PADDING, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 26, fontWeight: "800" },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  shareBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  filterBar: { flexDirection: "row", gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterLabel: { fontSize: 13, fontWeight: "600" },
  masonryGrid: { flexDirection: "row", gap: COLUMN_GAP },
  masonryColumn: { flex: 1, gap: 10 },
  photoCard: { borderRadius: 14, overflow: "hidden" },
  photoImage: { borderRadius: 0 },
  photoMeta: { padding: 10, gap: 5 },
  photoUsername: { fontSize: 12, fontWeight: "600" },
  photoCaption: { fontSize: 11, lineHeight: 15 },
  likeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  likeCount: { fontSize: 11 },
  qaSection: { gap: 14 },
  qaTitle: { fontSize: 18, fontWeight: "700" },
  qaInput: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
  qaTextInput: { flex: 1, fontSize: 14, lineHeight: 20, maxHeight: 80 },
  qaSendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  qaList: { gap: 10 },
  qaCard: { borderRadius: 14, padding: 14, gap: 8 },
  qaHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  qaUsername: { fontSize: 12, fontWeight: "700" },
  answeredBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  answeredText: { fontSize: 10, fontWeight: "700" },
  qaQuestion: { fontSize: 14, lineHeight: 20 },
  answerBox: { padding: 12, borderRadius: 10, borderLeftWidth: 3 },
  answerText: { fontSize: 13, lineHeight: 19 },
  qaFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  upvotes: { fontSize: 12 },
});
