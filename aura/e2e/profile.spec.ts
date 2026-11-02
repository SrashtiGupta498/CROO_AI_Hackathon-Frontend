import { test, expect } from "@playwright/test";
import { mockBackend, seedAuth, gotoApp } from "./support/mockApi";

test.describe("Profile — signed out", () => {
  test("shows the sign-in guard and routes to Login", async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await mockBackend(page);
    await gotoApp(page, "profile");

    await expect(page.getByTestId("profile-guard")).toBeVisible();
    await page.getByTestId("profile-guard-signin").click();
    await expect(page).toHaveURL(/#\/Login/i);
  });
});

test.describe("Profile — signed in", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockBackend(page);
    await gotoApp(page, "profile");
    await expect(page.getByTestId("profile-page")).toBeVisible();
  });

  test("renders the member's name and summary", async ({ page }) => {
    await expect(page.getByTestId("profile-name")).toContainText("Test User");
    // Skin type uses the clay personalization accent.
    await expect(page.getByText("Dry").first()).toBeVisible();
  });

  test("switches between tabs", async ({ page }) => {
    await page.getByTestId("profile-tab-liked").click();
    await expect(page.getByText(/no liked posts yet/i)).toBeVisible();

    await page.getByTestId("profile-tab-articles").click();
    await expect(page.getByText(/nothing saved yet/i)).toBeVisible();

    // Saved and Liked are the only tabs left: the ingredients tab and the
    // settings tab (whose every row was removed) are both gone, and nothing
    // was left behind as an empty panel.
    await expect(page.getByTestId("profile-tab-ingredients")).toHaveCount(0);
    await expect(page.getByTestId("profile-tab-settings")).toHaveCount(0);
    await expect(page.getByTestId("profile-settings-panel")).toHaveCount(0);
  });

  test("the removed settings never render anywhere on the page", async ({
    page,
  }) => {
    const gone = [
      /appearance theme/i,
      /language/i,
      /timezone/i,
      /newsletter/i,
      /profile visibility/i,
      /^comments$/i,
      /^username$/i,
      /cover image/i,
    ];
    const root = page.getByTestId("profile-page");
    for (const re of gone) {
      await expect(root.getByText(re)).toHaveCount(0);
    }

    // …including inside the edit modal.
    await page.getByTestId("profile-edit-profile").click();
    const modal = page.getByTestId("profile-edit-modal");
    await expect(modal).toBeVisible();
    for (const re of gone) {
      await expect(modal.getByText(re)).toHaveCount(0);
    }
  });

  /* Regression: GET /users/:id comes back wrapped as { status, message, data }.
     The client used to look for `.data.user` / `.user` and, finding neither,
     merged the ENVELOPE into the session user — so the page only ever showed
     the stale localStorage copy and nothing the server actually held. Write a
     stale session straight into storage, reload so the slice re-reads it, and
     assert the server's values win. */
  test("renders the server's profile, not the stale stored session", async ({
    page,
  }) => {
    // Registered AFTER seedAuth's init script, so it runs after it and wins:
    // seedAuth rewrites `currentUser` on every page load, which would otherwise
    // put the fresh fixture back and make this test vacuous.
    await page.addInitScript(() => {
      const stale = JSON.parse(localStorage.getItem("currentUser") || "{}");
      stale.FirstName = "Stale";
      stale.LastName = "Session";
      stale.Location = "Nowhere";
      localStorage.setItem("currentUser", JSON.stringify(stale));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("profile-page")).toBeVisible();

    // Sanity: the stale copy really was the starting point for this render.
    await expect(page.getByTestId("profile-name")).toContainText("Test User");
    await expect(page.getByTestId("profile-name")).not.toContainText("Stale");
    await expect(page.getByText("London, UK")).toBeVisible();
    await expect(page.getByText("Nowhere")).toHaveCount(0);
  });

  test("saved tab shows an empty state when nothing is saved", async ({
    page,
  }) => {
    await expect(page.getByText(/nothing saved yet/i)).toBeVisible();
  });

  test("opens the edit modal and saves profile + settings together", async ({
    page,
  }) => {
    let profilePatched: any = null;
    let settingsPatched: any = null;
    // Layer a capture-hook mock ON TOP of the one beforeEach installed —
    // Playwright matches the last-registered route first, so this wins.
    //
    // Do NOT unrouteAll() first: that leaves a window where requests escape
    // the mock and hit a backend that isn't there, the save thunk rejects, and
    // the modal never closes. Under parallel workers that window is wide enough
    // to fail this test intermittently.
    await mockBackend(page, {
      onProfilePatch: (b) => (profilePatched = b),
      onSettingsPatch: (b) => (settingsPatched = b),
    });

    await page.getByTestId("profile-open-settings").click();
    const modal = page.getByTestId("profile-edit-modal");
    await expect(modal).toBeVisible();

    // Change a profile field (bio). There is no editable settings field left
    // in the modal, so the settings write is now only about round-tripping
    // what was already stored.
    await modal
      .getByPlaceholder(/tell us a little about yourself/i)
      .fill("Updated bio from e2e.");

    await page.getByTestId("profile-save-settings").click();

    // Both writes must fire — the previous bug only saved settings.
    await expect.poll(() => profilePatched).not.toBeNull();
    await expect.poll(() => settingsPatched).not.toBeNull();
    expect(profilePatched).toMatchObject({ Bio: "Updated bio from e2e." });
    // The username/cover fields are no longer editable, but saving must not
    // wipe what the account already had.
    expect(settingsPatched).toMatchObject({ username: "testuser" });

    // Modal closes after the success flash.
    await expect(modal).toBeHidden({ timeout: 5000 });
  });

  test("edit modal can be dismissed with the close button", async ({
    page,
  }) => {
    await page.getByTestId("profile-edit-profile").click();
    const modal = page.getByTestId("profile-edit-modal");
    await expect(modal).toBeVisible();
    await page.getByTestId("profile-modal-close").click();
    await expect(modal).toBeHidden();
  });

  test("logout returns to the Login page", async ({ page }) => {
    await page.getByTestId("profile-logout").click();
    await expect(page).toHaveURL(/#\/Login/i);
  });
});
