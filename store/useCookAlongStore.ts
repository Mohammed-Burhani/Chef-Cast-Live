/**
 * Cook-along session store using Zustand.
 * Tracks the current recipe step, ingredient checklist, and timer state.
 * This store powers the entire interactive cook-along experience.
 */

import { create } from "zustand";

import { Recipe, RecipeStep } from "@/types";

interface CookAlongState {
  /** The current recipe being cooked */
  recipe: Recipe | null;
  /** Index of the currently active step (0-based) */
  currentStepIndex: number;
  /** Set of completed step IDs */
  completedStepIds: Set<string>;
  /** Set of checked ingredient IDs (prepped by user) */
  checkedIngredientIds: Set<string>;
  /** Whether the step timer is currently running */
  timerRunning: boolean;
  /** Remaining seconds on the current step timer */
  timerRemainingSeconds: number;
  /** Which tab is active: steps, ingredients, or tips */
  activeTab: "steps" | "ingredients" | "tips";
  /** Total score for this session */
  sessionScore: number;

  /** Load a recipe to start a cook-along session */
  startSession: (recipe: Recipe) => void;
  /** Move to the next step */
  nextStep: () => void;
  /** Go back to the previous step */
  prevStep: () => void;
  /** Mark the current step as complete */
  completeCurrentStep: () => void;
  /** Toggle an ingredient as checked/unchecked */
  toggleIngredient: (ingredientId: string) => void;
  /** Start the step timer */
  startTimer: () => void;
  /** Pause the step timer */
  pauseTimer: () => void;
  /** Tick the timer by 1 second (called by interval) */
  tickTimer: () => void;
  /** Reset the timer for the current step */
  resetTimer: () => void;
  /** Switch the active bottom tab */
  setActiveTab: (tab: "steps" | "ingredients" | "tips") => void;
  /** End the current session and reset state */
  endSession: () => void;
}

export const useCookAlongStore = create<CookAlongState>()((set, get) => ({
  recipe: null,
  currentStepIndex: 0,
  completedStepIds: new Set(),
  checkedIngredientIds: new Set(),
  timerRunning: false,
  timerRemainingSeconds: 0,
  activeTab: "steps",
  sessionScore: 0,

  startSession: (recipe) => {
    const firstStep = recipe.steps[0];
    set({
      recipe,
      currentStepIndex: 0,
      completedStepIds: new Set(),
      checkedIngredientIds: new Set(),
      timerRunning: false,
      timerRemainingSeconds: firstStep?.durationSeconds ?? 0,
      activeTab: "steps",
      sessionScore: 0,
    });
  },

  nextStep: () => {
    const { recipe, currentStepIndex, completedStepIds } = get();
    if (!recipe) return;
    const newIndex = Math.min(currentStepIndex + 1, recipe.steps.length - 1);
    const newStep = recipe.steps[newIndex];
    const newCompleted = new Set(completedStepIds);
    newCompleted.add(recipe.steps[currentStepIndex].id);
    set({
      currentStepIndex: newIndex,
      completedStepIds: newCompleted,
      timerRunning: false,
      timerRemainingSeconds: newStep?.durationSeconds ?? 0,
      sessionScore: get().sessionScore + 5,
    });
  },

  prevStep: () => {
    const { recipe, currentStepIndex } = get();
    if (!recipe) return;
    const newIndex = Math.max(currentStepIndex - 1, 0);
    const prevStep = recipe.steps[newIndex];
    set({
      currentStepIndex: newIndex,
      timerRunning: false,
      timerRemainingSeconds: prevStep?.durationSeconds ?? 0,
    });
  },

  completeCurrentStep: () => {
    const { recipe, currentStepIndex, completedStepIds } = get();
    if (!recipe) return;
    const currentStep = recipe.steps[currentStepIndex];
    const newCompleted = new Set(completedStepIds);
    newCompleted.add(currentStep.id);
    set({ completedStepIds: newCompleted, sessionScore: get().sessionScore + 5 });
  },

  toggleIngredient: (ingredientId) => {
    const checked = new Set(get().checkedIngredientIds);
    if (checked.has(ingredientId)) {
      checked.delete(ingredientId);
    } else {
      checked.add(ingredientId);
    }
    set({ checkedIngredientIds: checked });
  },

  startTimer: () => {
    const { timerRemainingSeconds } = get();
    if (timerRemainingSeconds > 0) {
      set({ timerRunning: true });
    }
  },

  pauseTimer: () => set({ timerRunning: false }),

  tickTimer: () => {
    const { timerRemainingSeconds, timerRunning } = get();
    if (!timerRunning) return;
    if (timerRemainingSeconds <= 0) {
      set({ timerRunning: false });
      return;
    }
    set({ timerRemainingSeconds: timerRemainingSeconds - 1 });
  },

  resetTimer: () => {
    const { recipe, currentStepIndex } = get();
    if (!recipe) return;
    const step = recipe.steps[currentStepIndex];
    set({ timerRemainingSeconds: step?.durationSeconds ?? 0, timerRunning: false });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  endSession: () =>
    set({
      recipe: null,
      currentStepIndex: 0,
      completedStepIds: new Set(),
      checkedIngredientIds: new Set(),
      timerRunning: false,
      timerRemainingSeconds: 0,
      sessionScore: 0,
    }),
}));
