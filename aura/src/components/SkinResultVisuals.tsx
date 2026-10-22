/* ============================================================
   SkinResultVisuals — the visual layer of a selfie analysis
   result: an overall score gauge, a face map showing which
   zones each concern was found in, and the skin-type
   probability spread.

   The face map is not decorative. Its zone boxes are the exact
   normalized boxes the ML service tiles for inference — see
   REGIONS in ml-service/src/face_analysis.py — so a highlighted
   cheek really is the region the score came from.
   ============================================================ */

import React from "react";
import type {
  ConcernItem,
  ConcernSeverity,
  SkinTypeResult,
} from "../services/skinAnalysis";
import "./SkinResultVisuals.css";

/* Mirrors REGIONS + UNDER_EYE in ml-service/src/face_analysis.py.
   Values are (x0, y0, x1, y1) relative to the detected face box. */
const REGION_BOXES: Record<string, [number, number, number, number]> = {
  forehead: [0.15, 0.0, 0.85, 0.22],
  left_cheek: [0.04, 0.38, 0.36, 0.78],
  right_cheek: [0.64, 0.38, 0.96, 0.78],
  nose: [0.4, 0.28, 0.6, 0.66],
  chin: [0.28, 0.8, 0.72, 1.0],
  left_under_eye: [0.16, 0.42, 0.4, 0.54],
  right_under_eye: [0.6, 0.42, 0.84, 0.54],
};

const REGION_LABELS: Record<string, string> = {
  forehead: "Forehead",
  left_cheek: "Left cheek",
  right_cheek: "Right cheek",
  nose: "Nose",
  chin: "Chin",
  left_under_eye: "Left under-eye",
  right_under_eye: "Right under-eye",
};

const SEVERITY_RANK: Record<ConcernSeverity, number> = {
  mild: 1,
  moderate: 2,
  significant: 3,
};

const SEVERITY_COLOR: Record<ConcernSeverity, string> = {
  mild: "var(--sv-mild)",
  moderate: "var(--sv-moderate)",
  significant: "var(--sv-significant)",
};

const CONCERN_LABELS: Record<string, string> = {
  acne: "Acne",
  blackheads: "Blackheads",
  dark_spots: "Dark spots",
  pigmentation: "Pigmentation",
  pores: "Pores",
  redness: "Redness",
  wrinkles: "Fine lines",
  dark_circles: "Dark circles",
};

/* ─── Overall score gauge ──────────────────────────────────── */

/** A single headline number. 100 = nothing flagged; each concern pulls it
 *  down by its own score, weighted by severity so one significant issue
 *  outweighs several mild ones. */
export const computeSkinScore = (concerns: ConcernItem[]): number => {
  if (!concerns.length) return 100;
  const weighted = concerns.reduce(
    (sum, c) => sum + c.score_0_100 * SEVERITY_RANK[c.severity],
    0,
  );
  const weight = concerns.reduce((sum, c) => sum + SEVERITY_RANK[c.severity], 0);
  return Math.max(0, Math.min(100, Math.round(100 - weighted / weight)));
};

export const SkinScoreGauge: React.FC<{ score: number; caption?: string }> = ({
  score,
  caption,
}) => {
  const r = 62;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const band = score >= 75 ? "good" : score >= 50 ? "fair" : "attention";

  return (
    <div className={`sv-gauge sv-gauge--${band}`}>
      <svg viewBox="0 0 160 160" className="sv-gauge-svg" role="img"
        aria-label={`Overall skin score ${score} out of 100`}>
        <circle cx="80" cy="80" r={r} className="sv-gauge-track" />
        <circle
          cx="80"
          cy="80"
          r={r}
          className="sv-gauge-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="sv-gauge-center">
        <span className="sv-gauge-label">Skin Health Score</span>
        <span className="sv-gauge-num">{score}</span>
        <span className="sv-gauge-unit">/ 100</span>
      </div>
      {caption && <p className="sv-gauge-caption">{caption}</p>}
    </div>
  );
};

/* ─── Face map ─────────────────────────────────────────────── */

