import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "phone-320", width: 320, height: 568 },
  { name: "phone-360", width: 360, height: 800 },
  { name: "phone-375", width: 375, height: 667 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-393", width: 393, height: 852 },
  { name: "phone-412", width: 412, height: 915 },
  { name: "phone-430", width: 430, height: 932 },
  { name: "phone-landscape-568", width: 568, height: 320 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-820", width: 820, height: 1180 },
  { name: "tablet-landscape-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 720 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
] as const;

const demoRoutes = [
  "/dashboard",
  "/learn",
  "/vocabulary",
  "/settings",
  "/reading",
  "/transfer",
  "/help",
  "/terms-of-service",
  "/privacy-policy",
  "/refund-policy",
  "/billing/checkout",
  "/learn/session/smart",
  "/learn/session/flashcards",
  "/learn/session/recall",
  "/learn/session/listening",
  "/learn/session/matching",
  "/learn/session/pronunciation",
] as const;

async function openDemoRoute(page: Page, route: string) {
  await page.addInitScript(() => {
    localStorage.setItem("gotit.mode", JSON.stringify("demo"));
    localStorage.setItem("gotit.uiLocale.v1", "he");
  });
  await page.goto(route);
  await page.waitForFunction(() => !document.querySelector(".empty-session"));
}

test.describe("responsive application shell", () => {
  for (const viewport of viewports) {
    test.describe(viewport.name, () => {
      test.use({ viewport });

      for (const route of demoRoutes) {
        test(`${route} has no document-level horizontal overflow`, async ({
          page,
        }) => {
          await openDemoRoute(page, route);

          const dimensions = await page.evaluate(() => ({
            viewportWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
          }));

          expect(
            dimensions.documentWidth,
            `${route} rendered ${dimensions.documentWidth}px wide in a ${dimensions.viewportWidth}px viewport`,
          ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
        });
      }

      test("the primary mobile menu remains a comfortable touch target", async ({
        page,
      }) => {
        await openDemoRoute(page, "/dashboard");
        const menu = page.locator(".mobile-menu");
        if (viewport.width <= 820) {
          const box = await menu.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.width).toBeGreaterThanOrEqual(44);
          expect(box!.height).toBeGreaterThanOrEqual(44);

          await menu.click();
          const sidebar = page.locator(".sidebar.mobile-open");
          await expect(sidebar).toBeVisible();
          await expect
            .poll(() =>
              sidebar.evaluate(
                (element) => element.getBoundingClientRect().right,
              ),
            )
            .toBeLessThanOrEqual(viewport.width);
          const openedMenu = await sidebar.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return {
              left: rect.left,
              right: rect.right,
              scrollOverflow:
                (element as HTMLElement).scrollWidth -
                (element as HTMLElement).clientWidth,
            };
          });
          expect(openedMenu.left).toBeGreaterThanOrEqual(0);
          expect(openedMenu.right).toBeLessThanOrEqual(viewport.width);
          expect(openedMenu.scrollOverflow).toBeLessThanOrEqual(1);

          const close = sidebar.locator(".mobile-close");
          const closeBox = await close.boundingBox();
          expect(closeBox).not.toBeNull();
          expect(closeBox!.width).toBeGreaterThanOrEqual(44);
          expect(closeBox!.height).toBeGreaterThanOrEqual(44);
        } else {
          await expect(menu).toBeHidden();
        }
      });

      if (viewport.width <= 820) {
        test("the add-word modal stays usable inside the viewport", async ({
          page,
        }) => {
          await openDemoRoute(page, "/vocabulary");
          await page.locator(".page-heading-row .button.primary").click();

          const modal = page.locator(".modal");
          await expect(modal).toBeVisible();
          const result = await modal.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const controls = [
              ...element.querySelectorAll("input, textarea, button"),
            ]
              .filter((control) => {
                const style = getComputedStyle(control);
                return (
                  style.display !== "none" && style.visibility !== "hidden"
                );
              })
              .map((control) => {
                const controlRect = control.getBoundingClientRect();
                return {
                  left: controlRect.left,
                  right: controlRect.right,
                };
              });
            return {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              scrollOverflow:
                (element as HTMLElement).scrollWidth -
                (element as HTMLElement).clientWidth,
              controls,
            };
          });

          expect(result.left).toBeGreaterThanOrEqual(0);
          expect(result.right).toBeLessThanOrEqual(viewport.width);
          expect(result.top).toBeGreaterThanOrEqual(0);
          expect(result.bottom).toBeLessThanOrEqual(viewport.height);
          expect(result.scrollOverflow).toBeLessThanOrEqual(1);
          for (const control of result.controls) {
            expect(control.left).toBeGreaterThanOrEqual(result.left);
            expect(control.right).toBeLessThanOrEqual(result.right + 1);
          }
        });
      }
    });
  }
});

