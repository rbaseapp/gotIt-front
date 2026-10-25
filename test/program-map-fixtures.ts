import type { WordPack } from "../src/lib/product";
import type { UnitLearningPath } from "../src/lib/unitLearningPath";
import { fixtureHomework } from "./course-fixtures";
export const mapPack: WordPack = {
  id: "d3000000-0000-4000-8000-000000000001",
  slug: "first",
  title: "Building Your First Sentences",
  description: "Build your first sentences.",
  moduleNumber: 1,
  version: 4,
  wordCount: 50,
  installed: true,
  installedVersion: 4,
  topic: {
    id: "d3000000-0000-4000-8000-000000000001",
    slug: "english-learning-path-en-he",
    title: "English",
  },
  track: {
    id: "d3000000-0000-4000-8000-000000000001",
    slug: "basic",
    title: "Basic",
    levelCode: "beginner",
    cefrFrom: "A1",
    cefrTo: "A2",
    sourceLanguageCode: "en",
    translationLanguageCode: "he",
  },
  progress: {
    introduced: 26,
    completed: 10,
    mastered: 0,
    linked: 26,
    new: 0,
    learning: 26,
    reviewing: 0,
    due: 0,
  },
};
export const mapPath: UnitLearningPath = {
  packId: mapPack.id,
  words: [
    {
      sourceText: "you",
      translationText: "אתה",
      exampleText: null,
      introduced: true,
    },
  ],
  stations: (["supported", "midpoint", "review"] as const).map(
    (station, index) => ({
      station,
      requiredWords: [10, 25, 50][index],
      durationMinutes: [5, 5, 10][index],
      available: index < 2,
      meetingCompleted: index === 0,
      preparationComplete: index === 0,
      lessonId: index === 0 ? fixtureHomework.lessonId : null,
      homework:
        index === 0
          ? {
              ...fixtureHomework,
              courseId: null,
              packId: mapPack.id,
              station: "supported",
              status: "completed",
            }
          : null,
      lockReason: index === 2 ? "words" : null,
    }),
  ),
  nextAction: { kind: "meeting", station: "midpoint", homeworkId: null },
};
