/**
 * Turns an aura-ml analysis result into a ranked recommendation feed of
 * home remedies + organic products.
 *
 * Ranking: detected concerns (by severity score, highest first)
 *        → metric triggers (measured redness / low brightness)
 *        → the base ritual for the classified skin type.
 *
 * All content lives in data/remedies.ts — edit that file, not this one.
 */
import { SelfieAnalysis, ConcernItem } from "./skinAnalysis";
import {
  SKIN_TYPE_RECS,
  CONCERN_RECS,
  DULL_SKIN_REC,
  REDNESS_SCORE_TRIGGER,
  BRIGHTNESS_SCORE_TRIGGER,
  CONCERN_LABELS,
  Remedy,
  ChemRemedy,
  ProductRec,
  Dosha,
} from "../data/remedies";

export interface RecommendationGroup {
  key: string;
  title: string;
  /** Why this group is being shown, phrased from the user's own result. */
  reason: string;
  severity?: ConcernItem["severity"];
  score?: number;
  /** Ayurvedic dosha this maps to, for on-brand framing. */
  dosha?: Dosha;
  remedies: Remedy[]; // 🌿 Ayurvedic ritual (hero)
  /**
   * 🧪 Clinical actives — ONLY populated for moderate/significant concerns
   * (AURA is Ayurveda-first, so mild concerns stay natural-only).
   */
  chemical: ChemRemedy[];
  products: ProductRec[]; // 🪷 organic picks
}

/**
 * A curated, ordered day/night plan surfaced when acne is significant.
 * This is the "targeted product recommendation" escalation block.
 */
export interface AcnePlan {
  severity: ConcernItem["severity"];
  score: number;
  /** Ordered routine steps (cleanse → treat → moisturize → protect). */
  steps: { step: string; pick: string; note: string }[];
  actives: ChemRemedy[];
  seeDermatologist: boolean;
}

const SEVERITY_WORD: Record<string, string> = {
  mild: "Mild",
  moderate: "Moderate",
  significant: "Significant",
};

