/**
 * LivePollCard — the interactive live poll component.
 * Shows voting options with animated result bars after voting.
 * Users earn XP for each poll participation.
 */

import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { usePollStore } from "@/store/usePollStore";
import { Poll, PollOption } from "@/types";

interface PollOptionRowProps {
  option: PollOption;
  totalVotes: number;
  isSelected: boolean;
  hasVoted: boolean;
  onVote: () => void;
  delay: number;
}

function PollOptionRow({ option, totalVotes, isSelected, hasVoted, onVote, delay }: PollOptionRowProps) {
  const colors = useColors();
  const widthAnim = useRef(new Animated.Value(0)).current;
  const percent = totalVotes > 0 ? option.votes / totalVotes : 0;

  useEffect(() => {
    if (hasVoted) {
      Animated.timing(widthAnim, {
        toValue: percent,
        duration: 800,
        delay,
        useNativeDriver: false,
      }).start();
    }
  }, [hasVoted, percent]);

  return (
    <TouchableOpacity
      onPress={!hasVoted ? onVote : undefined}
      activeOpacity={hasVoted ? 1 : 0.75}
      style={[
        styles.optionButton,
        {
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
          backgroundColor: colors.surface,
        },
      ]}
    >
      {/* Animated result fill */}
      {hasVoted && (
        <Animated.View
          style={[
            styles.resultFill,
            {
              backgroundColor: isSelected
                ? `${colors.primary}44`
                : `${colors.muted}88`,
              width: widthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      )}

      <View style={styles.optionContent}>
        <Text style={[styles.optionLabel, { color: colors.foreground }]}>
          {option.label}
        </Text>
        {hasVoted && (
          <Text style={[styles.optionPercent, { color: isSelected ? colors.primary : colors.mutedForeground }]}>
            {Math.round(percent * 100)}%
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface LivePollCardProps {
  poll: Poll;
  onDismiss?: () => void;
}

export function LivePollCard({ poll, onDismiss }: LivePollCardProps) {
  const colors = useColors();
  const { vote, userVote } = usePollStore();
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  const handleVote = (optionId: string) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    vote(optionId);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Live indicator */}
      <View style={styles.liveHeader}>
        <View style={[styles.liveDot, { backgroundColor: colors.live }]} />
        <Text style={[styles.liveLabel, { color: colors.live }]}>LIVE POLL</Text>
        <Text style={[styles.totalVotes, { color: colors.mutedForeground }]}>
          {totalVotes.toLocaleString()} votes
        </Text>
      </View>

      <Text style={[styles.question, { color: colors.foreground }]}>
        {poll.question}
      </Text>

      <View style={styles.options}>
        {poll.options.map((option, idx) => (
          <PollOptionRow
            key={option.id}
            option={option}
            totalVotes={totalVotes}
            isSelected={userVote === option.id}
            hasVoted={!!userVote}
            onVote={() => handleVote(option.id)}
            delay={idx * 100}
          />
        ))}
      </View>

      {userVote && (
        <Text style={[styles.thankyou, { color: colors.success }]}>
          ✓ Vote cast! +10 XP earned
        </Text>
      )}

      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
          <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>
            Dismiss
          </Text>
        </TouchableOpacity>
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
  liveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    flex: 1,
  },
  totalVotes: {
    fontSize: 12,
  },
  question: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  options: {
    gap: 10,
  },
  optionButton: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  resultFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  optionPercent: {
    fontSize: 14,
    fontWeight: "700",
  },
  thankyou: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  dismiss: {
    alignItems: "center",
    paddingTop: 4,
  },
  dismissText: {
    fontSize: 13,
  },
});
