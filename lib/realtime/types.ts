/**
 * Realtime Event Types
 * Discriminated union for all realtime events in the app
 */

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'failed';

export type QuestionActivatedEvent = {
  type: 'QUESTION_ACTIVATED';
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
};

export type QuestionClosedEvent = {
  type: 'QUESTION_CLOSED';
  questionId: string;
  episodeId: string;
  correctOption: 'a' | 'b' | 'c' | 'd';
  closedAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalScore: number;
  correctCount: number;
};

export type ViewerEntry = {
  rank: number;
  totalScore: number;
  correctCount: number;
};

export type LeaderboardUpdatedEvent = {
  type: 'LEADERBOARD_UPDATED';
  episodeId: string;
  topTen: LeaderboardEntry[];
  viewerEntry: ViewerEntry | null;
};

export type EpisodeWentLiveEvent = {
  type: 'EPISODE_WENT_LIVE';
  episodeId: string;
  title: string;
  startedAt: string;
};

export type EpisodeEndedEvent = {
  type: 'EPISODE_ENDED';
  episodeId: string;
  endedAt: string;
  finalRank: number | null;
  finalScore: number | null;
};

export type NewDishPhotoEvent = {
  type: 'NEW_DISH_PHOTO';
  photoId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  imageUrl: string;
  caption: string;
  episodeId: string | null;
  createdAt: string;
};

export type BadgeAwardedEvent = {
  type: 'BADGE_AWARDED';
  badgeKey: string;
  badgeName: string;
  xpReward: number;
  earnedAt: string;
};

export type XpUpdatedEvent = {
  type: 'XP_UPDATED';
  newXp: number;
  newLevelTitle: string;
  xpDelta: number;
};

export type ConnectionFailedEvent = {
  type: 'CONNECTION_FAILED';
  channelName: string;
  reason: string;
};

export type QuestionDismissedEvent = {
  type: 'QUESTION_DISMISSED';
  questionId: string;
  episodeId: string;
  dismissedAt: string;
};

export type CommentEvent = {
  type: 'NEW_COMMENT';
  commentId: string;
  episodeId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  text: string;
  createdAt: string;
};

export type RealtimeEvent =
  | QuestionActivatedEvent
  | QuestionClosedEvent
  | QuestionDismissedEvent
  | LeaderboardUpdatedEvent
  | EpisodeWentLiveEvent
  | EpisodeEndedEvent
  | NewDishPhotoEvent
  | BadgeAwardedEvent
  | XpUpdatedEvent
  | ConnectionFailedEvent
  | CommentEvent;
