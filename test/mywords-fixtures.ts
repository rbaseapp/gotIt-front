import type { WordCard } from "../src/lib/myWords";
export const cardId = (i: number) =>
  `${String(i).padStart(8, "0")}-0000-4000-8000-000000000001`;
const date = "2026-10-12T00:00:00.000Z";
const values = [
  ["revenue", "הכנסות", "n", "new", 40, "ft.com", 0],
  ["headline", "כותרת", "n", "new", 20, "cnn.com", 0],
  ["reluctant", "מסויג, לא שש", "adj", "learning", 40, "nytimes.com", 2],
  ["abundant", "שופע, בשפע", "adj", "learning", 40, "ft.com", 12],
  ["commute", "נסיעה לעבודה", "v", "mastered", 60, "reddit.com", 4],
  ["abandon", "לנטוש", "v", "mastered", 80, "bbc.com", 7],
  ["deadline", "מועד אחרון", "n", "new", 20, "linkedin.com", 0],
  ["accomplish", "להשיג, להגשים", "v", "learning", 40, "youtube.com", 0],
  ["negotiate", "לנהל משא ומתן", "v", "learning", 60, "linkedin.com", 0],
  ["itinerary", "מסלול נסיעה", "n", "learning", 40, "lonelyplanet.com", 0],
] as const;
export const myWordCards: WordCard[] = values.map((v, i) => ({
  id: cardId(i + 1),
  sourceText: v[0],
  primaryTranslation: v[1],
  partOfSpeech: v[2],
  learningStatus: v[3],
  overallMasteryScore: v[4],
  sourceLanguageCode: "en",
  translationLanguageCode: "he",
  itemType: "word",
  userStatus: "active",
  userPriority: "normal",
  manualHard: false,
  nextReviewAt: new Date(Date.parse(date) + v[6] * 86400000).toISOString(),
  createdAt: date,
  updatedAt: date,
  source: {
    sourceType: "chrome_extension",
    pageUrl: `https://${v[5]}/article`,
    pageTitle: "An article",
    sentenceText:
      i === 0
        ? "The company reported record revenue this quarter."
        : `A sentence with ${v[0]}.`,
    paragraphText: null,
    capturedAt: date,
  },
  tags: [{ id: cardId(90), name: "עסקים" }],
  answers: { correct: i === 0 ? 0 : 3, total: i === 0 ? 0 : 5 },
}));
export const myWordsDashboard = {
  counts: {
    total: 248,
    new: 31,
    learning: 96,
    reviewing: 0,
    mastered: 121,
    due: 6,
    difficult: 3,
    highPriority: 0,
    awaitingRecall: 0,
  },
  skills: [],
  modes: [],
  recentActivity: [],
  recentActivityPagination: {
    page: 1,
    pageCount: 1,
    totalCount: 0,
    pageSize: 6,
  },
  dailyGoal: {
    type: "minutes",
    value: 10,
    current: 6,
    completed: false,
    date: "2026-10-12",
  },
  gamification: {
    totalXp: 120,
    level: 1,
    nextLevelXp: 250,
    todayXp: 0,
    dailyXpCap: 200,
    dailyXpRemaining: 200,
    dailyXpCapReached: false,
    postDailyCapPercent: 25,
    currentStreakDays: 4,
    longestStreakDays: 4,
    lastActivityDate: "2026-10-12",
  },
  weeklyActivity: { timezone: "Asia/Jerusalem", days: [] },
};
