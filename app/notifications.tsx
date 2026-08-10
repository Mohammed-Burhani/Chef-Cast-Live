/**
 * Notifications center — the in-app inbox opened from the home-screen bell.
 *
 * Two tabs:
 *  - "For You"      — admin-scheduled, personalized notifications delivered to
 *                     this user (`notification_deliveries`). Unread items are
 *                     highlighted; tapping one marks it read and opens its deep
 *                     link (e.g. an episode) when one is attached.
 *  - "Announcements" — the admin-published announcements feed.
 */

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import {
  useMyNotifications,
  useAnnouncements,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/api/hooks";
import { formatRelativeTime } from "@/lib/utils/time";
import type { Database } from '@/types/database';

type DeliveryRow = Database['public']['Tables']['notification_deliveries']['Row'];
type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];

type Tab = 'you' | 'announcements';

export default function NotificationsScreen() {
  const colors = useColors();
  const [tab, setTab] = useState<Tab>('you');

  const { data: deliveries = [], isLoading: loadingDeliveries, refetch: refetchDeliveries } = useMyNotifications();
  const { data: announcements = [], isLoading: loadingAnnouncements, refetch: refetchAnnouncements } = useAnnouncements();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Clear the badge the moment the inbox is opened (mirrors the old drawer).
  useEffect(() => {
    markAllRead.mutate();
  }, []);

  const handleOpen = (delivery: DeliveryRow) => {
    if (!delivery.is_read) {
      markRead.mutate(delivery.id);
    }
    if (delivery.deep_link) {
      router.push(delivery.deep_link as never);
    }
  };

  const unreadCount = deliveries.filter((d) => !d.is_read).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        {tab === 'you' && unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAllRead.mutate()}>
            <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        {([
          { id: 'you', label: 'For You' },
          { id: 'announcements', label: 'Announcements' },
        ] as const).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t.id)}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === t.id ? colors.foreground : colors.mutedForeground },
                tab === t.id && { fontWeight: '700' },
              ]}
            >
              {t.label}
              {t.id === 'you' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'you' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => refetchDeliveries()}
              tintColor={colors.primary}
            />
          }
        >
          {loadingDeliveries ? (
            <LoadingSpinner fullScreen />
          ) : deliveries.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="bell-off" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Nothing here yet. We'll let you know when something fun is coming!
              </Text>
            </View>
          ) : (
            deliveries.map((delivery) => (
              <TouchableOpacity
                key={delivery.id}
                style={[styles.card, { backgroundColor: colors.surface }]}
                onPress={() => handleOpen(delivery)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Feather name="bell" size={16} color="#fff" />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.sender, { color: colors.foreground }]}>
                      Foodilicious
                    </Text>
                    <Text style={[styles.time, { color: colors.mutedForeground }]}>
                      {formatRelativeTime(delivery.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.title,
                      { color: colors.foreground },
                      !delivery.is_read && styles.unreadText,
                    ]}
                  >
                    {delivery.title}
                  </Text>
                  <Text style={[styles.message, { color: colors.mutedForeground }]}>
                    {delivery.body}
                  </Text>
                  {delivery.deep_link ? (
                    <View style={styles.linkRow}>
                      <Feather name="arrow-up-right" size={12} color={colors.primary} />
                      <Text style={[styles.linkText, { color: colors.primary }]}>Open</Text>
                    </View>
                  ) : null}
                </View>
                {!delivery.is_read && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => refetchAnnouncements()}
              tintColor={colors.primary}
            />
          }
        >
          {loadingAnnouncements ? (
            <LoadingSpinner fullScreen />
          ) : announcements.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="volume-2" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No announcements yet. Check back soon!
              </Text>
            </View>
          ) : (
            announcements.map((announcement: AnnouncementRow) => (
              <View
                key={announcement.id}
                style={[styles.card, { backgroundColor: colors.surface }]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                  <Feather name="volume-2" size={16} color="#fff" />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.sender, { color: colors.foreground }]}>
                      Foodilicious Team
                    </Text>
                    <Text style={[styles.time, { color: colors.mutedForeground }]}>
                      {formatRelativeTime(announcement.created_at)}
                    </Text>
                  </View>
                  <Text style={[styles.title, { color: colors.foreground }]}>
                    {announcement.title}
                  </Text>
                  <Text style={[styles.message, { color: colors.mutedForeground }]}>
                    {announcement.message}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  markAll: { fontSize: 13, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText: { fontSize: 15 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    padding: 14,
    position: 'relative',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardBody: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sender: { fontSize: 12, fontWeight: '600' },
  time: { fontSize: 11 },
  title: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  unreadText: { fontWeight: '800' },
  message: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  linkText: { fontSize: 12, fontWeight: '600' },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
