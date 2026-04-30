/**
 * CookTimer — countdown timer for recipe steps.
 * Shows remaining time with a circular progress ring.
 * Integrates with the useCookAlongStore for timer state.
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import { useCookAlongStore } from "@/store/useCookAlongStore";

interface CookTimerProps {
  totalSeconds: number;
}

export function CookTimer({ totalSeconds }: CookTimerProps) {
  const colors = useColors();
  const { timerRunning, timerRemainingSeconds, startTimer, pauseTimer, tickTimer, resetTimer } =
    useCookAlongStore();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  useEffect(() => {
    if (timerRemainingSeconds === 0 && timerRunning) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [timerRemainingSeconds, timerRunning]);

  const minutes = Math.floor(timerRemainingSeconds / 60);
  const seconds = timerRemainingSeconds % 60;
  const progress = totalSeconds > 0 ? timerRemainingSeconds / totalSeconds : 0;

  const size = 100;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const isDone = timerRemainingSeconds === 0 && totalSeconds > 0;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surface}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDone ? colors.success : colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={[styles.time, { color: isDone ? colors.success : colors.foreground }]}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => (timerRunning ? pauseTimer() : startTimer())}
          style={[styles.controlBtn, { backgroundColor: colors.primary }]}
        >
          <Feather
            name={timerRunning ? "pause" : isDone ? "check" : "play"}
            size={16}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={resetTimer}
          style={[styles.controlBtn, { backgroundColor: colors.surface }]}
        >
          <Feather name="rotate-ccw" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 10,
  },
  svg: {
    position: "absolute",
  },
  center: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  controls: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
