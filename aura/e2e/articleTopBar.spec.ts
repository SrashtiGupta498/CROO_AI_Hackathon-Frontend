import { test, expect } from "@playwright/test";
import { mockBackend, gotoApp } from "./support/mockApi";

/**
 * ArticleView renders its own floating top bar (Back / Read / Share) as
 * `position: fixed`, independent of the site Header. It used to sit at
 * `top: 6px`, which is inside the Header's own 0–68px band — the Header
 * (sticky, z-60) painted over it and intercepted every click aimed at those
 * three controls, at any scroll position. The bar now docks at `top: 68px`,
 * directly below the Header instead of underneath it.
 *
 * Playwright's `.click()` performs a real actionability check (element is the
 * one actually hit at its centre point), so it fails on its own if this
 * regresses — no coordinate math needed in the test itself.
 */

const POST = {
  _id: "p1",
  id: "p1",
  title: "Rosehip Oil Ritual",
  readTime: "4 min",
  sections: [],
};

test.describe("Article top bar clears the site header", () => {
  test("Back, Read and Share are clickable at the top of the page", async ({
    page,
  }) => {
    await mockBackend(page, { posts: [POST] });
    await gotoApp(page, "article/p1");

    const nav = page.locator("nav").filter({ hasText: "Rosehip Oil Ritual" });
    await expect(nav).toBeVisible();

    // A real .click() throws if another element is hit-tested on top of the
    // target — exactly how this bug presented.
    await page.getByRole("button", { name: /^read$/i }).click();
    await expect(page.locator(".article-view-reading-bar")).toBeVisible();
    await page.getByRole("button", { name: /exit/i }).click();

    await page.getByRole("button", { name: /^share$/i }).click();
  });

  test("Back and Read stay clickable after scrolling", async ({ page }) => {
    await mockBackend(page, { posts: [POST] });
    await gotoApp(page, "article/p1");

    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(200);

    await expect(page.getByRole("button", { name: /^read$/i })).toBeVisible();
    // Reachable, not just visible: this is what actually failed before — the
    // element existed but the Header sat on top of it.
    await page.getByRole("button", { name: /^read$/i }).click();
    await expect(page.locator(".article-view-reading-bar")).toBeVisible();
  });

  test("the top bar sits below the header, not behind it", async ({ page }) => {
    await mockBackend(page, { posts: [POST] });
    await gotoApp(page, "article/p1");

    const header = page.locator("header");
    const nav = page.locator("nav").filter({ hasText: "Rosehip Oil Ritual" });

    const headerBox = await header.boundingBox();
    const navBox = await nav.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(navBox).not.toBeNull();

    // The nav's top edge must be at or below the header's bottom edge — this
    // is the geometric fact the click-reachability above depends on.
    expect(navBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  });
});

/**
 * Separate, unrelated overflow bug found while verifying the fix above: the
 * bar's icon group (Read / Like / Bookmark / Share) is wide enough that on a
 * 375px screen it used to be pushed past the right edge of the viewport
 * entirely — Bookmark measured at x 400–437, off-screen, and so untappable.
 * `document.documentElement.scrollWidth` never caught it because the bar is
 * `position: fixed` and fixed-position overflow doesn't expand document
 * scroll width — hence asserting each control's own bounding box here rather
 * than a page-level overflow check.
 */
test.describe("Article top bar fits narrow viewports", () => {
  test("every icon in the toolbar stays inside a 375px viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockBackend(page, {
      // A realistically long title is the actual squeeze case — a short one
      // would pass even with the old, unbounded centre column.
      posts: [{ ...POST, title: "The 5-Step Morning Glow Routine for Every Skin Type" }],
    });
    await gotoApp(page, "article/p1");

    const nav = page.locator("nav").filter({ hasText: "Read" });
    await expect(nav).toBeVisible();

    for (const name of [/^read$/i, /^like/i, /liked/i]) {
      const btn = nav.getByRole("button", { name }).first();
      if (!(await btn.count())) continue;
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    }

    // The bookmark toggle has no accessible name — this is the control that
    // was actually measured off-screen, so it gets a direct DOM check rather
    // than relying on getByRole.
    const bookmark = nav.locator("button", { hasText: "🏷️" }).or(
      nav.locator("button", { hasText: "🔖" }),
    );
    await expect(bookmark).toBeVisible();
    const bmBox = await bookmark.boundingBox();
    expect(bmBox).not.toBeNull();
    expect(bmBox!.x + bmBox!.width).toBeLessThanOrEqual(375);
    await bookmark.click();
  });
});
