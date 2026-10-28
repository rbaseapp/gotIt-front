import { z } from "zod";
import { itemSchema, tagSchema } from "./product";

export function myWordsDesignEnabled(
  hostname = window.location.hostname,
  preview = import.meta.env.VITE_MYWORDS_DESIGN === "true",
) {
  return (
    hostname === "gotit-dev.rbaseapp.com" ||
    (preview && ["localhost", "127.0.0.1", "[::1]"].includes(hostname))
  );
}
export const wordCardSchema = itemSchema.extend({
  program: z
    .object({ title: z.string(), topic: z.string() })
    .nullable()
    .optional(),
  partOfSpeech: z.string().nullable(),
  source: z
    .object({
      sourceType: z.string(),
      pageUrl: z.string().nullable(),
      pageTitle: z.string().nullable(),
      sentenceText: z.string().nullable(),
      paragraphText: z.string().nullable(),
      capturedAt: z.string().nullable(),
    })
    .nullable(),
  tags: z.array(tagSchema),
  answers: z.object({
    correct: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
});
export type WordCard = z.infer<typeof wordCardSchema>;

export function memorySegments(score: number) {
  return Math.max(0, Math.min(5, Math.round(score / 20)));
}
export function reviewDay(
  date: string | null,
  timezone: string,
  now = new Date(),
) {
  if (!date) return null;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const calendarTime = (value: Date) => {
    const parts = formatter.formatToParts(value);
    const get = (kind: string) =>
      Number(parts.find((part) => part.type === kind)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"));
  };
  return Math.max(
    0,
    Math.round((calendarTime(new Date(date)) - calendarTime(now)) / 86400000),
  );
}
export function sourceHost(url: string | null | undefined) {
  try {
    const parsed = new URL(url || "");
    return ["https:", "http:"].includes(parsed.protocol)
      ? parsed.hostname.replace(/^www\./, "")
      : "";
  } catch {
    return "";
  }
}
export function sourceLink(url: string | null | undefined) {
  return sourceHost(url) ? url! : undefined;
}
export function shortPartOfSpeech(pos: string | null) {
  return pos
    ? { noun: "n", verb: "v", adjective: "adj", adverb: "adv" }[
        pos.toLowerCase()
      ] || pos
    : "";
}
