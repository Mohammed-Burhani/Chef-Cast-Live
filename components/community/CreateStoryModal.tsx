/**
 * CreateStoryModal - Instagram-like story creation interface
 * Allows users to pick images/videos, add captions, and create stories
 */

import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCommunityStore } from "@/store/communityStore";
import { uploadStoryMedia } from "@/lib/api/community";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface CreateStoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateStoryModal({ visible, onClose }: CreateStoryModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const createStory = useCommunityStore((s) => s.createStory);

  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        setMediaType(result.assets[0].type === "video" ? "video" : "image");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick media");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Camera permission is required");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setMediaUri(result.assets[0].uri);
        setMediaType("image");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const handleSubmit = async () => {
    if (!mediaUri) {
      Alert.alert("Media required", "Please select or take a photo/video");
      return;
    }

    setIsSubmitting(true);

    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const mediaUrl = await uploadStoryMedia(mediaUri);

      await createStory({
        mediaUrl,
        mediaType,
        caption: caption.trim() || undefined,
        expiresAt: expiresAt.toISOString(),
      });

      // Reset form
      setMediaUri(null);
      setCaption("");
      setIsSubmitting(false);
      onClose();

      if (Platform.OS !== "web") {
        Alert.alert("Success", "Your story has been shared!");
      }
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert("Error", "Failed to create story");
    }
  };

  const handleCancel = () => {
    if (mediaUri || caption.trim()) {
      Alert.alert(
        "Discard story?",
        "You have unsaved changes. Are you sure you want to discard this story?",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setMediaUri(null);
              setCaption("");
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Story</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.headerButton, styles.shareButton]}
            disabled={!mediaUri || isSubmitting}
          >
            {isSubmitting ? (
              <LoadingSpinner size="small" />
            ) : (
              <Text
                style={[
                  styles.headerButtonText,
                  { color: mediaUri ? colors.primary : colors.mutedForeground },
                ]}
              >
                Share
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Media Upload */}
        {!mediaUri ? (
          <View style={[styles.mediaUploadSection, { backgroundColor: colors.surface }]}>
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
          <View style={styles.mediaPreviewSection}>
            <Image
              source={{ uri: mediaUri }}
              style={styles.mediaPreview}
              contentFit="cover"
            />
            <TouchableOpacity
              style={[styles.changeMediaButton, { backgroundColor: colors.surface }]}
              onPress={() => setMediaUri(null)}
            >
              <Feather name="x-circle" size={20} color={colors.danger} />
              <Text style={[styles.changeMediaText, { color: colors.danger }]}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Caption Input */}
        {mediaUri && (
          <View style={[styles.inputSection, { backgroundColor: colors.surface }]}>
            <View style={styles.inputHeader}>
              <Feather name="edit-2" size={16} color={colors.primary} />
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Caption</Text>
            </View>
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              placeholder="Add a caption (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {caption.length}/500
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <View style={styles.infoItem}>
            <Feather name="clock" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Stories disappear after 24 hours
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="eye" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Only your followers can see your stories
            </Text>
          </View>
        </View>
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
  mediaUploadSection: {
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
  mediaPreviewSection: {
    position: "relative",
  },
  mediaPreview: {
    width: "100%",
    height: 500,
  },
  changeMediaButton: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
    borderRadius: 8,
  },
  changeMediaText: {
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
    minHeight: 60,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  infoSection: {
    marginTop: 1,
    padding: 16,
    gap: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 13,
  },
});