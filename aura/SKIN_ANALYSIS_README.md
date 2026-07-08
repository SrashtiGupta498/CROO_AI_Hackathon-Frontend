# AI Skin Analysis — Aura & Earth

Upload a selfie, get a real, model-backed read on your skin (type, tone, and visible concerns), and a set of matched home remedies and organic-ingredient suggestions. No blockchain, no paid agent network — just a straightforward computer-vision + LLM feature inside the Aura & Earth app. Monetization (premium tier, affiliate product links, etc.) is a planned future step, not something shipped today.

---

## 1. What it does

1. **Upload a selfie** (camera or file) in the app's Skincare AI section.
2. **Quality gate** — rejects unusable photos (no face, too blurry, too dark/bright) *before* running any model, so users aren't shown junk results.
3. **Skin-type classification** — a trained CNN labels the face `dry / oily / normal / combination` with a confidence score.
4. **Skin-concern detection** — a second trained CNN scans patches across the face (forehead, cheeks, nose, chin) and flags `acne, blackheads, dark spots, pigmentation, enlarged pores, redness, wrinkles`, each with a severity and the regions affected.
5. **Objective measurements** — classical computer vision (no model, just math) measures skin tone (ITA°), redness, and brightness directly from pixel values, plus a separate photometric dark-circle estimate.
6. **Remedy recommendations** — a curated, hand-written knowledge base of home remedies and organic ingredients is matched to the user's actual results (detected concerns first, then measured metrics, then a base ritual for their skin type). This is a lookup, not an LLM guess.
7. **Optional AI narrative** — Gemini turns the structured result into a friendly explanation, an AM/PM routine, and product-type suggestions, grounded strictly in the analysis JSON (not free-associated).
8. **Disclaimer, always shown**: cosmetic guidance only — never a medical diagnosis. Anything that looks medical should go to a dermatologist.

## 2. Why this is useful

Most "AI skincare scanner" apps hand back an opaque score (e.g. "82/100") with no explanation. This feature instead:
- Shows *what* was detected and *where* (region-level, not just a single label),
- Backs every recommendation with a fixed, auditable remedy database (no hallucinated advice),
- Keeps the model's job narrow (classification + measurement) and lets a simple, transparent rule-based layer decide what to show — easy to review, edit, and trust.

## 3. Architecture

```
React app (Aura & Earth)
  Skincare AI chat  ──►  Skin Analysis page
        │  upload selfie (multipart)
        ▼
NestJS backend  (POST /v1/skin/analyze[/selfie])
        │  proxies the image, optionally saves SkinType/SkinConcern
        │  to the logged-in user's profile
        ▼
Python FastAPI ML service (port 8000)
   quality_check()  ──►  predict() [skin type]
                    ──►  skin_metrics() [tone/redness/brightness]
                    ──►  analyze_concerns() [patch-based concern CNN + dark circles]
                    ──►  advise() [Gemini explain/routine/product]  (optional)
        ▼
Structured JSON  ──►  services/recommendations.ts (frontend)
        ▼
Ranked remedy + organic-product cards, rendered in the app
```

Three tiers, three responsibilities:
- **Frontend (`aura/`, React 19 + TypeScript + Vite + Tailwind):** capture/upload UI, renders results, ranks and displays remedies.
- **Backend proxy (NestJS, `src/module/skin/`):** single auth surface — forwards the image, attaches the result to a user's profile if a valid JWT is present, otherwise stateless.
- **ML service (Python + FastAPI, `ml-service/`):** the actual models and computer vision, served as a separate process because NestJS/Node cannot run PyTorch checkpoints.

## 4. The ML/CV pipeline in detail

| Stage | Technique | What it outputs |
|---|---|---|
| Quality gate | OpenCV: Haar face detection, Laplacian-variance blur check, mean-brightness exposure check | pass/fail + measured sharpness, brightness, face size |
| Skin type | EfficientNet-B0 (via `timm`), 224px input, softmax over 4 classes | `dry / oily / normal / combination` + confidence + full probability breakdown |
| Skin concerns | EfficientNet-B0 patch classifier over 8 classes (`acne, blackheads, dark_spots, pigmentation, pores, redness, wrinkles, clear`), run on tiled patches across named face regions, aggregated by coverage | each detected concern + severity (`mild/moderate/significant`) + affected regions |
| Dark circles | Not a model — photometric CIELAB L\* comparison between under-eye zones and a lower-cheek baseline | severity + score if the delta exceeds a threshold |
| Skin tone / redness / brightness | Classical CV: YCrCb+HSV skin masking, then CIELAB color stats (ITA° for tone, a\* for redness, L\* for brightness) | numeric scores + an average skin-tone swatch |
| Narrative advice (optional) | Gemini 2.5 Flash, prompted with the structured JSON only | plain-language explanation, AM/PM routine, ingredient-type suggestions |

