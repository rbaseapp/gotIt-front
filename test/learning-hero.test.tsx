import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LearningHero } from "../src/components/LearningHero";

describe("LearningHero lettering", () => {
  let image: { onload: (() => void) | null };
  let reduced: boolean;
  let motionChanged: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    reduced = false;
    image = { onload: null };
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        set onload(value: (() => void) | null) {
          image.onload = value;
        }
      },
    );
    vi.stubGlobal("matchMedia", () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_: string, handler: () => void) => {
        motionChanged = handler;
      },
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => vi.useRealTimers());

  it("retains the original until patches load, cycles every language and clears its timer", () => {
    const { container, unmount } = render(<LearningHero />);
    const original = container.querySelector("img")!.getAttribute("src");
    act(() => vi.advanceTimersByTime(8000));
    expect(container.querySelector(".learning-hero-text")).toBeNull();
    act(() => image.onload?.());
    const seen: string[] = [];
    for (let frame = 0; frame < 9; frame++) {
      act(() => vi.advanceTimersByTime(4000));
      const lettering = container.querySelector(".learning-hero-text")!;
      seen.push(lettering.getAttribute("lang")!);
      expect(container.querySelector("img")!.getAttribute("src")).toBe(
        original,
      );
    }
    expect(seen).toEqual([
      "ar",
      "fr",
      "es",
      "zh",
      "ja",
      "pt",
      "ru",
      "he",
      "de",
    ]);
    expect(container.querySelector('[lang="he"]')).toBeNull();
    act(() => vi.advanceTimersByTime(4000));
    expect(container.querySelector(".learning-hero-text")).toBeNull();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows a static RTL interface-language caption when reduced motion is enabled", () => {
    reduced = true;
    const { container } = render(<LearningHero />);
    act(() => image.onload?.());
    const caption = container.querySelector(".learning-hero-text")!;
    expect(caption).toHaveAttribute("lang", "he");
    expect(caption).toHaveAttribute("direction", "rtl");
    act(() => vi.advanceTimersByTime(40_000));
    expect(caption).toHaveTextContent("שלום");
    expect(vi.getTimerCount()).toBe(0);
    reduced = false;
    act(() => motionChanged());
    expect(vi.getTimerCount()).toBe(1);
  });

  it("pauses while the document is hidden and resumes when it becomes visible", () => {
    let hidden = false;
    const visibility = vi
      .spyOn(document, "hidden", "get")
      .mockImplementation(() => hidden);
    const { container } = render(<LearningHero />);
    act(() => image.onload?.());
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(40_000));
    expect(container.querySelector(".learning-hero-text")).toBeNull();
    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(4000));
    expect(container.querySelector(".learning-hero-text")).toHaveAttribute(
      "lang",
      "ar",
    );
    visibility.mockRestore();
  });
});
