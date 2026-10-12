import type { Course } from "./courses";
import type { WordPack } from "./product";
import { completedEnglishUnit, englishPathLevels } from "./englishPath";

export const programsDesignEnabled = (
  hostname = window.location.hostname,
  preview = import.meta.env.VITE_PROGRAMS_DESIGN === "true",
) =>
  hostname === "gotit-dev.rbaseapp.com" ||
  (preview && ["localhost", "127.0.0.1", "[::1]"].includes(hostname));

export type Program = {
  id: string;
  title: string;
  description: string;
  language: string;
  supportLanguage: string;
  level: string;
  minutes: number | null;
  daysPerWeek: number | null;
  completed: number;
  total: number;
  status: "draft" | "ongoing" | "completed";
  destination: string;
  continueTo: string;
  next: string | null;
  lessonNumber: number | null;
  kind: "books" | "conversation" | "travel" | "work";
  checkpoints: { title: string; completed: boolean }[];
  course?: Course;
};
export function programKind(text: string, path?: string): Program["kind"] {
  if (
    /travel|trip|touris|viaj|voyage|reise|טיול|נסיע|سفر|سياح|путеше|旅行/iu.test(
      text,
    )
  )
    return "travel";
  if (
    /business|work|career|job|negoci|travail|arbeit|עבוד|עסק|عمل|أعمال|работ|商务/iu.test(
      text,
    )
  )
    return "work";
  return path === "grammar" || path === "comprehensive"
    ? "books"
    : "conversation";
}
export function courseProgram(course: Course, fallbackTitle: string): Program {
  const version = course.versions.find(
    (v) => v.version === (course.activeVersion ?? course.draftVersion),
  );
  const prefs = version?.preferences ?? course.preferences;
  const units = version?.plan.units ?? [];
  const total = units.reduce((sum, unit) => sum + unit.lessons.length, 0);
  const active = course.activeVersion !== null;
  const completed = active
    ? Math.min(total, Math.max(0, course.progress.covered))
    : 0;
  const title = version?.plan.title || fallbackTitle;
  const status = !active
    ? "draft"
    : course.nextLesson
      ? "ongoing"
      : "completed";
  const nextUnit = units.findIndex(
    (unit) => unit.key === course.nextLesson?.unitKey,
  );
  const lessonNumber =
    course.nextLesson && nextUnit >= 0
      ? units
          .slice(0, nextUnit)
          .reduce((sum, unit) => sum + unit.lessons.length, 0) +
        course.nextLesson.lessonIndex +
        1
      : null;
  return {
    id: course.id,
    title,
    description: version?.plan.outcome || prefs.goal,
    language: prefs.targetLanguageCode,
    supportLanguage: prefs.supportLanguageCode,
    level: prefs.startingLevel,
    minutes: prefs.minutesPerLesson,
    daysPerWeek: prefs.daysPerWeek,
    completed,
    total,
    status,
    destination: `/courses/${course.id}`,
    continueTo:
      status === "ongoing"
        ? `/private-lesson?course=${course.id}&language=${encodeURIComponent(prefs.targetLanguageCode)}`
        : `/courses/${course.id}`,
    next: course.nextLesson?.title ?? null,
    lessonNumber,
    kind: programKind(`${title} ${prefs.goal}`, prefs.path),
    checkpoints: units
      .slice(Math.max(0, nextUnit - 2), Math.max(0, nextUnit - 2) + 3)
      .map((unit) => ({
        title: unit.title,
        completed:
          active &&
          unit.lessons.every((_, index) =>
            course.evidence.some(
              (e) =>
                e.version === course.activeVersion &&
                e.unitKey === unit.key &&
                e.lessonIndex === index &&
                e.covered,
            ),
          ),
      })),
    course,
  };
}
export function pathProgram(
  packs: WordPack[],
  title: string,
  description: string,
): Program | null {
  const path = englishPathLevels(packs).flatMap((level) => level.packs);
  if (!path.length) return null;
  const next = path.find((pack) => !completedEnglishUnit(pack));
  const completed = path.filter(completedEnglishUnit).length;
  return {
    id: "english-path",
    title,
    description,
    language: "en",
    supportLanguage: "he",
    level: next?.track.levelCode ?? path.at(-1)!.track.levelCode,
    minutes: null,
    daysPerWeek: null,
    completed,
    total: path.length,
    status: next ? "ongoing" : "completed",
    destination: "/english-learning",
    continueTo: "/english-learning",
    next: next?.title ?? null,
    lessonNumber: null,
    kind: "books",
    checkpoints: path
      .slice(Math.max(0, completed - 2), Math.max(0, completed - 2) + 3)
      .map((pack) => ({
        title: pack.title,
        completed: completedEnglishUnit(pack),
      })),
  };
}
export const programPercent = (
  program: Pick<Program, "total" | "completed">,
) =>
  program.total
    ? Math.min(
        100,
        Math.max(0, Math.round((program.completed / program.total) * 100)),
      )
    : 0;
export function courseArtworkRevision(course: Course) {
  return JSON.stringify([
    course.activeVersion,
    course.draftVersion,
    course.preferences.goal,
    course.preferences.path,
  ]);
}
