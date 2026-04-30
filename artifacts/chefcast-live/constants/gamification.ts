/**
 * Gamification constants: XP rewards per event and level thresholds.
 * These values define how the XP system rewards user engagement.
 */

import { XPEvent } from "@/types";

export const XP_REWARDS: Record<XPEvent, number> = {
  COOK_SESSION_COMPLETED: 100,
  POLL_VOTED: 10,
  STEP_COMPLETED: 5,
  DISH_PHOTO_UPLOADED: 25,
  QA_QUESTION_SUBMITTED: 15,
  MYSTERY_BOX_SUBMITTED: 50,
  MYSTERY_BOX_FEATURED: 200,
  STREAK_3_DAYS: 75,
  STREAK_7_DAYS: 200,
  STREAK_30_DAYS: 1000,
  BADGE_EARNED: 50,
  QUIZ_COMPLETED: 150,
  QUIZ_PERFECT_SCORE: 500,
  QUIZ_TOP_10: 200,
};

export interface Level {
  name: string;
  minXP: number;
  color: string;
}

export const LEVELS: Level[] = [
  { name: "Prep Cook", minXP: 0, color: "#6B7280" },
  { name: "Home Cook", minXP: 500, color: "#22C55E" },
  { name: "Sous Chef", minXP: 1500, color: "#3B82F6" },
  { name: "Head Chef", minXP: 3000, color: "#8B5CF6" },
  { name: "Executive Chef", minXP: 6000, color: "#F5A623" },
  { name: "Master Chef", minXP: 10000, color: "#E8572A" },
];

/**
 * Returns the current level object based on total XP.
 */
export function getLevelForXP(xp: number): Level {
  let currentLevel = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXP) {
      currentLevel = level;
    }
  }
  return currentLevel;
}

/**
 * Returns the next level object, or null if already at max level.
 */
export function getNextLevel(xp: number): Level | null {
  const currentLevel = getLevelForXP(xp);
  const currentIndex = LEVELS.indexOf(currentLevel);
  return LEVELS[currentIndex + 1] ?? null;
}

/**
 * Returns progress 0-1 toward the next level.
 */
export function getLevelProgress(xp: number): number {
  const current = getLevelForXP(xp);
  const next = getNextLevel(xp);
  if (!next) return 1;
  return (xp - current.minXP) / (next.minXP - current.minXP);
}
