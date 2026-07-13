/**
 * Admin Live Control - Control live episodes and active questions
 */

import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useEpisodes } from '@/lib/api/hooks';
import { useToggleEpisodeLive } from '@/lib/api/admin-hooks';

export default function AdminLiveControl() {
  const colors = useColors();
  const { data: episodes = [], isLoading } = useEpisodes();
  const toggleLiveMutation = useToggleEpisodeLive();

  const liveEpisodes = episodes.filter((ep) => ep.is_live);
  const upcomingEpisodes = episodes.filter((ep) => {
    const isPast = new Date(ep.scheduled_at) < new Date();
    return !ep.is_live && !ep.ended_at && !isPast;
  });

  const handleGoLive = (episode: any) => {
    Alert.alert(
      'Go Live',
      `Start streaming "${episode.title}"?\n\nOnly one episode can be live at a time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go Live',
          style: 'default',
          onPress: async () => {
            try {
              await toggleLiveMutation.mutateAsync({
                episodeId: episode.id,
                isLive: true,
              });
              Alert.alert('Success', 'Episode is now live!');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleStopLive = (episode: any) => {
    Alert.alert(
      'Stop Stream',
      `End live streaming for "${episode.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await toggleLiveMutation.mutateAsync({
                episodeId: episode.id,
                isLive: false,
              });
              Alert.alert('Success', 'Stream ended');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Live Control</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Live Episodes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Currently Live ({liveEpisodes.length})
          </Text>

          {liveEpisodes.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Feather name="radio" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No live episodes</Text>
            </View>
          ) : (
            liveEpisodes.map((ep) => (
              <View key={ep.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.liveDot, { backgroundColor: colors.live }]} />
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{ep.title}</Text>
                    <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                      Started: {new Date(ep.scheduled_at).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/(admin)/questions/${ep.id}` as any)}
                  >
                    <Feather name="help-circle" size={18} color="#fff" />
                    <Text style={styles.actionText}>Manage Questions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                    onPress={() => handleStopLive(ep)}
                  >
                    <Feather name="stop-circle" size={18} color="#fff" />
                    <Text style={styles.actionText}>End Stream</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Upcoming Episodes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ready to Go Live</Text>

          {upcomingEpisodes.length === 0 ? (
            <Text style={[styles.emptySmall, { color: colors.mutedForeground }]}>No upcoming episodes</Text>
          ) : (
            upcomingEpisodes.map((ep) => (
              <View key={ep.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{ep.title}</Text>
                  <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                    Scheduled: {new Date(ep.scheduled_at).toLocaleString()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.goLiveBtn, { backgroundColor: colors.success }]}
                  onPress={() => handleGoLive(ep)}
                >
                  <Feather name="play-circle" size={20} color="#fff" />
                  <Text style={styles.goLiveText}>Go Live</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyCard: {
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySmall: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  goLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goLiveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
