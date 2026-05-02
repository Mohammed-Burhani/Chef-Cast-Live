/**
 * Mock data for development.
 * In production, quiz questions and leaderboards are pushed via Supabase Realtime.
 */

import {
  CommunityPost,
  Episode,
  LeaderboardEntry,
  MysteryBoxSubmission,
  QAQuestion,
  QuizEvent,
  QuizEventResult,
  QuizLeaderboardEntry,
  QuizQuestion,
  Recipe,
} from "@/types";

export const MOCK_EPISODES: Episode[] = [
  {
    id: "ep-001",
    title: "Italian Risotto Night",
    description:
      "Join Chef Marco as he guides you through a perfect saffron risotto with wild mushrooms — a dish that demands patience and rewards with perfection.",
    thumbnailUrl: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800",
    broadcastAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isLive: true,
    chefName: "Chef Marco Rossi",
    season: 3,
    episodeNumber: 8,
    difficulty: "medium",
    duration: 45,
    hasQuiz: true,
  },
  {
    id: "ep-002",
    title: "Pan-Seared Duck Breast",
    description:
      "Master the art of perfectly rendered duck skin with Chef Sophie's foolproof method. Served with a cherry reduction that will blow your mind.",
    thumbnailUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
    broadcastAt: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    isLive: false,
    chefName: "Chef Sophie Laurent",
    season: 3,
    episodeNumber: 9,
    difficulty: "hard",
    duration: 55,
    hasQuiz: true,
  },
  {
    id: "ep-003",
    title: "Classic French Onion Soup",
    description:
      "Low and slow, then fast and furious. Chef Jean-Pierre reveals the secrets to the most comforting bowl of soup ever created.",
    thumbnailUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800",
    broadcastAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    isLive: false,
    chefName: "Chef Jean-Pierre",
    season: 3,
    episodeNumber: 10,
    difficulty: "easy",
    duration: 40,
    hasQuiz: true,
  },
];

// ─── Live Quiz Mock Data ───────────────────────────────────────────────────────

export const MOCK_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q-001",
    text: "Which type of rice must you use for an authentic Italian risotto?",
    options: [
      { id: "q1-a", label: "A", text: "Basmati" },
      { id: "q1-b", label: "B", text: "Arborio" },
      { id: "q1-c", label: "C", text: "Jasmine" },
      { id: "q1-d", label: "D", text: "Long-grain" },
    ],
    correctOptionId: "q1-b",
    timerSeconds: 15,
    explanation: "Arborio rice is essential — its high starch content is what creates risotto's signature creamy texture.",
    category: "Ingredients",
    pointsBase: 1000,
  },
  {
    id: "q-002",
    text: "What does the Italian technique 'mantecatura' involve?",
    options: [
      { id: "q2-a", label: "A", text: "Slow-roasting in the oven" },
      { id: "q2-b", label: "B", text: "Adding saffron at the end" },
      { id: "q2-c", label: "C", text: "Vigorously stirring in cold butter and Parmesan" },
      { id: "q2-d", label: "D", text: "Toasting the rice before cooking" },
    ],
    correctOptionId: "q2-c",
    timerSeconds: 20,
    explanation: "Mantecatura is the final step — beating in cold butter and Parmesan off the heat to create a creamy emulsion.",
    category: "Technique",
    pointsBase: 1000,
  },
  {
    id: "q-003",
    text: "Why must you add hot stock to risotto one ladle at a time?",
    options: [
      { id: "q3-a", label: "A", text: "To prevent the rice from sticking" },
      { id: "q3-b", label: "B", text: "To control the starch release and build creaminess" },
      { id: "q3-c", label: "C", text: "To keep the pan temperature consistent" },
      { id: "q3-d", label: "D", text: "Cold stock would ruin the colour" },
    ],
    correctOptionId: "q3-b",
    timerSeconds: 20,
    explanation: "Adding stock gradually forces the rice to release starch slowly — that's where the creaminess comes from, not from cream!",
    category: "Technique",
    pointsBase: 1000,
  },
  {
    id: "q-004",
    text: "Saffron is the world's most expensive spice by weight. Which part of the plant is harvested?",
    options: [
      { id: "q4-a", label: "A", text: "The petals" },
      { id: "q4-b", label: "B", text: "The roots" },
      { id: "q4-c", label: "C", text: "The stigmas (threads)" },
      { id: "q4-d", label: "D", text: "The seeds" },
    ],
    correctOptionId: "q4-c",
    timerSeconds: 15,
    explanation: "Saffron comes from the stigmas of the Crocus sativus flower — each flower has only 3, and they must be hand-harvested.",
    category: "Ingredients",
    pointsBase: 1000,
  },
  {
    id: "q-005",
    text: "At what stage should you stop cooking risotto?",
    options: [
      { id: "q5-a", label: "A", text: "When all the liquid is absorbed" },
      { id: "q5-b", label: "B", text: "When the rice is completely soft" },
      { id: "q5-c", label: "C", text: "Al dente — tender but with a slight bite" },
      { id: "q5-d", label: "D", text: "After exactly 18 minutes, no matter what" },
    ],
    correctOptionId: "q5-c",
    timerSeconds: 15,
    explanation: "Al dente means 'to the tooth' — the rice should have a very slight resistance. It will carry over and cook further from the residual heat.",
    category: "Technique",
    pointsBase: 1000,
  },
];

