/**
 * VideoPlayer Component
 * YouTube live stream player with quiz-aware fullscreen control
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
        videoId={videoId}
        height={300}
        play={false}
        allowWebViewZoom={false}
        webViewProps={{
          allowsFullscreenVideo: !isQuizActive,
        }}
      />
      {isQuizActive && (
        <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <Feather name="lock" size={12} color="#fff" />
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
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
