/**
 * Check Email screen — shown after signup/magic link request
 */

import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";

export default function CheckEmailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: topPadding + 40,
            paddingBottom: insets.bottom + 40,
          },
        ]}
      >
        <View style={styles.iconArea}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15`, shadowColor: colors.primary }]}>
            <Feather name="mail" size={40} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>

        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          We sent a magic link to{"\n"}
          <Text style={{ color: colors.primary, fontWeight: "700" }}>
            {email || "your email"}
          </Text>
        </Text>

        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Click the link in the email to sign in. The link expires in 1 hour.
        </Text>

        <Button
          title="Back to Login"
          onPress={() => router.replace("/(auth)/login")}
          style={styles.button}
        />

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/signup")}
          style={styles.resendLink}
        >
          <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
            Didn't receive the email?{" "}
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Try again</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  iconArea: {
    marginBottom: 8,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    width: "100%",
    marginTop: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resendLink: {
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
  },
});