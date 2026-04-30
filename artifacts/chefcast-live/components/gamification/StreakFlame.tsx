/**
 * Animated streak flame component.
 * Pulses to show the user's current cooking streak.
 * Color shifts from orange to yellow when the streak is active/high.
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

interface StreakFlameProps {
  streak: number;
  size?: "sm" | "md" | "lg";
}

export function StreakFlame({ streak, size = "md" }: StreakFlameProps) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const iconSize = { sm: 20, md: 32, lg: 48 }[size];
  const fontSize = { sm: 12, md: 18, lg: 28 }[size];

  const isActive = streak > 0;
  const flameColor = streak >= 7 ? "#F5A623" : streak >= 3 ? "#FF6B00" : colors.primary;

  useEffect(() => {
    if (!isActive) return;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.92,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isActive, streak]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Feather name="zap" size={iconSize} color={flameColor} />
      </Animated.View>
      <Text style={[styles.count, { fontSize, color: flameColor }]}>{streak}</Text>
      {size !== "sm" && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {streak === 1 ? "day" : "days"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 2,
  },
  count: {
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
});
