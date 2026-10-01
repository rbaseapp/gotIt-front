import { expect, test } from "@playwright/test";

test("mouth blending stays local to the face and respects reduced motion on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.setContent(`
    <link rel="stylesheet" href="/src/production.css" />
    <div class="teacher-avatar female speaking active" style="--tutor-mouth-soft: 1; --tutor-mouth-rounded: 0.35; --tutor-mouth-wide: 0">
      <span class="teacher-avatar-ring"></span>
      <span class="teacher-avatar-portrait">
        <img src="/src/assets/private-lesson/tutor-female-listening.png" alt="" />
        <img class="teacher-avatar-speaking" src="/src/assets/private-lesson/tutor-female-speaking.png" alt="" />
        <img class="teacher-avatar-speaking-rounded" src="/src/assets/private-lesson/tutor-female-speaking-rounded.png" alt="" />
        <img class="teacher-avatar-speaking-wide" src="/src/assets/private-lesson/tutor-female-speaking-wide.png" alt="" />
        <img class="teacher-avatar-blink" src="/src/assets/private-lesson/tutor-female-blink.png" alt="" />
      </span>
      <span class="teacher-avatar-level"><i></i><i></i><i></i></span>
    </div>
  `);

  const avatar = page.locator(".teacher-avatar");
  const soft = page.locator(".teacher-avatar-speaking");
  const wide = page.locator(".teacher-avatar-speaking-wide");
  const rounded = page.locator(".teacher-avatar-speaking-rounded");
  const blink = page.locator(".teacher-avatar-blink");
  await expect(avatar).toHaveCSS("width", "225px");
  await expect(soft).toHaveCSS("opacity", "1");
  await expect(rounded).toHaveCSS("opacity", "0.35");
  await expect(wide).toHaveCSS("opacity", "0");
  await expect(rounded).not.toHaveCSS("mask-image", "none");
  await expect(blink).not.toHaveCSS("display", "none");
  await expect(blink).not.toHaveCSS("mask-image", "none");
  await expect(page.locator(".teacher-avatar-portrait")).toHaveCSS(
    "animation-name",
    "teacher-avatar-breathe",
  );
  await expect(soft).not.toHaveCSS("mask-image", "none");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(soft).toHaveCSS("opacity", "0");
  await expect(wide).toHaveCSS("opacity", "0");
  await expect(rounded).toHaveCSS("opacity", "0");
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

test("both real tutor components load every pose and stay within a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 760 });
  await page.goto("/");
  await page.setContent(`
    <link rel="stylesheet" href="/src/production.css" />
    <style>
      body { margin: 0; background: #f1f7f3; font-family: sans-serif; }
      #avatars { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 16px; }
      article { text-align: center; }
      .teacher-avatar { margin: 0 auto; width: min(260px, 85vw); }
      .teacher-avatar-portrait, .teacher-avatar-blink { animation: none; }
      @media (max-width: 600px) { #avatars { grid-template-columns: 1fr; } }
    </style>
    <div id="avatars"></div>
  `);
  await page.addScriptTag({
    type: "module",
    content: `
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import { TeacherAvatar } from '/src/components/TeacherAvatar.tsx';
    const levels = [0, 0.14, 0.34, 0.75];
    const names = ['Rest', 'Soft speech', 'Rounded speech', 'Wide speech'];
    ReactDOM.createRoot(document.getElementById('avatars')).render(React.createElement(React.Fragment, null,
      ...['male', 'female'].flatMap(variant => levels.map((audioLevel, index) =>
        React.createElement('article', {key: variant + index},
          React.createElement(TeacherAvatar, {activity: 'listening', active: true, audioLevel, variant, label: variant + ' ' + names[index]}),
          React.createElement('p', null, variant + ' / ' + names[index]))))));
  `,
  });
  await expect(page.locator(".teacher-avatar")).toHaveCount(8);
  await expect
    .poll(() =>
      page
        .locator(".teacher-avatar-portrait img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  for (const variant of ["male", "female"]) {
    const rounded = page.getByRole("img", {
      name: `${variant} Rounded speech`,
      exact: true,
    });
    await expect(rounded.locator(".teacher-avatar-speaking-rounded")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(rounded.locator(".teacher-avatar-speaking-wide")).toHaveCSS(
      "opacity",
      "0",
    );
    await expect(
      page.getByRole("img", { name: `${variant} Rest`, exact: true }),
    ).toHaveClass(/listening/);
  }
  await page.screenshot({
    path: "test-results/avatar-poses.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 568 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
