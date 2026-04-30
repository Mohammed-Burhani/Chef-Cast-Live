/**
 * Reusable Button component with primary, ghost, and outline variants.
 * Provides press feedback and loading/disabled states.
 */

import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = true,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const colors = useColors();

  const handlePress = (e: Parameters<NonNullable<TouchableOpacityProps["onPress"]>>[0]) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  const bgColor = {
    primary: colors.primary,
    ghost: "transparent",
    outline: "transparent",
    danger: colors.danger,
  }[variant];

  const borderColor = {
    primary: "transparent",
    ghost: "transparent",
    outline: colors.border,
    danger: "transparent",
  }[variant];

  const textColor = {
    primary: colors.primaryForeground,
    ghost: colors.primary,
    outline: colors.foreground,
    danger: colors.primaryForeground,
  }[variant];

  const paddingVertical = { sm: 10, md: 14, lg: 18 }[size];
  const fontSize = { sm: 13, md: 15, lg: 17 }[size];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === "outline" ? 1 : 0,
          paddingVertical,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.label, { color: textColor, fontSize }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
