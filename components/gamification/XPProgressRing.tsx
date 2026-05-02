/**
 * Animated circular progress ring showing XP progress toward the next level.
 * Uses react-native-svg for the ring shape with a smooth animation.
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { getLevelForXP, getNextLevel, getLevelProgress } from "@/constants/gamification";
import { useColors } from "@/hooks/useColors";

interface XPProgressRingProps {
  xp: number;
  size?: number;
}

export function XPProgressRing({ xp = 0, size = 140 }: XPProgressRingProps) {
  const colors = useColors();
  const safeXP = xp || 0;
  const currentLevel = getLevelForXP(safeXP);
  const nextLevel = getNextLevel(safeXP);
  const progress = getLevelProgress(safeXP);

  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surface}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.center}>
        <Text style={[styles.xpNumber, { color: colors.foreground }]}>
          {safeXP.toLocaleString()}
        </Text>
        <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>XP</Text>
        <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.levelText}>{currentLevel.name}</Text>
        </View>
      </View>

      {nextLevel && (
        <Text style={[styles.nextLevel, { color: colors.mutedForeground }]}>
          {(nextLevel.minXP - safeXP).toLocaleString()} XP to {nextLevel.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    width: 140,
    height: 140,
    gap: 2,
  },
  xpNumber: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: -4,
  },
  levelBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  levelText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  nextLevel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
});
