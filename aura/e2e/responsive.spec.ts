import { test, expect, type Page } from "@playwright/test";
import { mockBackend, gotoApp, seedAuth } from "./support/mockApi";

/**
 * Responsive layout suite.
 *
 * Two things break most often when a layout stops being responsive:
 *   1. Something overflows the viewport horizontally (a fixed width, an
 *      un-wrapped row, an image without max-width) → the page scrolls sideways.
 *   2. The breakpoint-specific chrome doesn't swap (desktop bar shown on a
 *      phone, or the mobile bottom nav shown on desktop).
 *
 * These tests assert both, across the public pages at phone / tablet / desktop.
 * The backend is mocked (see support/mockApi), so list pages render their
 * chrome even with empty data — enough to measure layout.
 */

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

// Routes that render without authentication.
const PUBLIC_ROUTES = [
  "/",
  "explore",
  "ingredients",
  "diy",
  "reels",
  "Login",
  "about",
  "contact",
  "ai",
];

/** Pixels the document scrolls horizontally. 0 (±1 for sub-pixel rounding)
 *  means nothing bleeds past the viewport. Inner `overflow-x:auto` regions
 *  (filter chips, code blocks) scroll themselves and don't count here. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const de = document.documentElement;
    return de.scrollWidth - de.clientWidth;
  });
}

test.describe("Responsive — no horizontal overflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  for (const vp of VIEWPORTS) {
    for (const route of PUBLIC_ROUTES) {
      test(`${vp.name} · ${route} does not scroll sideways`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await mockBackend(page);
        await gotoApp(page, route);
        // Let fonts/images reflow before measuring.
        await page.waitForTimeout(350);

        const overflow = await horizontalOverflow(page);
        expect(
          overflow,
          `"${route}" overflows the ${vp.name} viewport by ${overflow}px`,
        ).toBeLessThanOrEqual(1);
      });
    }
  }
});

test.describe("Responsive — navigation chrome swaps at the breakpoint", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test("mobile shows the bottom nav and hides the desktop nav", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockBackend(page);
    await gotoApp(page, "/");

    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
    // The quick-access bar this used to assert on is gone — it duplicated the
    // main nav. The desktop nav is now the thing that swaps at the breakpoint.
    await expect(page.getByTestId("desktop-nav")).toBeHidden();
  });

  test("tablet still shows the mobile bottom nav (below the lg breakpoint)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await mockBackend(page);
    await gotoApp(page, "/");

    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
  });

  test("desktop shows the desktop nav and hides the bottom nav", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockBackend(page);
    await gotoApp(page, "/");

    await expect(page.getByTestId("desktop-nav")).toBeVisible();
    await expect(page.getByTestId("mobile-bottom-nav")).toBeHidden();
  });

  /* The AI FAB is fixed bottom-right at z-index 70; the bottom nav is fixed at
     z-index 50. Where both showed, the FAB covered the nav's right-hand item
     (Journal) and ate its clicks. The FAB is now desktop-only — these two
     assert the rule from both sides so the overlap can't come back. */
  test("the AI FAB is hidden wherever the bottom nav is on screen", async ({ page }) => {
    await mockBackend(page);

    for (const vp of [
      { name: "mobile", width: 375, height: 812 },
      { name: "tablet", width: 768, height: 1024 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoApp(page, "/");

      await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
      await expect(
        page.getByTestId("ai-skin-fab"),
        `the AI FAB must not overlap the bottom nav at ${vp.name}`,
      ).toBeHidden();
    }
  });

  test("every bottom-nav item is clickable, not covered by an overlay", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockBackend(page);
    await gotoApp(page, "/");

    // Playwright's actionability check fails the click if another element sits
    // on top of the target, which is exactly the regression under test.
    await page.getByTestId("mobile-bottom-nav").getByLabel("Journal").click();
    await expect(page).toHaveURL(/#\/journal/);
  });
});

test.describe("Responsive — authenticated pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  for (const vp of VIEWPORTS) {
    test(`${vp.name} · profile does not scroll sideways`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockBackend(page);
      await seedAuth(page);
      await gotoApp(page, "profile");
      await page.waitForTimeout(350);

      const overflow = await horizontalOverflow(page);
      expect(
        overflow,
        `profile overflows the ${vp.name} viewport by ${overflow}px`,
      ).toBeLessThanOrEqual(1);
    });
  }
});
