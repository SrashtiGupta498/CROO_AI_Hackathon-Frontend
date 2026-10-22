# Deployment Requirements — Aura & Earth

What has to exist, be configured, and be checked before this stack can go
live. Three deployable units, in dependency order:

| # | Unit | Stack | Repo / path | Talks to |
|---|------|-------|-------------|----------|
| 1 | **ML service** | Python 3.11 + FastAPI + PyTorch | `BLOGS_WITHAI-master/ml-service` | — |
| 2 | **API** | NestJS (Node) | `BLOGS_WITHAI-master` | MongoDB, Redis, ML service, SMTP, Google OAuth |
| 3 | **Frontend** | React 19 + Vite 6 (this repo) | `E:\aura` | API |

Deploy in that order. The API needs `ML_SERVICE_URL` to point at a running #1,
and the frontend bakes `VITE_API_URL` in **at build time**, so #2 must have its
final public URL before you build #3.

---

## 1. Frontend (this repo)

### Build

```bash
npm ci && npm run build
```

Output is a fully static `dist/` — publish that directory. Node is only needed
to build; nothing runs server-side.

- **Node:** 20 LTS or newer (Vite 6 requires ≥18; React 19 toolchain is tested on 20).
- **Build command:** `npm ci && npm run build`
- **Publish directory:** `dist`

### Environment variables (read at BUILD time)

Set these on the *static site's* build environment, not at runtime — Vite
inlines them into the bundle. Changing one requires a **rebuild**, not a restart.

| Var | Required | Notes |
|-----|----------|-------|
| `VITE_API_URL` | Yes | Backend **origin**, no trailing `/v1` and no trailing slash. e.g. `https://aura-api.example.com`. Defaults to `http://localhost:3002` if unset — an unset value in production silently ships a localhost build. |
| `GEMINI_API_KEY` | Only for in-browser AI | Inlined into the client bundle by `vite.config.ts` (`define:`), so **anyone who loads the site can read it**. Use a restricted, rotatable key, or move these calls server-side. |

### Hosting requirements

- **No SPA rewrite rule needed.** The app uses `HashRouter` (`src/App.tsx`), so
  every route lives after `#` and the server only ever serves `/index.html`.
  Do *not* add a catch-all rewrite expecting `/ai/chat` style paths — they
  don't exist as URLs.
- **HTTPS required** — the skin scan calls `navigator.mediaDevices.getUserMedia`,
  which browsers only expose on secure origins (or `localhost`).
- Static host is enough: Render Static Site, Netlify, Vercel, S3+CloudFront, nginx.
- Cache `dist/assets/*` aggressively (content-hashed); serve `index.html`
  with `no-cache` so deploys are picked up.

### Bundle notes

`react-vendor` and `redux-vendor` are split into long-lived chunks. Heavy
per-feature libs (tiptap, pdf-parse, @google/genai) stay inside their lazy route
chunks — don't add them to `manualChunks` or they land in the initial download.

---

## 2. API (NestJS)

### Build & run

```bash
npm ci && npm run build     # nest build
npm run start:prod          # node dist/main
```

### Required environment variables

| Var | Notes |
|-----|-------|
| `PORT` | Listen port (host usually injects this). |
| `MONGODB_URI` | MongoDB connection string. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | **Generate fresh, high-entropy values per environment.** |
| `JWT_ACCESS_TOKEN_EXPIRES_IN`, `JWT_REFRESH_EXPIRATION_DAYS` | Token lifetimes. |
| `NODE_ENV` | `production` |
| `REDIS_HOST`, `REDIS_PORT` | Rate limiting / cache. |
| `THROTTLE_TTL`, `THROTTLE_LIMIT` | Throttler config. |
| `MAX_FILE_SIZE`, `UPLOAD_DEST` | Upload limits and destination. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | OAuth. See the three-way match below. |
| `FRONTEND_URL` | Used to build password-reset links. Must include the hash route form the frontend expects. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Leave `SMTP_HOST` blank and reset links are logged to the server console instead of emailed — fine for staging, **not** for production. |
| `ML_SERVICE_URL` | Origin of unit #1. Without it, `/v1/skin/analyze` has nothing to proxy to. |
| `LOGS_ENABLED` | Logging toggle. |

