/**
 * Announcements Browse Screen
 * Shows every published announcement with its full description, newest first.
 */

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useColors } from "@/hooks/useColors";
import { useAnnouncements } from "@/lib/api/hooks";
import { formatRelativeTime } from "@/lib/utils/time";
import type { Database } from '@/types/database';

type Announcement = Database['public']['Tables']['announcements']['Row'];

export default function AnnouncementsScreen() {
  const colors = useColors();
  const { data: announcements = [], isLoading, refetch } = useAnnouncements();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Announcements</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        {announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="volume-2" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No announcements yet. Check back soon!
            </Text>
          </View>
        ) : (
          announcements.map((announcement) => (
            <View
              key={announcement.id}
              style={[styles.announcementCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Feather name="volume-2" size={16} color="#fff" />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.username, { color: colors.foreground }]}>
                    Foodilicious Team
                  </Text>
                  <Text style={[styles.time, { color: colors.mutedForeground }]}>
                    {formatRelativeTime(announcement.created_at)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {announcement.title}
              </Text>
              <Text style={[styles.message, { color: colors.foreground }]}>
                {announcement.message}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: Platform.OS === 'web' ? 34 : 40 },
  announcementCard: { borderRadius: 14, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  username: { fontSize: 13, fontWeight: '600' },
  time: { fontSize: 11 },
  title: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  message: { fontSize: 14, lineHeight: 21 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
