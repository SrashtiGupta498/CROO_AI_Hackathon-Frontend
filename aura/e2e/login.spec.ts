import { test, expect } from "@playwright/test";
import { mockBackend, gotoApp, TEST_USER } from "./support/mockApi";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    // Start every test signed out.
    await page.addInitScript(() => localStorage.clear());
  });

  test("renders the redesigned sign-in form", async ({ page }) => {
    await mockBackend(page);
    await gotoApp(page, "Login");

    await expect(page.getByTestId("login-page")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /sign in to your account/i }),
    ).toBeVisible();
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
    await expect(page.getByTestId("login-google")).toBeVisible();
  });

  test("password visibility toggle switches the input type", async ({ page }) => {
    await mockBackend(page);
    await gotoApp(page, "Login");

    const password = page.getByTestId("login-password");
    await password.fill("secret123");
    await expect(password).toHaveAttribute("type", "password");

    await page.getByTestId("login-toggle-password").click();
    await expect(password).toHaveAttribute("type", "text");

    await page.getByTestId("login-toggle-password").click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("shows an error message when credentials are rejected", async ({ page }) => {
    await mockBackend(page, { loginError: "Invalid email or password" });
    await gotoApp(page, "Login");

    await page.getByTestId("login-email").fill("wrong@example.com");
    await page.getByTestId("login-password").fill("nope");
    await page.getByTestId("login-submit").click();

    const err = page.getByTestId("login-error");
    await expect(err).toBeVisible();
    await expect(err).toHaveText(/invalid email or password/i);

    // Still on the login page (no redirect on failure).
    await expect(page).toHaveURL(/#\/Login/i);
  });

  test("successful login redirects to the profile page", async ({ page }) => {
    await mockBackend(page);
    await gotoApp(page, "Login");

    await page.getByTestId("login-email").fill(TEST_USER.Email);
    await page.getByTestId("login-password").fill("correct-horse");
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/#\/profile/i);
    await expect(page.getByTestId("profile-name")).toContainText("Test User");
  });

  test("navigates to sign-up from the login page", async ({ page }) => {
    await mockBackend(page);
    await gotoApp(page, "Login");
    await page.getByTestId("login-signup-link").click();
    await expect(page).toHaveURL(/#\/Signup/i);
  });
});
