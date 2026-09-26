import { useLayoutEffect } from "react";

const SHORT_VIEWPORT_HEIGHT = 780;
const COMPACT_VIEWPORT_HEIGHT = 640;

export function useGameViewport() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const visualViewport = window.visualViewport;
    let animationFrame = 0;

    const updateViewport = () => {
      const height = Math.round(visualViewport?.height ?? window.innerHeight);
      root.style.setProperty("--game-viewport-height", `${height}px`);
      body.classList.toggle(
        "game-viewport-short",
        height < SHORT_VIEWPORT_HEIGHT,
      );
      body.classList.toggle(
        "game-viewport-compact",
        height < COMPACT_VIEWPORT_HEIGHT,
      );
    };
    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateViewport);
    };

    body.classList.add("game-session-open");
    updateViewport();
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("orientationchange", scheduleUpdate);
    visualViewport?.addEventListener("resize", scheduleUpdate);
    visualViewport?.addEventListener("scroll", scheduleUpdate);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("orientationchange", scheduleUpdate);
      visualViewport?.removeEventListener("resize", scheduleUpdate);
      visualViewport?.removeEventListener("scroll", scheduleUpdate);
      body.classList.remove(
        "game-session-open",
        "game-viewport-short",
        "game-viewport-compact",
      );
      root.style.removeProperty("--game-viewport-height");
    };
  }, []);
}
