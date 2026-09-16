export type LearningStatus = "NEW" | "LEARNING" | "REVIEWING" | "MASTERED";
export type UserStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type GameType =
  | "smart"
  | "flashcards"
  | "recall"
  | "listening"
  | "matching"
  | "pronunciation";
export type SkillKey =
  "recognition" | "recall" | "listening" | "spelling" | "pronunciation";

export interface SkillScores {
  recognition: number;
  recall: number;
  listening: number;
  spelling: number;
  pronunciation: number;
}

export interface LearningItem {
  id: string;
  source: string;
  translation: string;
  sourceLanguage: string;
  translationLanguage: string;
  partOfSpeech: string;
  phonetic?: string;
  context: string;
  sourceTitle?: string;
  status: LearningStatus;
  userStatus: UserStatus;
  priority: "NORMAL" | "HIGH";
  hard: boolean;
  mastery: number;
  skills: SkillScores;
  tags: string[];
  dueAt: string;
  createdAt: string;
  attempts: number;
  deletedAt?: string | null;
  masterySource?: "SYSTEM" | "USER" | null;
  firstMasteredAt?: string | null;
  translations?: string[];
  examples?: string[];
  occurrences?: Array<{ context: string; createdAt: string }>;
}

export interface Attempt {
  id: string;
  itemId: string;
  game: GameType;
  correct: boolean;
  score: number;
  createdAt: string;
  sessionId?: string;
  sequence?: number;
  result?:
    "correct" | "partially_correct" | "incorrect" | "skipped" | "self_rated";
  skills?: SkillKey[];
  direction?: "source_to_meaning" | "meaning_to_source" | "audio_to_source";
  userAnswer?: string;
  expectedAnswer?: string;
  responseTimeMs?: number;
  hintsUsed?: number;
  selfRating?: "again" | "hard" | "good" | "easy";
  xp?: number;
}

export interface PracticeSession {
  id: string;
  game: GameType;
  startedAt: string;
  endedAt?: string;
  status: "active" | "completed" | "abandoned";
  itemIds: string[];
  xp: number;
  durationSeconds: number;
}

export interface AuthUser {
  id: string;
  applicationId: string;
  email: string;
  emailVerified: boolean;
  status: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type ProfilePatch = Omit<UserProfile, "name" | "email">;

export interface UserProfile {
  learningPreferences?: { enabledSkills: SkillKey[] };
  name: string;
  email: string;
  defaultTranslationLanguage: string | null;
  timezone: string;
  dailyGoal: { type: "items" | "minutes" | "attempts"; value: number };
  defaultNewItemsPerDay: number;
  translationMethodPreference: "auto" | "dictionary" | "ai" | null;
  languages: Array<{
    languageCode: string;
    selfAssessedLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
    systemEstimatedLevel?: string | null;
    effectiveLevel?: string | null;
    systemConfidence?: number | null;
    lastEvaluatedAt?: string | null;
  }>;
  interests: string[];
}

export interface AppStats {
  xp: number;
  streak: number;
  learnedToday: number;
  minutesThisWeek: number;
  lastPracticeDate: string | null;
}
