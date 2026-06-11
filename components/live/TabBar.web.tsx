/**
 * TabBar Component - Web version (no reanimated)
 * Non-animated tab switcher for web builds
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface TabBarProps {
  activeTab: 'quiz' | 'comments';
  onTabChange: (tab: 'quiz' | 'comments') => void;
  isQuizActive: boolean;
}

export function TabBar({ activeTab, onTabChange, isQuizActive }: TabBarProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange('quiz')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'quiz' ? colors.foreground : colors.mutedForeground,
                fontWeight: activeTab === 'quiz' ? '700' : '500',
              },
            ]}
          >
            Quiz
          </Text>
          {isQuizActive && activeTab === 'comments' && (
            <View
              style={[
                styles.dot,
                { backgroundColor: colors.live },
              ]}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange('comments')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'comments' ? colors.foreground : colors.mutedForeground,
                fontWeight: activeTab === 'comments' ? '700' : '500',
              },
            ]}
          >
            Comments
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.indicator,
          { backgroundColor: colors.primary },
          { transform: [{ translateX: activeTab === 'quiz' ? 0 : '100%' }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    position: 'relative',
  },
  tabs: {
    flexDirection: 'row',
    height: 48,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabText: {
    fontSize: 15,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '50%',
    height: 2,
    transition: 'transform 0.2s ease',
  },
});
