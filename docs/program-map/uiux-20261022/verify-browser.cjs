async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  await page.reload();
  await page
    .getByRole("heading", { name: "מסלול הלמידה ביחידה", exact: true })
    .waitFor();
  const measurements = [];
  for (const width of [320, 390, 768, 1490]) {
    await page.setViewportSize({ width, height: 900 });
    const data = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      primary: document.querySelectorAll(".pm-action").length,
    }));
    assert(
      data.scroll <= data.width,
      `Horizontal overflow at ${width}: ${JSON.stringify(data)}`,
    );
    assert(data.primary === 2, "Continuation must be the only primary action");
    measurements.push(data);
  }
  const start = page.locator(".pm-start-here").first();
  await page.mouse.move(0, 0);
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".pm-start-here")).opacity ===
      "0",
  );
  await start.hover();
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".pm-start-here")).opacity ===
      "1",
  );
  await page.screenshot({
    animations: "disabled",
    path: "output/playwright/program-map-hover.png",
    fullPage: true,
  });
  const locked = page
    .locator(".pm-step")
    .filter({
      has: page.getByRole("heading", {
        name: "תרגול אחרי השיעור",
        exact: true,
      }),
    });
  assert(
    (await locked.locator(".pm-action,.pm-start-here").count()) === 0,
    "Locked practice has an entry action",
  );
  await start.click();
  const dialog = page.getByRole("dialog");
  assert(await dialog.isVisible(), "Missing confirmation");
  assert(
    (await page.getByRole("status").count()) === 0,
    "Opened content before confirmation",
  );
  await page.screenshot({
    animations: "disabled",
    path: "output/playwright/program-map-confirmation.png",
  });
  await dialog.getByRole("button", { name: "ביטול", exact: true }).click();
  assert(
    await start.evaluate((e) => e === document.activeElement),
    "Cancel did not restore focus",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    (await start.evaluate((e) => getComputedStyle(e).display)) === "none",
    "Touch button should be in the menu",
  );
  const trigger = page.getByRole("button", {
    name: "החזר למסלול: שלום, מציגים את עצמנו — רכישה ושיחה נתמכת",
    exact: true,
  });
  await trigger.click();
  await page.locator(".pm-menu-start").click();
  assert(await dialog.isVisible(), "Touch entry did not confirm");
  await page.screenshot({
    animations: "disabled",
    path: "output/playwright/program-map-mobile-confirmation.png",
  });
  await dialog.getByRole("button", { name: "התחל מכאן", exact: true }).click();
  assert(
    await page.getByRole("status").isVisible(),
    "Confirmed activity did not open",
  );
  await page.getByRole("status").getByRole("button", { name: "סגירה" }).click();
  assert(
    (await page.locator(".pm-progress").innerText()).includes("2 מתוך 14"),
    "Opening changed completion evidence",
  );
  const currentMenu = page.getByRole("button", {
    name: "דלג: שלום, מציגים את עצמנו — שימוש, הבנה והפקה עצמאית",
    exact: true,
  });
  await currentMenu.click();
  await page
    .locator(".path-choice-options")
    .getByRole("button", { name: "דלג", exact: true })
    .click();
  const restore = page.getByRole("button", {
    name: "החזר למסלול: שלום, מציגים את עצמנו — שימוש, הבנה והפקה עצמאית",
    exact: true,
  });
  await restore.click();
  await page
    .locator(".path-choice-options")
    .getByRole("button", { name: "החזר למסלול", exact: true })
    .click();
  assert(
    (await page.locator(".pm-goal-summary").innerText()).includes("10"),
    "Remaining count differs after restore",
  );
  await page.screenshot({
    animations: "disabled",
    path: "output/playwright/program-map-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1490, height: 900 });
  await page.locator(".pm-hero").scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.screenshot({
    animations: "disabled",
    path: "output/playwright/program-map-desktop.png",
    fullPage: true,
  });
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`);
  return {
    measurements,
    errors,
    confirmedEntry: true,
    cancelFocus: true,
    lockedPractice: true,
    skipRestore: true,
    unchangedCompletion: true,
  };
};
