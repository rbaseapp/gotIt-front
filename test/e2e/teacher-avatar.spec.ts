import { expect, test } from "@playwright/test";

test("mouth blending stays local to the face and respects reduced motion on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.setContent(`
    <link rel="stylesheet" href="/src/production.css" />
    <div class="teacher-avatar female speaking active" style="--tutor-mouth-soft: 0.65; --tutor-mouth-wide: 0.35">
      <span class="teacher-avatar-ring"></span>
      <span class="teacher-avatar-portrait">
        <img src="/src/assets/private-lesson/tutor-female-listening.png" alt="" />
        <img class="teacher-avatar-speaking" src="/src/assets/private-lesson/tutor-female-speaking.png" alt="" />
        <img class="teacher-avatar-speaking-wide" src="/src/assets/private-lesson/tutor-female-speaking-wide.png" alt="" />
      </span>
      <span class="teacher-avatar-level"><i></i><i></i><i></i></span>
    </div>
  `);

  const avatar = page.locator(".teacher-avatar");
  const soft = page.locator(".teacher-avatar-speaking");
  const wide = page.locator(".teacher-avatar-speaking-wide");
  await expect(avatar).toHaveCSS("width", "225px");
  await expect(soft).toHaveCSS("opacity", "0.65");
  await expect(wide).toHaveCSS("opacity", "0.35");
  await expect(soft).not.toHaveCSS("mask-image", "none");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(soft).toHaveCSS("opacity", "0");
  await expect(wide).toHaveCSS("opacity", "0");
  await expect(page.locator(".teacher-avatar-portrait")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".teacher-avatar-ring")).toHaveCSS(
    "transform",
    "none",
  );
  await expect(page.locator(".teacher-avatar-level i").first()).toHaveCSS(
    "height",
    "12px",
  );
});
