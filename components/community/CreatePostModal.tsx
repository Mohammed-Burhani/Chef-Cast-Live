/**
 * CreatePostModal - Instagram-like post creation interface
 * Allows users to pick images, add captions, tags, and location
 */

import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/store/useAuthStore";
import { useCommunityStore } from "@/store/communityStore";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreatePostModal({ visible, onClose }: CreatePostModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const createPost = useCommunityStore((s) => s.createPost);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Camera permission is required to take photos");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert("Image required", "Please select or take a photo");
      return;
    }

    if (!caption.trim()) {
      Alert.alert("Caption required", "Please add a caption to your post");
      return;
    }

    setIsSubmitting(true);

    try {
      const tagArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await createPost({
        userId: user?.id || "me",
        username: user?.username || "you",
        avatarUrl: user?.avatarUrl,
        photoUrl: imageUri,
        caption: caption.trim(),
        location: location.trim() || undefined,
        tags: tagArray.length > 0 ? tagArray : undefined,
      });

      // Reset form
      setImageUri(null);
      setCaption("");
      setLocation("");
      setTags("");
      setIsSubmitting(false);
      onClose();

      if (Platform.OS !== "web") {
        Alert.alert("Success", "Your post has been shared!");
      }
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert("Error", "Failed to create post");
    }
  };

  const handleCancel = () => {
    if (imageUri || caption.trim()) {
      Alert.alert(
        "Discard post?",
        "You have unsaved changes. Are you sure you want to discard this post?",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setImageUri(null);
              setCaption("");
              setLocation("");
              setTags("");
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.foreground }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.headerButton, styles.shareButton]}
            disabled={!imageUri || !caption.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <LoadingSpinner size="small" />
            ) : (
              <Text
                style={[
                  styles.headerButtonText,
                  { color: imageUri && caption.trim() ? colors.primary : colors.mutedForeground },
                ]}
              >
                Share
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Image Upload */}
          {!imageUri ? (
            <View style={[styles.imageUploadSection, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.uploadButton, { borderColor: colors.border }]}
                onPress={pickImage}
              >
                <Feather name="image" size={48} color={colors.mutedForeground} />
                <Text style={[styles.uploadText, { color: colors.mutedForeground }]}>
                  Select from Gallery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadButton, { borderColor: colors.border }]}
                onPress={takePhoto}
              >
                <Feather name="camera" size={48} color={colors.mutedForeground} />
                <Text style={[styles.uploadText, { color: colors.mutedForeground }]}>
                  Take Photo
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePreviewSection}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
              <TouchableOpacity
                style={[styles.changeImageButton, { backgroundColor: colors.surface }]}
                onPress={() => setImageUri(null)}
              >
                <Feather name="x-circle" size={20} color={colors.danger} />
                <Text style={[styles.changeImageText, { color: colors.danger }]}>Change</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Caption Input */}
          <View style={[styles.inputSection, { backgroundColor: colors.surface }]}>
            <View style={styles.inputHeader}>
              <Feather name="edit-2" size={16} color={colors.primary} />
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Caption</Text>
            </View>
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              placeholder="Write a caption..."
              placeholderTextColor={colors.mutedForeground}
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={4}
              maxLength={2200}
            />
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {caption.length}/2200
            </Text>
          </View>

          {/* Location Input */}
          <View style={[styles.inputSection, { backgroundColor: colors.surface }]}>
            <View style={styles.inputHeader}>
              <Feather name="map-pin" size={16} color={colors.primary} />
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Location</Text>
            </View>
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              placeholder="Add location (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Tags Input */}
          <View style={[styles.inputSection, { backgroundColor: colors.surface }]}>
            <View style={styles.inputHeader}>
              <Feather name="hash" size={16} color={colors.primary} />
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Tags</Text>
            </View>
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              placeholder="Add tags separated by commas (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={tags}
              onChangeText={setTags}
            />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Example: Italian, Homemade, Vegetarian
            </Text>
          </View>

          {/* Episode Tagging */}
          <View style={[styles.inputSection, { backgroundColor: colors.surface }]}>
            <View style={styles.inputHeader}>
              <Feather name="tv" size={16} color={colors.primary} />
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Tag Episode</Text>
            </View>
            <TouchableOpacity
              style={[styles.episodeButton, { borderColor: colors.border }]}
              onPress={() => {
                // TODO: Implement episode picker
                Alert.alert("Coming soon", "Episode tagging will be available soon!");
              }}
            >
              <Text style={[styles.episodeButtonText, { color: colors.mutedForeground }]}>
                Select an episode (optional)
              </Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  shareButton: {
    opacity: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  imageUploadSection: {
    padding: 20,
    gap: 16,
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "500",
  },
  imagePreviewSection: {
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: 400,
  },
  changeImageButton: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
    borderRadius: 8,
  },
  changeImageText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputSection: {
    marginTop: 1,
    padding: 16,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  textInput: {
    fontSize: 15,
    lineHeight: 20,
    minHeight: 40,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
  },
  episodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  episodeButtonText: {
    fontSize: 14,
  },
});