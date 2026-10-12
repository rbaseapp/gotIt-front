import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLearningLanguage } from "../src/lib/useLearningLanguage";
import { product } from "../src/lib/product";

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ profile: { defaultSourceLanguage: "ar" } }),
}));
vi.mock("../src/lib/product", () => ({
  product: vi.fn(),
  errorMessage: () => "Language loading failed",
}));

describe("learning language persistence", () => {
  it("preserves selected English while the Arabic-default profile's languages load and on remount", async () => {
    localStorage.setItem("gotit.learningLanguage", "en");
    let resolve!: (value: unknown) => void;
    vi.mocked(product).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }) as never,
    );
    const first = renderHook(useLearningLanguage);
    expect(first.result.current.loading).toBe(true);
    expect(first.result.current.code).toBe("en");
    expect(localStorage.getItem("gotit.learningLanguage")).toBe("en");
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    first.unmount();

    const second = renderHook(useLearningLanguage);
    await act(async () => {
      resolve({
        languages: [
          { code: "ar", count: 10 },
          { code: "en", count: 2 },
        ],
      });
    });
    expect(second.result.current.code).toBe("en");
    expect(localStorage.getItem("gotit.learningLanguage")).toBe("en");
  });

  it("does not replace the selection after a failed language request", async () => {
    localStorage.setItem("gotit.learningLanguage", "en");
    vi.mocked(product).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(useLearningLanguage);
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.code).toBe("en");
    expect(localStorage.getItem("gotit.learningLanguage")).toBe("en");
  });

  it("resolves a removed selection only after a successful language response", async () => {
    localStorage.setItem("gotit.learningLanguage", "fr");
    vi.mocked(product).mockResolvedValue({
      languages: [{ code: "ar", count: 10 }],
    });
    const { result } = renderHook(useLearningLanguage);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.code).toBe("ar");
    expect(localStorage.getItem("gotit.learningLanguage")).toBe("ar");
  });
});

it("synchronizes the header selection with another mounted language consumer", async () => {
  localStorage.setItem("gotit.learningLanguage", "en");
  vi.mocked(product).mockResolvedValue({
    languages: [
      { code: "en", count: 2 },
      { code: "ar", count: 10 },
    ],
  });
  const header = renderHook(useLearningLanguage);
  const page = renderHook(useLearningLanguage);
  await waitFor(() => expect(page.result.current.loading).toBe(false));
  act(() => header.result.current.setCode("ar"));
  expect(page.result.current.code).toBe("ar");
  expect(localStorage.getItem("gotit.learningLanguage")).toBe("ar");
});