### Google OAuth — the redirect URI must match in three places

A mismatch in any one of these fails the login with `redirect_uri_mismatch`:

1. The frontend origin that initiates the flow
2. The API's `GOOGLE_REDIRECT_URI`
3. The authorised redirect URI in the Google Cloud Console

### Persistent storage ⚠️

`src/main.ts` serves uploads from `join(process.cwd(), 'uploads')` on the local
filesystem. On ephemeral hosts (Render, Heroku, most container platforms) that
directory is **wiped on every deploy and restart** — every uploaded image 404s
afterwards. Before production, either attach a persistent volume/disk, or move
uploads to object storage (S3/R2/Cloudinary) and serve them from there.

### CORS

The API must allow the frontend origin. Verify after the first deploy — a CORS
failure looks identical to "the backend is down" from the browser.

---

## 3. ML service (FastAPI)

### Run

```bash
pip install -r ml-service/requirements.txt
python -m uvicorn src.api:app --host 0.0.0.0 --port 8000
```

### Requirements

- **Python 3.11.** `numpy<2` is pinned — do not upgrade it.
- **PyTorch** is not in `requirements.txt`. Install the right build for the
  target machine first, e.g.
  `pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu`
- **`opencv-python` and `opencv-python-headless` must never both be installed.**
  `pip install -r` only adds, never removes, so a stale build cache carrying
  `opencv-python` breaks `cv2` (e.g. `cv2.CascadeClassifier` silently disappears).
  Build from a clean environment/cache.
- **Model checkpoints** (`ml-service/checkpoints`, `ml-service/skin_type_ckpt`)
  must ship with the deploy or be downloaded on boot. They are large — confirm
  they aren't excluded by `.gitignore` or the host's build filter.
- **`GEMINI_API_KEY`** in the environment for the remedy agent.
- **Memory:** PyTorch + a vision model needs meaningfully more RAM than a Node
  service. Size the instance for the model, not for the traffic — a 512 MB
  instance will OOM on first inference.

---

## Pre-deploy checklist

**Build gates** (all currently pass)

- [x] `npx tsc --noEmit` — clean
- [x] `npm run build` — succeeds
- [ ] `npm run test:e2e` — 44/45. The one failure is a stale assertion in
      `e2e/profile.spec.ts:39` (expects the text "preferences" in the settings
      tab; the panel heading is "Account settings" and the word only appears
      inside the edit modal). Test bug, not an app bug — but the suite is red
      until it's fixed, so it can't gate a deploy as-is.

**Configuration**

- [ ] `VITE_API_URL` set on the frontend build environment to the real API origin
- [ ] Fresh `JWT_SECRET` / `JWT_REFRESH_SECRET` generated for this environment
- [ ] Google OAuth redirect URI matches in all three places
- [ ] SMTP credentials filled in (or accept console-only reset links)
- [ ] `ML_SERVICE_URL` points at the deployed ML service
- [ ] API CORS allows the frontend origin
- [ ] Persistent storage decided for `/uploads`

**Secrets**

- [ ] The backend's `.env` contains a live MongoDB Atlas connection string with
      username and password (in a comment under `MONGODB_URI`). That file **is**
      gitignored, so it is not in git history — but the backend has no
      `.env.example`, and `.gitignore` carries a `!.env.example` negation, so
      the first person who creates one by copying `.env` will commit the
      credential. Create `.env.example` with placeholders only, and rotate the
      Atlas password if that string has ever left the dev machine.
- [ ] Confirm `.env` / `.env.local` stay gitignored in both repos.
- [ ] Decide whether `GEMINI_API_KEY` should stay client-side. As configured it
      is public to every visitor.

**Data**

- [ ] Seed categories. Production currently returns a single category
      (`Skin Care`) from `/v1/categories/get`, so the landing page's
      "Browse by Concern" grid renders one tile in a four-column layout.

**Post-deploy smoke test**

- [ ] `/#/` loads, hero renders, "Browse by Concern" is populated
- [ ] `/#/ai` shows both choices; `/#/ai/analysis` and `/#/ai/chat` open
- [ ] Camera prompt appears on the scan (proves HTTPS)
- [ ] Login → profile → logout round-trips
- [ ] An uploaded image still resolves after a redeploy (proves storage)
