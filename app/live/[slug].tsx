/**
 * Live Session Screen - /live/[slug]
 * Real-time interaction during live episodes
 */

import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useColors } from "@/hooks/useColors";
import { useEpisodes } from "@/lib/api/hooks";

export default function LiveSessionScreen() {
  const colors = useColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: episodes = [], isLoading } = useEpisodes();

  const episode = episodes.find(ep => ep.slug === slug || ep.id === slug);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!episode) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>Episode not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.livePill, { backgroundColor: colors.live }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <TouchableOpacity style={styles.menuBtn}>
          <Feather name="more-vertical" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>{episode.title}</Text>
        
        <View style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="video" size={48} color={colors.mutedForeground} />
          <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>
            Live streaming view coming soon
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Feather name="info" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            This is the live interaction screen. Features like live quiz, polls, and chat will be integrated here.
          </Text>
        </View>
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
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 20 },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  placeholder: {
    height: 300,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderText: { fontSize: 14 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 14,
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: { fontSize: 18, fontWeight: '600' },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
