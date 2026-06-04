/**
 * TabBar Component
 * Animated tab switcher with quiz activity indicator
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface TabBarProps {
  activeTab: 'quiz' | 'comments';
  onTabChange: (tab: 'quiz' | 'comments') => void;
  isQuizActive: boolean;
}

export function TabBar({ activeTab, onTabChange, isQuizActive }: TabBarProps) {
  const colors = useColors();
  const indicatorX = useSharedValue(0);
  const dotOpacity = useSharedValue(1);

  // Animate indicator
  useEffect(() => {
    indicatorX.value = withTiming(activeTab === 'quiz' ? 0 : 1, { duration: 200 });
  }, [activeTab]);

  // Pulse dot when quiz active and on comments tab
  useEffect(() => {
    if (isQuizActive && activeTab === 'comments') {
      dotOpacity.value = withRepeat(
        withTiming(0.3, { duration: 800 }),
        -1,
        true
      );
    } else {
      dotOpacity.value = 1;
    }
  }, [isQuizActive, activeTab]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value * 50 + '%' }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

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
            <Animated.View
              style={[
                styles.dot,
                { backgroundColor: colors.live },
                dotStyle,
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

      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: colors.primary },
          indicatorStyle,
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
  },
});
