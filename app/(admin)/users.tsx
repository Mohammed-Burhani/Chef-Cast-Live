/**
 * Admin User Management - View and manage all users
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useAllUsers, useToggleUserAdmin } from '@/lib/api/admin-hooks';
import { DataTable, Column } from '@/components/admin/DataTable';

export default function AdminUsers() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading } = useAllUsers({ searchQuery, limit: 100 });
  const toggleAdminMutation = useToggleUserAdmin();

  const handleToggleAdmin = (user: any) => {
    Alert.alert(
      user.is_admin ? 'Remove Admin' : 'Make Admin',
      `${user.is_admin ? 'Remove admin privileges from' : 'Grant admin privileges to'} ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: user.is_admin ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await toggleAdminMutation.mutateAsync({
                userId: user.id,
                isAdmin: !user.is_admin,
              });
              Alert.alert('Success', `User ${user.is_admin ? 'removed from' : 'added to'} admin role`);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const columns: Column<any>[] = [
    {
      key: 'username',
      label: 'Username',
      width: 200,
      render: (user) => (
        <View style={styles.userCell}>
          <Text style={[styles.username, { color: colors.foreground }]}>{user.username}</Text>
          {user.is_admin && (
            <View style={[styles.adminBadge, { backgroundColor: colors.warning }]}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
        </View>
      ),
    },
    {
      key: 'xp',
      label: 'XP',
      width: 100,
      render: (user) => (
        <Text style={[styles.cellText, { color: colors.foreground }]}>
          {user.xp.toLocaleString()}
        </Text>
      ),
    },
    {
      key: 'level_title',
      label: 'Level',
      width: 150,
    },
    {
      key: 'created_at',
      label: 'Joined',
      width: 150,
      render: (user) => (
        <Text style={[styles.cellText, { color: colors.mutedForeground }]}>
          {new Date(user.created_at).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 200,
      render: (user) => (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/(admin)/users/[id]', params: { id: user.id } } as any)}
          >
            <Feather name="eye" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: user.is_admin ? colors.danger : colors.success }]}
            onPress={() => handleToggleAdmin(user)}
          >
            <Feather name={user.is_admin ? 'user-minus' : 'user-plus'} size={14} color="#fff" />
            <Text style={styles.actionBtnText}>{user.is_admin ? 'Remove' : 'Admin'}</Text>
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>User Management</Text>
      </View>

      <View style={styles.content}>
        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search users..."
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Feather name="users" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {data?.total.toLocaleString() || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Users</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Feather name="shield" size={20} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {data?.users.filter(u => u.is_admin).length || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Admins</Text>
          </View>
        </View>

        {/* Table */}
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <DataTable
            columns={columns}
            data={data?.users || []}
            keyExtractor={(user) => user.id}
            emptyMessage="No users found"
          />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  loading: {
    padding: 48,
    alignItems: 'center',
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  cellText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
