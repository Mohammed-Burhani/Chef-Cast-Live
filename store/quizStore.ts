/**
 * ============================================================================
 * MOCK QUIZ STORE FOR PROTOTYPE
 * ============================================================================
 * Supabase quiz scoring edge functions commented out. Using mock quiz flow.
 */

import { create } from 'zustand';
// import { supabase } from '@/lib/supabase'; // COMMENTED OUT FOR PROTOTYPE
import { useAuthStore } from './authStore';
import type {
  QuestionActivatedEvent,
  QuestionClosedEvent,
  LeaderboardUpdatedEvent,
  EpisodeEndedEvent,
} from '@/lib/realtime/types';

export type QuizPhase = 'idle' | 'question' | 'answered' | 'revealed' | 'episode_ended';

export interface ActiveQuestion {
  questionId: string;
  episodeId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  timerSeconds: number;
  openedAt: string;
  sequenceNumber: number;
}

export interface QuestionResult {
  questionId: string;
  selectedOption: 'a' | 'b' | 'c' | 'd' | null;
  correctOption: 'a' | 'b' | 'c' | 'd';
  isCorrect: boolean;
  pointsEarned: number;
  responseTimeMs: number;
}

interface QuizState {
  // State machine
  phase: QuizPhase;
  episodeId: string | null;
  
  // Current question
  currentQuestion: ActiveQuestion | null;
  selectedOption: 'a' | 'b' | 'c' | 'd' | null;
  correctOption: 'a' | 'b' | 'c' | 'd' | null;
  isCorrect: boolean | null;
  
  // Timer
  timerSecondsRemaining: number;
  timerStartedAt: number | null;
  
  // Score
  totalScore: number;
  correctCount: number;
  questionCount: number;
  currentRank: number | null;
  
  // Submission
  isSubmitting: boolean;
  submitError: string | null;
  
  // History
  questionsHistory: QuestionResult[];
  
  // Actions
  joinEpisode: (episodeId: string) => Promise<void>;
  handleQuestionActivated: (event: QuestionActivatedEvent) => void;
  handleQuestionClosed: (event: QuestionClosedEvent) => void;
  submitAnswer: (option: 'a' | 'b' | 'c' | 'd') => Promise<void>;
  handleLeaderboardUpdate: (event: LeaderboardUpdatedEvent) => void;
  handleEpisodeEnded: (event: EpisodeEndedEvent) => void;
  reset: () => void;
  _tickTimer: () => void;
}

// Module-level timer ref (not in state to avoid re-renders)
let timerInterval: NodeJS.Timeout | null = null;
let revealTimeout: NodeJS.Timeout | null = null;

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const stopRevealTimeout = () => {
  if (revealTimeout) {
    clearTimeout(revealTimeout);
    revealTimeout = null;
  }
};

