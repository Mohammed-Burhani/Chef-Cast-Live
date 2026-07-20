/**
 * Live Quiz Store (Zustand)
 * State machine driven by Supabase Realtime events:
 *   idle → question → revealing → between → (loop) → complete
 *
 * - "idle": No quiz active, show "Starting Soon"
 * - "question": Question is live, timer counting, awaiting answer
 * - "revealing": Show correct/wrong + points + top 3
 * - "between": Between-question leaderboard snapshot
 * - "complete": All questions done → final results
 */

import { create } from 'zustand';
import type { Database } from '@/types/database';

type Question = Database['public']['Tables']['questions']['Row'];
type EpisodeScore = Database['public']['Tables']['episode_scores']['Row'];

export type QuizPhase = 'idle' | 'question' | 'revealing' | 'between' | 'complete';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalScore: number;
  correctCount: number;
  isCurrentUser: boolean;
}

export interface UserAnswer {
  questionId: string;
  selectedOption: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  responseTimeMs: number;
}

interface LiveQuizState {
  phase: QuizPhase;
  episodeId: string | null;

  // Current question state
  currentQuestion: Question | null;
  questionStartedAt: number; // timestamp when opened_at was set (server time)
  timerRemaining: number;
  questionTimerSeconds: number;

  // User interaction
  selectedOption: string | null;
  answeredAt: number | null;

  // Scoring
  totalScore: number;
  correctCount: number;

  // All answers for current session
  userAnswers: UserAnswer[];

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  viewerRank: number | null;

  // Question progress
  currentQuestionNumber: number;
  totalQuestions: number;

  // Actions
  setEpisodeId: (id: string) => void;
  setTotalQuestions: (count: number) => void;
  handleQuestionActivated: (question: Question) => void;
  setSelectedOption: (option: string) => void;
  submitAnswer: (answer: UserAnswer) => void;
  handleQuestionClosed: (correctOption: string) => void;
  showBetweenLeaderboard: () => void;
  startNextQuestion: (question: Question) => void;
  tickTimer: () => void;
  updateLeaderboard: (entries: LeaderboardEntry[], viewerRank: number | null) => void;
  updateScore: (totalScore: number, correctCount: number) => void;
  completeQuiz: () => void;
  reset: () => void;
}

export const useLiveQuizStore = create<LiveQuizState>()((set, get) => ({
  phase: 'idle',
  episodeId: null,
  currentQuestion: null,
  questionStartedAt: 0,
  timerRemaining: 0,
  questionTimerSeconds: 0,
  selectedOption: null,
  answeredAt: null,
  totalScore: 0,
  correctCount: 0,
  userAnswers: [],
  leaderboard: [],
  viewerRank: null,
  currentQuestionNumber: 0,
  totalQuestions: 0,

  setEpisodeId: (id) => set({ episodeId: id }),
  setTotalQuestions: (count) => set({ totalQuestions: count }),

  handleQuestionActivated: (question) => {
    const now = Date.now();
    const openedAt = question.opened_at ? new Date(question.opened_at).getTime() : now;
    const timerSeconds = question.timer_seconds;

    // Calculate how much time has already passed since activation
    const elapsedMs = now - openedAt;
    const remainingMs = Math.max(0, timerSeconds * 1000 - elapsedMs);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    set((state) => ({
      phase: 'question',
      currentQuestion: question,
      questionStartedAt: openedAt,
      timerRemaining: remainingSeconds,
      questionTimerSeconds: timerSeconds,
      selectedOption: null,
      answeredAt: null,
      currentQuestionNumber: state.currentQuestionNumber + 1,
    }));
  },

  setSelectedOption: (option) => set({ selectedOption: option }),

  submitAnswer: (answer) => {
    set((state) => ({
      userAnswers: [...state.userAnswers, answer],
      selectedOption: answer.selectedOption,
      answeredAt: Date.now(),
    }));
  },

  handleQuestionClosed: (correctOption: string) => {
    // Reveal the correct answer and transition to revealing phase.
    // Score/correctCount come from server via updateScore (leaderboard event).
    const currentQuestion = get().currentQuestion;
    if (currentQuestion) {
      set({
        phase: 'revealing',
        currentQuestion: { ...currentQuestion, correct_option: correctOption },
      });
    } else {
      set({ phase: 'revealing' });
    }
  },

  showBetweenLeaderboard: () => {
    const { currentQuestionNumber, totalQuestions } = get();
    if (currentQuestionNumber >= totalQuestions) {
      set({ phase: 'complete' });
    } else {
      set({ phase: 'between' });
    }
  },

  startNextQuestion: (question) => {
    const now = Date.now();
    const openedAt = question.opened_at ? new Date(question.opened_at).getTime() : now;
    const timerSeconds = question.timer_seconds;
    const elapsedMs = now - openedAt;
    const remainingMs = Math.max(0, timerSeconds * 1000 - elapsedMs);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    set((state) => ({
      phase: 'question',
      currentQuestion: question,
      questionStartedAt: openedAt,
      timerRemaining: remainingSeconds,
      questionTimerSeconds: timerSeconds,
      selectedOption: null,
      answeredAt: null,
      currentQuestionNumber: state.currentQuestionNumber + 1,
    }));
  },

  tickTimer: () => {
    const { timerRemaining, phase } = get();
    if (phase !== 'question') return;
    if (timerRemaining <= 1) {
      set({ timerRemaining: 0 });
    } else {
      set({ timerRemaining: timerRemaining - 1 });
    }
  },

  updateLeaderboard: (entries, viewerRank) =>
    set({ leaderboard: entries, viewerRank }),

  updateScore: (totalScore, correctCount) =>
    set({ totalScore, correctCount }),

  completeQuiz: () => set({ phase: 'complete' }),

  reset: () =>
    set({
      phase: 'idle',
      currentQuestion: null,
      questionStartedAt: 0,
      timerRemaining: 0,
      questionTimerSeconds: 0,
      selectedOption: null,
      answeredAt: null,
      totalScore: 0,
      correctCount: 0,
      userAnswers: [],
      leaderboard: [],
      viewerRank: null,
      currentQuestionNumber: 0,
      totalQuestions: 0,
    }),
}));

// Typed selectors
export const useLiveQuizPhase = () => useLiveQuizStore((s) => s.phase);
export const useLiveCurrentQuestion = () => useLiveQuizStore((s) => s.currentQuestion);
export const useLiveTimerRemaining = () => useLiveQuizStore((s) => s.timerRemaining);
export const useLiveSelectedOption = () => useLiveQuizStore((s) => s.selectedOption);
export const useLiveTotalScore = () => useLiveQuizStore((s) => s.totalScore);
export const useLiveCorrectCount = () => useLiveQuizStore((s) => s.correctCount);
export const useLiveLeaderboard = () => useLiveQuizStore((s) => s.leaderboard);
export const useLiveViewerRank = () => useLiveQuizStore((s) => s.viewerRank);
export const useLiveCurrentQuestionNumber = () => useLiveQuizStore((s) => s.currentQuestionNumber);
export const useLiveTotalQuestions = () => useLiveQuizStore((s) => s.totalQuestions);
export const useLivePhase = () => useLiveQuizStore((s) => s.phase);
