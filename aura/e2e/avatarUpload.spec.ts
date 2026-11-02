import { test, expect } from "@playwright/test";
import {
  mockBackend,
  seedAuth,
  gotoApp,
  UPLOADED_IMAGE_URL,
} from "./support/mockApi";

const PNG = {
  name: "avatar.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
};

/* Uploading a new profile photo must replace the initials avatar straight
   away, and must persist the returned URL through PATCH /users/:id/profile. */

/**
 * What the <img> actually shows. The URL that is SAVED is the one the upload
 * endpoint returned (UPLOADED_IMAGE_URL); the one RENDERED goes through
 * toAbsoluteUrl(src, 320), which asks Cloudinary for the same asset resized to
 * the avatar slot and in whatever format the browser accepts. Asserting the
 * saved URL here would pass only by re-introducing full-size avatar downloads.
 */
const RENDERED_AVATAR =
  /\/image\/upload\/f_auto,q_auto,c_limit,w_320\/v1\/aura\/avatar\.png$/;
test.describe("Profile — avatar upload", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
  });

  test("uploading a photo from the profile header updates the avatar", async ({
    page,
  }) => {
    let profilePatched: any = null;
    await mockBackend(page, { onProfilePatch: (b) => (profilePatched = b) });
    await gotoApp(page, "profile");
    await expect(page.getByTestId("profile-page")).toBeVisible();

    // Starts as initials — no avatar <img> (exact: the hero's "Profile cover"
    // would otherwise match this substring).
    await expect(page.getByAltText("Profile", { exact: true })).toHaveCount(0);

    await page
      .locator('[data-testid="profile-page"] input[type="file"]')
      .first()
      .setInputFiles(PNG);

    await expect.poll(() => profilePatched).not.toBeNull();
    expect(profilePatched).toMatchObject({
      ProfilePicture: UPLOADED_IMAGE_URL,
    });

    const img = page.getByAltText("Profile", { exact: true });
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("src", RENDERED_AVATAR);
  });

  test("a photo picked in the edit modal survives a late settings load", async ({
    page,
  }) => {
    let profilePatched: any = null;
    await mockBackend(page, { onProfilePatch: (b) => (profilePatched = b) });

    // Hold the settings fetch open so it resolves AFTER the photo is picked —
    // the slow-network ordering, made deterministic.
    let releaseSettings: () => void = () => {};
    const settingsHeld = new Promise<void>((r) => {
      releaseSettings = r;
    });
    await page.route("**/v1/settings/user/**", async (route) => {
      if (route.request().method() === "GET") await settingsHeld;
      await route.fallback();
    });

    await gotoApp(page, "profile");
    await expect(page.getByTestId("profile-page")).toBeVisible();

    await page.getByTestId("profile-edit-profile").click();
    const modal = page.getByTestId("profile-edit-modal");
    await expect(modal).toBeVisible();

    await modal.locator('input[type="file"]').first().setInputFiles(PNG);

    const preview = modal.getByAltText("Profile picture preview");
    await expect(preview).toHaveAttribute("src", RENDERED_AVATAR);

    // The settings response now lands, re-running the modal's sync effect.
    releaseSettings();
    await page.waitForTimeout(600);

    // The staged photo must still be there, not reset to the stored value.
    await expect(preview).toHaveAttribute("src", RENDERED_AVATAR);

    await page.getByTestId("profile-save-settings").click();
    await expect.poll(() => profilePatched).not.toBeNull();
    expect(profilePatched).toMatchObject({
      ProfilePicture: UPLOADED_IMAGE_URL,
    });
  });
});
