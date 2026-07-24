/**
 * Realtime Channel Manager
 * Singleton managing all Supabase Realtime subscriptions with reconnection logic
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
   * Unsubscribe from episode channel
   */
  unsubscribeFromEpisode(episodeId: string): void {
    const channelName = `episode:${episodeId}`;
    this.removeChannel(channelName);
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    for (const channelName of this.channels.keys()) {
      this.removeChannel(channelName);
    }
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
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleQuestionChange(payload: any, episodeId: string): void {
    const record = payload.new;

    // Question activated
    if (record.is_active && !payload.old?.is_active) {
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

    // Question closed — guard against false duplicates using a tracked Set
    // because payload.old may only contain the primary key (default replication mode),
    // causing every subsequent update to a closed question to fire QUESTION_CLOSED again.
    if (record.closed_at && !this.closedQuestionIds.has(record.id)) {
      this.closedQuestionIds.add(record.id);
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
