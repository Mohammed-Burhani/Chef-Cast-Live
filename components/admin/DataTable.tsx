/**
 * Reusable data table component for admin dashboard
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export type Column<T> = {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  width?: number;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  onRowPress?: (item: T) => void;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
};

export function DataTable<T>({
  columns,
  data,
  onRowPress,
  emptyMessage = 'No data available',
  keyExtractor,
}: DataTableProps<T>) {
  const colors = useColors();

  if (data.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
        <Feather name="inbox" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {columns.map((col) => (
          <View
            key={col.key}
            style={[styles.headerCell, col.width && { width: col.width }]}
          >
            <Text style={[styles.headerText, { color: colors.mutedForeground }]}>
              {col.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Rows */}
      <ScrollView style={styles.scroll}>
        {data.map((item) => {
          const key = keyExtractor(item);
          const Wrapper = onRowPress ? TouchableOpacity : View;

          return (
            <Wrapper
              key={key}
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => onRowPress?.(item)}
              activeOpacity={onRowPress ? 0.7 : 1}
            >
              {columns.map((col) => (
                <View
                  key={col.key}
                  style={[styles.cell, col.width && { width: col.width }]}
                >
                  {col.render ? (
                    col.render(item)
                  ) : (
                    <Text style={[styles.cellText, { color: colors.foreground }]}>
                      {String((item as any)[col.key] ?? '-')}
                    </Text>
                  )}
                </View>
              ))}
            </Wrapper>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCell: {
    flex: 1,
    paddingRight: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scroll: {
    maxHeight: 600,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cell: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
  },
  emptyState: {
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
