# Deploying the frontend (Vercel, free tier)

The app is a static Vite/React bundle — no server runtime, so Vercel's Hobby
plan hosts it at $0 with no spin-down (unlike the API).

## Repo layout gotcha

`E:\aura` is **not itself a git repo**. It maps to the `aura/` subfolder of
`SrashtiGupta498/CROO_AI_Hackathon-Frontend` (pushed via the `github-srashti`
SSH alias). Sync `E:\aura` into that subfolder — excluding `node_modules`,
`dist`, `.env.local`, `test-results/`, `playwright-report/`, `scratch/`,
`data/` — then commit and push.

## Vercel project settings

1. <https://vercel.com/new> → import `CROO_AI_Hackathon-Frontend`.
2. **Root Directory: `aura`** — this is the one setting that cannot live in
   `vercel.json`; leave it at the repo root and the build finds no
   `package.json`. Everything else (framework, build/install command, output
   dir, asset caching) is already pinned in `aura/vercel.json`.
3. Environment variable — read by Vite at **build** time, so a change needs a
   redeploy, not just a restart:

   | Variable | Value | Notes |
   | --- | --- | --- |
   | `VITE_API_URL` | `https://croo-blog-api.onrender.com` | Backend **origin**, no trailing `/v1`. Unset → falls back to `http://localhost:3002` and production breaks. |

   No Gemini key is needed here: AI features call the backend's `/v1/ai/*`
   routes, and `GEMINI_API_KEY` is set on the Render API service instead.

4. Deploy.

## No rewrite rule needed

The app uses `HashRouter`, so every route lives after a `#` and the static host
only ever serves `/index.html`. That is why `vercel.json` has no `rewrites`
block — deep links work without one. If the app is ever switched to
`BrowserRouter`, add:

```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

## After the first deploy

Copy the Vercel URL and set it on the API side, otherwise password-reset links
point at localhost:

- Render → `croo-blog-api` → `FRONTEND_URL` = `https://<project>.vercel.app`
- Google Cloud console → OAuth client → authorised redirect URI, and Render's
  `GOOGLE_REDIRECT_URI`, if Google login is used.

CORS on the API is `origin: true` (reflects any origin) and auth travels as a
Bearer header rather than a cookie, so no allowlist change is needed for the
Vercel domain.

## Free-tier realities

- The API sleeps after ~15 min idle on Render free; the first request after
  that takes ~30–60 s. The UI should show a loading state, not a dead screen.
- Media is served by Cloudinary's CDN, not by Vercel or the API — image and
  video bandwidth does not count against either.
