/**
 * Splash screen — animated two-logo entrance
 * Sponsor logo is now the full centered hero, production logo anchors the bottom
 * Pure UI, auto-navigates after 2.8s
 */

import { Image } from "expo-image";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useAuthStore } from "@/store/useAuthStore";
import colors from "@/constants/colors";

const theme = colors.light;

// Prevent native splash from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function SplashScreenComponent() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  // Animation values
  const heroOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(12);
  const bottomOpacity = useSharedValue(0);

  useEffect(() => {
    // Hide native splash immediately
    SplashScreen.hideAsync();

    // Trigger animations
    heroOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    heroTranslateY.value = withDelay(200, withTiming(0, { duration: 500 }));

    bottomOpacity.value = withDelay(700, withTiming(1, { duration: 300 }));

    // Auto-navigate after 2.8s
    const timer = setTimeout(() => {
      if (isLoggedIn) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/welcome");
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  const bottomStyle = useAnimatedStyle(() => ({
    opacity: bottomOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Hero zone — full sponsor logo, big and centered */}
      <View style={styles.heroZone}>
        <Animated.View style={[styles.heroContent, heroStyle]}>
          <Image
            source={require("@/assets/logos/sponsor-with.webp")}
            style={styles.heroLogo}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      {/* Bottom zone — Production, same size as before */}
      <View style={styles.bottomZone}>
        <Animated.View style={[styles.bottomContent, bottomStyle]}>
          <View style={styles.divider} />
          <Text style={styles.labelBottom}>A PRODUCTION BY</Text>
          <Image
            source={require("@/assets/logos/G_Red.webp")}
            style={styles.bottomLogo}
            contentFit="cover"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.cardForeground,
  },
  heroZone: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  heroContent: {
    width: "100%",
    alignItems: "center",
  },
  heroLogo: {
    width: "100%",
    height: 220,
  },
  bottomZone: {
    flex: 0.35,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  bottomContent: {
    alignItems: "center",
    gap: 12,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: theme.accent,
    opacity: 0.4,
    marginBottom: 4,
  },
  labelBottom: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: "#8B7355",
    textTransform: "uppercase",
  },
  bottomLogo: {
    width: 170,
    height: 70,
  },
});