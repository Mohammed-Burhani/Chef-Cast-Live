/**
 * Main tab bar layout with 5 tabs:
 * Home, Cook-Along, Community, Achievements, Profile
 *
 * Uses a custom animated tab bar (AnimatedTabBar) for a modern, flowy
 * switching effect — a capsule glides between tabs, icons pop, labels animate.
 */

import { Tabs } from "expo-router";
import React from "react";

import AnimatedTabBar from "@/components/ui/AnimatedTabBar";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="achievements" options={{ title: "Achievements" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="cook-along" options={{ href: null }} />
    </Tabs>
  );
}