export const MOCK_QUIZ_EVENT: QuizEvent = {
  id: "quiz-ep-001",
  episodeId: "ep-001",
  episodeTitle: "Italian Risotto Night",
  thumbnailUrl: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800",
  chefName: "Chef Marco Rossi",
  totalQuestions: 5,
  scheduledAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  isLive: true,
  participantCount: 2847,
};

export const MOCK_QUIZ_LEADERBOARD: QuizLeaderboardEntry[] = [
  { rank: 1, userId: "u1", username: "risotto_king", score: 4950, correctAnswers: 5, avgResponseMs: 4200, isCurrentUser: false },
  { rank: 2, userId: "u2", username: "chef_sophie_fan", score: 4720, correctAnswers: 5, avgResponseMs: 5100, isCurrentUser: false },
  { rank: 3, userId: "u3", username: "midnight_cook", score: 4500, correctAnswers: 5, avgResponseMs: 6300, isCurrentUser: false },
  { rank: 4, userId: "u4", username: "pasta_queen", score: 4100, correctAnswers: 4, avgResponseMs: 4800, isCurrentUser: false },
  { rank: 5, userId: "u5", username: "foodie_sara", score: 3850, correctAnswers: 4, avgResponseMs: 5900, isCurrentUser: false },
  { rank: 6, userId: "u6", username: "weekend_warrior", score: 3600, correctAnswers: 4, avgResponseMs: 7200, isCurrentUser: false },
  { rank: 7, userId: "me", username: "you", score: 3200, correctAnswers: 3, avgResponseMs: 6800, isCurrentUser: true },
  { rank: 8, userId: "u8", username: "kitchen_newbie", score: 2900, correctAnswers: 3, avgResponseMs: 8100, isCurrentUser: false },
  { rank: 9, userId: "u9", username: "spice_master", score: 2400, correctAnswers: 2, avgResponseMs: 9200, isCurrentUser: false },
  { rank: 10, userId: "u10", username: "flavor_chaser", score: 1800, correctAnswers: 2, avgResponseMs: 11000, isCurrentUser: false },
];

export const MOCK_PAST_QUIZ_RESULTS: QuizEventResult[] = [
  {
    eventId: "quiz-ep-007",
    eventTitle: "French Butter Sauces",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    totalQuestions: 5,
    correctAnswers: 4,
    totalScore: 3850,
    rank: 12,
    totalParticipants: 3120,
    answers: [],
  },
  {
    eventId: "quiz-ep-006",
    eventTitle: "Japanese Knife Skills",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    totalQuestions: 5,
    correctAnswers: 5,
    totalScore: 4800,
    rank: 3,
    totalParticipants: 2650,
    answers: [],
  },
  {
    eventId: "quiz-ep-005",
    eventTitle: "Spanish Paella Deep Dive",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
    totalQuestions: 5,
    correctAnswers: 3,
    totalScore: 2700,
    rank: 45,
    totalParticipants: 2900,
    answers: [],
  },
];

// ─── Community / Other Mock Data ──────────────────────────────────────────────

export const MOCK_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "post-1",
    userId: "user-2",
    username: "foodie_sara",
    episodeTitle: "Italian Risotto Night",
    photoUrl: "https://images.unsplash.com/photo-1717465962260-d6d2fa73db5f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    caption: "Got 4/5 on the risotto quiz! So proud of myself 🔥",
    likes: 142,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "post-2",
    userId: "user-3",
    username: "chef_at_home",
    episodeTitle: "Italian Risotto Night",
    photoUrl: "https://images.unsplash.com/photo-1653233797467-1a528819fd4f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    caption: "Perfect score on the quiz! The mantecatura question got everyone",
    likes: 89,
    isLiked: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "post-3",
    userId: "user-4",
    username: "weekend_warrior",
    episodeTitle: "Pan-Seared Duck Breast",
    photoUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500",
    caption: "Ranked #6 on last week's duck quiz! Getting better every week",
    likes: 234,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "post-4",
    userId: "user-5",
    username: "pasta_queen",
    episodeTitle: "Italian Risotto Night",
    photoUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500",
    caption: "Ranked #4 in tonight's quiz! The saffron question caught me off guard",
    likes: 67,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
  },
];

