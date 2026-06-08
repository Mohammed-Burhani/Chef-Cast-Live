/**
 * Splash screen — animated three-logo entrance
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

// Prevent native splash from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function SplashScreenComponent() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  // Animation values
  const topOpacity = useSharedValue(0);
  const heroOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(12);
  const bottomOpacity = useSharedValue(0);

  useEffect(() => {
    // Hide native splash immediately
    SplashScreen.hideAsync();

    // Trigger animations
    topOpacity.value = withDelay(200, withTiming(0.7, { duration: 300 }));
    
    heroOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    heroTranslateY.value = withDelay(500, withTiming(0, { duration: 500 }));
    
    bottomOpacity.value = withDelay(900, withTiming(1, { duration: 300 }));

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

  const topStyle = useAnimatedStyle(() => ({
    opacity: topOpacity.value,
  }));

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

      {/* Top zone — Sponsor/Partner */}
      <View style={styles.topZone}>
        <Animated.View style={[styles.topContent, topStyle]}>
          <Text style={styles.labelTop}>PRESENTED BY</Text>
          <Image
            source={require("@/assets/logos/sponsor-haier.png")}
            style={styles.topLogo}
            contentFit="cover"
          />
        </Animated.View>
      </View>

      {/* Middle zone — Hero Foodilicious */}
      <View style={styles.middleZone}>
        <Animated.View style={heroStyle}>
          <Image
            source={require("@/assets/logos/G_Foodilicious_Clean.png")}
            style={styles.heroLogo}
            contentFit="cover"
          />
        </Animated.View>
      </View>

      {/* Bottom zone — Production */}
      <View style={styles.bottomZone}>
        <Animated.View style={[styles.bottomContent, bottomStyle]}>
          <View style={styles.divider} />
          <Text style={styles.labelBottom}>A PRODUCTION BY</Text>
          <Image
            source={require("@/assets/logos/G_Red.png")}
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
    backgroundColor: "#0A0905",
  },
  topZone: {
    flex: 0.15,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  topContent: {
    alignItems: "center",
    gap: 8,
  },
  labelTop: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: "#8B7355",
    textTransform: "uppercase",
  },
  topLogo: {
    width: 100,
    height: 40,
  },
  middleZone: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center",
  },
  heroLogo: {
    width: 280,
    height: 120,
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
    backgroundColor: "#D4AF37",
    opacity: 0.3,
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