test("English unit word's one-click known control stays on one line", async ({
  page,
}) => {
  for (const width of [320, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await openDemoRoute(page, "/dashboard");
    const layout = await page.evaluate(() => {
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      backdrop.innerHTML = `<section class="modal modal-lg english-path-word-modal">
        <div class="modal-body pack-word-dialog"><div class="pack-word-list">
          <div class="pack-word-row english-path-word-row">
            <input type="checkbox" aria-label="Select refrigerator" />
            <span><b>refrigerator</b><span>מקרר</span></span>
            <button class="button ghost">אני כבר יודע/ת</button>
          </div>
        </div></div></section>`;
      document.body.append(backdrop);
      const row = backdrop.querySelector<HTMLElement>(
        ".english-path-word-row",
      )!;
      const button = row.querySelector<HTMLButtonElement>("button")!;
      const rowRect = row.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const text = document.createRange();
      text.selectNodeContents(button);
      return {
        textLines: text.getClientRects().length,
        buttonLeft: buttonRect.left,
        buttonRight: buttonRect.right,
        rowLeft: rowRect.left,
        rowRight: rowRect.right,
        rowOverflow: row.scrollWidth - row.clientWidth,
      };
    });
    expect(layout.textLines, `${width}px button text wrapped`).toBe(1);
    expect(layout.buttonLeft).toBeGreaterThanOrEqual(layout.rowLeft);
    expect(layout.buttonRight).toBeLessThanOrEqual(layout.rowRight);
    expect(layout.rowOverflow).toBeLessThanOrEqual(1);
  }
});

test("English unit preview keeps aligned controls and footer at short heights", async ({
  page,
}) => {
  for (const { width, height } of [
    { width: 320, height: 568 },
    { width: 525, height: 709 },
    { width: 1920, height: 900 },
  ]) {
    await page.setViewportSize({ width, height });
    await openDemoRoute(page, "/dashboard");
    const layout = await page.evaluate(() => {
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      backdrop.innerHTML = `<section class="modal modal-lg english-path-word-modal">
        <header class="modal-header"><h2>יחידה 3: Essential Everyday Actions</h2></header>
        <div class="modal-body pack-word-dialog"><p>50 מילים וביטויים ביחידה זו.</p>
          <div class="pack-selection-summary"><p>2 נבחרו</p><div class="live-options"><button class="button ghost">בחירת הכול</button><button class="button ghost">ניקוי הבחירה</button></div></div>
          <div class="pack-word-list" dir="rtl"></div></div>
        <div class="modal-actions" dir="rtl"><button class="button secondary">הוספת המילים שנבחרו</button><button class="button secondary">אני כבר יודע/ת את המילים שנבחרו</button><button class="button ghost">ביטול סימון הנבחרות כידועות</button><button class="button ghost">סגירה</button>
          <button class="button primary">הוספה ותחילת תרגול</button></div></section>`;
      document.body.append(backdrop);
      const list = backdrop.querySelector<HTMLElement>(".pack-word-list")!;
      for (let index = 0; index < 50; index += 1) {
        const row = document.createElement("div");
        row.className = "pack-word-row english-path-word-row";
        row.innerHTML = `<input type="checkbox" aria-label="Select word" /><span><b dir="auto">${index ? "refrigerator" : "wash"}</b>
          <span dir="auto">${index ? "מקרר" : "לשטוף"}</span></span>
          <button class="button ghost">אני כבר יודע/ת</button>`;
        list.append(row);
      }
      const rows = [
        ...list.querySelectorAll<HTMLElement>(".english-path-word-row"),
      ];
      const buttons = rows.map((row) =>
        row.querySelector<HTMLButtonElement>("button")!,
      );
      const modalRect = backdrop
        .querySelector(".modal")!
        .getBoundingClientRect();
      const footerRect = backdrop
        .querySelector(".modal-actions")!
        .getBoundingClientRect();
      const footerButtons = [
        ...backdrop.querySelectorAll<HTMLElement>(".modal-actions .button"),
      ];
      const text = document.createRange();
      text.selectNodeContents(buttons[0]);
      return {
        textLines: text.getClientRects().length,
        buttonLefts: buttons
          .slice(0, 5)
          .map((button) => button.getBoundingClientRect().left),
        rowOverflow: rows.some((row) => row.scrollWidth > row.clientWidth + 1),
        footerInside:
          footerRect.bottom <= modalRect.bottom + 1 &&
          footerRect.left >= modalRect.left - 1 &&
          footerRect.right <= modalRect.right + 1,
        footerButtonsInside: footerButtons.every((button) => {
          const rect = button.getBoundingClientRect();
          return (
            rect.left >= modalRect.left - 1 &&
            rect.right <= modalRect.right + 1 &&
            rect.bottom <= modalRect.bottom + 1
          );
        }),
        listScrolls: list.scrollHeight > list.clientHeight,
      };
    });
    expect(layout.textLines, `${width}px button text wrapped`).toBe(1);
    expect(new Set(layout.buttonLefts).size).toBe(1);
    expect(layout.rowOverflow).toBe(false);
    expect(layout.footerInside).toBe(true);
    expect(layout.footerButtonsInside).toBe(true);
    expect(layout.listScrolls).toBe(true);
  }
});

const privateLessonFixture = `
  <aside class="sidebar"></aside>
  <section class="private-lesson-session live-panel has-report" role="dialog">
    <header class="private-lesson-session-header">
      <div>
        <p class="eyebrow">Active lesson</p>
        <h2>Foundation: use Present Simple Continuous in meaningful spoken English</h2>
        <span class="private-lesson-status ended">The lesson has ended and the report is ready.</span>
      </div>
      <div class="private-lesson-header-controls">
        <button class="icon-button private-lesson-sidebar-button">Menu</button>
        <button class="private-lesson-mute"><span>Mute microphone</span></button>
        <div class="private-lesson-timer">00:00</div>
      </div>
    </header>
    <div class="private-lesson-meta"><span>English</span><span>B2</span></div>
    <div class="private-lesson-report-shell">
      <div class="private-lesson-report">
        <section class="private-lesson-report-summary">
          <h3>A deliberately long lesson summary that must wrap without widening the report.</h3>
          <p>Recall and practise complete sentences with long mixed-direction content.</p>
        </section>
        <section class="private-lesson-assessment">
          <header><h4>Lesson assessment</h4><span>More evidence is needed</span></header>
          <div class="private-lesson-skill-grid">
            <article><div><strong>Speaking</strong><span>B2</span></div><div class="private-lesson-skill-track"></div><p>Clear answers with meaningful spoken English.</p></article>
            <article><div><strong>Vocabulary</strong><span>B2</span></div><div class="private-lesson-skill-track"></div><p>studying/playing/organizing/typing/swimming and other unbroken content</p></article>
            <article><div><strong>Grammar</strong><span>B2</span></div><div class="private-lesson-skill-track"></div><p>Present Continuous with am/is/are + verb-ing + right now.</p></article>
            <article><div><strong>Fluency</strong><span>B2</span></div><div class="private-lesson-skill-track"></div><p>Continuous speech without long pauses.</p></article>
            <article><div><strong>Comprehension</strong><span>C1</span></div><div class="private-lesson-skill-track"></div><p>Understood the instructions and corrections.</p></article>
          </div>
        </section>
        <div class="private-lesson-report-grid">
          <section><h4>Strengths</h4><p>Clear structured answers.</p></section>
          <section><h4>Corrections</h4><article><strong>A very long corrected expression</strong><p>Explanation that must remain inside this card.</p></article></section>
          <section data-report-card="grammar"><h4>Grammar</h4><article><strong>Present Continuous</strong><p>am/is/are + verb-ing</p></article></section>
          <section data-report-card="vocabulary"><h4>Vocabulary</h4><article><strong>uncharacteristically-long-vocabulary-token</strong><p>A long note that must wrap.</p></article></section>
        </div>
      </div>
    </div>
    <div class="private-lesson-actions private-lesson-report-actions"><button class="button primary">Start another lesson</button></div>
  </section>`;

test.describe("private lesson responsive regressions", () => {
  for (const viewport of viewports) {
    test(`${viewport.name} keeps the timer and report cards contained`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openDemoRoute(page, "/dashboard");
      await page.locator("body").evaluate((body, fixture) => {
        document.documentElement.dir = "rtl";
        body.className = [
          "private-lesson-session-open",
          window.innerHeight < 760 ? "private-lesson-viewport-short" : "",
          window.innerHeight < 640 ? "private-lesson-viewport-compact" : "",
        ]
          .filter(Boolean)
          .join(" ");
        body.innerHTML = fixture;
      }, privateLessonFixture);

      const result = await page.evaluate(() => {
        const box = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`Missing ${selector}`);
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          };
        };
        const intersects = (
          first: ReturnType<typeof box>,
          second: ReturnType<typeof box>,
        ) =>
          Math.min(first.right, second.right) -
            Math.max(first.left, second.left) >
            0.5 &&
          Math.min(first.bottom, second.bottom) -
            Math.max(first.top, second.top) >
            0.5;
        const shell = document.querySelector(
          ".private-lesson-report-shell",
        ) as HTMLElement;
        const timer = box(".private-lesson-timer");
        const controls = box(".private-lesson-header-controls");
        const grammar = box('[data-report-card="grammar"]');
        const vocabulary = box('[data-report-card="vocabulary"]');
        return {
          timer,
          controls,
          reportOverflow: shell.scrollWidth - shell.clientWidth,
          cardsOverlap: intersects(grammar, vocabulary),
        };
      });

      expect(result.timer.left).toBeGreaterThanOrEqual(0);
      expect(result.timer.right).toBeLessThanOrEqual(viewport.width);
      expect(result.controls.left).toBeGreaterThanOrEqual(0);
      expect(result.controls.right).toBeLessThanOrEqual(viewport.width);
      expect(result.reportOverflow).toBeLessThanOrEqual(1);
      expect(result.cardsOverlap).toBe(false);
    });
  }
});
