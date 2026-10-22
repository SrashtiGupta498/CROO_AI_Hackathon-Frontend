import type { Page, Route, Request } from "@playwright/test";

/**
 * Network-level mock for the backend `/v1/**` API.
 *
 * The frontend talks to a NestJS backend (default origin http://localhost:3002)
 * via axios. Rather than depend on that backend + real credentials, e2e tests
 * intercept every `/v1/**` request and serve deterministic JSON. Cross-origin
 * XHR from :3000 → :3002 is CORS-checked by the browser, so every response
 * (and the CORS preflight) carries permissive CORS headers.
 */

export const TEST_USER = {
  id: "u_test_1",
  _id: "u_test_1",
  FirstName: "Test",
  LastName: "User",
  Email: "test@example.com",
  Role: "user",
  Bio: "Here for calm, natural skincare.",
  Location: "London, UK",
  SkinType: "Dry",
  SkinConcern: "Hydration",
  RitualFrequency: "Daily",
  ProfilePicture: "",
  AccessToken: "test-access-token",
  RefreshToken: "test-refresh-token",
};

export const TEST_SETTINGS = {
  id: "s_test_1",
  userId: "u_test_1",
  username: "testuser",
  coverImage: "",
  theme: "light",
  language: "English",
  timezone: "IST",
  newsletterFrequency: "Weekly",
  isPrivate: false,
  allowComments: true,
  socialLinks: { instagram: "", youtube: "" },
  followersCount: 0,
  followingCount: 0,
  postCount: 0,
  totalLikes: 0,
  totalComments: 0,
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: JSON.stringify(body),
  });
}

export interface MockOptions {
  /** Force the login endpoint to fail with this message (401). */
  loginError?: string;
  /** Overrides for the authenticated user record. */
  user?: Partial<typeof TEST_USER>;
  /** Bookmarked posts returned on the Saved tab. */
  bookmarks?: any[];
  /** Liked posts returned on the Liked tab. */
  likes?: any[];
  /** Called whenever a PATCH /settings request is received. */
  onSettingsPatch?: (body: any) => void;
  /** Called whenever a PATCH /users/:id (profile) request is received. */
  onProfilePatch?: (body: any) => void;
  /** Posts returned from GET /posts. Defaults to an empty list. */
  posts?: any[];
  /** Fail GET /posts with a 500 so the failed-load path can be exercised. */
  postsError?: boolean;
}

/**
 * Install the `/v1/**` mock on a page. Returns a small record of what was
 * received so tests can assert on outgoing writes.
 */
export async function mockBackend(page: Page, opts: MockOptions = {}) {
  const received = { settingsPatch: null as any, profilePatch: null as any };
  const user = { ...TEST_USER, ...opts.user };

  // Block external media/fonts so navigation's `load` event never waits on a
  // slow third-party host (picsum, unsplash, google fonts). Keeps tests fast
  // and offline-deterministic.
  await page.route(
    /(picsum\.photos|images\.unsplash\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|nominatim\.openstreetmap\.org)/,
    (route) => route.abort(),
  );

  await page.route("**/v1/**", async (route: Route, request: Request) => {
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname; // e.g. /v1/users/login

    // CORS preflight
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS_HEADERS, body: "" });
    }

    let body: any = {};
    try {
      body = request.postDataJSON();
    } catch {
      body = {};
    }

    // ── Auth ────────────────────────────────────────────────────────────
    if (path.endsWith("/users/login") && method === "POST") {
      if (opts.loginError) {
        return json(route, 401, { message: opts.loginError });
      }
      return json(route, 200, user);
    }
    if (path.endsWith("/auth/logout")) {
      return json(route, 200, { message: "ok" });
    }
    if (path.includes("/auth/refresh")) {
      return json(route, 200, { AccessToken: user.AccessToken });
    }

    // ── Settings ────────────────────────────────────────────────────────
    if (path.includes("/settings/user/")) {
      if (method === "PATCH") {
        received.settingsPatch = body;
        opts.onSettingsPatch?.(body);
        return json(route, 200, { data: { ...TEST_SETTINGS, ...body } });
      }
      return json(route, 200, { data: TEST_SETTINGS });
    }

    // ── Engagement (saved / liked) ──────────────────────────────────────
    if (path.includes("/engagements/me/bookmarks")) {
      return json(route, 200, { data: opts.bookmarks ?? [] });
    }
    if (path.includes("/engagements/me/likes")) {
      return json(route, 200, { data: opts.likes ?? [] });
    }

    // ── User profile ────────────────────────────────────────────────────
    // Update goes to PATCH /users/:id/profile; fetch is GET /users/:id.
    if (/\/users\/[^/]+\/profile$/.test(path) && method === "PATCH") {
      received.profilePatch = body;
      opts.onProfilePatch?.(body);
      return json(route, 200, { ...user, ...body });
    }
    if (/\/users\/[^/]+$/.test(path) && method === "GET") {
      return json(route, 200, user);
    }

    // ── Posts feed ──────────────────────────────────────────────────────
    // Explore renders three different states off this one endpoint (list,
    // empty catalogue, failed load), so it needs to be steerable per test.
    if (/\/posts\/?$/.test(path) && method === "GET") {
      if (opts.postsError) {
        return json(route, 500, { message: "Failed to fetch articles" });
      }
      const posts = opts.posts ?? [];
      return json(route, 200, { data: posts, total: posts.length });
    }
    // Single post — ArticleView reads its id off this, and several of its
    // actions (share, comment, bookmark) no-op without one. Note the real
    // endpoint is /posts/getpostById/:id, not /posts/:id.
    const postMatch = path.match(/\/posts\/(?:getpostById\/)?([^/]+)$/);
    if (postMatch && method === "GET") {
      const found = (opts.posts ?? []).find(
        (p: any) => String(p.id ?? p._id) === postMatch[1],
      );
      if (found) return json(route, 200, { data: found });
      return json(route, 404, { message: "Post not found" });
    }

    // ── Default: empty success so nothing on the page hard-fails ────────
    return json(route, 200, { data: [] });
  });

  return received;
}

/**
 * Seed an authenticated session by writing the same localStorage keys the
 * Redux slice reads on init (`currentUser`), before any app script runs.
 */
export async function seedAuth(page: Page, user = TEST_USER) {
  await page.addInitScript((u) => {
    localStorage.setItem("currentUser", JSON.stringify(u));
  }, user);
}

/**
 * Navigate to a HashRouter route. Waits for `domcontentloaded` rather than the
 * full `load` event so a slow/aborted image can never stall navigation.
 */
export const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:4173";

export async function gotoApp(page: Page, hashPath: string) {
  const path = hashPath.replace(/^#?\/?/, "");
  await page.goto(`${APP_BASE_URL}/#/${path}`, {
    waitUntil: "domcontentloaded",
  });
}
