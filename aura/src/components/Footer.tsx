import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  subscribeNewsletter,
  subscribeGlobalInApp,
  isLoggedIn,
} from "../services/subscription";
import Logo from "./Logo";
import "./Footer.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Deduped and de-linted. What was here before had the same problems as the
 * old quick-access bar:
 *   - "Ingredient Library" pointed at /library, which is NOT a route — it fell
 *     through to NotFound. It is /ingredients.
 *   - "Sustainability" and "Video Rituals" both pointed at "/", i.e. straight
 *     back to the home page.
 *   - "Skin Philosophy" duplicated "Daily Rituals" (/articles), "Trending
 *     Remedies" made it three, "Our Ethos" duplicated "About Us" (/about) and
 *     "Write for Us" duplicated "Contact" (/contact).
 * Thirteen links resolved to seven distinct pages; now each label is one real
 * destination, which also buys back the vertical space this footer was
 * spending on repeats.
 */
const NAV_LINKS = {
  Explore: [
    { label: "Daily Rituals", path: "/articles" },
    { label: "Ingredient Library", path: "/ingredients" },
    { label: "DIY Creator", path: "/diy" },
    { label: "Video Rituals", path: "/reels" },
  ],
  Discover: [
    { label: "AI Skin Guide", path: "/ai" },
    { label: "Browse Categories", path: "/explore" },
    { label: "The Journal", path: "/journal" },
  ],
  Company: [
    { label: "About Us", path: "/about" },
    { label: "Contact", path: "/contact" },
  ],
};

const SOCIALS = [
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Pinterest",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: "Spotify",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
  },
];

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubscribe = async () => {
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Always capture the newsletter signup (works for anonymous visitors).
      const result = await subscribeNewsletter(value);

      // Hybrid: if the visitor is logged in, also create an in-app "global"
      // subscription so they get notified about new posts. Best-effort —
      // a failure here should not block the newsletter success.
      if (isLoggedIn()) {
        try {
          await subscribeGlobalInApp();
        } catch {
          /* ignore — newsletter signup already succeeded */
        }
      }

      setSuccessMsg(result?.message || "You're in the circle!");
      setSubscribed(true);
      setEmail("");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="app-footer-root font-sans w-full text-white overflow-hidden relative">
      {/* Decorative botanical blob */}
      <div className="app-footer-leaf app-footer-leaf-1" />

      {/* ─────────────────────────────────────
          BAND 1 — Newsletter, as a single horizontal strip.

          It briefly ran as a tall stacked hero with a botanical photo card,
          which pushed the footer past 1000px. Same editorial voice, laid on
          one line: pitch left, field right. The photo is gone — the pages
          above the footer are already full of imagery, and it was buying
          decoration with ~250px of height.
      ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="min-w-0">
            <p className="app-footer-kicker">The Weekly Digest</p>
            <h2 className="app-footer-headline">
              Rituals, delivered{" "}
              <span className="app-footer-headline-accent">to your inbox.</span>
            </h2>
          </div>

          <div className="flex-none w-full md:w-auto">
            {subscribed ? (
              <div className="app-footer-nl-success">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="flex-shrink-0"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="font-semibold text-[13px]">
                  {successMsg || "You're in the circle! 🌿"}
                </p>
              </div>
            ) : (
              <>
                <div className="app-footer-nl-field">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && handleSubscribe()
                    }
                    placeholder="your@email.com"
                    disabled={loading}
                    className="app-footer-nl-input"
                  />
                  <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="app-footer-nl-btn"
                    style={
                      loading ? { opacity: 0.6, cursor: "wait" } : undefined
                    }
                  >
                    {loading ? "…" : "Join"}
                  </button>
                </div>
                {error && (
                  <p className="text-[12px] text-[#ffb4a8] mt-2">{error}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <hr className="app-footer-divider" />
      </div>

      {/* ─────────────────────────────────────
          BAND 2 — Brand + link columns
      ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8 pb-6">
        {/* grid-cols-2 on phones: three link lists stacked full-width made the
            mobile footer ~1330px tall. Two-up halves that; the brand block
            spans both so it still reads as the header of the group. */}
        <div className="grid gap-8 grid-cols-2 md:gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand + socials */}
          <div className="col-span-2 md:col-span-1">
            <Logo
              tone="dark"
              tagline
              className="mb-4"
              onClick={() => navigate("/")}
            />
            <p className="text-[rgba(255,255,255,0.4)] text-[0.85rem] leading-[1.65] max-w-[240px] mb-5">
              Natural rituals rooted in tradition, guided by science.
            </p>
            <div className="flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  aria-label={s.name}
                  className="app-footer-social-btn"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(NAV_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="app-footer-col-head">{heading}</p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <span
                      className="app-footer-link"
                      onClick={() => navigate(link.path)}
                    >
                      {link.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <hr className="app-footer-divider" />
      </div>

      {/* ─────────────────────────────────────
          BOTTOM: Legal + Copyright
      ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[rgba(255,255,255,0.3)] tracking-[0.06em]">
            © {new Date().getFullYear()} Aura &amp; Earth · Crafted with
            Intention
          </p>

          <div className="flex items-center gap-5">
            {["Privacy", "Terms", "Cookies"].map((item, i, arr) => (
              <React.Fragment key={item}>
                <span className="cursor-pointer transition-colors duration-200 text-[11px] text-[rgba(255,255,255,0.3)] tracking-[0.05em] hover:text-[rgba(154,212,183,0.85)]">
                  {item}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-[rgba(255,255,255,0.1)] text-[10px]">
                    ·
                  </span>
                )}
              </React.Fragment>
            ))}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="app-footer-social-btn app-footer-social-btn--sm"
              title="Back to top"
              aria-label="Back to top"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
