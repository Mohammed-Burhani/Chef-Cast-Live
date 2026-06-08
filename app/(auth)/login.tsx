/**
 * Login screen — Supabase authentication with Magic Link and OAuth
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
// import { supabase } from "@/lib/supabase"; // COMMENTED OUT FOR PROTOTYPE
// import { signInWithGoogle, signInWithApple, signInAnonymously } from "@/lib/auth"; // COMMENTED OUT FOR PROTOTYPE

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [anonLoading, setAnonLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    // PROTOTYPE: Mock successful login after short delay
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      // Auto navigate to app after 1s
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1000);
    }, 800);

    /* SUPABASE CODE COMMENTED OUT
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    */
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    
    // PROTOTYPE: Mock successful login
    setTimeout(() => {
      setGoogleLoading(false);
      router.replace('/(tabs)');
    }, 800);

    /* SUPABASE CODE COMMENTED OUT
    const result = await signInWithGoogle();
    
    setGoogleLoading(false);

    if (!result.success && !result.cancelled) {
      setError("Google sign-in failed. Please try again.");
    }
    */
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    setError("");
    
    // PROTOTYPE: Mock successful login
    setTimeout(() => {
      setAppleLoading(false);
      router.replace('/(tabs)');
    }, 800);

    /* SUPABASE CODE COMMENTED OUT
    const result = await signInWithApple();
    
    setAppleLoading(false);

    if (!result.success && !result.cancelled) {
      setError("Apple sign-in failed. Please try again.");
    }
    */
  };

  const handleAnonymousSignIn = async () => {
    setAnonLoading(true);
    setError("");
    
    // PROTOTYPE: Mock successful login
    setTimeout(() => {
      setAnonLoading(false);
      router.replace('/(tabs)');
    }, 800);

    /* SUPABASE CODE COMMENTED OUT
    const result = await signInAnonymously();
    
    setAnonLoading(false);

    if (!result.success) {
      setError("Anonymous sign-in failed. Please try again.");
    }
    */
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.background, "#2A1040", colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={[styles.content, { paddingTop: topPadding + 20, paddingBottom: insets.bottom + 40 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Sign in to continue cooking
            </Text>
          </View>

          {success ? (
            <View style={[styles.successBox, { backgroundColor: `${colors.primary}22`, borderColor: colors.primary }]}>
              <Feather name="mail" size={20} color={colors.primary} />
              <Text style={[styles.successText, { color: colors.primary }]}>
                Check your email for the magic link!
              </Text>
            </View>
          ) : (
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
                  editable={!loading}
                />
              </View>

              {error ? (
                <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
              ) : null}

              <Button title="Send Magic Link" loading={loading} onPress={handleMagicLink} />

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Google Sign-In */}
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                style={[styles.oauthButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={colors.foreground} />
                ) : (
                  <>
                    <Feather name="chrome" size={18} color={colors.foreground} />
                    <Text style={[styles.oauthButtonText, { color: colors.foreground }]}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Apple Sign-In (iOS only) */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={handleAppleSignIn}
                  disabled={appleLoading}
                  style={[styles.oauthButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {appleLoading ? (
                    <ActivityIndicator size="small" color={colors.foreground} />
                  ) : (
                    <>
                      <Feather name="smartphone" size={18} color={colors.foreground} />
                      <Text style={[styles.oauthButtonText, { color: colors.foreground }]}>
                        Continue with Apple
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Anonymous Sign-In */}
              <TouchableOpacity
                onPress={handleAnonymousSignIn}
                disabled={anonLoading}
                style={[styles.anonButton, { backgroundColor: `${colors.mutedForeground}15`, borderColor: colors.border }]}
              >
                {anonLoading ? (
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                ) : (
                  <>
                    <Feather name="user-x" size={18} color={colors.mutedForeground} />
                    <Text style={[styles.anonButtonText, { color: colors.mutedForeground }]}>
                      Continue as Guest
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              New to ChefCast?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/welcome")}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Get started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    flex: 1,
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
  input: {
    flex: 1,
    fontSize: 16,
  },
  error: { fontSize: 13, marginTop: -4 },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  oauthButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  oauthButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  anonButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  anonButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: "auto",
  },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: "700" },
});
