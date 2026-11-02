/**
 * Combines the measured shine read with the user's own intake answers into a
 * short, honest context line — e.g. "you're not using a routine yet, which
 * can let oil build up." This is NOT a new classification signal: it never
 * overrides or adjusts `skin_type`/`shine_level`, it only explains a plausible
 * reason for the measured number using what the user told us. Returns null
 * whenever there's nothing defensible to say — no forced correlation.
 */
import { SkinTypeResult } from "./skinAnalysis";
import { SkinIntake } from "../data/skinIntake";

export function buildSkinContext(
  skinType: SkinTypeResult | null | undefined,
  intake: SkinIntake | null | undefined,
): string | null {
  if (!skinType || skinType.basis !== "measurement") return null;

  const products = intake?.products;
  if (typeof products !== "string") return null;

  const level = skinType.shine_level;

  if ((level === "high" || level === "very_high") && products === "nothing") {
    return "You mentioned you're not using a regular routine yet — unmanaged natural oil can build up over the day, which may be part of what this measured.";
  }
  if ((level === "high" || level === "very_high") && products === "actives") {
    return "You're already using actives — shine at this level is more likely your skin's natural oil production than your routine.";
  }
  if (level === "low" && products === "actives") {
    return "Actives (acids/retinol) can dry skin out — this low-shine reading may partly reflect that rather than your natural baseline.";
  }

  return null;
}