interface ZoneHit {
  severity: ConcernSeverity;
  concerns: string[];
}

/** Groups the flat concern list by the face zones each was found in. */
const buildZoneMap = (concerns: ConcernItem[]): Record<string, ZoneHit> => {
  const zones: Record<string, ZoneHit> = {};
  concerns.forEach((c) => {
    (c.regions || []).forEach((region) => {
      if (!REGION_BOXES[region]) return;
      const label = CONCERN_LABELS[c.concern] || c.concern;
      const existing = zones[region];
      if (!existing) {
        zones[region] = { severity: c.severity, concerns: [label] };
        return;
      }
      existing.concerns.push(label);
      /* A zone shows its worst concern — understating severity would be
         the more harmful error here. */
      if (SEVERITY_RANK[c.severity] > SEVERITY_RANK[existing.severity]) {
        existing.severity = c.severity;
      }
    });
  });
  return zones;
};

export const FaceConcernMap: React.FC<{ concerns: ConcernItem[] }> = ({ concerns }) => {
  const zones = buildZoneMap(concerns);
  const hits = Object.entries(zones);

  /* The face box occupies this area of the 200x260 viewBox. */
  const FX = 30;
  const FY = 18;
  const FW = 140;
  const FH = 210;

  return (
    <div className="sv-facemap">
      <svg viewBox="0 0 200 260" className="sv-facemap-svg" role="img"
        aria-label={
          hits.length
            ? `Face map: concerns found in ${hits.map(([r]) => REGION_LABELS[r]).join(", ")}`
            : "Face map: no concerns localised to a specific zone"
        }
      >
        {/* Face silhouette */}
        <ellipse cx="100" cy="120" rx="70" ry="100" className="sv-face-shape" />
        {/* Highlighted zones, drawn from the ML service's own boxes */}
        {hits.map(([region, hit]) => {
          const [x0, y0, x1, y1] = REGION_BOXES[region];
          return (
            <rect
              key={region}
              x={FX + x0 * FW}
              y={FY + y0 * FH}
              width={(x1 - x0) * FW}
              height={(y1 - y0) * FH}
              rx="10"
              className="sv-face-zone"
              style={{ fill: SEVERITY_COLOR[hit.severity] }}
            >
              <title>{`${REGION_LABELS[region]}: ${hit.concerns.join(", ")}`}</title>
            </rect>
          );
        })}
        {/* Simple features so the silhouette reads as a face */}
        <circle cx="76" cy="105" r="4" className="sv-face-feature" />
        <circle cx="124" cy="105" r="4" className="sv-face-feature" />
        <path d="M86 165 Q100 174 114 165" className="sv-face-feature-line" />
      </svg>

      {hits.length > 0 ? (
        <ul className="sv-facemap-legend">
          {hits.map(([region, hit]) => (
            <li key={region}>
              <span
                className="sv-legend-dot"
                style={{ background: SEVERITY_COLOR[hit.severity] }}
                aria-hidden
              />
              <span className="sv-legend-zone">{REGION_LABELS[region]}</span>
              <span className="sv-legend-concerns">{hit.concerns.join(" · ")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sv-facemap-empty">
          Nothing localised to a specific zone — your skin read evenly across the face.
        </p>
      )}
    </div>
  );
};

/* ─── Skin type probability spread ─────────────────────────── */

/** The result card shows only the winning type; this shows how close the
 *  runner-ups were, which matters when confidence is low. */
export const SkinTypeSpread: React.FC<{ skinType: SkinTypeResult }> = ({ skinType }) => {
  const entries = Object.entries(skinType.probs || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;

  return (
    <div className="sv-spread">
      {entries.map(([type, p]) => {
        const pct = Math.round(p * 100);
        const isTop = type === skinType.skin_type;
        return (
          <div key={type} className={`sv-spread-row ${isTop ? "is-top" : ""}`}>
            <span className="sv-spread-label">{type}</span>
            <span className="sv-spread-track">
              <span className="sv-spread-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="sv-spread-pct">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
};
