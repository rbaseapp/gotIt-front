import type { GameType, LearningItem, SkillKey } from "../types";

export function practiceQueue(
  items: LearningItem[],
  game: GameType,
  ids?: string[],
): LearningItem[] {
  const active = items.filter(
    (item) =>
      !item.deletedAt &&
      item.userStatus === "ACTIVE" &&
      (!ids || ids.includes(item.id)),
  );
  // Demo ordering only. Live queues must be returned by the future B3/B4 API.
  const sorted = [...active].sort(
    (a, b) => +new Date(a.dueAt) - +new Date(b.dueAt),
  );
  if (game !== "matching") return sorted.slice(0, 8);
  // Avoid indistinguishable pairs and mixing unrelated language directions in a board.
  const first = sorted[0];
  const sources = new Set<string>();
  const meanings = new Set<string>();
  return sorted
    .filter((item) => {
      if (
        item.sourceLanguage !== first.sourceLanguage ||
        item.translationLanguage !== first.translationLanguage
      )
        return false;
      const source = normalizeAnswer(item.source);
      const meaning = normalizeAnswer(item.translation);
      if (sources.has(source) || meanings.has(meaning)) return false;
      sources.add(source);
      meanings.add(meaning);
      return true;
    })
    .slice(0, 4);
}
export function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase();
}
export function answerQuality(answer: string, expected: string): number {
  const a = normalizeAnswer(answer);
  const b = normalizeAnswer(expected);
  if (a === b) return 100;
  if (!a || Math.abs(a.length - b.length) > 1) return 0;
  const rows = Array.from({ length: a.length + 1 }, (_, index) => [
    index,
    ...Array(b.length).fill(0),
  ]);
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return rows[a.length][b.length] === 1 && b.length > 3 ? 65 : 0;
}
export const gameSkills: Record<GameType, SkillKey[]> = {
  smart: ["recognition", "recall"],
  flashcards: ["recognition"],
  recall: ["recall"],
  listening: ["listening", "spelling"],
  matching: ["recognition"],
  pronunciation: ["pronunciation"],
};
