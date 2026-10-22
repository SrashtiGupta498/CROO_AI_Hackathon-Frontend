import React from "react";
import "./Logo.css";

/**
 * The Aura & Earth mark and wordmark.
 *
 * Replaces the generic shield glyph that used to sit in the header, footer and
 * mobile drawer — three copies of the same inline SVG, and a shape that reads
 * as "antivirus" rather than botanical skincare.
 *
 * The mark is two ideas in one figure: a leaf (Earth) inside a double ring
 * (the Aura). It is stroke-only and drawn in `currentColor`, so one file works
 * on ivory and on the dark forest surfaces without a second asset — set the
 * colour on the parent and the mark follows.
 */

export const AuraMark: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {/* Aura — the outer halo stays faint so it reads as glow, not as a border.
        It is the first thing to disappear at favicon sizes, by design. */}
    <circle cx="16" cy="16" r="14.4" strokeWidth="1" opacity="0.32" />
    <circle cx="16" cy="16" r="11.6" strokeWidth="1.4" />

    {/* Earth — a single leaf, pointed at both tips (a vesica), sized to sit
        inside the inner ring with breathing room at 18px. */}
    <path d="M16 23.6C11 20.1 11 13.1 16 8.6C21 13.1 21 20.1 16 23.6Z" strokeWidth="1.6" />

    {/* Midrib + two side veins — the detail that keeps it from reading as a
        plain almond shape at display sizes. */}
    <path d="M16 22.6V10.4" strokeWidth="1.2" />
    <path d="M16 18.2L12.9 15.7" strokeWidth="1" opacity="0.75" />
    <path d="M16 14.8L19.1 12.3" strokeWidth="1" opacity="0.75" />
  </svg>
);

type Tone = "light" | "dark";

interface LogoProps {
  /** `light` = for ivory surfaces, `dark` = for the forest header drawer/footer. */
  tone?: Tone;
  /** Hide the wordmark and show the badge alone (tight spaces, avatars). */
  markOnly?: boolean;
  /** Small caps line under the wordmark. Off by default — header has no room. */
  tagline?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const MARK_PX: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 18,
  md: 21,
  lg: 25,
};

export const Logo: React.FC<LogoProps> = ({
  tone = "light",
  markOnly = false,
  tagline = false,
  size = "md",
  className = "",
  onClick,
}) => (
  <div
    className={`ae-logo ae-logo--${tone} ae-logo--${size} ${className}`}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
    aria-label={onClick ? "Aura & Earth — go to home" : undefined}
  >
    <span className="ae-logo__badge">
      <AuraMark size={MARK_PX[size]} />
    </span>

    {!markOnly && (
      <span className="ae-logo__text">
        {/* One lockup everywhere. The header used roman type while the footer
            and drawer were fully italic — same brand, three different faces. */}
        <span className="ae-logo__word">
          Aura <span className="ae-logo__amp">&amp;</span> Earth
        </span>
        {tagline && <span className="ae-logo__tagline">Natural Rituals</span>}
      </span>
    )}
  </div>
);

export default Logo;
