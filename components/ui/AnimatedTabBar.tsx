/**
 * Custom animated bottom tab bar.
 *
 * Modern "flowy" feel: a floating capsule glides between tabs on a spring.
 * The capsule wraps the icon, label and dot of the active tab (nothing pokes
 * out), the icon cross-fades from muted to bright colour, labels animate
 * from muted to bright, and a tiny dot pulses at the bottom of the capsule.
 * Adds a subtle haptic tick on each switch (native only).
 *
 * Uses `react-native-reanimated` — keep `react-native-reanimated/plugin`
 * first in the Babel plugin list (already configured).
 */

import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

/** Route name -> (tab label, Feather icon). Also acts as the visibility allowlist. */
const TAB_META: Record<string, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  index: { label: "Home", icon: "home" },
  community: { label: "Community", icon: "users" },
  achievements: { label: "Achievements", icon: "award" },
  profile: { label: "Profile", icon: "user" },
};

/** Smooth, slightly overshooting spring — the "flowy" glide of the capsule. */
const SLIDE_SPRING = { damping: 20, stiffness: 220, mass: 0.9 };
/** Quick bouncy pop for the active icon / dot. */
const POP_SPRING = { damping: 12, stiffness: 320, mass: 0.6 };

type TabRoute = { key: string; name: string; params?: object };
type Frame = { x: number; width: number };

/**
 * Structural subset of `BottomTabBarProps` (expo-router bundles its own
 * @react-navigation copy, so we avoid importing internal type paths).
 */
type AnimatedTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: { href?: string | null } }>;
  navigation: {
    emit: (event: {
      type: string;
      target?: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented?: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

export default function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: AnimatedTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  // Only render tabs that are (a) in our allowlist and (b) not hidden via href: null.
  const visible = state.routes.filter(
    (r) => TAB_META[r.name] && descriptors[r.key]?.options.href !== null
  );
  const activeRouteKey = state.routes[state.index]?.key;
  const activeKey =
    visible.some((r) => r.key === activeRouteKey) ? activeRouteKey : visible[0]?.key;

  // Bar geometry (handles device bottom inset + web sizing).
  const TOP_PAD = 8;
  const BOTTOM_PAD = isWeb ? 8 : Math.max(insets.bottom - 4, 6);
  const BAR_H = 62 + insets.bottom;
  const contentH = BAR_H - TOP_PAD - BOTTOM_PAD;
  // Tall enough to hold icon + label + dot so nothing pokes out of the capsule.
  const CAPSULE_H = Math.min(44, contentH - 2);
  const CAPSULE_TOP = TOP_PAD + (contentH - CAPSULE_H) / 2;

  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const pillOpacity = useSharedValue(0);
  const frames = useRef<Record<string, Frame>>({});
  const placed = useRef(false);

  const movePill = useCallback(
    (key: string, animate: boolean) => {
      const f = frames.current[key];
      if (!f) return;
      // Nudge the capsule in from the full tab width for a floating look.
      const inset = isWeb ? 14 : 12;
      const x = f.x + inset;
      const w = f.width - inset * 2;
      if (animate) {
        pillX.value = withSpring(x, SLIDE_SPRING);
        pillW.value = withSpring(w, SLIDE_SPRING);
        pillOpacity.value = withSpring(1, SLIDE_SPRING);
      } else {
        pillX.value = x;
        pillW.value = w;
        pillOpacity.value = 1;
      }
    },
    [isWeb, pillX, pillW, pillOpacity]
  );

  // Glide the capsule whenever the active tab changes.
  useEffect(() => {
    if (!activeKey) return;
    if (placed.current) {
      movePill(activeKey, true);
    } else if (frames.current[activeKey]) {
      movePill(activeKey, false);
      placed.current = true;
    }
  }, [activeKey, movePill]);

  // Measure each tab so the capsule can target it. The first measurement of
  // the active tab places the capsule without animating (avoids an entrance sweep).
  const handleTabLayout = useCallback(
    (key: string, x: number, width: number) => {
      frames.current[key] = { x, width };
      if (!placed.current && key === activeKey) {
        requestAnimationFrame(() => {
          if (!placed.current) {
            movePill(key, false);
            placed.current = true;
          }
        });
      }
    },
    [activeKey, movePill]
  );

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillW.value,
    opacity: pillOpacity.value,
  }));

  return (
    <View
      style={[
        styles.bar,
        {
          height: BAR_H,
          paddingTop: TOP_PAD,
          paddingBottom: BOTTOM_PAD,
          backgroundColor: isIOS ? "transparent" : `${colors.background}EE`,
          borderTopColor: colors.border,
        },
      ]}
    >
      {isIOS && <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />}

      <View pointerEvents="none" style={[styles.hairline, { backgroundColor: colors.border }]} />

      {/* Gliding active-tab capsule (behind the buttons, non-interactive). */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.capsule,
          {
            top: CAPSULE_TOP,
            height: CAPSULE_H,
            borderRadius: CAPSULE_H / 2,
            backgroundColor: `${colors.primary}22`,
            borderColor: `${colors.primary}4D`,
          },
          pillStyle,
        ]}
      />

      {visible.map((route) => {
        const { label, icon } = TAB_META[route.name];
        const active = route.key === activeKey;
        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!event.defaultPrevented) {
            navigation.navigate(route.name);
          }
          if (!isWeb) Haptics.selectionAsync().catch(() => {});
        };
        const onLongPress = () =>
          navigation.emit({ type: "tabLongPress", target: route.key });

        return (
          <TabButton
            key={route.key}
            label={label}
            icon={icon}
            active={active}
            tint={colors.primary}
            foreground={colors.foreground}
            muted={colors.mutedForeground}
            onPress={onPress}
            onLongPress={onLongPress}
            onLayout={(x, width) => handleTabLayout(route.key, x, width)}
          />
        );
      })}
    </View>
  );
}

type TabButtonProps = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  tint: string;
  foreground: string;
  muted: string;
  onPress: () => void;
  onLongPress: () => void;
  onLayout: (x: number, width: number) => void;
};

function TabButton({
  label,
  icon,
  active,
  tint,
  foreground,
  muted,
  onPress,
  onLongPress,
  onLayout,
}: TabButtonProps) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, POP_SPRING);
  }, [active, progress]);

  // The icon stays constant-size — the active effect is the colour
  // cross-fade below. No scaling, so nothing pokes out of the capsule.
  const mutedIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
  }));
  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [muted, foreground]),
    opacity: interpolate(progress.value, [0, 1], [0.65, 1]),
  }));

  // Tiny dot at the bottom of the capsule that scales in.
  const dotStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.3, 1]) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onLayout={(e) => onLayout(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={active ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, mutedIconStyle]}>
          <Feather name={icon} size={22} color={muted} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, activeIconStyle]}>
          <Feather name={icon} size={22} color={tint} />
        </Animated.View>
      </View>

      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>

      <Animated.View style={[styles.dot, { backgroundColor: tint }, dotStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  hairline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  capsule: {
    position: "absolute",
    left: 0,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginTop: 1,
  },
});
