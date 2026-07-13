import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useColors } from '@/hooks/useColors';

export default function AdminLayout() {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AdminSidebar />
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});
