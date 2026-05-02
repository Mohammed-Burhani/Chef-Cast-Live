/**
 * Central TypeScript type definitions for ChefCast: Live.
 */

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  gender?: "male" | "female" | "other";
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
  hasQuiz?: boolean;
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

export interface MysteryBoxSubmission {
  id: string;
  userId: string;
  username: string;
  mysteryIngredient: string;
  dishIdea: string;
  isFeaturedOnTv: boolean;
  submittedAt: string;
}

// ─── Live Quiz Types ─────────────────────────────────────────────────────────

export interface QuizOption {
  id: string;
  label: "A" | "B" | "C" | "D";
  text: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctOptionId: string;
  timerSeconds: number;
  explanation?: string;
  category?: string;
  pointsBase: number;
}

export interface QuizAnswer {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  responseTimeMs: number;
}

export interface QuizEvent {
  id: string;
  episodeId: string;
  episodeTitle: string;
  thumbnailUrl: string;
  chefName: string;
  totalQuestions: number;
  scheduledAt: string;
  isLive: boolean;
  participantCount: number;
}

export interface QuizEventResult {
  eventId: string;
  eventTitle: string;
  date: string;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  rank: number;
  totalParticipants: number;
  answers: QuizAnswer[];
}

export interface QuizLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  correctAnswers: number;
  avgResponseMs: number;
  isCurrentUser: boolean;
}

export type XPEvent =
  | "CORRECT_ANSWER"
  | "PERFECT_EPISODE"
  | "TOP_3_FINISH"
  | "TOP_10_FINISH"
  | "DISH_PHOTO_UPLOADED"
  | "MYSTERY_BOX_SUBMITTED"
  | "MYSTERY_BOX_FEATURED";
