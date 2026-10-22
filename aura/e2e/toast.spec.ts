import { test, expect, type Locator, type Page } from "@playwright/test";
import { mockBackend, gotoApp, seedAuth } from "./support/mockApi";

/**
 * Feedback used to come from `window.alert()` — including for successes
 * ("Link copied to clipboard ✨"). A native alert blocks the page, names the
 * origin ("localhost:3000 says"), can't be styled, and can't time out. It is
 * also invisible to these tests unless a dialog handler is attached, which is
 * how the regression below is caught: `failOnDialog` fails the test if any
 * native dialog is opened at all.
 */

const POST = {
  _id: "p1",
  id: "p1",
  title: "Rosehip Oil Ritual",
  readTime: "4 min",
  sections: [],
};

/** Any native dialog is a regression — every path here should use a toast. */
async function failOnDialog(page: Page) {
  page.on("dialog", async (dialog) => {
    await dialog.dismiss();
    throw new Error(
      `A native ${dialog.type()} dialog was opened: "${dialog.message()}"`,
    );
  });
}

/** Centres the target before clicking, so it isn't left at the very edge of
 *  the viewport by Playwright's default scroll-into-view alignment. */
async function clickCentred(target: Locator) {
  await target.evaluate((el) =>
    el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }),
  );
  await target.click();
}

test.describe("Toasts replace native dialogs", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await failOnDialog(page);
  });

  test("a success toast appears, announces politely, and auto-dismisses", async ({
    page,
  }) => {
    await mockBackend(page, { posts: [POST] });
    // Force the clipboard branch rather than the native share sheet, which
    // Playwright cannot drive.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined });
    });

    await gotoApp(page, "article/p1");

    await page.getByRole("button", { name: /^share$/i }).first().click();

    const toast = page.locator(".ae-toast");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/link copied/i);
    await expect(toast).toHaveClass(/ae-toast--success/);

    // Announced through the shared polite live region, not one per toast.
    await expect(
      page.locator('[data-testid="toast-viewport"] [aria-live="polite"] .ae-toast'),
    ).toHaveCount(1);

    // Successes time out; nothing is lost if one is missed.
    await expect(toast).toHaveCount(0, { timeout: 8000 });
  });

  test("an error toast persists until dismissed and hides transport detail", async ({
    page,
  }) => {
    await seedAuth(page);
    await mockBackend(page, { posts: [POST] });
    // A bare 500 with no body — the case that used to surface axios's own
    // "Request failed with status code 500".
    await page.route("**/v1/engagements", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({}),
      });
    });

    await gotoApp(page, "article/p1");

    await page
      .getByPlaceholder(/share your thoughts/i)
      .fill("A thought worth sharing.");
    await clickCentred(page.getByRole("button", { name: /post comment/i }));

    const toast = page.locator(".ae-toast--error");
    await expect(toast).toBeVisible();
    await expect(toast).not.toContainText(
      /status code|network error|axios|localhost|:300\d/i,
    );

    // Errors do not auto-dismiss — they wait for the reader.
    await page.waitForTimeout(5500);
    await expect(toast).toBeVisible();

    await page.getByRole("button", { name: /dismiss notification/i }).click();
    await expect(toast).toHaveCount(0);
  });
});
