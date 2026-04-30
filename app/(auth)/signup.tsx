/**
 * Signup screen — creates a new user profile.
 * Mock auth for first build. Replace with Supabase Auth in production.
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
import { useAuthStore } from "@/store/useAuthStore";
import { UserProfile } from "@/types";

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleSignup = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 800));

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      username: username.toLowerCase().replace(/\s/g, "_"),
      displayName: displayName.trim(),
      xpTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
      subscriptionTier: "free",
      cookingLevel: "beginner",
      createdAt: new Date().toISOString(),
    };

    await login(newUser);
    setLoading(false);
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#E8572A22", colors.background, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: topPadding + 20, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Join the cooking community
            </Text>
          </View>

          <View style={styles.form}>
            {[
              { value: displayName, setter: setDisplayName, placeholder: "Display name", icon: "user" as const },
              { value: username, setter: setUsername, placeholder: "Username", icon: "at-sign" as const },
              { value: email, setter: setEmail, placeholder: "Email address", icon: "mail" as const, keyboard: "email-address" as const },
              { value: password, setter: setPassword, placeholder: "Password", icon: "lock" as const, secure: true },
            ].map((field, idx) => (
              <View
                key={idx}
                style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Feather name={field.icon} size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.keyboard}
                  autoCapitalize="none"
                  secureTextEntry={field.secure}
                />
              </View>
            ))}

            {error ? (
              <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
            ) : null}

            <Button title="Create Account" loading={loading} onPress={handleSignup} />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  header: { gap: 6 },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 16 },
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
  input: { flex: 1, fontSize: 16 },
  error: { fontSize: 13, marginTop: -4 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: "700" },
});
