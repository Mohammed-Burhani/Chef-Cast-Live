/**
 * Episode Details Screen - /episode/[id]
 * Shows episode information, blog/notes, and access to live if active
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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

export default function EpisodeDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: episodes = [], isLoading } = useEpisodes();

  const episode = episodes.find(ep => ep.id === id);

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

  const isPast = !!episode.ended_at; // Only past if admin explicitly ended
  const isLive = episode.is_live;
  const isUpcoming = !isLive && !isPast;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Episode Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.hero}>
          <Image
            source={{ uri: episode.thumbnail_url || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800' }}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
          />
          {isLive && (
            <View style={[styles.liveBadge, { backgroundColor: colors.live }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE NOW</Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(26,10,46,0.9)"]}
            style={styles.heroGradient}
          />
        </View>

        {/* Episode Info */}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]}>{episode.title}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {new Date(episode.scheduled_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
            {episode.duration_minutes && (
              <View style={styles.metaItem}>
                <Feather name="clock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {episode.duration_minutes} min
                </Text>
              </View>
            )}
          </View>

          {episode.description && (
            <Text style={[styles.description, { color: colors.foreground }]}>
              {episode.description}
            </Text>
          )}
        </View>

        {/* Live Action Button */}
        {isLive && (
          <TouchableOpacity
            style={[styles.liveButton, { backgroundColor: colors.neonRed }]}
            onPress={() => router.push(`/live/${episode.id}` as never)}
          >
            <Feather name="zap" size={18} color="#fff" />
            <Text style={styles.liveButtonText}>Join Live Session</Text>
          </TouchableOpacity>
        )}

        {/* Upcoming Notice */}
        {isUpcoming && (
          <View style={[styles.noticeCard, { backgroundColor: `${colors.accent}15`, borderColor: colors.accent }]}>
            <Feather name="clock" size={18} color={colors.accent} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              This episode hasn't started yet.
              {new Date(episode.scheduled_at) > new Date()
                ? ` Scheduled for ${new Date(episode.scheduled_at).toLocaleDateString()}.`
                : ' The host will start it shortly.'}
            </Text>
          </View>
        )}

        {/* Episode Content / Blog */}
        {isPast && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Episode Highlights</Text>
            <Text style={[styles.blogText, { color: colors.mutedForeground }]}>
              {episode.notes || "Episode notes and highlights will be added by the admin after the live session."}
            </Text>
          </View>
        )}

        {/* Additional Info */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About This Episode</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Feather name="user" size={16} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Chef:</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>Chef Marco</Text>
            </View>
            <View style={styles.infoItem}>
              <Feather name="tag" size={16} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Category:</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>Italian Cuisine</Text>
            </View>
          </View>
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  hero: { position: 'relative', height: 280 },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  liveBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  info: { padding: 20, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13 },
  description: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  liveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  blogText: { fontSize: 14, lineHeight: 22 },
  infoList: { gap: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14, minWidth: 70 },
  infoValue: { fontSize: 14, fontWeight: '600', flex: 1 },
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
