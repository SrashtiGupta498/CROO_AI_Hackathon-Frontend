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
  ProductRec,
} from "../data/remedies";

export interface RecommendationGroup {
  key: string;
  title: string;
  /** Why this group is being shown, phrased from the user's own result. */
  reason: string;
  severity?: ConcernItem["severity"];
  score?: number;
  remedies: Remedy[];
  products: ProductRec[];
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

  // 1. Detected concerns, already sorted by score by the ML service.
  for (const item of detected) {
    const entry = CONCERN_RECS[item.concern];
    if (!entry) continue;
    const label = CONCERN_LABELS[item.concern] || item.concern;
    groups.push({
      key: `concern:${item.concern}`,
      title: entry.title,
      reason:
        item.method === "photometric"
          ? `${SEVERITY_WORD[item.severity]} ${label.toLowerCase()} measured in your photo`
          : `${SEVERITY_WORD[item.severity]} ${label.toLowerCase()} detected${
              item.regions?.length
                ? ` (${item.regions.map((r) => r.replace(/_/g, " ")).join(", ")})`
                : ""
            }`,
      severity: item.severity,
      score: item.score_0_100,
      remedies: entry.remedies,
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
      remedies: entry.remedies,
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
      remedies: DULL_SKIN_REC.remedies,
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
      reason: `Classified as ${type} skin (${Math.round(
        (analysis.skin_type?.confidence ?? 0) * 100
      )}% confidence)`,
      remedies: entry.remedies,
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

/** The single most pressing concern label, for saving to the user profile. */
export function topConcernLabel(analysis: SelfieAnalysis | null): string | null {
  const first =
    analysis?.concerns?.status === "ok" && analysis.concerns.detected?.length
      ? analysis.concerns.detected[0]
      : null;
  return first ? CONCERN_LABELS[first.concern] || first.concern : null;
}
