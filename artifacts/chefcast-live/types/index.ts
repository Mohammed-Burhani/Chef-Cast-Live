/**
 * Central TypeScript type definitions for ChefCast: Live.
 * All shared interfaces live here to ensure consistency across the app.
 */

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  xpTotal: number;
  currentStreak: number;
  longestStreak: number;
  lastCookedAt?: string;
  subscriptionTier: "free" | "premium";
  cookingLevel: "beginner" | "home_cook" | "enthusiast";
  createdAt: string;
}

export interface Episode {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl?: string;
  broadcastAt: string;
  isLive: boolean;
  chefName: string;
  season: number;
  episodeNumber: number;
  difficulty: "easy" | "medium" | "hard";
  duration: number;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  isOptional: boolean;
  stepNumber?: number;
  checked?: boolean;
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  instruction: string;
  durationSeconds?: number;
  techniqueTag?: string;
  tip?: string;
  ingredientIds?: string[];
}

export interface Recipe {
  id: string;
  episodeId: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  steps: RecipeStep[];
  ingredients: Ingredient[];
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  episodeId: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  closesAt?: string;
  userVotedOptionId?: string;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconName: string;
  xpReward: number;
  unlockCriteria: string;
  isUnlocked: boolean;
  earnedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface CommunityPost {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  episodeTitle: string;
  photoUrl: string;
  caption: string;
  likes: number;
  isLiked: boolean;
  createdAt: string;
}

export interface QAQuestion {
  id: string;
  userId: string;
  username: string;
  question: string;
  upvotes: number;
  isAnswered: boolean;
  answer?: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  xpTotal: number;
  currentStreak: number;
  isCurrentUser: boolean;
}

export interface CookSession {
  id: string;
  episodeId: string;
  recipeId: string;
  completedSteps: number[];
  completed: boolean;
  dishPhotoUrl?: string;
  startedAt: string;
  completedAt?: string;
  score: number;
}

export interface MysteryBoxSubmission {
  id: string;
  userId: string;
  username: string;
  mysteryIngredient: string;
  dishIdea: string;
  isFeaturedOnTv: boolean;
  submittedAt: string;
}

export type XPEvent =
  | "COOK_SESSION_COMPLETED"
  | "POLL_VOTED"
  | "STEP_COMPLETED"
  | "DISH_PHOTO_UPLOADED"
  | "QA_QUESTION_SUBMITTED"
  | "MYSTERY_BOX_SUBMITTED"
  | "MYSTERY_BOX_FEATURED"
  | "STREAK_3_DAYS"
  | "STREAK_7_DAYS"
  | "STREAK_30_DAYS"
  | "BADGE_EARNED";
