/**
 * Realtime Channel Manager
 * Singleton managing all Supabase Realtime subscriptions with reconnection logic
 *
 * IMPROVED: Uses quiz_events table for race-condition-free question delivery.
 * The old mechanism (postgres_changes on questions table with UPDATE detection)
 * was fragile because:
 *   1. REPLICA IDENTITY DEFAULT meant payload.old only had PK columns
 *   2. The activate-question edge function deactivates the old question (setting
 *      closed_at), which triggered a false QUESTION_CLOSED event that could
 *      race with the new question's QUESTION_ACTIVATED event
 *   3. The new quiz_events table uses INSERT events which are always unique
 *      and carry the correct event type and payload
 *
 * Legacy postgres_changes on questions is kept as a fallback.
 */

import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRealtimeStore } from '@/store/realtimeStore';
import type { RealtimeEvent, ConnectionStatus } from './types';

type EventHandler<T extends RealtimeEvent = RealtimeEvent> = (payload: T) => void;
type UnsubscribeFn = () => void;

interface ChannelMetadata {
  channel: RealtimeChannel;
  episodeId?: string;
  userId?: string;
  reconnectAttempts: number;
  reconnectTimer?: NodeJS.Timeout;
}

class ChannelManager {
  private channels = new Map<string, ChannelMetadata>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private connectionStatuses = new Map<string, ConnectionStatus>();
  // Track questions that have already fired QUESTION_CLOSED in this session
  // to guard against duplicate events when payload.old lacks column-level data.
  private closedQuestionIds = new Set<string>();
  // Track the currently active question per episode so we don't emit
  // QUESTION_CLOSED for old questions being deactivated.
  private activeQuestionByEpisode = new Map<string, string>();
  // Deduplication: prevent both legacy (postgres_changes on questions) and new
  // (postgres_changes on quiz_events) paths from emitting the same event twice.
  private processedActivationKeys = new Set<string>();
  private processedCloseKeys = new Set<string>();

  // Reconnection config
  private readonly INITIAL_DELAY = 1000;
  private readonly MAX_DELAY = 30000;
  private readonly MAX_ATTEMPTS = 5;
  private readonly BACKOFF_MULTIPLIER = 2;

