/**
 * VideoPlayer Component
 * YouTube live stream player with quiz-aware fullscreen control
 *
 * - Auto-plays the stream when mounted
 * - Exits fullscreen automatically when quiz becomes active
 * - Blocks fullscreen entry while quiz is active
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import YoutubeIframe from 'react-native-youtube-iframe';
import { useColors } from '@/hooks/useColors';

interface VideoPlayerProps {
  streamUrl: string | null;
  isQuizActive: boolean;
}

function parseYoutubeVideoId(url: string): string | null {
  if (!url) return null;

  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

function VideoPlayerComponent({ streamUrl, isQuizActive }: VideoPlayerProps) {
  const colors = useColors();
  const videoId = streamUrl ? parseYoutubeVideoId(streamUrl) : null;
  const playerRef = useRef<any>(null);
  const wasQuizActiveRef = useRef(isQuizActive);

  // Auto-exit fullscreen when quiz becomes active
  useEffect(() => {
    if (isQuizActive && !wasQuizActiveRef.current) {
      // Quiz just became active — try to exit fullscreen
      try {
        // Web: use the Fullscreen API
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }

        // Native: Try to access the WebView and inject fullscreen exit
        if (Platform.OS !== 'web') {
          const iframeRef = playerRef.current?.ref?.current
            ?? playerRef.current?.webViewRef?.current;
          if (iframeRef?.injectJavaScript) {
            iframeRef.injectJavaScript(
              `try { document.exitFullscreen(); } catch(e) {} true;`
            );
          }
        }
      } catch {
        // Best effort — don't crash if fullscreen exit fails
      }
    }
    wasQuizActiveRef.current = isQuizActive;
  }, [isQuizActive]);

  const handleReady = useCallback(() => {
    // Player is ready — force play in case the play={true} prop doesn't auto-start
    try {
      playerRef.current?.playVideo?.();
    } catch {
      // Best effort — some platforms don't support programmatic play
    }
  }, []);

  if (!videoId) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.surface }]}>
        <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>
          Stream starting soon...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <YoutubeIframe
        key={videoId}
        ref={playerRef}
        videoId={videoId}
        height={300}
        play={true}
        allowWebViewZoom={false}
        onReady={handleReady}
        webViewProps={{
          allowsFullscreenVideo: !isQuizActive,
        }}
      />
      {isQuizActive && (
        <View style={[styles.badge, { backgroundColor: 'rgba(26,10,46,0.9)' }]}>
          <Feather name="lock" size={12} color="#F5F5F5" />
          <Text style={styles.badgeText}>Quiz active — fullscreen locked</Text>
        </View>
      )}
    </View>
  );
}

export const VideoPlayer = React.memo(VideoPlayerComponent);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#F5F5F5',
    fontSize: 11,
    fontWeight: '600',
  },
});
