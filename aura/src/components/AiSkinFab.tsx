import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import "./AiSkinFab.css";

/**
 * Floating entry point to the AI skin analysis.
 *
 * Lives once at the app root rather than being repeated per article, so the
 * offer is reachable from anywhere without every article template carrying its
 * own copy of the CTA.
 *
 * Deliberately hidden on the AI flow itself (pointing at the page you're
 * already on is noise) and on the auth screens, where a floating action would
 * compete with the form.
 *
 * Desktop-only: below the `lg` breakpoint the bottom Navigation is on screen and
 * already offers this destination as its raised centre button, so the FAB is
 * hidden there (see AiSkinFab.css). It is still rendered — the CSS does the
 * hiding — so keep visibility assertions breakpoint-aware.
 */

/* Routes that already are the destination, or where a floating CTA intrudes. */
const HIDDEN_ON = [
  "/ai",
  "/login",
  "/signup",
  "/forgotpassword",
  "/resetpassword",
  "/google",
];

const AiSkinFab: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(false);

  const path = pathname.toLowerCase();
  const hidden = HIDDEN_ON.some((p) => path === p || path.startsWith(`${p}/`));

  /* Reels is a full-screen snap-scroll surface with its own bottom controls —
     the FAB would sit on top of them. */
  const overlaps = path.startsWith("/reels");

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  if (hidden || overlaps) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/ai")}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      data-testid="ai-skin-fab"
      aria-label="Start AI skin analysis"
      className={`ai-skin-fab${expanded ? " is-expanded" : ""}`}
    >
      <Sparkles size={18} className="ai-skin-fab-icon" aria-hidden="true" />
      <span className="ai-skin-fab-label">Analyse my skin</span>
    </button>
  );
};

export default AiSkinFab;
