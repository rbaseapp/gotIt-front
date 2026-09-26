import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGameViewport } from "../src/hooks/useGameViewport";

describe("useGameViewport", () => {
  it("uses the visible browser height and restores the document on exit", () => {
    const viewport = Object.assign(new EventTarget(), {
      height: 700,
    }) as VisualViewport;
    vi.stubGlobal("visualViewport", viewport);

    const { unmount } = renderHook(() => useGameViewport());

    expect(document.documentElement.style.getPropertyValue("--game-viewport-height"))
      .toBe("700px");
    expect(document.body).toHaveClass(
      "game-session-open",
      "game-viewport-short",
    );
    expect(document.body).not.toHaveClass("game-viewport-compact");

    unmount();

    expect(document.documentElement.style.getPropertyValue("--game-viewport-height"))
      .toBe("");
    expect(document.body).not.toHaveClass(
      "game-session-open",
      "game-viewport-short",
      "game-viewport-compact",
    );
  });
});
