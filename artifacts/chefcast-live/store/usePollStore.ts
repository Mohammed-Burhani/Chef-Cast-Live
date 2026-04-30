/**
 * Live poll store using Zustand.
 * Manages the currently active poll and vote state.
 * In production, this would sync with Supabase Realtime.
 */

import { create } from "zustand";

import { Poll } from "@/types";

interface PollState {
  /** The currently active poll, or null if no poll is live */
  activePoll: Poll | null;
  /** Whether the poll bottom sheet is visible */
  isPollVisible: boolean;
  /** ID of the option the user voted for, or null if not voted */
  userVote: string | null;

  /** Show a poll (triggered by Realtime in production) */
  showPoll: (poll: Poll) => void;
  /** Hide the poll sheet */
  hidePoll: () => void;
  /** Submit a vote for an option */
  vote: (optionId: string) => void;
  /** Update vote counts (from Realtime in production) */
  updateVoteCounts: (optionId: string) => void;
}

export const usePollStore = create<PollState>()((set, get) => ({
  activePoll: null,
  isPollVisible: false,
  userVote: null,

  showPoll: (poll) => set({ activePoll: poll, isPollVisible: true, userVote: null }),

  hidePoll: () => set({ isPollVisible: false }),

  vote: (optionId) => {
    const poll = get().activePoll;
    if (!poll || get().userVote) return;

    const updatedOptions = poll.options.map((opt) =>
      opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
    );

    set({
      userVote: optionId,
      activePoll: { ...poll, options: updatedOptions },
    });
  },

  updateVoteCounts: (optionId) => {
    const poll = get().activePoll;
    if (!poll) return;
    const updatedOptions = poll.options.map((opt) =>
      opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
    );
    set({ activePoll: { ...poll, options: updatedOptions } });
  },
}));
