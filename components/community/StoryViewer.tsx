/**
 * StoryViewer - Instagram-like story viewer
 * Shows stories with progress bar, tap to navigate, swipe to next/previous
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { Story } from "@/types";

interface StoryViewerProps {
  visible: boolean;
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onUserPress?: (userId: string) => void;
  onStoryViewed?: (storyId: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function StoryViewer({
  visible,
  stories,
  initialIndex = 0,
  onClose,
  onUserPress,
  onStoryViewed,
}: StoryViewerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const progressAnim = useSharedValue(0);

  const currentStory = stories[currentIndex];

  // Record a view when a story becomes the active one.
  useEffect(() => {
    if (visible && currentStory) {
      onStoryViewed?.(currentStory.id);
    }
  }, [visible, currentIndex, currentStory?.id, onStoryViewed]);

  useEffect(() => {
    if (!visible) {
      setProgress(0);
      progressAnim.value = 0;
      return;
    }

    // Reset progress when story changes
    setProgress(0);
    progressAnim.value = 0;

    // Auto-advance progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Move to next story
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 1; // Increment by 1% every 100ms (10s total)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [visible, currentIndex, stories.length, onClose]);

  useEffect(() => {
    progressAnim.value = withTiming(progress / 100, { duration: 100 });
  }, [progress, progressAnim]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  const handleTapLeft = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleTapRight = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleUserPress = () => {
    if (onUserPress && currentStory) {
      onUserPress(currentStory.userId);
    }
  };

  if (!currentStory) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Story Content */}
        <Image
          source={{ uri: currentStory.mediaUrl }}
          style={styles.storyImage}
          contentFit="cover"
        />

        {/* Gradient Overlay */}
        <View style={styles.gradientOverlay} />

        {/* Progress Bars */}
        <View style={[styles.progressContainer, { paddingTop: insets.top + 8 }]}>
          {stories.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressBar,
                { backgroundColor: "rgba(255,255,255,0.3)" },
              ]}
            >
              {index <= currentIndex && (
                <Animated.View
                  style={[
                    styles.progressFill,
                    { backgroundColor: "#fff" },
                    progressStyle,
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={handleUserPress}
            style={styles.userInfo}
          >
            <Image
              source={{ uri: currentStory.avatarUrl }}
              style={[styles.avatar, { backgroundColor: colors.muted }]}
              contentFit="cover"
            />
            <View style={styles.userDetails}>
              <Text style={[styles.username, { color: "#fff" }]}>
                {currentStory.username}
              </Text>
              <Text style={[styles.time, { color: "rgba(255,255,255,0.8)" }]}>
                {new Date(currentStory.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {currentStory.caption && (
          <View style={[styles.captionContainer, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={[styles.caption, { color: "#fff" }]}>
              {currentStory.caption}
            </Text>
          </View>
        )}

        {/* Tap Areas */}
        <TouchableOpacity style={styles.tapLeft} onPress={handleTapLeft} />
        <TouchableOpacity style={styles.tapRight} onPress={handleTapRight} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  storyImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 8,
    gap: 4,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  progressBar: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userDetails: {
    gap: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: "700",
  },
  time: {
    fontSize: 12,
  },
  closeButton: {
    padding: 8,
  },
  captionContainer: {
    paddingHorizontal: 16,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  tapLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "30%",
    height: "100%",
  },
  tapRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "30%",
    height: "100%",
  },
});