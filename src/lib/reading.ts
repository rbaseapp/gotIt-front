import type { Reading } from "./product";
export function textSegments(
  reading: Reading,
): { text: string; itemId?: string }[] {
  const characters = Array.from(reading.bodyText);
  const ranges = reading.targets
    .flatMap((t) => (t.ranges || []).map((r) => ({ ...r, itemId: t.id })))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const result: { text: string; itemId?: string }[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor || range.end > characters.length) continue;
    if (range.start > cursor)
      result.push({ text: characters.slice(cursor, range.start).join("") });
    result.push({
      text: characters.slice(range.start, range.end).join(""),
      itemId: range.itemId,
    });
    cursor = range.end;
  }
  if (cursor < characters.length)
    result.push({ text: characters.slice(cursor).join("") });
  return result;
}