**Concern detection, concretely:** the face is split into named zones (forehead, both cheeks, nose, chin), each zone is tiled into small patches, patches that aren't mostly skin (eyes, hair, background) are dropped via a color-mask rule, and the remaining patches are batch-classified. A concern only surfaces if it appears on enough patches (noise floor) with high enough model confidence — this keeps genuinely clear skin from being flagged.

## 5. Recommendation engine (rule-based, not learned)

`data/remedies.ts` is a hand-curated knowledge base: for every skin type and every concern, it lists 2–4 home remedies (with method + frequency) and a handful of organic ingredients (with a one-line reason). `services/recommendations.ts` ranks and assembles what to show for a given result:

1. Every detected concern (highest severity first),
2. Measured-metric triggers the concern model didn't already catch (e.g. high measured redness, low measured brightness → "dull skin"),
3. A baseline ritual for the classified skin type (always shown, lowest priority).

Because this layer is a lookup table rather than a model or an unconstrained LLM call, every recommendation is traceable to a specific line in `remedies.ts` — easy to audit, correct, or expand.

## 6. Tech stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router 7.
- **Backend proxy:** NestJS 11, Mongoose (to persist SkinType/SkinConcern on user profiles), JWT auth (optional on this endpoint).
- **ML service:** Python, FastAPI, PyTorch + `timm` (EfficientNet-B0 ×2 — skin type, concerns), OpenCV (face detection, color-space math), `google-generativeai` (Gemini) for the narrative layer.

## 7. API endpoints (ML service, proxied by the backend)

| Endpoint | Purpose |
|---|---|
| `GET /health` | Model/service status, reports whether a Gemini key is configured |
| `POST /predict/skin-type` | Skin-type classification only |
| `POST /analyze/selfie` | Full pipeline (quality + skin type + metrics + concerns), no LLM |
| `POST /analyze/advice` | Same as above, plus Gemini explain/routine/product (falls back to a bare analysis if no Gemini key is set) |

All POST endpoints take a multipart `image` field (jpeg/png/webp, ≤10MB).

## 8. Run locally

```bash
# 1. ML service
cd ml-service
pip install -r requirements.txt
# optional, enables narrative advice:
#   $env:GEMINI_API_KEY = "AIza..."      (PowerShell)
python -m uvicorn src.api:app --port 8000 --reload
curl http://localhost:8000/health

# 2. Backend (from the NestJS project root)
npm run start:dev          # expects ML_SERVICE_URL, defaults to http://localhost:8000

# 3. Frontend
cd aura
npm install
npm run dev
```

## 9. Privacy & safety

- Selfies are **not stored** without consent; the pipeline logs only a filename/byte-count, never raw image bytes.
- Every surface carries a persistent disclaimer: cosmetic guidance only, not a medical diagnosis.
- Uploads are validated by type and size (≤10MB) before reaching any model.

## 10. Known limitations (honest state, not marketing)

- The concern model classifies **one label per patch** (softmax), not true multi-label per patch — co-occurring concerns on the same patch aren't both captured yet.
- Face/region detection uses a Haar cascade with a center-crop fallback, not landmark-based (e.g. MediaPipe FaceMesh), so region boundaries are approximate.
- No confidence calibration yet — raw softmax probabilities are shown as "confidence."
- Skin-tone fairness (accuracy across Fitzpatrick I–VI) has not been measured or balanced in training data.
- Redness/tone/brightness measurements are sensitive to camera white balance and lighting — no correction is applied.

## 11. Roadmap

**Near-term (model/product quality):**
- Multi-label concern head (sigmoid per patch) instead of softmax.
- Confidence calibration (temperature scaling).
- Landmark-based face regions (MediaPipe) instead of Haar-box heuristics.
- Skin-tone fairness audit and rebalanced training data (ACNE04 + DermNet + Fitzpatrick17k + SCIN).
- Skin-history memory across repeat scans + routine reminders.

**Future monetization (not yet built — ideas, not commitments):**
- A premium tier (e.g. deeper analysis history, progress tracking over time, priority Gemini-powered routines).
- Affiliate/commerce links on the organic-product recommendations (the recommendation cards already link into the in-app Ingredient Library — a natural hook for real purchase links later).
- Licensing the analysis API to other skincare/wellness apps.

## 12. Disclaimer

This feature provides general cosmetic skincare information only. It does not diagnose medical skin conditions. Users with persistent, painful, or rapidly changing skin issues should consult a dermatologist.
