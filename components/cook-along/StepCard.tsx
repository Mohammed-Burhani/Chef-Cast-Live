/**
 * StepCard — displays a single recipe step in the cook-along experience.
 * Shows instruction text, technique tag, and optional chef tip.
 */

import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTypography } from "@/hooks/useTypography";
import { RecipeStep } from "@/types";

interface StepCardProps {
  step: RecipeStep;
  stepNumber: number;
  totalSteps: number;
  isCompleted: boolean;
}

const TECHNIQUE_LABELS: Record<string, string> = {
  knife_work: "Knife Work",
  sauce: "Sauce",
  sauté: "Sauté",
  plating: "Plating",
  baking: "Baking",
  grilling: "Grilling",
};

export function StepCard({ step, stepNumber, totalSteps, isCompleted }: StepCardProps) {
  const colors = useColors();
  const { styles: typo } = useTypography();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Step header */}
      <View style={styles.header}>
        <View
          style={[
            styles.stepBadge,
            {
              backgroundColor: isCompleted ? colors.success : colors.primary,
            },
          ]}
        >
          {isCompleted ? (
            <Feather name="check" size={14} color="#F5F5F5" />
          ) : (
            <Text style={[typo.labelLarge, { color: "#F5F5F5" }]}>{stepNumber}</Text>
          )}
        </View>

        <Text style={[typo.bodySmall, { color: colors.mutedForeground }]}>
          Step {stepNumber} of {totalSteps}
        </Text>

        {step.techniqueTag && (
          <View style={[styles.techniqueBadge, { backgroundColor: `${colors.accent}22` }]}>
            <Text style={[typo.labelSmall, { color: colors.accent }]}>
              {TECHNIQUE_LABELS[step.techniqueTag] ?? step.techniqueTag}
            </Text>
          </View>
        )}
      </View>

      {/* Instruction */}
      <Text style={[typo.bodyLarge, { color: colors.foreground }]}>
        {step.instruction}
      </Text>

      {/* Chef tip */}
      {step.tip && (
        <View style={[styles.tipBox, { backgroundColor: `${colors.primary}15`, borderLeftColor: colors.primary }]}>
          <Feather name="info" size={14} color={colors.primary} />
          <Text style={[typo.bodyMedium, { color: colors.foreground }]}>
            <Text style={{ color: colors.primary, ...typo.labelMedium }}>Chef tip: </Text>
            {step.tip}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  techniqueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tipBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    alignItems: "flex-start",
  },
});
