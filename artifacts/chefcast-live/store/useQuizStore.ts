/**
 * Live Quiz store using Zustand.
 * Manages the full quiz state machine:
 *   idle → countdown → question → revealing → between → (loop) → complete
 *
 * In production, the host's question pushes arrive via Supabase Realtime.
 * Here we simulate with mock data and manual triggers.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { MOCK_QUIZ_QUESTIONS, MOCK_QUIZ_LEADERBOARD, MOCK_PAST_QUIZ_RESULTS } from "@/constants/mockData";
import {
  QuizAnswer,
  QuizEventResult,
  QuizLeaderboardEntry,
  QuizQuestion,
} from "@/types";

export type QuizPhase =
  | "idle"        // No quiz active — show upcoming info + past results
  | "countdown"   // Quiz is starting — 3-2-1 countdown
  | "question"    // Question is live — timer running, awaiting answer
  | "revealing"   // Timer expired or user answered — show correct answer
  | "between"     // Brief leaderboard snapshot between questions
  | "complete";   // All questions done — show final leaderboard

interface QuizState {
  phase: QuizPhase;
  questions: QuizQuestion[];
  currentQuestionIndex: number;

  /** When the current question became active (Date.now() ms) */
  questionStartedAt: number;

  /** Remaining seconds on the question timer */
  timerRemaining: number;

  /** All answers the user has given so far this session */
  userAnswers: QuizAnswer[];

  /** Which option the user tapped (null if time ran out) */
  selectedOptionId: string | null;

  /** Running score for this session */
  sessionScore: number;

  /** Leaderboard updated after each question */
  liveLeaderboard: QuizLeaderboardEntry[];

  /** Past completed quiz results */
  pastResults: QuizEventResult[];

  /** Total participants in this quiz */
  participantCount: number;

  /** Countdown number (3, 2, 1) */
  countdownValue: number;

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Start a new quiz session */
  startQuiz: () => void;

  /** Select an answer option */
  selectAnswer: (optionId: string) => void;

  /** Reveal the correct answer (called when timer hits 0 or user answers) */
  revealAnswer: () => void;

  /** Advance to the next question (or complete if last) */
  nextQuestion: () => void;

  /** Move from revealing to between-question leaderboard */
  showBetweenLeaderboard: () => void;

  /** Tick the timer down by 1 second */
  tickTimer: () => void;

  /** Tick the countdown down */
  tickCountdown: () => void;

  /** Reset to idle state */
  resetQuiz: () => void;

  /** Load past results from AsyncStorage */
  loadPastResults: () => Promise<void>;
}

const STORAGE_KEY = "@chefcast:quizResults";

/** Calculate points for a correct answer based on response speed */
function calcPoints(base: number, totalSeconds: number, remainingSeconds: number): number {
  const speedRatio = remainingSeconds / totalSeconds;
  const speedBonus = Math.round(base * 0.5 * speedRatio);
  return base + speedBonus;
}

