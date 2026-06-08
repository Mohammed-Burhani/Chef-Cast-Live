/**
 * CommentsTab Component
 * Live comments feed with Realtime sync and quiz activity banner
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useCommentStore, Comment } from '@/store/commentStore';
import { useQuizPhase } from '@/store/useQuizStore';
// import { supabase } from '@/lib/supabase'; // COMMENTED OUT FOR PROTOTYPE
import { formatRelativeTime } from '@/lib/utils/time';

interface CommentsTabProps {
  episodeId: string;
  onSwitchToQuiz: () => void;
}

// Avatar component with username hash color
function Avatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const colors = useColors();
  
  const getColorFromUsername = (name: string): string => {
    const colors = ['#E85200', '#FFC200', '#FFE500', '#F5A623', '#FF8C00', '#FFB347', '#E3000F'];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const initial = username.charAt(0).toUpperCase();
  const bgColor = getColorFromUsername(username);

  return (
    <View style={[styles.avatar, { backgroundColor: bgColor }]}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

// Comment row component
function CommentRow({ comment }: { comment: Comment }) {
  const colors = useColors();

  return (
    <View style={styles.commentRow}>
      <Avatar username={comment.username} avatarUrl={comment.avatarUrl} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.username, { color: colors.foreground }]}>
            {comment.username}
          </Text>
          <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
            {formatRelativeTime(comment.createdAt)}
          </Text>
        </View>
        <Text style={[styles.commentText, { color: colors.foreground }]}>
          {comment.text}
        </Text>
      </View>
    </View>
  );
}

export function CommentsTab({ episodeId, onSwitchToQuiz }: CommentsTabProps) {
  const colors = useColors();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [isNearBottom, setIsNearBottom] = useState(true);

  const comments = useCommentStore((s) => s.comments);
  const isLoading = useCommentStore((s) => s.isLoading);
  const isSending = useCommentStore((s) => s.isSending);
  const sendError = useCommentStore((s) => s.sendError);
  const loadComments = useCommentStore((s) => s.loadComments);
  const appendComment = useCommentStore((s) => s.appendComment);
  const sendComment = useCommentStore((s) => s.sendComment);
  const reset = useCommentStore((s) => s.reset);

  const quizPhase = useQuizPhase();
  const showQuizBanner = quizPhase === 'question';

  // Banner animation
  const bannerTranslateY = useSharedValue(-60);
  const bannerOpacity = useSharedValue(0);

  useEffect(() => {
    if (showQuizBanner) {
      bannerTranslateY.value = withTiming(0, { duration: 300 });
      bannerOpacity.value = withTiming(1, { duration: 300 });
    } else {
      bannerTranslateY.value = withTiming(-60, { duration: 300 });
      bannerOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [showQuizBanner]);

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bannerTranslateY.value }],
    opacity: bannerOpacity.value,
  }));

  // Load comments and subscribe to Realtime
  useEffect(() => {
    loadComments(episodeId);

    // PROTOTYPE: Realtime subscription commented out
    /* SUPABASE CODE COMMENTED OUT
    const channel = supabase
      .channel(`comments:${episodeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `episode_id=eq.${episodeId}`,
        },
        async (payload) => {
          // Fetch full comment with profile
          const { data } = await supabase
            .from('comments')
            .select(`
              id,
              episode_id,
              user_id,
              text,
              created_at,
              profiles (
                username,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const comment: Comment = {
              id: data.id,
              episodeId: data.episode_id,
              userId: data.user_id,
              username: (data.profiles as any)?.username ?? 'Unknown',
              avatarUrl: (data.profiles as any)?.avatar_url ?? null,
              text: data.text,
              createdAt: data.created_at,
            };

            appendComment(comment);

            // Auto-scroll if near bottom
            if (isNearBottom) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      reset();
    };
    */

    return () => {
      reset();
    };
  }, [episodeId]);

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setIsNearBottom(distanceFromBottom < 80);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    await sendComment(episodeId, inputText);
    setInputText('');
  };

  const charCount = inputText.length;
  const showCharCount = charCount > 160;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Quiz active banner */}
      {showQuizBanner && (
        <Animated.View style={[styles.banner, { backgroundColor: colors.primary }, bannerStyle]}>
          <TouchableOpacity
            style={styles.bannerContent}
            onPress={onSwitchToQuiz}
            activeOpacity={0.8}
          >
            <Text style={styles.bannerText}>❓ Question is live! Tap to switch.</Text>
            <Feather name="chevron-right" size={18} color="#F5F5F5" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Comments list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommentRow comment={item} />}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No comments yet. Be the first!
              </Text>
            </View>
          }
        />
      )}

      {/* Input area */}
      <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {sendError && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {sendError}
          </Text>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.mutedForeground}
            value={inputText}
            onChangeText={setInputText}
            maxLength={200}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputText.trim() && !isSending ? colors.primary : colors.muted,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#F5F5F5" />
            ) : (
              <Feather name="send" size={18} color="#F5F5F5" />
            )}
          </TouchableOpacity>
        </View>
        {showCharCount && (
          <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
            {charCount} / 200
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '700',
  },
  commentContent: {
    flex: 1,
    gap: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
