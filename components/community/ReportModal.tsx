/**
 * ReportModal — lets a user report a post or comment to the admins.
 * Pick a reason, optionally add detail, then submit to content_reports.
 */

import { Feather } from "@expo/vector-icons";
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
import { submitReport } from "@/lib/api/reports";

const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "misinformation", label: "Misinformation" },
  { id: "other", label: "Something else" },
];

interface ReportModalProps {
  visible: boolean;
  targetType: "post" | "comment";
  targetId: string;
  onClose: () => void;
}

export function ReportModal({ visible, targetType, targetId, onClose }: ReportModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleClose = () => {
    // Reset state next time it opens.
    setTimeout(() => {
      setReason(null);
      setDetails("");
      setSubmitting(false);
      setSubmitted(false);
    }, 250);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason || submitting) return;

    setSubmitting(true);
    try {
      await submitReport({ targetType, targetId, reason, details });
      setSubmitted(true);
    } catch (error) {
      setSubmitting(false);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to submit report");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Report {targetType === "post" ? "post" : "comment"}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {submitted ? (
            <View style={styles.success}>
              <Feather name="check-circle" size={48} color={colors.success} />
              <Text style={[styles.successTitle, { color: colors.foreground }]}>
                Thank you
              </Text>
              <Text style={[styles.successText, { color: colors.mutedForeground }]}>
                Your report has been sent to our moderators.
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                What's the issue with this {targetType === "post" ? "post" : "comment"}?
              </Text>

              {REPORT_REASONS.map((item) => {
                const selected = reason === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.reasonRow,
                      {
                        backgroundColor: selected ? `${colors.primary}15` : colors.background,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setReason(item.id)}
                  >
                    <Feather
                      name={selected ? "check-circle" : "circle"}
                      size={18}
                      color={selected ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.reasonLabel,
                        { color: selected ? colors.primary : colors.foreground },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TextInput
                style={[
                  styles.detailsInput,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                placeholder="Add details (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={details}
                onChangeText={setDetails}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!reason || submitting}
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.danger, opacity: !reason || submitting ? 0.5 : 1 },
                ]}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? "Submitting..." : "Submit Report"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  detailsInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: "top",
    marginTop: 4,
  },
  submitBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  success: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  successText: {
    fontSize: 14,
    textAlign: "center",
  },
  doneBtn: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