export const useQuizStore = create<QuizState>()((set, get) => ({
  phase: "idle",
  questions: MOCK_QUIZ_QUESTIONS,
  currentQuestionIndex: 0,
  questionStartedAt: 0,
  timerRemaining: 0,
  userAnswers: [],
  selectedOptionId: null,
  sessionScore: 0,
  liveLeaderboard: MOCK_QUIZ_LEADERBOARD,
  pastResults: MOCK_PAST_QUIZ_RESULTS,
  participantCount: 2847,
  countdownValue: 3,

  startQuiz: () => {
    set({
      phase: "countdown",
      currentQuestionIndex: 0,
      userAnswers: [],
      selectedOptionId: null,
      sessionScore: 0,
      countdownValue: 3,
    });
  },

  tickCountdown: () => {
    const { countdownValue, questions } = get();
    if (countdownValue <= 1) {
      const firstQ = questions[0];
      set({
        phase: "question",
        timerRemaining: firstQ.timerSeconds,
        questionStartedAt: Date.now(),
        selectedOptionId: null,
      });
    } else {
      set({ countdownValue: countdownValue - 1 });
    }
  },

  selectAnswer: (optionId) => {
    const { phase, selectedOptionId } = get();
    // Lock in only one answer per question
    if (phase !== "question" || selectedOptionId !== null) return;
    set({ selectedOptionId: optionId });
    // Immediately reveal after selection
    get().revealAnswer();
  },

  revealAnswer: () => {
    const { questions, currentQuestionIndex, selectedOptionId, timerRemaining, sessionScore, userAnswers } = get();
    const question = questions[currentQuestionIndex];
    if (!question) return;

    const isCorrect = selectedOptionId === question.correctOptionId;
    const pointsEarned = isCorrect
      ? calcPoints(question.pointsBase, question.timerSeconds, timerRemaining)
      : 0;
    const responseMs = selectedOptionId
      ? (question.timerSeconds - timerRemaining) * 1000
      : question.timerSeconds * 1000;

    const answer: QuizAnswer = {
      questionId: question.id,
      selectedOptionId,
      isCorrect,
      pointsEarned,
      responseTimeMs: responseMs,
    };

    // Update leaderboard — inject user's new score at rank 7
    const newScore = sessionScore + pointsEarned;
    const updatedLeaderboard = MOCK_QUIZ_LEADERBOARD.map((entry) =>
      entry.isCurrentUser ? { ...entry, score: newScore } : entry
    ).sort((a, b) => b.score - a.score)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    set({
      phase: "revealing",
      userAnswers: [...userAnswers, answer],
      sessionScore: newScore,
      liveLeaderboard: updatedLeaderboard,
      timerRemaining: 0,
    });
  },

  showBetweenLeaderboard: () => {
    const { currentQuestionIndex, questions } = get();
    if (currentQuestionIndex >= questions.length - 1) {
      get().nextQuestion();
    } else {
      set({ phase: "between" });
    }
  },

  nextQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= questions.length) {
      // Quiz complete — save result
      const { sessionScore, userAnswers, pastResults } = get();
      const correctCount = userAnswers.filter((a) => a.isCorrect).length;
      const newResult: QuizEventResult = {
        eventId: `quiz-${Date.now()}`,
        eventTitle: "Italian Risotto Night",
        date: new Date().toISOString(),
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        totalScore: sessionScore,
        rank: get().liveLeaderboard.find((e) => e.isCurrentUser)?.rank ?? 7,
        totalParticipants: get().participantCount,
        answers: userAnswers,
      };

      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([newResult, ...pastResults].slice(0, 10)));

      set({
        phase: "complete",
        pastResults: [newResult, ...pastResults],
      });
    } else {
      const nextQ = questions[nextIndex];
      set({
        phase: "question",
        currentQuestionIndex: nextIndex,
        timerRemaining: nextQ.timerSeconds,
        questionStartedAt: Date.now(),
        selectedOptionId: null,
      });
    }
  },

  tickTimer: () => {
    const { timerRemaining, phase } = get();
    if (phase !== "question") return;
    if (timerRemaining <= 1) {
      // Time's up — reveal with no answer
      get().revealAnswer();
    } else {
      set({ timerRemaining: timerRemaining - 1 });
    }
  },

  resetQuiz: () =>
    set({
      phase: "idle",
      currentQuestionIndex: 0,
      userAnswers: [],
      selectedOptionId: null,
      sessionScore: 0,
      timerRemaining: 0,
      liveLeaderboard: MOCK_QUIZ_LEADERBOARD,
    }),

  loadPastResults: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const saved = JSON.parse(json) as QuizEventResult[];
        set({ pastResults: [...saved, ...MOCK_PAST_QUIZ_RESULTS] });
      }
    } catch {
      // use defaults
    }
  },
}));
