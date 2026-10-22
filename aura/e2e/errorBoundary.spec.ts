import { test, expect } from "@playwright/test";
import { mockBackend, gotoApp } from "./support/mockApi";

/**
 * The app had no error boundary at all: any throw during render unmounted the
 * entire tree — header, footer and bottom nav included — leaving a white page
 * whose only escape was a manual reload.
 *
 * Failing a route's lazy chunk is the cleanest way to provoke a real render
 * error from the outside: `lazy()` rejects, React throws during render, and the
 * boundary is what stands between that and a blank screen. It is also a genuine
 * production scenario — a client holding a stale index.html after a deploy asks
 * for chunk hashes that no longer exist.
 */

test.describe("Error boundary", () => {
  test("a failed route chunk shows a recovery screen, not a blank page", async ({
    page,
  }) => {
    await mockBackend(page);
    // Break exactly one route's chunk; everything else must keep working.
    await page.route("**/assets/About-*.js", (route) => route.abort());

    await gotoApp(page, "about");

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/didn't load properly/i);

    // The whole point: the chrome survives, so the user is not stranded.
    await expect(page.getByTestId("desktop-nav").or(page.getByTestId("mobile-bottom-nav")).first()).toBeAttached();
    await expect(page.getByRole("button", { name: /back home/i })).toBeVisible();
  });

  test("navigating away from a crashed route recovers", async ({ page }) => {
    await mockBackend(page);
    await page.route("**/assets/About-*.js", (route) => route.abort());

    await gotoApp(page, "about");
    await expect(page.getByRole("alert")).toBeVisible();

    await page.getByRole("button", { name: /back home/i }).click();

    // A crash on /about must not follow the reader to /. If the boundary did
    // not reset on navigation, the fallback would still be on screen here.
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("routes with working chunks are unaffected", async ({ page }) => {
    await mockBackend(page);
    await page.route("**/assets/About-*.js", (route) => route.abort());

    await gotoApp(page, "contact");

    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
