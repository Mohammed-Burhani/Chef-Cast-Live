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
import { UserProfile } from "@/types";

const COOKING_LEVELS = [
  { id: "beginner", label: "Beginner", desc: "Just getting started", icon: "smile" as const },
  { id: "home_cook", label: "Home Cook", desc: "Comfortable in the kitchen", icon: "coffee" as const },
  { id: "enthusiast", label: "Enthusiast", desc: "Passionate about food", icon: "zap" as const },
];

const CUISINES = ["Italian", "Asian", "Mexican", "French", "Indian", "American", "Mediterranean", "Japanese"];

const GENDERS = [
  { value: "male" as const, label: "Male", icon: "user" as const },
  { value: "female" as const, label: "Female", icon: "user" as const },
  { value: "other" as const, label: "Other", icon: "users" as const },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, login } = useAuthStore();
  const [step, setStep] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<"male" | "female" | "other" | null>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const toggleCuisine = (c: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleNext = async () => {
    if (step === 0 && selectedLevel) {
      setStep(1);
    } else if (step === 1 && selectedCuisines.length > 0) {
      setStep(2);
    } else if (step === 2 && selectedGender) {
      await completeOnboarding();
      router.replace("/(auth)/signup");
    }
  };

  const handleAnonymousSignin = async () => {
    if (step === 0 && !selectedLevel) return;
    if (step === 1 && selectedCuisines.length === 0) return;
    if (step === 2 && !selectedGender) return;

    // Create anonymous user
    const anonUser: UserProfile = {
      id: `anon-${Date.now()}`,
      username: `chef_${Math.random().toString(36).substr(2, 6)}`,
      displayName: "Anonymous Chef",
      gender: selectedGender || "other",
      xpTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
      subscriptionTier: "free",
      cookingLevel: (selectedLevel as any) || "beginner",
      cuisinePreferences: selectedCuisines,
      createdAt: new Date().toISOString(),
    };

    await completeOnboarding();
    await login(anonUser);
    router.replace("/(tabs)");
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
            paddingTop: topPadding + 16,
            paddingBottom: insets.bottom + 60,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: colors.neonRed }]}>
            <Feather name="zap" size={28} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>ChefCast</Text>
          <Text style={[styles.appTagline, { color: colors.neonRed }]}>LIVE</Text>
        </View>

        <Text style={[styles.headline, { color: colors.foreground }]}>
          {step === 0 ? "What's your cooking level?" : step === 1 ? "What cuisines excite you?" : "Select your gender"}
        </Text>

        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
          {step === 0
            ? "We'll tailor the experience to match your skills"
            : step === 1
            ? "We'll suggest episodes you'll love"
            : "Help us personalize your experience"}
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

        {/* Step 2: Gender */}
        {step === 2 && (
          <View style={styles.genderGrid}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                onPress={() => setSelectedGender(g.value)}
                activeOpacity={0.8}
                style={[
                  styles.genderCard,
                  {
                    backgroundColor: selectedGender === g.value ? `${colors.primary}22` : colors.surface,
                    borderColor: selectedGender === g.value ? colors.primary : colors.border,
                    borderWidth: selectedGender === g.value ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.genderIcon, { backgroundColor: `${colors.primary}22` }]}>
                  <Feather name={g.icon} size={24} color={colors.primary} />
                </View>
                <Text style={[styles.genderLabel, { color: colors.foreground }]}>
                  {g.label}
                </Text>
                {selectedGender === g.value && (
                  <Feather name="check-circle" size={18} color={colors.primary} style={styles.genderCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Button
          title={step === 0 ? "Continue" : step === 1 ? "Continue" : "Create Account"}
          disabled={step === 0 ? !selectedLevel : step === 1 ? selectedCuisines.length === 0 : !selectedGender}
          onPress={handleNext}
          style={styles.cta}
        />

        {/* Anonymous signin button */}
        <TouchableOpacity
          onPress={handleAnonymousSignin}
          disabled={step === 0 ? !selectedLevel : step === 1 ? selectedCuisines.length === 0 : !selectedGender}
          style={[
            styles.anonButton,
            {
              backgroundColor: `${colors.neonRed}15`,
              borderColor: colors.neonRed,
              opacity: (step === 0 && !selectedLevel) || (step === 1 && selectedCuisines.length === 0) || (step === 2 && !selectedGender) ? 0.4 : 1,
            },
          ]}
        >
          <Feather name="user-x" size={16} color={colors.neonRed} />
          <Text style={[styles.anonButtonText, { color: colors.neonRed }]}>
            Continue as Guest
          </Text>
        </TouchableOpacity>

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
    gap: 20,
  },
  logoArea: {
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF1744",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: -4,
  },
  headline: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    textAlign: "center",
  },
  subtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: -8,
  },
  options: {
    gap: 10,
  },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  levelIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    flex: 1,
    gap: 2,
  },
  levelLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  levelDesc: {
    fontSize: 12,
  },
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  cuisineChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
  },
  cuisineLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  genderGrid: {
    gap: 10,
  },
  genderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    position: "relative",
  },
  genderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  genderLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  genderCheck: {
    position: "absolute",
    right: 14,
  },
  cta: {
    marginTop: 4,
    shadowColor: "#E8572A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  anonButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: "#FF1744",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  anonButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  loginLink: {
    alignItems: "center",
    paddingBottom: 8,
  },
  loginText: {
    fontSize: 13,
  },
});