export function buildRecommendations(
  analysis: SelfieAnalysis | null
): RecommendationGroup[] {
  if (!analysis || analysis.status !== "ok") return [];

  const groups: RecommendationGroup[] = [];
  const detected: ConcernItem[] =
    analysis.concerns?.status === "ok" && analysis.concerns.detected
      ? analysis.concerns.detected
      : [];

  // AURA is Ayurveda-first: clinical actives only surface when a concern is
  // moderate or significant. Mild concerns stay natural-only.
  const showsActives = (severity?: ConcernItem["severity"]) =>
    severity === "moderate" || severity === "significant";

  // 1. Detected concerns, already sorted by score by the ML service.
  for (const item of detected) {
    const entry = CONCERN_RECS[item.concern];
    if (!entry) continue;
    const label = CONCERN_LABELS[item.concern] || item.concern;
    groups.push({
      key: `concern:${item.concern}`,
      title: entry.title,
      // Phrased as an observation, not a diagnosis. The concern model is
      // trained on stock/derm photos and is directional on real selfie skin,
      // so "we noticed" is what the signal actually supports — "you have"
      // overstates it, and a confident wrong call is the failure this product
      // recovers from worst. The photometric branch IS a direct measurement,
      // so it keeps the firmer "measured" wording.
      reason:
        item.method === "photometric"
          ? `${SEVERITY_WORD[item.severity]} ${label.toLowerCase()} measured in your photo`
          : `We noticed signs of ${label.toLowerCase()}${
              item.regions?.length
                ? ` around your ${item.regions
                    .map((r) => r.replace(/_/g, " "))
                    .join(", ")}`
                : ""
            } (${SEVERITY_WORD[item.severity].toLowerCase()})`,
      severity: item.severity,
      score: item.score_0_100,
      dosha: entry.dosha,
      remedies: entry.remedies,
      chemical: showsActives(item.severity) ? entry.chemical ?? [] : [],
      products: entry.products,
    });
  }

  const has = (key: string) => groups.some((g) => g.key === `concern:${key}`);

  // 2. Metric triggers — only when the concern model didn't already flag it.
  const rednessScore = analysis.metrics?.redness?.score_0_100;
  if (
    !has("redness") &&
    typeof rednessScore === "number" &&
    rednessScore >= REDNESS_SCORE_TRIGGER
  ) {
    const entry = CONCERN_RECS.redness;
    groups.push({
      key: "metric:redness",
      title: entry.title,
      reason: `Your measured redness score is ${Math.round(rednessScore)}/100`,
      score: rednessScore,
      dosha: entry.dosha,
      remedies: entry.remedies,
      chemical: rednessScore >= REDNESS_SCORE_TRIGGER + 15 ? entry.chemical ?? [] : [],
      products: entry.products,
    });
  }

  const brightnessScore = analysis.metrics?.brightness?.score_0_100;
  if (
    typeof brightnessScore === "number" &&
    brightnessScore < BRIGHTNESS_SCORE_TRIGGER
  ) {
    groups.push({
      key: "metric:dull",
      title: DULL_SKIN_REC.title,
      reason: `Your measured brightness score is ${Math.round(brightnessScore)}/100`,
      score: 100 - brightnessScore,
      dosha: DULL_SKIN_REC.dosha,
      remedies: DULL_SKIN_REC.remedies,
      chemical: [], // glow is a maintenance goal — keep it natural-first
      products: DULL_SKIN_REC.products,
    });
  }

  // 3. Base ritual for the classified skin type — always present, last.
  const type = analysis.skin_type?.skin_type;
  if (type && SKIN_TYPE_RECS[type]) {
    const entry = SKIN_TYPE_RECS[type];
    groups.push({
      key: `type:${type}`,
      title: entry.title,
      // Measurement-derived, so phrase it as what was measured — there is no
      // classifier confidence to quote any more.
      reason:
        analysis.skin_type?.note ??
        `Your skin measured in the ${type} range`,
      dosha: entry.dosha,
      remedies: entry.remedies,
      chemical: [], // base ritual stays natural — the concern groups carry actives
      products: entry.products,
    });
  }

  // De-duplicate products across groups: the highest-priority group keeps it.
  const seen = new Set<string>();
  for (const g of groups) {
    g.products = g.products.filter((p) => {
      const k = p.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  return groups;
}

/**
 * Builds the targeted acne product plan — the escalation block shown only when
 * acne is detected at moderate/significant severity. Returns null otherwise.
 */
export function buildAcnePlan(analysis: SelfieAnalysis | null): AcnePlan | null {
  if (!analysis || analysis.status !== "ok") return null;
  const detected: ConcernItem[] =
    analysis.concerns?.status === "ok" && analysis.concerns.detected
      ? analysis.concerns.detected
      : [];
  const acne = detected.find((c) => c.concern === "acne");
  if (!acne || acne.severity === "mild") return null;

  const entry = CONCERN_RECS.acne;
  const otcActives = (entry.chemical ?? []).filter((c) => c.otc !== false);

  // A simple, safe ordered routine assembled from the acne tiers.
  const steps: AcnePlan["steps"] = [
    {
      step: "Cleanse (AM + PM)",
      pick: "Gentle gel cleanser + willow-bark salicylic acid",
      note: "Clears oil and dead skin without stripping the barrier.",
    },
    {
      step: "Treat (PM)",
      pick: "Bakuchiol or azelaic acid serum",
      note: "Plant-derived actives that clear spots and fade marks.",
    },
    {
      step: "Calm & moisturize",
      pick: "Neem/aloe gel + niacinamide",
      note: "Keeps the barrier happy so treatment doesn't over-dry.",
    },
    {
      step: "Protect (AM)",
      pick: "Mineral SPF 30+",
      note: "Non-negotiable — actives and marks both worsen in sun.",
    },
  ];

  return {
    severity: acne.severity,
    score: acne.score_0_100,
    steps,
    actives: otcActives,
    // Persistent/cystic-looking significant acne → nudge toward a professional.
    seeDermatologist: acne.severity === "significant",
  };
}

/** The single most pressing concern label, for saving to the user profile. */
export function topConcernLabel(analysis: SelfieAnalysis | null): string | null {
  const first =
    analysis?.concerns?.status === "ok" && analysis.concerns.detected?.length
      ? analysis.concerns.detected[0]
      : null;
  return first ? CONCERN_LABELS[first.concern] || first.concern : null;
}
