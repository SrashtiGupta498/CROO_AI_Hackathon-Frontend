# Aura & Earth — End-to-End Audit (2026-06-30)

Scope: full frontend (`aura/`) + its NestJS API at `localhost:3002/v1`.
Method: live browser run-through of ~20 routes (logged-out **and** logged-in) + two static code audits (functionality, UI consistency).
Legend: **✅ verified live** = reproduced in the running app this session. Otherwise static-analysis finding.

---

## A. Functionality & integration

### High
- **F-H1 — 401 handler is broken under HashRouter (and bounces you to a full reload). ✅ verified live.**
  `services/api.ts:24-33` checks `window.location.pathname !== "/Login"` and sets `window.location.href = "/Login"`. The app uses **HashRouter**, so the path is always `/` and routes live in the hash. The guard never matches; the redirect lands on `/` (Home) and forces a full page reload that drops SPA state. I hit this during testing — a background 401 silently threw me to Home.
  → Compare/redirect using the hash (`/#/Login`), and dispatch a Redux `logout` so the store doesn't keep a stale user.
- **F-H2 — `localStorage.currentUser` is wiped on 401 but Redux state is not.**
  `api.ts:27` removes localStorage; Redux only hydrates at init (`store/user/user.slice.tsx:23`). After any background 401 the UI still shows "logged in" while every token call fails.
  → Dispatch `logout` from the interceptor (shared event), keep store + storage in sync.
- **F-H3 — Dead links → blank screen. ✅ verified live.**
  `/articles` (linked from `components/Header.tsx:565,803` + nav arrays) and `/Lab` (`pages/Profile.tsx:621`) are **not declared** in `App.tsx`. Navigating renders an empty `<main>` (0 chars). There is also **no catch-all `*` NotFound**, so any typo'd URL is a blank page.
  → Add the missing routes (or repoint links to `/explore`/`/ingredients`) **and** add a `<Route path="*">` NotFound.
- **F-H4 — Signup never produces a valid session → first action 401-loops.**
  Backend sets the DB `AccessToken` only on `/users/login`, not on `/users` register. `store/user/user.action.tsx:20-30` + `Signuppage.tsx:21-22` set `currentUser` from the register response and navigate to `/profile`. The user *looks* logged in but has no server-valid token, so the first like/comment/bookmark triggers the F-H1/F-H2 wipe.
  → After signup, dispatch `loginUser` (or require explicit login) before treating as authenticated.

### Medium
- **F-M1 — Malformed/extra routes.** `App.tsx:67` `path="ArticleEditorPage/:id"` is missing the leading slash (unreachable dead route); there are 6 overlapping `/diy*` aliases (`:56-61`). → Delete the stray line; collapse the diy aliases.
- **F-M2 — `ArticleEditorPage` bypasses the shared axios client.** `pages/ArticleEditorPage.tsx:3,37-38` uses raw `axios` + hardcoded `http://localhost:3002/v1/...` (no auth header, no interceptor). → Use `services/api.ts`.
- **F-M3 — Inconsistent user-id resolution.** `engagement.ts:8` (`id||_id`), `notification.ts:37` (`_id||id`), `subscription.ts:27` (`_id||id`), `Profile.tsx:99` (`id||_id`). Different precedence can send different ids. → One `getCurrentUserId()` helper everywhere.
- **F-M4 — `_id`-only access where API returns `id`.** `pages/CategoryPage.tsx:766,769` use `post._id` for `key` and navigation; only works because `article.slice` backfills `_id`. Anything outside that path gets `key={undefined}` / `/article/undefined`. (Same root cause as the comment-delete bug already fixed in `engagement.ts`.) → Standardize on `post.id ?? post._id`.
- **F-M5 — Admin gate uses two different checks.** `AdminRoute.tsx:10-13` is case/shape-tolerant; `Profile.tsx:49` uses exact `currentUser?.Role === "admin"`. A lowercase-`role` admin passes the route but the Profile "Admin Studio" panel hides. → Reuse `isAdminUser`.
- **F-M6 — No error UI in list pages.** Slices track `error`, but `Explore.tsx` / `Reels.tsx` render only loading/empty; a failed fetch shows a blank grid. ✅ I confirmed `/reels` falls back to **hardcoded mock reels** (backend has 0), which masks real failures. → Surface `state.*.error`; decide whether mock reels should ship.
- **F-M7 — `alert()` used for UX.** `ArticleView.tsx` (comment failed / link copied), `Profile.tsx:148,168,185`, `ArticleEditor.tsx`, `CategoryManager.tsx:79`. Blocking native dialogs. → Inline toast/banner. (Note: the Share "Link copied" `alert` blocked automated testing — real, if minor, UX friction.)

