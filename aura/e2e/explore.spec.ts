import { test, expect } from "@playwright/test";
import { mockBackend, gotoApp } from "./support/mockApi";

/**
 * Explore's three terminal states.
 *
 * The page used to render only one of them. Its empty state was gated on
 * `posts.length > 0`, so a request that never returned any rows — the common
 * case when the backend is down — left the reader with the hero, the concern
 * pills, and then nothing at all: no message, no retry, no way to tell a broken
 * fetch from an empty catalogue. These lock in the distinction.
 */

const POSTS = [
  { _id: "p1", id: "p1", title: "Rosehip Oil Ritual", readTime: "4 min" },
  { _id: "p2", id: "p2", title: "Aloe From Scratch", readTime: "6 min" },
];

test.describe("Explore — load states", () => {
  test("renders the feed when posts load", async ({ page }) => {
    await mockBackend(page, { posts: POSTS });
    await gotoApp(page, "explore");

    await expect(page.getByText("Rosehip Oil Ritual")).toBeVisible();
    // Neither failure nor empty messaging should appear on the happy path.
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByText(/couldn.t load the remedies/i)).toHaveCount(0);
  });

  test("an empty catalogue says so instead of rendering a void", async ({
    page,
  }) => {
    await mockBackend(page, { posts: [] });
    await gotoApp(page, "explore");

    await expect(page.getByText("No remedies yet")).toBeVisible();
    // An empty shelf is not an error — it must not be announced as one.
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("a failed load explains itself and offers a retry that works", async ({
    page,
  }) => {
    // Start broken so the failure path renders...
    await mockBackend(page, { postsError: true });
    await gotoApp(page, "explore");

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/couldn.t load the remedies/i);

    // ...then heal the backend, so a working retry is observable rather than
    // just re-rendering the same error.
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await mockBackend(page, { posts: POSTS });

    await page.getByRole("button", { name: /try again/i }).click();

    await expect(page.getByText("Rosehip Oil Ritual")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});
