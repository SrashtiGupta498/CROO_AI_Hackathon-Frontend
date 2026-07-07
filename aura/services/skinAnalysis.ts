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

export interface SkinTypeResult {
  skin_type: string; // dry | oily | normal | combination
  confidence: number; // 0-1
  probs: Record<string, number>;
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
  /** Present on the flat /analyze/selfie response when CAP settlement is on. */
  cap?: CapOrderRef;
}

export interface SkinAdvice {
  explain: string;
  routine: string;
  product: string;
}

/**
 * On-chain settlement metadata, present only when the backend has CAP enabled
 * (CAP_ENABLED=true). Each scan opens a real CROO order that settles in USDC on
 * Base. Absent when CAP is off — always check before rendering.
 */
export interface CapOrderRef {
  negotiationId: string;
  serviceId: string;
}

export interface AdviceResponse {
  analysis: SelfieAnalysis;
  advice: SkinAdvice;
  cap?: CapOrderRef;
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
