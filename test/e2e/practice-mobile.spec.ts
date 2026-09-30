import { expect, test, type Page } from "@playwright/test";

const phones = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 430, height: 620 },
  { width: 568, height: 320 },
] as const;

async function openDemo(page: Page, route: string) {
  await page.addInitScript(() => {
    localStorage.setItem("gotit.mode", JSON.stringify("demo"));
    localStorage.setItem("gotit.uiLocale.v1", "he");
  });
  await page.goto(route);
  await expect(page.locator(".session-main .exercise-area")).toBeVisible();
}

const liveFixture = `
  <div class="session-page live-session">
    <header class="session-topbar"><button class="button ghost">Exit</button><div class="session-hud"><span class="hud-chip xp"><b>12</b> XP</span></div></header>
    <main class="live-session-main session-active">
      <div class="live-toolbar"><span>Exercise 1 of 5</span><span class="round-label">Review</span></div>
      <progress class="live-session-progress" value="1" max="5"></progress>
      <section class="live-exercise live-panel practice-card">
        <p class="eyebrow">Choose the meaning</p>
        <h1>uncharacteristically</h1>
        <blockquote>A deliberately long example sentence that wraps onto several lines in a narrow phone.</blockquote>
        <div class="live-choice-grid">
          ${Array.from({ length: 8 }, (_, i) => `<button class="button secondary"><span>Long option number ${i + 1} with wrapped text</span></button>`).join("")}
        </div>
        <div class="live-feedback"><p>Detailed feedback with enough text to need several lines on a small phone.</p><button class="button primary feedback-next-action">Continue</button></div>
      </section>
    </main>
  </div>`;

const launchFixture = `
  <div class="session-page live-session">
    <header class="session-topbar"><button class="button ghost">Exit</button></header>
    <main class="live-session-main">
      <section class="live-panel session-launch">
        <span class="launch-icon">✦</span><p class="eyebrow">Smart review</p>
        <h1>Ready to practice</h1><p>Ten words in a short round.</p>
        <details class="session-settings"><summary>Customize</summary></details>
        <button class="button primary launch-button">Start</button>
      </section>
    </main>
  </div>`;

async function openLiveFixture(page: Page, width: number, height: number, fixture = liveFixture) {
  await page.goto("/dashboard");
  await page.locator("body").evaluate((body, { fixture, height }) => {
    document.documentElement.dir = "rtl";
    document.documentElement.style.setProperty("--game-viewport-height", `${height}px`);
    body.className = [
      "game-session-open",
      height < 780 ? "game-viewport-short" : "",
      height < 640 ? "game-viewport-compact" : "",
    ].filter(Boolean).join(" ");
    body.innerHTML = fixture;
  }, { fixture, height });
  await expect(page.locator(".live-session-main")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
}

test.describe("practice on phones", () => {
  for (const viewport of phones) {
    test(`demo actions remain reachable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openDemo(page, "/learn/session/flashcards");
      const main = page.locator(".session-main");
      const action = page.locator(".skip-button");
      await action.scrollIntoViewIfNeeded();
      const bounds = await action.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(await main.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
    });

    test(`long live feedback scrolls to Continue at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openLiveFixture(page, viewport.width, viewport.height);
      const panel = page.locator(".live-exercise");
      const action = panel.locator(".feedback-next-action");
      await action.scrollIntoViewIfNeeded();
      const bounds = await action.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(await panel.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
    });
  }

  test("a taller phone uses the card height and a shorter phone can scroll after resize", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await openLiveFixture(page, 430, 932);
    const panel = page.locator(".live-exercise");
    const tall = await panel.evaluate((element) => {
      const panelBox = element.getBoundingClientRect();
      const first = element.querySelector("h1")!.getBoundingClientRect();
      return { panelHeight: panelBox.height, firstOffset: first.top - panelBox.top };
    });
    expect(tall.firstOffset).toBeGreaterThan(20);

    await page.setViewportSize({ width: 430, height: 568 });
    await page.evaluate(() => {
      document.documentElement.style.setProperty("--game-viewport-height", "568px");
      document.body.classList.add("game-viewport-short", "game-viewport-compact");
    });
    const short = await panel.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(short.clientHeight).toBeLessThan(tall.panelHeight);
    expect(short.scrollHeight).toBeGreaterThan(short.clientHeight);
    await panel.locator(".feedback-next-action").scrollIntoViewIfNeeded();
    await expect(panel.locator(".feedback-next-action")).toBeInViewport();
  });

  test("the launch card is centered on a tall phone", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await openLiveFixture(page, 430, 932, launchFixture);
    const placement = await page.locator(".live-session-main").evaluate((main) => {
      const available = main.getBoundingClientRect();
      const card = main.querySelector(".session-launch")!.getBoundingClientRect();
      return {
        topGap: card.top - available.top,
        bottomGap: available.bottom - card.bottom,
      };
    });
    expect(Math.abs(placement.topGap - placement.bottomGap)).toBeLessThanOrEqual(20);
    expect(placement.topGap).toBeGreaterThan(100);
  });

});
