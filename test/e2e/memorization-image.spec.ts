import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const styles = readFileSync(
  new URL("../../src/styles.css", import.meta.url),
  "utf8",
);
const productionStyles = readFileSync(
  new URL("../../src/production.css", import.meta.url),
  "utf8",
);

const finalStyles = ["ux.css", "figma-review.css", "path-review.css"]
  .map((name) =>
    readFileSync(new URL(`../../src/${name}`, import.meta.url), "utf8"),
  )
  .join("\n");

const viewports = [
  { width: 320, height: 568 },
  { width: 568, height: 320 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
];

const imageSizes = [
  { width: 800, height: 200 },
  { width: 200, height: 800 },
  { width: 500, height: 500 },
];

for (const viewport of viewports) {
  for (const imageSize of imageSizes) {
    test(`${viewport.width}x${viewport.height} contains ${imageSize.width}x${imageSize.height} memorization image without layout shift`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.route("**/memorization-fixture", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<html><head><meta charset="utf-8">
            <style>${styles}</style>
            <style>${productionStyles}</style><style>${finalStyles}</style>
            <style>.practice-card { animation: none; }</style>
          </head><body>
          <main class="live-session" dir="rtl"><section class="memorization-card live-panel practice-card">
            <div class="memorization-visual">
              <div class="memorization-image-loading" aria-label="Loading image"></div>
            </div>
          <div class="memorization-copy"><h1 dir="ltr">here</h1><p class="memorization-translation" dir="rtl">כאן</p></div></section></main></body></html>`,
        }),
      );
      await page.goto("/memorization-fixture");

      const visual = page.locator(".memorization-visual");
      const before = await visual.boundingBox();
      expect(before).not.toBeNull();

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imageSize.width}" height="${imageSize.height}"><rect width="100%" height="100%" fill="red"/></svg>`;
      await visual.evaluate(
        (element, source) => {
          element.innerHTML = `<img alt="Study item" src="${source}"><small class="image-credit">Image credit</small>`;
        },
        `data:image/svg+xml,${encodeURIComponent(svg)}`,
      );
      await expect(visual.locator("img")).toHaveJSProperty("complete", true);

      const after = await visual.boundingBox();
      const layout = await visual.evaluate((element) => {
        const image = element.querySelector("img")!;
        const credit = element.querySelector(".image-credit")!;
        const frame = element.getBoundingClientRect();
        const imageBox = image.getBoundingClientRect();
        const creditBox = credit.getBoundingClientRect();
        return {
          fit: getComputedStyle(image).objectFit,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          imageBox: {
            left: imageBox.left,
            right: imageBox.right,
            bottom: imageBox.bottom,
          },
          creditBox: { top: creditBox.top, bottom: creditBox.bottom },
          frame: { left: frame.left, right: frame.right, bottom: frame.bottom },
          documentWidth: document.documentElement.scrollWidth,
        };
      });

      expect(after!.width).toBeCloseTo(before!.width, 0);
      expect(after!.height).toBeCloseTo(before!.height, 0);
      expect(layout.fit).toBe("contain");
      expect(after!.width).toBeGreaterThanOrEqual(
        Math.min(220, viewport.width - 80),
      );
      expect(after!.height).toBeGreaterThanOrEqual(
        viewport.height < 400 ? 150 : 210,
      );
      const centers = await page
        .locator(".memorization-card")
        .evaluate((card) => {
          const middle = (element: Element) => {
            const b = element.getBoundingClientRect();
            return b.left + b.width / 2;
          };
          return [
            ".memorization-visual",
            "h1",
            ".memorization-translation",
          ].map(
            (selector) => middle(card.querySelector(selector)!) - middle(card),
          );
        });
      for (const delta of centers) expect(Math.abs(delta)).toBeLessThan(2);
      expect(layout.naturalWidth).toBe(imageSize.width);
      expect(layout.naturalHeight).toBe(imageSize.height);
      expect(layout.imageBox.left).toBeGreaterThanOrEqual(
        layout.frame.left - 1,
      );
      expect(layout.imageBox.right).toBeLessThanOrEqual(layout.frame.right + 1);
      expect(layout.imageBox.bottom).toBeLessThanOrEqual(
        layout.creditBox.top + 1,
      );
      expect(layout.creditBox.bottom).toBeLessThanOrEqual(
        layout.frame.bottom + 1,
      );
      expect(layout.documentWidth).toBeLessThanOrEqual(viewport.width + 1);
    });
  }
}
