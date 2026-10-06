import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { product } from "../src/lib/product";
import { useReadingGuides } from "../src/lib/useReadingGuides";

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ profile: { defaultTranslationLanguage: "he" } }),
}));
vi.mock("../src/context/SubscriptionContext", () => ({
  useSubscription: () => ({ hasEntitlement: () => true }),
}));
vi.mock("../src/lib/product", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/product")>()),
  product: vi.fn(),
}));
const items = Array.from({ length: 65 }, (_, index) => ({
  id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
  sourceText: `word ${index}`,
  translationLanguageCode: "he",
  updatedAt: "2026-10-06T00:00:00.000Z",
}));
beforeEach(() => {
  vi.mocked(product).mockReset();
});

it("resolves every word in a large unit with bounded batches instead of stopping at thirty", async () => {
  vi.mocked(product).mockImplementation(
    async (_schema, _path, _method, body) => ({
      guides: (body as { ids: string[] }).ids.map((id) => ({
        id,
        phoneticText: "וורד",
        phoneticScheme: "transliteration:he",
      })),
    }),
  );
  const { result } = renderHook(() => useReadingGuides(items));
  await waitFor(() => expect(result.current(items[64])?.text).toBe("וורד"));
  expect(
    vi
      .mocked(product)
      .mock.calls.map((call) => (call[3] as { ids: string[] }).ids.length),
  ).toEqual([30, 30, 5]);
  expect(items.every((item) => result.current(item)?.language === "he")).toBe(
    true,
  );
});

it("stops remaining batches on provider failure while preserving earlier guides", async () => {
  vi.mocked(product)
    .mockResolvedValueOnce({
      guides: [
        {
          id: items[0].id,
          phoneticText: "וורד",
          phoneticScheme: "transliteration:he",
        },
      ],
    })
    .mockRejectedValueOnce(new Error("provider unavailable"));
  const { result } = renderHook(() => useReadingGuides(items));
  await waitFor(() => expect(product).toHaveBeenCalledTimes(2));
  expect(result.current(items[0])?.text).toBe("וורד");
  expect(result.current(items[64])).toBeUndefined();
});
