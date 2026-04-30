/**
 * Welcome / Onboarding screen.
 * Asks for cooking level and cuisine preferences.
 * Routes to signup or login after onboarding.
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/store/useAuthStore";

const COOKING_LEVELS = [
  { id: "beginner", label: "Beginner", desc: "Just getting started", icon: "smile" as const },
  { id: "home_cook", label: "Home Cook", desc: "Comfortable in the kitchen", icon: "coffee" as const },
  { id: "enthusiast", label: "Enthusiast", desc: "Passionate about food", icon: "zap" as const },
];

const CUISINES = ["Italian", "Asian", "Mexican", "French", "Indian", "American", "Mediterranean", "Japanese"];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const toggleCuisine = (c: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleNext = async () => {
    if (step === 0 && selectedLevel) {
      setStep(1);
    } else if (step === 1) {
      await completeOnboarding();
      router.replace("/(auth)/signup");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#E8572A", "#1A1A2E", colors.background]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding + 20,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={36} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>ChefCast</Text>
          <Text style={[styles.appTagline, { color: colors.accent }]}>LIVE</Text>
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          {step === 0 ? "What's your cooking level?" : "What cuisines excite you?"}
        </Text>

        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
          {step === 0
            ? "We'll tailor the experience to match your skills"
            : "We'll suggest episodes you'll love"}
        </Text>

        {/* Step 0: Cooking Level */}
        {step === 0 && (
          <View style={styles.options}>
            {COOKING_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.id}
                onPress={() => setSelectedLevel(level.id)}
                activeOpacity={0.8}
                style={[
                  styles.levelCard,
                  {
                    backgroundColor:
                      selectedLevel === level.id
                        ? `${colors.primary}22`
                        : colors.surface,
                    borderColor:
                      selectedLevel === level.id ? colors.primary : colors.border,
                    borderWidth: selectedLevel === level.id ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.levelIcon, { backgroundColor: `${colors.primary}22` }]}>
                  <Feather name={level.icon} size={24} color={colors.primary} />
                </View>
                <View style={styles.levelText}>
                  <Text style={[styles.levelLabel, { color: colors.foreground }]}>
                    {level.label}
                  </Text>
                  <Text style={[styles.levelDesc, { color: colors.mutedForeground }]}>
                    {level.desc}
                  </Text>
                </View>
                {selectedLevel === level.id && (
                  <Feather name="check-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 1: Cuisine preferences */}
        {step === 1 && (
          <View style={styles.cuisineGrid}>
            {CUISINES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => toggleCuisine(c)}
                activeOpacity={0.8}
                style={[
                  styles.cuisineChip,
                  {
                    backgroundColor: selectedCuisines.includes(c)
                      ? colors.primary
                      : colors.surface,
                    borderColor: selectedCuisines.includes(c)
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cuisineLabel,
                    {
                      color: selectedCuisines.includes(c)
                        ? "#fff"
                        : colors.foreground,
                    },
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Button
          title={step === 0 ? "Continue" : "Start Cooking"}
          disabled={step === 0 ? !selectedLevel : false}
          onPress={handleNext}
          style={styles.cta}
        />

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={styles.loginLink}
        >
          <Text style={[styles.loginText, { color: colors.mutedForeground }]}>
            Already have an account?{" "}
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  logoArea: {
    alignItems: "center",
    gap: 8,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: -8,
  },
  headline: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
    textAlign: "center",
  },
  subtext: {
    fontSize: 15,
    textAlign: "center",
    marginTop: -12,
  },
  options: {
    gap: 12,
  },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
  },
  levelIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    flex: 1,
    gap: 2,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  levelDesc: {
    fontSize: 13,
  },
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  cuisineChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
  },
  cuisineLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  cta: {
    marginTop: 8,
  },
  loginLink: {
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
  },
});