### Low
- **F-L1 — Leftover `console.log`/`console.error`** in shipped paths: `store/article/*.tsx`, `pages/Explore.tsx`, `ArticleView.tsx`, `Profile.tsx`. → Remove.
- **F-L2 — `geminiService.ts:8` reads `process.env.API_KEY`** in browser code — undefined under Vite (needs `import.meta.env.VITE_*`), so the key is always empty and every Gemini call fails into catch. Also unsafe to expose client-side. → Proxy via backend.
- **F-L3 — Weak form validation.** Signup splits "Full Name" on whitespace (single word → empty `LastName`, `Signuppage.tsx:33-35`); the "agree to terms" checkbox is decorative/never enforced; no password-length check on signup (Reset has one). → Validate name parts, password, terms.

---

## B. UI / design consistency

### High
- **U-H1 — The design system is dead code.** `index.css` defines `--ae-*` tokens and `.ae-btn/.ae-card/.ae-pill/.ae-input/.ae-h2` — **0 usages anywhere**. Every page re-implements buttons/cards/inputs inline. → Adopt the `.ae-*` classes (or delete them and pick one source of truth).
- **U-H2 — 3+ competing palettes.** Brand sage/forest vs. the Daily journal pastel set (`pages/daily/shared.ts:7-14`) vs. the Story/Article editor pink-purple (`story-editor/blockTypes.ts:13-25`, `ArticleEditor.tsx:56-57,1790`). None reconciled. → Extend brand tokens to these tools or formally document them as isolated sub-themes.
- **U-H3 — "Same color, many spellings."** 121 distinct hex colors (593 occurrences). Sage as `#6B8E7A`/`#6b8e7a` (mixed case) + ad-hoc `#6B7B6F`/`#7C857A`/`#8A9A92`; "flag red" `#C0584F` vs `#CF4444`/`#C0392B`/`#C2452F`. → Replace literals with `--ae-*` vars; normalize case.
- **U-H4 — Border-radius chaos.** ~20 spellings (`rounded-xl`, `rounded-[24px]`, `[26px]`, `[28px]`, `[2.5rem]`, `[3.5rem]`…). `Profile.tsx:442-713` alone mixes six. → Restrict to a 5-step scale.
- **U-H5 — Dark mode is a dead toggle. ✅ partially verified.** `App.tsx:38` holds `isDarkMode` with **no UI to toggle it**; only `SkincareAI.tsx` + `Navigation.tsx` use `dark:`. Every other page ignores it. → Wire a real toggle + add `dark:` coverage, or remove the scaffolding.
- **U-H6 — `dangerouslySetInnerHTML` on article/user HTML (XSS).** 13 sites incl. `ArticleView.tsx:585,594,608`, `ArticleEditor.tsx`, `story-editor/PreviewPanel.tsx`. → Sanitize with DOMPurify before render.
- **U-H7 — Tailwind via CDN, no build config.** `index.html:8` loads `cdn.tailwindcss.com` with an inline config, while `index.css` uses `@tailwind`/`@layer` with **no `tailwind.config.js`/PostCSS** — the two can silently disagree dev vs build. (Console warns: "cdn.tailwindcss.com should not be used in production".) → Move to a real Tailwind build, single config.

