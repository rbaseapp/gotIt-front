import type { WordPack } from "./product";

export const ENGLISH_PATH_SLUGS = new Set([
  "daily-english",
  "english-learning-path-en-he",
]);

export const isEnglishPathPack = (pack: WordPack) =>
  ENGLISH_PATH_SLUGS.has(pack.topic.slug) &&
  pack.track.sourceLanguageCode === "en" &&
  pack.track.translationLanguageCode === "he";

export const ENGLISH_PATH_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export function englishPathLevels(packs: WordPack[]) {
  const coursePacks = packs.filter(isEnglishPathPack);
  return ENGLISH_PATH_LEVELS.map((level) => ({
    level,
    packs: coursePacks
      .filter((pack) => pack.track.levelCode === level)
      .sort((a, b) => a.moduleNumber - b.moduleNumber),
  }));
}

export const completedEnglishUnit = (pack: WordPack) =>
  pack.wordCount > 0 &&
  pack.progress.linked === pack.wordCount &&
  pack.progress.mastered === pack.wordCount;