export const MOCK_QA: QAQuestion[] = [
  {
    id: "qa-1",
    userId: "user-6",
    username: "kitchen_newbie",
    question: "Can I use regular long-grain rice instead of Arborio?",
    upvotes: 24,
    isAnswered: true,
    answer:
      "No! Arborio or Carnaroli are essential. They have high starch content which creates the creamy texture. Long-grain rice won't work.",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: "qa-2",
    userId: "user-7",
    username: "curious_cook",
    question: "Why does my risotto always turn gluggy?",
    upvotes: 18,
    isAnswered: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "u1", username: "risotto_king", score: 9840, xpTotal: 12400, currentStreak: 21, isCurrentUser: false },
  { rank: 2, userId: "u2", username: "chef_sophie_fan", score: 8920, xpTotal: 10200, currentStreak: 15, isCurrentUser: false },
  { rank: 3, userId: "u3", username: "midnight_cook", score: 8650, xpTotal: 9800, currentStreak: 12, isCurrentUser: false },
  { rank: 4, userId: "u4", username: "pasta_queen", score: 7400, xpTotal: 8900, currentStreak: 8, isCurrentUser: false },
  { rank: 5, userId: "u5", username: "foodie_sara", score: 6800, xpTotal: 7200, currentStreak: 5, isCurrentUser: false },
  { rank: 6, userId: "u6", username: "weekend_warrior", score: 5900, xpTotal: 6100, currentStreak: 3, isCurrentUser: false },
  { rank: 7, userId: "me-user", username: "you", score: 4200, xpTotal: 4800, currentStreak: 5, isCurrentUser: true },
  { rank: 8, userId: "u8", username: "kitchen_newbie", score: 3800, xpTotal: 4200, currentStreak: 2, isCurrentUser: false },
];

export const MOCK_MYSTERY_BOX_SUBMISSIONS: MysteryBoxSubmission[] = [
  {
    id: "mb-1",
    userId: "user-2",
    username: "foodie_sara",
    mysteryIngredient: "Pomegranate",
    dishIdea: "Moroccan lamb tagine with pomegranate molasses glaze and preserved lemon couscous",
    isFeaturedOnTv: true,
    submittedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "mb-2",
    userId: "user-3",
    username: "chef_at_home",
    mysteryIngredient: "Pomegranate",
    dishIdea: "Duck breast with pomegranate and walnut sauce, served on a bed of jeweled saffron rice",
    isFeaturedOnTv: false,
    submittedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
];

export const MOCK_RECIPE: Recipe = {
  id: "recipe-001",
  episodeId: "ep-001",
  title: "Saffron Risotto with Wild Mushrooms",
  description: "A creamy, luxurious Italian risotto infused with saffron and topped with sautéed wild mushrooms.",
  servings: 4,
  prepTimeMinutes: 15,
  cookTimeMinutes: 30,
  ingredients: [
    { id: "ing-1", name: "Arborio rice", amount: "1.5 cups", isOptional: false },
    { id: "ing-2", name: "Chicken or vegetable stock", amount: "6 cups", isOptional: false },
    { id: "ing-3", name: "Saffron threads", amount: "1 pinch", isOptional: false },
    { id: "ing-4", name: "White wine", amount: "1/2 cup", isOptional: false },
    { id: "ing-5", name: "Parmesan cheese", amount: "1 cup grated", isOptional: false },
    { id: "ing-6", name: "Butter", amount: "3 tbsp", isOptional: false },
    { id: "ing-7", name: "Wild mushrooms", amount: "8 oz", isOptional: false },
    { id: "ing-8", name: "Shallots", amount: "2 minced", isOptional: false },
    { id: "ing-9", name: "Fresh parsley", amount: "2 tbsp", isOptional: true },
  ],
  steps: [
    { id: "step-1", stepNumber: 1, instruction: "Heat stock in a saucepan and keep warm. Steep saffron in 1/4 cup hot stock.", durationSeconds: 300 },
    { id: "step-2", stepNumber: 2, instruction: "In a large pan, sauté shallots in butter until translucent.", durationSeconds: 180 },
    { id: "step-3", stepNumber: 3, instruction: "Add rice and toast for 2 minutes, stirring constantly.", durationSeconds: 120 },
    { id: "step-4", stepNumber: 4, instruction: "Pour in wine and stir until absorbed.", durationSeconds: 180 },
    { id: "step-5", stepNumber: 5, instruction: "Add stock one ladle at a time, stirring frequently until absorbed before adding more.", durationSeconds: 1200 },
    { id: "step-6", stepNumber: 6, instruction: "Stir in saffron stock during the last 5 minutes of cooking.", durationSeconds: 300 },
    { id: "step-7", stepNumber: 7, instruction: "Remove from heat, stir in Parmesan and remaining butter vigorously (mantecatura).", durationSeconds: 120 },
    { id: "step-8", stepNumber: 8, instruction: "Top with sautéed wild mushrooms and fresh parsley. Serve immediately.", durationSeconds: 60 },
  ],
  nutritionPerServing: {
    calories: 420,
    protein: 12,
    carbs: 58,
    fat: 14,
  },
};
