import API from "./api";

// The selfie analysis now goes through the NestJS backend, which proxies to the
// Python ML service (BLOGS_WITHAI-master/ml-service) and — when a JWT is present
// (attached by the API client) — saves SkinType/SkinConcern to the profile.
// One API surface, one auth. The backend responses are wrapped as
// { status, message, data }, so we unwrap with `res.data?.data ?? res.data`.

// ---------- response shapes (mirror src/analyze_selfie.py) ----------

export interface QualityResult {
  passed: boolean;
  checks: {
    face_present?: boolean;
    resolution_ok?: boolean;
    sharp_ok?: boolean;
    exposure_ok?: boolean;
    face_px?: number;
    sharpness?: number;
    brightness?: number;
  };
  issues: string[];
}

/**
 * Skin-type read. Since the 4-class CNN was retired (0.39 accuracy on a
 * leak-free split, barely above the 0.25 random baseline) this is DERIVED FROM
 * THE SHINE MEASUREMENT: `skin_type` restates the measurement in familiar
 * words, and `confidence` is null because no model produced it. Show `note` or
 * `shine_percentile` — never a confidence percentage.
 */
export interface SkinTypeResult {
  skin_type: string; // dry | oily | normal | combination (measurement-derived)
  confidence: number | null; // always null now — there is no model behind it
  probs?: Record<string, number>;
  ok?: boolean;
  basis?: "measurement";
  is_classifier?: boolean;
  shine_level?: "low" | "typical" | "high" | "very_high";
  tzone?: "even" | "slight" | "concentrated" | "unmeasured";
  overall_shine?: number;
  t_over_u?: number;
  shine_percentile?: number;
  tzone_pct_above_cheeks?: number | null;
  /** Plain-English read that always quotes the underlying number. */
  note?: string;
}

export interface SkinMetrics {
  ok: boolean;
  reason?: string;
  skin_pixels?: number;
  tone?: {
    ita_deg: number;
    category: string; // very_light | light | intermediate | tan | brown | dark
    avg_hex: string;
    L: number;
    b: number;
  };
  redness?: { a_star: number; score_0_100: number };
  brightness?: { L_star: number; score_0_100: number };
}

export type ConcernName =
  | "acne"
  | "blackheads"
  | "dark_spots"
  | "pigmentation"
  | "pores"
  | "redness"
  | "wrinkles"
  | "dark_circles";

export type ConcernSeverity = "mild" | "moderate" | "significant";

export interface ConcernItem {
  concern: ConcernName;
  severity: ConcernSeverity;
  score_0_100: number;
  /** fraction of analyzed skin tiles affected (model concerns only) */
  coverage?: number;
  patches?: number;
  max_conf?: number;
  regions?: string[];
  /** "model" = trained concern classifier, "photometric" = measured (dark circles) */
  method: "model" | "photometric";
  delta_L?: number;
}

export interface ConcernsResult {
  status: "ok" | "unavailable" | "error";
  note?: string;
  face_detected?: boolean;
  patches_analyzed?: number;
  detected?: ConcernItem[];
}

export interface SelfieAnalysis {
  image: string;
  status: "ok" | "rejected";
  quality: QualityResult;
  skin_type: SkinTypeResult | null;
  metrics: SkinMetrics | null;
  concerns: ConcernsResult | null;
  /**
   * Id of the SkinReport the backend stored for this scan — the address the
   * feedback endpoint takes. Null when the uploader is signed out (nothing was
   * stored), which is what hides the feedback prompt.
   */
  report_id?: string | null;
}

/** One home remedy Gemini generated from the ML numbers. */
export interface GeminiRemedy {
  name: string;
  how: string;
  frequency?: string;
}

/** A group of remedies for one concern (or the skin-type base ritual). */
export interface GeminiRemedyGroup {
  target: string; // e.g. "Acne", "Oily skin"
  based_on?: string; // which number this maps to, e.g. "acne score 42/100"
  severity?: ConcernSeverity;
  score?: number | null;
  remedies: GeminiRemedy[];
}

/** Structured home remedies produced by Gemini from the ML analysis numbers. */
export interface GeminiRemedies {
  summary?: string;
  groups?: GeminiRemedyGroup[];
  see_dermatologist?: boolean;
}

export interface SkinAdvice {
  explain: string;
  routine: string;
  product: string;
  /** Home remedies Gemini derived from the ML numbers (skin type + scores). */
  remedies?: GeminiRemedies;
}

export interface AdviceResponse {
  analysis: SelfieAnalysis;
  advice: SkinAdvice;
  /** Set alongside `analysis`, not inside it — see SelfieAnalysis.report_id. */
  report_id?: string | null;
}

// ---------- calls ----------

function toForm(file: File | Blob): FormData {
  const form = new FormData();
  form.append("image", file);
  return form;
}

/** Quality gate + skin type + tone/redness/brightness metrics (no Gemini). */
export async function analyzeSelfie(file: File | Blob): Promise<SelfieAnalysis> {
  const res = await API.post("/skin/analyze/selfie", toForm(file), {
    timeout: 120_000, // first call loads the model
  });
  return res.data?.data ?? res.data;
}

/**
 * Full pipeline + Gemini guidance (explain / routine / product).
 * The backend handles the fallbacks: if the ML server has no Gemini key it
 * returns the bare analysis (no `advice` key), and a quality-rejected photo also
 * comes back as a bare analysis — callers should check for `advice` before using it.
 */
export async function analyzeWithAdvice(
  file: File | Blob
): Promise<AdviceResponse | SelfieAnalysis> {
  const res = await API.post("/skin/analyze", toForm(file), {
    timeout: 120_000, // model load + Gemini latency
  });
  return res.data?.data ?? res.data;
}

/** Service + model status via the backend proxy (also reports Gemini key state). */
export async function mlHealth(): Promise<{
  status: string;
  skin_type_labels: string[];
  device: string;
  gemini_key_set: boolean;
}> {
  const res = await API.get("/skin/health");
  return res.data?.data ?? res.data;
}
