/**
 * AnnouncementsDrawer — right-side notifications drawer opened from the
 * home-screen bell.
 *
 * Lists announcements newest-first, marks them all as seen the moment the
 * drawer opens (client-side only — see useAnnouncementReadStore), and links
 * out to the full /announcements listing page.
 *
 * Uses React Native's core Animated API (no extra deps) via a transparent
 * Modal: the panel slides in from the right edge, and stays mounted during the
 * exit animation before unmounting.
 */

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAnnouncementReadStore } from "@/store/useAnnouncementReadStore";
import { formatRelativeTime } from "@/lib/utils/time";
import type { Database } from '@/types/database';

type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];

type Props = {
  visible: boolean;
  onClose: () => void;
  announcements: AnnouncementRow[];
};

const screenWidth = Dimensions.get('window').width;
const panelWidth = Math.min(420, screenWidth * 0.85);

export function AnnouncementsDrawer({ visible, onClose, announcements }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  // Keep the Modal mounted while the exit animation plays, then unmount.
  const [mounted, setMounted] = useState(false);

  // Mount + mark all as seen as soon as the drawer is opened.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      useAnnouncementReadStore.getState().markAllSeen();
    }
  }, [visible]);

  // Slide in once mounted.
  useEffect(() => {
    if (!mounted || !visible) return;
    translateX.setValue(screenWidth);
    Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [mounted, visible, translateX]);

  // Slide out, then unmount.
  useEffect(() => {
    if (visible || !mounted) return;
    Animated.timing(translateX, { toValue: screenWidth, duration: 220, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setMounted(false);
      }
    );
  }, [visible, mounted, translateX]);

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Dim backdrop — tapping closes the drawer */}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              backgroundColor: colors.surface,
              transform: [{ translateX }],
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerTitleRow}>
              <Feather name="bell" size={20} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* List */}
          {announcements.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="volume-2" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No announcements yet.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {announcements.map((announcement) => (
                <View
                  key={announcement.id}
                  style={[styles.item, { borderBottomColor: colors.border }]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: colors.primary }]}>
                    <Feather name="volume-2" size={14} color="#fff" />
                  </View>
                  <View style={styles.itemBody}>
                    <View style={styles.itemHeader}>
                      <Text
                        style={[styles.itemTitle, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {announcement.title}
                      </Text>
                      <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>
                        {formatRelativeTime(announcement.created_at)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.itemMessage, { color: colors.mutedForeground }]}
                      numberOfLines={3}
                    >
                      {announcement.message}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Footer link to the full listing */}
          {announcements.length > 0 && (
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={[styles.viewAllBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  onClose();
                  router.push('/announcements' as never);
                }}
              >
                <Text style={styles.viewAllText}>View all announcements</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 16 },
  item: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1, gap: 4 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  itemTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  itemTime: { fontSize: 11 },
  itemMessage: { fontSize: 13, lineHeight: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  viewAllBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewAllText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
