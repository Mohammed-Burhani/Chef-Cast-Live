/**
 * Admin Settings - App configuration
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';

export default function AdminSettings() {
  const colors = useColors();
  const [autoPublish, setAutoPublish] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  const [autoModeration, setAutoModeration] = React.useState(false);

  const settingSections = [
    {
      title: 'Episode Settings',
      items: [
        {
          label: 'Auto-publish episodes',
          description: 'Automatically set episodes live at scheduled time',
          value: autoPublish,
          onValueChange: setAutoPublish,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          label: 'Admin notifications',
          description: 'Get notified about user activity and system events',
          value: notifications,
          onValueChange: setNotifications,
        },
      ],
    },
    {
      title: 'Moderation',
      items: [
        {
          label: 'Auto-moderation',
          description: 'Automatically filter inappropriate content',
          value: autoModeration,
          onValueChange: setAutoModeration,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {settingSections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>

            {section.items.map((item, itemIdx) => (
              <View key={itemIdx} style={[styles.settingCard, { backgroundColor: colors.surface }]}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                    {item.description}
                  </Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={item.onValueChange}
                  trackColor={{ false: colors.muted, true: `${colors.primary}66` }}
                  thumbColor={item.value ? colors.primary : colors.mutedForeground}
                />
              </View>
            ))}
          </View>
        ))}

        {/* System Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>System</Text>

          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>App Version</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>1.0.0</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Database</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.statusText, { color: colors.success }]}>Connected</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Storage</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>2.4 GB / 10 GB</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Actions</Text>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <Feather name="download-cloud" size={20} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Export Data</Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <Feather name="upload-cloud" size={20} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Import Data</Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <Feather name="refresh-cw" size={20} color={colors.warning} />
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Clear Cache</Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.comingSoon, { backgroundColor: colors.surface }]}>
          <Feather name="settings" size={48} color={colors.mutedForeground} />
          <Text style={[styles.comingSoonText, { color: colors.foreground }]}>
            More settings coming soon
          </Text>
          <Text style={[styles.comingSoonDesc, { color: colors.mutedForeground }]}>
            Advanced configuration options will be added in future updates
          </Text>
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
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  comingSoon: {
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  comingSoonDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
});