export const useQuizStore = create<QuizState>()((set, get) => ({
  // Initial state
  phase: 'idle',
  episodeId: null,
  currentQuestion: null,
  selectedOption: null,
  correctOption: null,
  isCorrect: null,
  timerSecondsRemaining: 0,
  timerStartedAt: null,
  totalScore: 0,
  correctCount: 0,
  questionCount: 0,
  currentRank: null,
  isSubmitting: false,
  submitError: null,
  questionsHistory: [],

  joinEpisode: async (episodeId: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      console.error('[Quiz] No user ID');
      return;
    }

    try {
      // PROTOTYPE: Mock episode join
      set({
        episodeId,
        phase: 'idle',
        totalScore: 0,
        correctCount: 0,
        questionCount: 0,
        questionsHistory: [],
      });

      /* SUPABASE CODE COMMENTED OUT
      // Register participation
      await supabase
        .from('episode_scores')
        .upsert(
          {
            user_id: userId,
            episode_id: episodeId,
            joined_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,episode_id', ignoreDuplicates: true }
        );

      set({
        episodeId,
        phase: 'idle',
        totalScore: 0,
        correctCount: 0,
        questionCount: 0,
        questionsHistory: [],
      });
      */
    } catch (error) {
      console.error('[Quiz] Join episode error:', error);
    }
  },

  handleQuestionActivated: (event: QuestionActivatedEvent) => {
    stopTimer();
    stopRevealTimeout();

    const question: ActiveQuestion = {
      questionId: event.questionId,
      episodeId: event.episodeId,
      questionText: event.questionText,
      optionA: event.optionA,
      optionB: event.optionB,
      optionC: event.optionC,
      optionD: event.optionD,
      timerSeconds: event.timerSeconds,
      openedAt: event.openedAt,
      sequenceNumber: event.sequenceNumber,
    };

    set({
      phase: 'question',
      currentQuestion: question,
      selectedOption: null,
      correctOption: null,
      isCorrect: null,
      timerSecondsRemaining: event.timerSeconds,
      timerStartedAt: Date.now(),
      submitError: null,
    });

    // Start timer
    timerInterval = setInterval(() => {
      get()._tickTimer();
    }, 250);
  },

  handleQuestionClosed: (event: QuestionClosedEvent) => {
    stopTimer();

    const state = get();
    const isCorrect = state.selectedOption === event.correctOption;

    // Find points from last submission (if any)
    const pointsEarned = isCorrect ? state.totalScore - (state.questionsHistory.reduce((sum, q) => sum + q.pointsEarned, 0)) : 0;

    const result: QuestionResult = {
      questionId: event.questionId,
      selectedOption: state.selectedOption,
      correctOption: event.correctOption,
      isCorrect,
      pointsEarned,
      responseTimeMs: state.timerStartedAt ? Date.now() - state.timerStartedAt : 0,
    };

    set({
      phase: 'revealed',
      correctOption: event.correctOption,
      isCorrect,
      questionsHistory: [...state.questionsHistory, result],
      questionCount: state.questionCount + 1,
    });

    // Auto-transition to idle after 3s
    revealTimeout = setTimeout(() => {
      set({ phase: 'idle' });
    }, 3000);
  },

  submitAnswer: async (option: 'a' | 'b' | 'c' | 'd') => {
    const state = get();

    // Guards
    if (state.phase !== 'question') return;
    if (state.isSubmitting) return;
    if (state.selectedOption !== null) return; // Already answered (idempotent)
    if (!state.currentQuestion) return;
    if (!state.timerStartedAt) return;

    stopTimer();

    const responseTimeMs = Date.now() - state.timerStartedAt;

    set({
      isSubmitting: true,
      selectedOption: option,
      phase: 'answered',
      submitError: null,
    });

    try {
      // PROTOTYPE: Mock answer scoring
      const mockIsCorrect = Math.random() > 0.3; // 70% chance correct for demo
      const mockPoints = mockIsCorrect ? Math.floor(800 + Math.random() * 400) : 0;
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network

      set({
        isCorrect: mockIsCorrect,
        totalScore: state.totalScore + mockPoints,
        correctCount: state.correctCount + (mockIsCorrect ? 1 : 0),
        isSubmitting: false,
      });

      /* SUPABASE CODE COMMENTED OUT
      const { data, error } = await supabase.functions.invoke('score-answer', {
        body: {
          questionId: state.currentQuestion.questionId,
          episodeId: state.episodeId,
          selectedOption: option,
          responseTimeMs,
        },
      });

      if (error) {
        // Check for duplicate submission (23505 = unique violation)
        if (error.message?.includes('23505') || error.message?.includes('duplicate')) {
          // Silent no-op
          set({ isSubmitting: false });
          return;
        }

        throw error;
      }

      // Update score from Edge Function response
      set({
        isCorrect: data.isCorrect,
        totalScore: data.newTotalScore,
        correctCount: data.newCorrectCount,
        isSubmitting: false,
      });
      */
    } catch (error: any) {
      console.error('[Quiz] Submit answer error:', error);
      set({
        submitError: 'Failed to submit answer. Please try again.',
        isSubmitting: false,
      });
    }
  },

  handleLeaderboardUpdate: (event: LeaderboardUpdatedEvent) => {
    if (event.viewerEntry) {
      set({ currentRank: event.viewerEntry.rank });
    }
  },

  handleEpisodeEnded: (event: EpisodeEndedEvent) => {
    stopTimer();
    stopRevealTimeout();

    set({
      phase: 'episode_ended',
    });
  },

  reset: () => {
    stopTimer();
    stopRevealTimeout();

    set({
      phase: 'idle',
      episodeId: null,
      currentQuestion: null,
      selectedOption: null,
      correctOption: null,
      isCorrect: null,
      timerSecondsRemaining: 0,
      timerStartedAt: null,
      totalScore: 0,
      correctCount: 0,
      questionCount: 0,
      currentRank: null,
      isSubmitting: false,
      submitError: null,
      questionsHistory: [],
    });
  },

  _tickTimer: () => {
    const state = get();
    if (!state.timerStartedAt || !state.currentQuestion) return;

    const elapsed = (Date.now() - state.timerStartedAt) / 1000;
    const remaining = Math.max(0, state.currentQuestion.timerSeconds - elapsed);

    set({ timerSecondsRemaining: Math.ceil(remaining) });

    // Time's up
    if (remaining <= 0 && state.selectedOption === null) {
      stopTimer();
      set({ phase: 'answered' });
    }
  },
}));

// Typed selectors
export const useCurrentQuestion = () => useQuizStore((s) => s.currentQuestion);
export const useTimerRemaining = () => useQuizStore((s) => s.timerSecondsRemaining);
export const useQuizPhase = () => useQuizStore((s) => s.phase);
export const useSelectedOption = () => useQuizStore((s) => s.selectedOption);
export const useIsCorrect = () => useQuizStore((s) => s.isCorrect);
export const useCorrectOption = () => useQuizStore((s) => s.correctOption);
export const useTotalScore = () => useQuizStore((s) => s.totalScore);
