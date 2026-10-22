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

    await page.getByTestId("profile-tab-ingredients").click();
    await expect(page.getByText(/no ingredients yet/i)).toBeVisible();

    await page.getByTestId("profile-tab-settings").click();
    await expect(page.getByTestId("profile-settings-panel")).toBeVisible();
    // Assert against the panel's own heading and a row that is actually in it.
    // This used to look for /preferences/i, which only ever appears inside the
    // edit MODAL ("Account & preferences") — not in the settings tab.
    const panel = page.getByTestId("profile-settings-panel");
    await expect(
      panel.getByRole("heading", { name: /account settings/i }),
    ).toBeVisible();
    await expect(panel.getByText(/appearance theme/i)).toBeVisible();
  });

  test("saved tab shows an empty state when nothing is saved", async ({ page }) => {
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

    // Change a profile field (bio) and a settings field (username).
    await modal.getByPlaceholder(/tell us a little about yourself/i).fill(
      "Updated bio from e2e.",
    );
    await modal.getByPlaceholder("@yourhandle").fill("newhandle");

    await page.getByTestId("profile-save-settings").click();

    // Both writes must fire — the previous bug only saved settings.
    await expect.poll(() => profilePatched).not.toBeNull();
    await expect.poll(() => settingsPatched).not.toBeNull();
    expect(profilePatched).toMatchObject({ Bio: "Updated bio from e2e." });
    expect(settingsPatched).toMatchObject({ username: "newhandle" });

    // Modal closes after the success flash.
    await expect(modal).toBeHidden({ timeout: 5000 });
  });

  test("edit modal can be dismissed with the close button", async ({ page }) => {
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
