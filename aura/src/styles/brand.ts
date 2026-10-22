/* ============================================================
   BRAND PALETTE (JS) — mirror of the CSS tokens in theme.css.
   Import these instead of re-declaring per-file `ACCENT`/`DARK`
   constants, which is how ArticleEditor drifted to a pink/purple
   palette while the rest of the app stayed sage/cream.

   Only for values that must reach inline `style={{}}` props or
   canvas/SVG APIs. In className/CSS, prefer the tokens themselves
   (`text-sage`, `var(--ae-ink)`) so theming stays in one place.
   Keep in sync with src/styles/theme.css.
   ============================================================ */

export const INK = "#2D2A26";
export const INK_SOFT = "#3D5B4F";
export const SAGE = "#3D5B4F";
export const SAGE_DARK = "#4B695A";
export const SAGE_LIGHT = "#DCE5DD";
export const HERB = "#71816F";       /* olive — fills & borders, not small text */
export const TURMERIC = "#C6A66B";   /* champagne — tiny hints, never shiny     */
export const CLAY = "#c67d63";       /* skin & personalization accent       */
export const SYNTHETIC = "#8a94a6";  /* chemical / synthetic actives — muted, low priority */
export const PAPER = "#FCFAF7";
export const PAPER_2 = "#F6F2EC";
export const SURFACE = "#ffffff";
export const MUTED = "#6D6A65";
export const DANGER = "#b4413c";
export const WARNING = "#c98a3a";

/** Conventional aliases — the names already used across the pages. */
export const ACCENT = SAGE;
export const DARK = INK;