### Medium
- **U-M1 — Auth pages are drifting near-duplicates.** `Login/Signup/Forgot/Reset` each re-inline the same glass card + `.input-premium`/`.btn-premium`. → Extract `AuthLayout` + `AuthInput`/`AuthButton`.
- **U-M2 — `Header.tsx` (1000+ lines) redefines local `ACCENT`/`DARK` and re-declares badge/pill/button styles** already in `index.css`. → Centralize.
- **U-M3 — Badges/pills/cards duplicated per page**, several off-palette (`ArticleCard.tsx:44-58` uses `green-100`/`amber-100`/`slate-200`). → Shared `<Badge>`/`<Pill>`/`<Card>`.
- **U-M4 — Inconsistent fonts.** ~150 inline `fontFamily` decls instead of `font-serif`/`font-sans` tokens; heading sizes mix `clamp()`, `text-2xl/3xl/4xl`, inline `fontSize`. → Standardize on `.ae-h2/h3` + Tailwind families.
- **U-M5 — Shadows ad-hoc**, and `card-shadow` is defined twice with different values (`index.html:52` black vs `index.css:35` ink-tinted). → One shadow scale.
- **U-M6 — Responsive risks.** Fixed heights/widths (`Article.tsx:60` `210px`, `Profile.tsx:446` `w-40 h-40`), `Explore.tsx:126` masonry `minmax(300px,1fr)` with no breakpoints, `SkincareAI.tsx:34 max-w-md` mobile-only. → Add `sm:/md:/lg:` + fluid sizing. (Recommend a mobile pass — not yet runtime-tested at 375px.)

### Low
- **U-L1 — Content/brand mismatch. ✅ verified live.** The rotating top banner shows **e-commerce** copy ("🌿 Free shipping on orders over ₹999 · code AURA10 for 10% off") on a site with **no shop/cart**. → Remove or replace with editorial CTAs.
- **U-L2 — Broken images on Explore. ✅ verified live.** ~22 of 100 thumbnails fail — they're external MSN-scraped URLs (`img-s-msn-com.akamaized.net/...`) in the post data, hotlink-blocked/expired. → Proxy/rehost images, and fall back to `PostCover` placeholder on `onError`.
- **U-L3 — A11y: icon-only buttons lack `aria-label`** (Header `:595,603,608,673`, Navigation, Footer social, SkincareAI); empty/missing `alt` on several `<img>`; `Notes.tsx` labels lack `htmlFor`. → Add labels/alts.
- **U-L4 — External runtime image deps.** `DIYCreator.tsx:314,501` + `IngredientLibrary.tsx:314` hardcode `transparenttextures.com/...` for a background texture. → Self-host/inline.
- **U-L5 — App-shell max-width conflict.** `App.tsx:47` wraps routes in `max-w-7xl`, but Header (`:364 max-w-[1600px]`) and heroes render full-bleed. → One max-width system.
- **U-L6 — Commented-out JSX / dev cruft** (`ArticleCard.tsx:83-93`, commented routes in `App.tsx`). → Remove.

---

## C. Tested OK (no issues found)
- No uncaught JS/console errors across **~20 routes** (Home, Explore, AI, Reels, Ingredients, Categories, Journal, Daily + sub-routes, Profile, Login, Signup, Forgot/Reset, DIY).
- Auth forms render correctly logged-out (Login: email+password+remember+Google; Signup: name+email+password+terms+Google).
- Profile handles logged-out state gracefully ("Enter the Sanctuary" CTA, no crash).
- `/reset-password` without a token shows a correct "Invalid reset link" state.
- Engagement stats (views/likes/comments/shares) + the comment CRUD verified working end-to-end earlier this session.
- Admin `/admin/*` routes are guarded (anon → Login, non-admin → Home).

---

## D. Highest-ROI quick wins
1. **F-H1 + F-H3:** fix the HashRouter 401 redirect and add a `*` NotFound — kills the two worst "blank screen / bounce to Home" bugs.
2. **F-H4:** log the user in after signup (or require login) — removes a guaranteed broken first-action path.
3. **U-H3 + U-H1:** replace hardcoded hexes with `--ae-*` vars and adopt the existing `.ae-*` classes — eliminates most visual drift at once.
4. **U-L1 + U-L2:** drop the e-commerce banner and add an image `onError` fallback — the two most visible content glitches.
5. **U-H6:** sanitize `dangerouslySetInnerHTML` — security.
