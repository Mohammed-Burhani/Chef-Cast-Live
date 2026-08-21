/**
 * Signup screen with onboarding flow
 * Collects: cooking level, cuisine preferences, gender
 * Creates profile after auth
 */

import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

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

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // Pre-fill from welcome screen if available
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(
    (params.cookingLevel as string) || null
  );
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    params.cuisines ? (params.cuisines as string).split(',') : []
  );
  const [selectedGender, setSelectedGender] = useState<"male" | "female" | "other" | null>(
    (params.gender as "male" | "female" | "other") || null
  );
  const [step, setStep] = useState(0); // 0: credentials, 1: level, 2: cuisines, 3: gender

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const toggleCuisine = (c: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !username.trim() || !password.trim()) {
      setError("All fields required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Invalid email");
      return;
    }

    setError("");
    setStep(1);
  };

  const handleNext = () => {
    if (step === 1 && selectedLevel) {
      setStep(2);
    } else if (step === 2 && selectedCuisines.length > 0) {
      setStep(3);
    } else if (step === 3 && selectedGender) {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      // Create account with password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            username: username.trim(),
            cooking_level: selectedLevel,
            cuisines: selectedCuisines,
            gender: selectedGender,
            onboarded_at: new Date().toISOString(),
          },
        },
      });

      if (authError) throw authError;

      // Auto sign in + redirect
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace("/(auth)/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
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

          <View style={styles.logoArea}>
            <Image
              source={require('@/assets/logos/G_Foodilicious_Clean.webp')}
              style={styles.headerLogoWide}
              contentFit="cover"
            />
          </View>

          <Text style={[styles.headline, { color: colors.foreground }]}>
            {step === 0
              ? "Create your account"
              : step === 1
                ? "What's your cooking level?"
                : step === 2
                  ? "What cuisines excite you?"
                  : "Select your gender"}
          </Text>

          <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
            {step === 0
              ? "Join the live cooking community"
              : step === 1
                ? "We'll tailor the experience"
                : step === 2
                  ? "We'll suggest episodes you'll love"
                  : "Help us personalize your experience"}
          </Text>

          {/* Step 0: Email & Username & Password */}
          {step === 0 && (
            <View style={styles.form}>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Feather name="mail" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Email address"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Feather name="user" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Username"
                  placeholderTextColor={colors.mutedForeground}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoComplete="username"
                />
              </View>

              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Feather name="lock" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Password (min 6 chars)"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                />
              </View>

              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

              <Button title="Continue" onPress={handleEmailSubmit} style={styles.cta} />
            </View>
          )}

          {/* Step 1: Cooking Level */}
          {step === 1 && (
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
                          ? `${colors.primary}15`
                          : colors.surface,
                      borderColor:
                        selectedLevel === level.id ? colors.primary : colors.border,
                      borderWidth: selectedLevel === level.id ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[styles.levelIcon, { backgroundColor: `${colors.primary}15` }]}>
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

          {/* Step 2: Cuisine preferences */}
          {step === 2 && (
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

          {/* Step 3: Gender */}
          {step === 3 && (
            <View style={styles.genderGrid}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  onPress={() => setSelectedGender(g.value)}
                  activeOpacity={0.8}
                  style={[
                    styles.genderCard,
                    {
                      backgroundColor: selectedGender === g.value ? `${colors.primary}15` : colors.surface,
                      borderColor: selectedGender === g.value ? colors.primary : colors.border,
                      borderWidth: selectedGender === g.value ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[styles.genderIcon, { backgroundColor: `${colors.primary}15` }]}>
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

          {step > 0 && (
            <>
              <Button
                title={step === 3 ? "Create Account" : "Continue"}
                disabled={
                  step === 1
                    ? !selectedLevel
                    : step === 2
                      ? selectedCuisines.length === 0
                      : !selectedGender
                }
                loading={loading}
                onPress={handleNext}
                style={styles.cta}
              />

              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={[styles.skipButtonText, { color: colors.mutedForeground }]}>
                  Skip for now
                </Text>
              </TouchableOpacity>
            </>
          )}

          {error && step > 0 ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.loginLink}>
            <Text style={[styles.loginText, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    gap: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
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
  form: { gap: 14 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  options: { gap: 10 },
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    fontSize: 13,
    textAlign: "center",
  },
  loginLink: {
    alignItems: "center",
    paddingBottom: 8,
  },
  loginText: {
    fontSize: 13,
  },
  headerLogoWide: { width: 180, height: 70 },
});