/**
 * User Settings — per-user tabs: Saved (bookmarked posts) and Activities
 * (a user's own posts/comments/likes/saves). Reachable from the Profile screen.
 */

import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/store/useAuthStore";
import { useSavedPosts, useUserActivity } from "@/lib/api/community-hooks";
import { SavedGrid } from "@/components/community/SavedGrid";
import { ActivityList } from "@/components/community/ActivityList";

type TabId = "saved" | "activities";

export default function SettingsScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ tab?: string }>();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;

  const [activeTab, setActiveTab] = useState<TabId>(
    params.tab === "activities" ? "activities" : "saved"
  );

  useEffect(() => {
    if (params.tab === "activities" || params.tab === "saved") {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  const { data: saved = [], isLoading: loadingSaved } = useSavedPosts(userId);
  const { data: activity = [], isLoading: loadingActivity } = useUserActivity(userId);

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: "saved", label: "Saved" },
    { id: "activities", label: "Activities" },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, active && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "saved" ? (
          <SavedGrid posts={saved} isLoading={loadingSaved} />
        ) : (
          <ActivityList items={activity} isLoading={loadingActivity} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
});
