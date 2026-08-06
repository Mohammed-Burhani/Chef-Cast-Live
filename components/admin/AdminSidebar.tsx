import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/useAuthStore';

type NavItem = {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', route: '/(admin)' },
  { id: 'episodes', label: 'Episodes', icon: 'tv', route: '/(admin)/episodes' },
  { id: 'live', label: 'Live Control', icon: 'radio', route: '/(admin)/live-control' },
  { id: 'community', label: 'Community', icon: 'users', route: '/(admin)/community' },
  { id: 'users', label: 'Users', icon: 'user', route: '/(admin)/users' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2', route: '/(admin)/analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '/(admin)/settings' },
];

export function AdminSidebar() {
  const colors = useColors();
  const { user, logout } = useAuthStore();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const getActiveId = () => {
    if (pathname === '/(admin)' || pathname === '/') return 'dashboard';
    if (pathname.includes('/episodes')) return 'episodes';
    if (pathname.includes('/live-control')) return 'live';
    if (pathname.includes('/community')) return 'community';
    if (pathname.includes('/users')) return 'users';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  const selectedNav = getActiveId();

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
      <View style={styles.sidebarHeader}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Feather name="zap" size={24} color="#fff" />
        </View>
        <Text style={[styles.logoText, { color: colors.foreground }]}>Foodilicious Admin</Text>
      </View>

      <ScrollView style={styles.nav} contentContainerStyle={styles.navContent} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.navItem,
              selectedNav === item.id && { backgroundColor: `${colors.primary}22` },
            ]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Feather
              name={item.icon}
              size={20}
              color={selectedNav === item.id ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.navLabel,
                {
                  color: selectedNav === item.id ? colors.primary : colors.mutedForeground,
                },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.sidebarFooter, { borderTopColor: colors.border }]}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase()}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>{user?.username}</Text>
            <Text style={[styles.role, { color: colors.mutedForeground }]}>Admin</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="log-out" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
  },
  nav: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navContent: {
    flexGrow: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
  },
  role: {
    fontSize: 11,
  },
  logoutBtn: {
    padding: 8,
  },
});