  /**
   * Subscribe to episode realtime events
   */
  subscribeToEpisode(episodeId: string, userId: string): RealtimeChannel {
    const channelName = `episode:${episodeId}`;

    // Return existing channel if already subscribed
    const existing = this.channels.get(channelName);
    if (existing) {
      return existing.channel;
    }

    this.setConnectionStatus(channelName, 'connecting');

    const channel = supabase
      .channel(channelName)
      // ---- Legacy: postgres_changes on questions table (kept as fallback) ----
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `episode_id=eq.${episodeId}`,
        },
        (payload) => {
          this.handleQuestionChange(payload, episodeId);
        }
      )
      // ---- NEW: postgres_changes on quiz_events table (race-condition-free) ----
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quiz_events',
          filter: `episode_id=eq.${episodeId}`,
        },
        (payload) => {
          this.handleQuizEvent(payload, episodeId);
        }
      )
      // ---- Legacy: postgres_changes on episode_scores ----
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'episode_scores',
          filter: `episode_id=eq.${episodeId}`,
        },
        (payload) => {
          this.handleLeaderboardChange(payload, episodeId, userId);
        }
      )
      // ---- Legacy: postgres_changes on episodes ----
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'episodes',
          filter: `id=eq.${episodeId}`,
        },
        (payload) => {
          this.handleEpisodeChange(payload, episodeId);
        }
      )
      // ---- Broadcast events (for direct messaging from edge functions) ----
      .on('broadcast', { event: `badge:${userId}` }, (payload) => {
        this.emit({
          type: 'BADGE_AWARDED',
          ...payload.payload,
        });
      })
      .on('broadcast', { event: `xp:${userId}` }, (payload) => {
        this.emit({
          type: 'XP_UPDATED',
          ...payload.payload,
        });
      })
      .subscribe((status) => {
        this.handleSubscriptionStatus(channelName, status, episodeId, userId);
      });

    this.channels.set(channelName, {
      channel,
      episodeId,
      userId,
      reconnectAttempts: 0,
    });

    return channel;
  }

  /**
   * Subscribe to community feed (dish photos)
   */
  subscribeToCommunityFeed(episodeId: string | null): RealtimeChannel {
    const channelName = `feed:${episodeId ?? 'global'}`;

    const existing = this.channels.get(channelName);
    if (existing) {
      return existing.channel;
    }

    this.setConnectionStatus(channelName, 'connecting');

    const config: any = {
      event: 'INSERT',
      schema: 'public',
      table: 'dish_photos',
    };

    if (episodeId) {
      config.filter = `episode_id=eq.${episodeId}`;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', config, (payload) => {
        this.handleDishPhotoInsert(payload);
      })
      .subscribe((status) => {
        this.handleSubscriptionStatus(channelName, status);
      });

    this.channels.set(channelName, {
      channel,
      reconnectAttempts: 0,
    });

    return channel;
  }

  /**
   * Subscribe to live comments for an episode
   *
   * Uses Supabase Realtime Broadcast for sub-millisecond delivery.
   * Broadcast messages bypass the database entirely, which means:
   *   - No WAL bloat from high comment volume
   *   - No database connection pool exhaustion
   *   - Sub-millisecond latency (direct WebSocket push)
   *   - Supabase can handle millions of broadcast messages
   *
   * The actual DB write happens in the post-comment edge function,
   * which also triggers the broadcast. Clients only receive broadcasts.
   */
  subscribeToComments(episodeId: string): RealtimeChannel {
    const channelName = `comments:${episodeId}`;

    // Return existing channel if already subscribed
    const existing = this.channels.get(channelName);
    if (existing) {
      return existing.channel;
    }

    this.setConnectionStatus(channelName, 'connecting');

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new_comment' }, (payload) => {
        const data = payload.payload as {
          commentId: string;
          episodeId: string;
          userId: string;
          username: string;
          avatarUrl: string | null;
          text: string;
          createdAt: string;
        };

        this.emit({
          type: 'NEW_COMMENT',
          ...data,
        });
      })
      .subscribe((status) => {
        this.handleSubscriptionStatus(channelName, status);
      });

    this.channels.set(channelName, {
      channel,
      episodeId,
      reconnectAttempts: 0,
    });

    return channel;
  }

  /**
   * Unsubscribe from comments channel
   */
  unsubscribeFromComments(episodeId: string): void {
    const channelName = `comments:${episodeId}`;
    this.removeChannel(channelName);
  }

  /**
   * Unsubscribe from episode channel
   */
  unsubscribeFromEpisode(episodeId: string): void {
    const channelName = `episode:${episodeId}`;
    this.activeQuestionByEpisode.delete(episodeId);
    this.removeChannel(channelName);
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    for (const channelName of this.channels.keys()) {
      this.removeChannel(channelName);
    }
    this.activeQuestionByEpisode.clear();
  }

  /**
   * Register event handler
   */
  on<T extends RealtimeEvent['type']>(
    eventType: T,
    handler: EventHandler<Extract<RealtimeEvent, { type: T }>>
  ): UnsubscribeFn {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    this.eventHandlers.get(eventType)!.add(handler as EventHandler);

    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler as EventHandler);
      }
    };
  }

  /**
   * Get connection status for channel
   */
  getConnectionStatus(channelName: string): ConnectionStatus {
    return this.connectionStatuses.get(channelName) ?? 'connecting';
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private emit(event: RealtimeEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
  }

  private setConnectionStatus(channelName: string, status: ConnectionStatus): void {
    this.connectionStatuses.set(channelName, status);
    useRealtimeStore.getState().setConnectionStatus(channelName, status);
  }

  private removeChannel(channelName: string): void {
    const metadata = this.channels.get(channelName);
    if (metadata) {
      if (metadata.reconnectTimer) {
        clearTimeout(metadata.reconnectTimer);
      }
      supabase.removeChannel(metadata.channel);
      this.channels.delete(channelName);
      this.connectionStatuses.delete(channelName);
    }
  }

  private handleSubscriptionStatus(
    channelName: string,
    status: string,
    episodeId?: string,
    userId?: string
  ): void {
    const metadata = this.channels.get(channelName);
    if (!metadata) return;

    if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
      this.setConnectionStatus(channelName, 'connected');
      metadata.reconnectAttempts = 0;
    } else if (
      status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
      status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
    ) {
      this.handleConnectionError(channelName, episodeId, userId);
    }
  }

  private handleConnectionError(
    channelName: string,
    episodeId?: string,
    userId?: string
  ): void {
    const metadata = this.channels.get(channelName);
    if (!metadata) return;

    metadata.reconnectAttempts++;

    if (metadata.reconnectAttempts > this.MAX_ATTEMPTS) {
      this.setConnectionStatus(channelName, 'failed');
      this.emit({
        type: 'CONNECTION_FAILED',
        channelName,
        reason: `Failed after ${this.MAX_ATTEMPTS} attempts`,
      });
      return;
    }

    this.setConnectionStatus(channelName, 'reconnecting');

    const delay = Math.min(
      this.INITIAL_DELAY * Math.pow(this.BACKOFF_MULTIPLIER, metadata.reconnectAttempts - 1),
      this.MAX_DELAY
    );

    metadata.reconnectTimer = setTimeout(() => {
      this.reconnectChannel(channelName, episodeId, userId);
    }, delay);
  }

  private reconnectChannel(channelName: string, episodeId?: string, userId?: string): void {
    // Remove old channel
    const metadata = this.channels.get(channelName);
    if (metadata) {
      supabase.removeChannel(metadata.channel);
      this.channels.delete(channelName);
    }

    // Recreate subscription
    if (episodeId && userId) {
      this.subscribeToEpisode(episodeId, userId);
    } else if (channelName.startsWith('feed:')) {
      const feedEpisodeId = channelName.replace('feed:', '');
      this.subscribeToCommunityFeed(feedEpisodeId === 'global' ? null : feedEpisodeId);
    } else if (channelName.startsWith('comments:')) {
      const commentsEpisodeId = channelName.replace('comments:', '');
      this.subscribeToComments(commentsEpisodeId);
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle postgres_changes events on quiz_events table (NEW — preferred path)
   *
   * This is the preferred delivery mechanism because INSERT events don't have
   * the race conditions inherent in UPDATE-based postgres_changes detection.
   */
  private handleQuizEvent(payload: any, episodeId: string): void {
    const record = payload.new;
    const eventType = record.event_type as string;
    const eventPayload = record.payload || {};

    switch (eventType) {
      case 'QUESTION_ACTIVATED': {
        // Deduplication: quiz_events path may race with legacy questions path.
        const actKey = `act:${episodeId}:${eventPayload.questionId}`;
        if (this.processedActivationKeys.has(actKey)) return;
        this.processedActivationKeys.add(actKey);

        // Track this as the active question for the episode
        this.activeQuestionByEpisode.set(episodeId, eventPayload.questionId);

        this.emit({
          type: 'QUESTION_ACTIVATED',
          questionId: eventPayload.questionId,
          episodeId,
          questionText: eventPayload.questionText,
          optionA: eventPayload.optionA,
          optionB: eventPayload.optionB,
          optionC: eventPayload.optionC ?? null,
          optionD: eventPayload.optionD ?? null,
          timerSeconds: eventPayload.timerSeconds,
          openedAt: eventPayload.openedAt,
          sequenceNumber: eventPayload.sequenceNumber,
        });
        break;
      }

      case 'QUESTION_CLOSED': {
        // Deduplication: quiz_events path may race with legacy questions path.
        const closeKey = `close:${episodeId}:${eventPayload.questionId}`;
        if (this.processedCloseKeys.has(closeKey)) return;
        this.processedCloseKeys.add(closeKey);

        // Only emit QUESTION_CLOSED if this question is the one we
        // consider active. This prevents old-question deactivation events
        // from overriding the current question state.
        const activeId = this.activeQuestionByEpisode.get(episodeId);
        if (eventPayload.questionId && activeId && eventPayload.questionId !== activeId) {
          // This is a close event for a different question — ignore it
          return;
        }

        this.closedQuestionIds.add(eventPayload.questionId);
        this.activeQuestionByEpisode.delete(episodeId);

        this.emit({
          type: 'QUESTION_CLOSED',
          questionId: eventPayload.questionId,
          episodeId,
          correctOption: eventPayload.correctOption,
          closedAt: eventPayload.closedAt,
        });
        break;
      }

      case 'QUESTION_DISMISSED': {
        // Question dismissed — clear tracking and emit event
        this.closedQuestionIds.delete(eventPayload.questionId);

        this.emit({
          type: 'QUESTION_DISMISSED',
          questionId: eventPayload.questionId,
          episodeId,
          dismissedAt: eventPayload.dismissedAt,
        });
        break;
      }
    }
  }

  /**
   * Handle postgres_changes events on questions table (LEGACY — kept as fallback)
   *
   * This is the original delivery mechanism. It's fragile because:
   * - payload.old may not contain is_active (REPLICA IDENTITY DEFAULT)
   * - The deactivation step in activate-question sets closed_at on the OLD
   *   question, which triggers a false QUESTION_CLOSED event
   */
  private handleQuestionChange(payload: any, episodeId: string): void {
    const record = payload.new;

    // FIX: Guard against false QUESTION_CLOSED events from deactivated questions.
    // The activate-question edge function deactivates the old question by setting
    // is_active=false. With REPLICA IDENTITY DEFAULT, payload.old only has {id},
    // so we can't distinguish "deactivated during activation" from "properly closed."
    //
    // To mitigate: check if the currently tracked active question matches.
    // If not, this is likely a deactivation side-effect, not a real close.

    // Question activated — only fire if payload.old doesn't already show it as active
    if (record.is_active && !payload.old?.is_active) {
      // Deduplication: legacy questions path may race with quiz_events path.
      const actKey = `act:${episodeId}:${record.id}`;
      if (this.processedActivationKeys.has(actKey)) return;
      this.processedActivationKeys.add(actKey);

      this.activeQuestionByEpisode.set(episodeId, record.id);

      this.emit({
        type: 'QUESTION_ACTIVATED',
        questionId: record.id,
        episodeId,
        questionText: record.question_text,
        optionA: record.option_a,
        optionB: record.option_b,
        optionC: record.option_c,
        optionD: record.option_d,
        timerSeconds: record.timer_seconds,
        openedAt: record.opened_at,
        sequenceNumber: record.sequence_number,
      });
    }

    // Question closed — guard: only emit if this is the tracked active question
    if (record.closed_at && !this.closedQuestionIds.has(record.id)) {
      // Deduplication: legacy questions path may race with quiz_events path.
      const closeKey = `close:${episodeId}:${record.id}`;
      if (this.processedCloseKeys.has(closeKey)) return;
      this.processedCloseKeys.add(closeKey);

      const activeId = this.activeQuestionByEpisode.get(episodeId);

      // Skip if this close event is for a question that's NOT the current active one
      // (this prevents old question deactivation from firing false QUESTION_CLOSED)
      if (activeId && record.id !== activeId) {
        return;
      }

      this.closedQuestionIds.add(record.id);
      this.activeQuestionByEpisode.delete(episodeId);

      this.emit({
        type: 'QUESTION_CLOSED',
        questionId: record.id,
        episodeId,
        correctOption: record.correct_option,
        closedAt: record.closed_at,
      });
    }
  }

  private async handleLeaderboardChange(
    payload: any,
    episodeId: string,
    userId: string
  ): Promise<void> {
    // Fetch top 10 + viewer entry
    const { data: topTen } = await supabase
      .from('episode_scores')
      .select('rank, user_id, episode_id, total_score, correct_count, profiles(username, avatar_url)')
      .eq('episode_id', episodeId)
      .order('rank', { ascending: true })
      .limit(10);

    const { data: viewerData } = await supabase
      .from('episode_scores')
      .select('rank, total_score, correct_count')
      .eq('episode_id', episodeId)
      .eq('user_id', userId)
      .single();

    if (!topTen) return;

    this.emit({
      type: 'LEADERBOARD_UPDATED',
      episodeId,
      topTen: topTen.map((entry: any) => ({
        rank: entry.rank,
        userId: entry.user_id,
        username: entry.profiles?.username ?? 'Unknown',
        avatarUrl: entry.profiles?.avatar_url ?? null,
        totalScore: entry.total_score,
        correctCount: entry.correct_count,
      })),
      viewerEntry: viewerData
        ? {
            rank: viewerData.rank,
            totalScore: viewerData.total_score,
            correctCount: viewerData.correct_count,
          }
        : null,
    });
  }

  private handleEpisodeChange(payload: any, episodeId: string): void {
    const record = payload.new;
    const old = payload.old;

    // Episode went live
    if (record.is_live && !old?.is_live) {
      this.emit({
        type: 'EPISODE_WENT_LIVE',
        episodeId,
        title: record.title,
        startedAt: record.scheduled_at,
      });
    }

    // Episode ended
    if (record.ended_at && !old?.ended_at) {
      this.emit({
        type: 'EPISODE_ENDED',
        episodeId,
        endedAt: record.ended_at,
        finalRank: null, // Will be populated by leaderboard event
        finalScore: null,
      });
    }
  }

  private async handleDishPhotoInsert(payload: any): Promise<void> {
    const record = payload.new;

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', record.user_id)
      .single();

    this.emit({
      type: 'NEW_DISH_PHOTO',
      photoId: record.id,
      userId: record.user_id,
      username: profile?.username ?? 'Unknown',
      avatarUrl: profile?.avatar_url ?? null,
      imageUrl: record.image_url,
      caption: record.caption ?? '',
      episodeId: record.episode_id,
      createdAt: record.created_at,
    });
  }
}

// Export singleton instance
export const channelManager = new ChannelManager();
