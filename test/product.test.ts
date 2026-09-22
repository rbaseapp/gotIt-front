import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { api, clearTokens, setTokens } from "../src/lib/api";
import {
  detailSchema,
  intent,
  itemSchema,
  masteryRequirementText,
  product,
  query,
} from "../src/lib/product";
import { parseImportFile } from "../src/lib/transfer";
import { textSegments } from "../src/lib/reading";
import { encodeWav } from "../src/lib/voice";
const id = "11111111-1111-4111-8111-111111111111";
const capture = {
  item: {
    sourceText: "remember",
    sourceLanguageCode: "en",
    translationLanguageCode: "he",
  },
  translation: { text: "לזכור" },
  context: { selectedText: "remember", sourceType: "import" },
  senseDecision: { mode: "auto" },
};
describe("production boundaries", () => {
  it("rejects malformed server projections instead of injecting demo defaults", () => {
    expect(itemSchema.safeParse({ id, sourceText: "remember" }).success).toBe(
      false,
    );
    expect(
      detailSchema.safeParse({
        skills: [{ skillType: "recall", masteryScore: 999 }],
      }).success,
    ).toBe(false);
  });
  it("preserves opaque cursors and omits empty filters", () => {
    expect(query({ cursor: "a+/=", search: "", tagId: undefined })).toBe(
      "?cursor=a%2B%2F%3D",
    );
  });
  it("explains the next concrete requirement for learning a word", () => {
    expect(
      masteryRequirementText({
        totalScoredAttempts: 12,
        minimumScoredAttempts: 3,
        activeRecallSuccesses: 8,
        minimumActiveRecallSuccesses: 2,
        activeRecallCalendarDays: 1,
        minimumActiveRecallCalendarDays: 2,
        activeRecallMasteryScore: 100,
        masteryThreshold: 80,
        reviewStage: 3,
        learnedReviewStage: 2,
        needsTypedRecall: true,
      }),
    ).toBe("נדרשת שליפה מוקלדת מוצלחת ביום נוסף.");
  });
  it("snapshots retry intent rather than retaining a mutable caller object", () => {
    const body = { answerText: "first" };
    const submission = intent(body);
    body.answerText = "second";
    expect(submission.body).toEqual({ answerText: "first" });
    expect(submission.eventId).toMatch(/^[a-f0-9-]{36}$/);
  });
  it("validates import format, scopes, duplicate events, URLs, and byte limits", () => {
    const input = {
      format: "capture_requests_v1",
      entries: [{ eventId: id, capture }],
    };
    expect(parseImportFile(JSON.stringify(input)).entries).toHaveLength(1);
    expect(() =>
      parseImportFile(
        JSON.stringify({
          ...input,
          entries: [...input.entries, ...input.entries],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseImportFile(
        JSON.stringify({
          ...input,
          entries: [
            { eventId: id, capture: { ...capture, applicationUserId: id } },
          ],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseImportFile(
        JSON.stringify({ format: "learning_library_v1", items: [] }),
      ),
    ).toThrow();
    expect(() =>
      parseImportFile(
        JSON.stringify({
          ...input,
          entries: [
            {
              eventId: id,
              capture: {
                ...capture,
                context: { ...capture.context, pageUrl: "javascript:alert(1)" },
              },
            },
          ],
        }),
      ),
    ).toThrow();
    expect(() => parseImportFile("א".repeat(140000))).toThrow("256KB");
  });
  it("highlights Unicode code-point ranges safely without interpreting HTML", () => {
    const reading = {
      id,
      title: "x",
      bodyText: "😀 <b> remember",
      contentType: "article",
      targetLanguageCode: "en",
      effectiveLevel: null,
      targets: [
        {
          id,
          sourceText: "remember",
          occurrenceCount: 1,
          ranges: [{ start: 6, end: 14 }],
        },
      ],
    };
    const segments = textSegments(reading);
    expect(segments.map((v) => v.text).join("")).toBe(reading.bodyText);
    expect(segments.find((v) => v.itemId)?.text).toBe("remember");
  });
  it("encodes exact 16 kHz mono 16-bit PCM WAV with bounded samples", () => {
    const bytes = encodeWav(new Float32Array([0, -2, 2]));
    const view = new DataView(bytes.buffer);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF");
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getInt16(46, true)).toBe(-32768);
    expect(view.getInt16(48, true)).toBe(32767);
  });
  it("sends Google credential only to scoped Core and validates returned identity", async () => {
    clearTokens();
    const user = {
      id,
      applicationId: "22222222-2222-4222-8222-222222222222",
      email: "u@example.com",
      emailVerified: true,
      status: "active",
    };
    const fetchMock = vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith("/auth/google")
              ? { user, accessToken: "a", refreshToken: "r", expiresIn: 900 }
              : { user },
          ),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await api.google("opaque-id-token")).toEqual(user);
    expect(fetchMock.mock.calls[0][0]).toBe("/core-api/api/v1/auth/google");
    expect(localStorage.getItem("gotit.auth")).toBeNull();
    clearTokens();
  });
  it("retains the event header across an authorized 401 refresh and rejects invalid DTOs", async () => {
    clearTokens();
    setTokens({ accessToken: "a", refreshToken: "r", expiresIn: 900 });
    let calls = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh"))
        return new Response(
          JSON.stringify({
            accessToken: "b",
            refreshToken: "s",
            expiresIn: 900,
          }),
        );
      expect(init?.headers).toMatchObject({ "Idempotency-Key": id });
      return ++calls === 1
        ? new Response("{}", { status: 401 })
        : new Response(JSON.stringify({ receipt: 7 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await product(
        z.object({ receipt: z.number() }),
        "practice/attempts",
        "POST",
        { answerText: "a" },
        id,
      ),
    ).toEqual({ receipt: 7 });
    expect(calls).toBe(2);
    clearTokens();
  });
});
