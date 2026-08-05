/**
 * Realtime React Hooks
 * Typed hooks for subscribing to realtime events
 */

import { useEffect, useRef } from 'react';
import { channelManager } from './channelManager';
import { useAuthStore } from '@/store/useAuthStore';
import type {
  ConnectionStatus,
  QuestionActivatedEvent,
  QuestionClosedEvent,
  QuestionDismissedEvent,
  LeaderboardUpdatedEvent,
  EpisodeWentLiveEvent,
  EpisodeEndedEvent,
  EpisodeUpdatedEvent,
  BadgeAwardedEvent,
  XpUpdatedEvent,
  NewDishPhotoEvent,
  CommentEvent,
} from './types';

/**
 * Subscribe to episode channel and manage connection
 */
export function useEpisodeChannel(episodeId: string | null): {
  connectionStatus: ConnectionStatus;
} {
  const user = useAuthStore((s) => s.user);
  const statusRef = useRef<ConnectionStatus>('connecting');

  useEffect(() => {
    if (!episodeId || !user?.id) return;

    channelManager.subscribeToEpisode(episodeId, user.id);

    // Poll connection status
    const interval = setInterval(() => {
      statusRef.current = channelManager.getConnectionStatus(`episode:${episodeId}`);
    }, 1000);

    return () => {
      clearInterval(interval);
      channelManager.unsubscribeFromEpisode(episodeId);
    };
  }, [episodeId, user?.id]);

  return {
    connectionStatus: statusRef.current,
  };
}

/**
 * Subscribe to question activation and close events
 */
export function useQuestionEvents(
  episodeId: string | null,
  handlers: {
    onActivated?: (event: QuestionActivatedEvent) => void;
    onClosed?: (event: QuestionClosedEvent) => void;
  }
): void {
  const onActivatedRef = useRef(handlers.onActivated);
  const onClosedRef = useRef(handlers.onClosed);

  // Keep refs updated
  useEffect(() => {
    onActivatedRef.current = handlers.onActivated;
    onClosedRef.current = handlers.onClosed;
  }, [handlers.onActivated, handlers.onClosed]);

  useEffect(() => {
    if (!episodeId) return;

    const unsubscribers: Array<() => void> = [];

    if (onActivatedRef.current) {
      const unsub = channelManager.on('QUESTION_ACTIVATED', (event) => {
        if (event.episodeId === episodeId && onActivatedRef.current) {
          onActivatedRef.current(event);
        }
      });
      unsubscribers.push(unsub);
    }

    if (onClosedRef.current) {
      const unsub = channelManager.on('QUESTION_CLOSED', (event) => {
        if (event.episodeId === episodeId && onClosedRef.current) {
          onClosedRef.current(event);
        }
      });
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [episodeId]);
}

/**
 * Subscribe to question dismissed events
 */
export function useQuestionDismissedEvent(
  episodeId: string | null,
  handler: (event: QuestionDismissedEvent) => void
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!episodeId) return;

    const unsub = channelManager.on('QUESTION_DISMISSED', (event) => {
      if (event.episodeId === episodeId && handlerRef.current) {
        handlerRef.current(event);
      }
    });

    return unsub;
  }, [episodeId]);
}

/**
 * Subscribe to leaderboard updates
 */
export function useLeaderboardEvents(
  episodeId: string | null,
  handler: (event: LeaderboardUpdatedEvent) => void
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!episodeId) return;

    const unsub = channelManager.on('LEADERBOARD_UPDATED', (event) => {
      if (event.episodeId === episodeId && handlerRef.current) {
        handlerRef.current(event);
      }
    });

    return unsub;
  }, [episodeId]);
}

/**
 * Subscribe to episode state changes (live/ended)
 */
export function useEpisodeStateEvents(
  episodeId: string | null,
  handlers: {
    onLive?: (event: EpisodeWentLiveEvent) => void;
    onEnded?: (event: EpisodeEndedEvent) => void;
  }
): void {
  const onLiveRef = useRef(handlers.onLive);
  const onEndedRef = useRef(handlers.onEnded);

  useEffect(() => {
    onLiveRef.current = handlers.onLive;
    onEndedRef.current = handlers.onEnded;
  }, [handlers.onLive, handlers.onEnded]);

  useEffect(() => {
    if (!episodeId) return;

    const unsubscribers: Array<() => void> = [];

    if (onLiveRef.current) {
      const unsub = channelManager.on('EPISODE_WENT_LIVE', (event) => {
        if (event.episodeId === episodeId && onLiveRef.current) {
          onLiveRef.current(event);
        }
      });
      unsubscribers.push(unsub);
    }

    if (onEndedRef.current) {
      const unsub = channelManager.on('EPISODE_ENDED', (event) => {
        if (event.episodeId === episodeId && onEndedRef.current) {
          onEndedRef.current(event);
        }
      });
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [episodeId]);
}

/**
 * Subscribe to global episode updates (the `episode-feed` channel).
 *
 * Used by the home screen to refresh the "Going Live Soon" rail and live banner
 * the moment a scheduled episode flips to live — no 30s poll wait.
 */
export function useEpisodeFeedEvents(handler: (event: EpisodeUpdatedEvent) => void): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    channelManager.subscribeToEpisodeFeed();

    const unsub = channelManager.on('EPISODE_UPDATED', (event) => {
      if (handlerRef.current) {
        handlerRef.current(event);
      }
    });

    return unsub;
  }, []);
}

/**
 * Subscribe to badge awards for current user
 */
export function useBadgeEvents(handler: (event: BadgeAwardedEvent) => void): void {
  const handlerRef = useRef(handler);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!user?.id) return;

    const unsub = channelManager.on('BADGE_AWARDED', (event) => {
      if (handlerRef.current) {
        handlerRef.current(event);
      }
    });

    return unsub;
  }, [user?.id]);
}

/**
 * Subscribe to XP updates for current user
 */
export function useXpEvents(handler: (event: XpUpdatedEvent) => void): void {
  const handlerRef = useRef(handler);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!user?.id) return;

    const unsub = channelManager.on('XP_UPDATED', (event) => {
      if (handlerRef.current) {
        handlerRef.current(event);
      }
    });

    return unsub;
  }, [user?.id]);
}

/**
 * Subscribe to community feed (dish photos)
 */
export function useCommunityFeedEvents(
  episodeId: string | null,
  handler: (event: NewDishPhotoEvent) => void
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    channelManager.subscribeToCommunityFeed(episodeId);

    const unsub = channelManager.on('NEW_DISH_PHOTO', (event) => {
      // Filter by episode if specified
      if (episodeId && event.episodeId !== episodeId) return;

      if (handlerRef.current) {
        handlerRef.current(event);
      }
    });

    return () => {
      unsub();
      // Note: Don't unsubscribe channel here as multiple components may use it
    };
  }, [episodeId]);
}

/**
 * Subscribe to live comments for an episode
 * Uses Broadcast for low-latency real-time delivery
 */
export function useCommentEvents(
  episodeId: string | null,
  handler: (event: CommentEvent) => void
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!episodeId) return;

    // Subscribe to comments channel
    channelManager.subscribeToComments(episodeId);

    // Listen for new comment events
    const unsub = channelManager.on('NEW_COMMENT', (event) => {
      if (event.episodeId === episodeId && handlerRef.current) {
        handlerRef.current(event);
      }
    });

    return () => {
      unsub();
      // Don't unsubscribe the channel here — the comment store manages
      // channel lifecycle tied to the component mount/unmount
    };
  }, [episodeId]);
}
