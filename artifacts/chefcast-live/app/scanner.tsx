/**
 * Fridge Scanner screen — scan ingredients using image picker.
 * In production, sends image to AI edge function for ingredient detection.
 * Shows compatibility with the current episode's recipe.
 */

import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface DetectedIngredient {
  name: string;
  confidence: "high" | "medium" | "low";
  isInRecipe: boolean;
  isSelected: boolean;
}

const MOCK_DETECTED: DetectedIngredient[] = [
  { name: "Onion", confidence: "high", isInRecipe: true, isSelected: true },
  { name: "Garlic", confidence: "high", isInRecipe: true, isSelected: true },
  { name: "Butter", confidence: "high", isInRecipe: true, isSelected: true },
  { name: "Parmesan cheese", confidence: "medium", isInRecipe: true, isSelected: true },
  { name: "White wine", confidence: "medium", isInRecipe: true, isSelected: true },
  { name: "Mushrooms", confidence: "high", isInRecipe: true, isSelected: false },
  { name: "Eggs", confidence: "high", isInRecipe: false, isSelected: true },
  { name: "Milk", confidence: "medium", isInRecipe: false, isSelected: true },
  { name: "Tomatoes", confidence: "low", isInRecipe: false, isSelected: false },
];

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<DetectedIngredient[]>([]);
  const [showResults, setShowResults] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      analyzeImage();
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      analyzeImage();
    }
  };

  const analyzeImage = async () => {
    setScanning(true);
    setShowResults(false);
    await new Promise((r) => setTimeout(r, 2000));
    setDetected(MOCK_DETECTED);
    setScanning(false);
    setShowResults(true);
  };

  const toggleIngredient = (idx: number) => {
    setDetected((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, isSelected: !item.isSelected } : item))
    );
  };

  const inRecipeCount = detected.filter((d) => d.isInRecipe && d.isSelected).length;
  const totalRecipeIngredients = 12;

  const confidenceColors = {
    high: colors.success,
    medium: colors.warning,
    low: colors.mutedForeground,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Fridge Scanner</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Camera area */}
        {!image ? (
          <View style={[styles.cameraArea, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.reticle}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.reticleCorner,
                    {
                      borderColor: colors.primary,
                      top: i < 2 ? 0 : undefined,
                      bottom: i >= 2 ? 0 : undefined,
                      left: i % 2 === 0 ? 0 : undefined,
                      right: i % 2 === 1 ? 0 : undefined,
                      borderTopWidth: i < 2 ? 3 : 0,
                      borderBottomWidth: i >= 2 ? 3 : 0,
                      borderLeftWidth: i % 2 === 0 ? 3 : 0,
                      borderRightWidth: i % 2 === 1 ? 3 : 0,
                    },
                  ]}
                />
              ))}
            </View>
            <Feather name="camera" size={48} color={colors.mutedForeground} />
            <Text style={[styles.cameraHint, { color: colors.mutedForeground }]}>
              Point at your fridge or pantry
            </Text>
          </View>
        ) : (
          <View style={styles.previewArea}>
            <Image source={{ uri: image }} style={styles.previewImage} contentFit="cover" />
            {scanning && (
              <View style={[styles.scanningOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.scanningText}>Analyzing ingredients...</Text>
              </View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={takePhoto}
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="camera" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Feather name="image" size={20} color={colors.foreground} />
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {showResults && (
          <View style={styles.results}>
            {/* Recipe compatibility */}
            <View style={[styles.compatCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.compatTitle, { color: colors.foreground }]}>Recipe Compatibility</Text>
              <Text style={[styles.compatScore, { color: colors.accent }]}>
                {inRecipeCount}/{totalRecipeIngredients} ingredients
              </Text>
              <View style={[styles.compatBar, { backgroundColor: colors.muted }]}>
                <View style={[styles.compatFill, {
                  width: `${(inRecipeCount / totalRecipeIngredients) * 100}%`,
                  backgroundColor: inRecipeCount >= 8 ? colors.success : inRecipeCount >= 5 ? colors.warning : colors.danger,
                }]} />
              </View>
              <Text style={[styles.compatNote, { color: colors.mutedForeground }]}>
                {inRecipeCount >= 8
                  ? "You're ready to cook tonight's episode!"
                  : inRecipeCount >= 5
                  ? "Almost there! A few more ingredients needed."
                  : "You're missing several key ingredients."}
              </Text>
            </View>

            {/* Detected list */}
            <Text style={[styles.detectedTitle, { color: colors.foreground }]}>
              {detected.length} ingredients detected
            </Text>
            <View style={[styles.detectedList, { backgroundColor: colors.surface }]}>
              {detected.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => toggleIngredient(idx)}
                  style={[styles.detectedRow, { borderBottomColor: colors.border }]}
                >
                  <View style={[
                    styles.checkbox,
                    {
                      backgroundColor: item.isSelected ? colors.primary : "transparent",
                      borderColor: item.isSelected ? colors.primary : colors.border,
                    }
                  ]}>
                    {item.isSelected && <Feather name="check" size={11} color="#fff" />}
                  </View>
                  <Text style={[styles.detectedName, { color: item.isSelected ? colors.foreground : colors.mutedForeground }]}>
                    {item.name}
                  </Text>
                  {item.isInRecipe && (
                    <View style={[styles.inRecipeBadge, { backgroundColor: `${colors.success}22` }]}>
                      <Text style={[styles.inRecipeText, { color: colors.success }]}>In recipe</Text>
                    </View>
                  )}
                  <View style={[styles.confDot, { backgroundColor: confidenceColors[item.confidence] }]} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Feather name="save" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Save to My Pantry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 20, fontWeight: "800", textAlign: "center" },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  cameraArea: { height: 260, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 12, position: "relative", overflow: "hidden" },
  reticle: { position: "absolute", top: 20, left: 20, right: 20, bottom: 20 },
  reticleCorner: { position: "absolute", width: 24, height: 24 },
  cameraHint: { fontSize: 15 },
  previewArea: { height: 260, borderRadius: 20, overflow: "hidden", position: "relative" },
  previewImage: { width: "100%", height: "100%" },
  scanningOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 12 },
  scanningText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  actionButtons: { flexDirection: "row", gap: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  results: { gap: 14 },
  compatCard: { borderRadius: 16, padding: 16, gap: 8 },
  compatTitle: { fontSize: 14, fontWeight: "600" },
  compatScore: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  compatBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  compatFill: { height: "100%", borderRadius: 4 },
  compatNote: { fontSize: 13, lineHeight: 18 },
  detectedTitle: { fontSize: 16, fontWeight: "700" },
  detectedList: { borderRadius: 14, overflow: "hidden" },
  detectedRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  detectedName: { flex: 1, fontSize: 14 },
  inRecipeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  inRecipeText: { fontSize: 10, fontWeight: "700" },
  confDot: { width: 8, height: 8, borderRadius: 4 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
