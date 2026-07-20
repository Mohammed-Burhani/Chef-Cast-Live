/**
 * StartingSoon Component
 * Shown when no quiz is active — "Starting Soon" pulse animation
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface StartingSoonProps {
  episodeTitle?: string;
}

export function StartingSoon({ episodeTitle }: StartingSoonProps) {
  const colors = useColors();

  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withDelay(
        1500,
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
    pulseScale.value = withRepeat(
      withDelay(
        1500,
        withTiming(0.95, { duration: 1000 })
      ),
      -1,
      true
    );
  }, [pulseOpacity, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.iconContainer, pulseStyle]}>
        <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}22` }]}>
          <Feather name="clock" size={48} color={colors.primary} />
        </View>
      </Animated.View>

      <Text style={[styles.title, { color: colors.foreground }]}>
        Starting Soon
      </Text>

      {episodeTitle && (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {episodeTitle}
        </Text>
      )}

      <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          The quiz will begin when the host starts the first question. Stay tuned!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
