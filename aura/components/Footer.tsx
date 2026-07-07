import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  subscribeNewsletter,
  subscribeGlobalInApp,
  isLoggedIn,
} from "../services/subscription";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NAV_LINKS = {
  Explore: [
    { label: "Daily Rituals", path: "/articles" },
    { label: "Ingredient Library", path: "/library" },
    { label: "Skin Philosophy", path: "/articles" },
    { label: "DIY Creator", path: "/diy" },
  ],
  Discover: [
    { label: "AI Skin Guide", path: "/ai" },
    { label: "Browse Categories", path: "/explore" },
    { label: "Trending Remedies", path: "/articles" },
    { label: "Video Rituals", path: "/" },
  ],
  Company: [
    { label: "Our Ethos", path: "/" },
    { label: "Sustainability", path: "/" },
    { label: "Write for Us", path: "/" },
    { label: "Contact", path: "/" },
  ],
};

const SOCIALS = [
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    <footer
      style={{
        background: "linear-gradient(160deg, #1e3329 0%, #162820 60%, #0f1f19 100%)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
      className="w-full text-white overflow-hidden relative"
    >
      <style>{`
        @keyframes leafFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.06; }
          50%       { transform: translateY(-18px) rotate(8deg); opacity: 0.1; }
        }
        @keyframes footerFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .footer-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,0.5);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.25s, transform 0.25s;
          text-decoration: none;
        }
        .footer-link:hover {
          color: #A8C5AB;
          transform: translateX(4px);
        }
        .footer-link::before {
          content: '';
          display: block;
          width: 0;
          height: 1px;
          background: #A8C5AB;
          transition: width 0.25s;
          flex-shrink: 0;
        }
        .footer-link:hover::before { width: 12px; }
        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          color: rgba(255,255,255,0.45);
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(8px);
        }
        .social-btn:hover {
          color: white;
          background: #6B8E7A;
          border-color: #6B8E7A;
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(107,142,122,0.4);
        }
        .footer-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.07);
        }
        .nl-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: white;
          border-radius: 16px;
          padding: 14px 20px;
          font-size: 0.9rem;
          flex: 1;
          outline: none;
          transition: border-color 0.25s, background 0.25s;
          font-family: inherit;
        }
        .nl-input::placeholder { color: rgba(255,255,255,0.25); }
        .nl-input:focus {
          border-color: #6B8E7A;
          background: rgba(255,255,255,0.09);
        }
        .nl-btn {
          background: linear-gradient(135deg, #6B8E7A 0%, #4a7060 100%);
          color: white;
          border: none;
          border-radius: 16px;
          padding: 14px 26px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          white-space: nowrap;
          transition: transform 0.25s, box-shadow 0.25s, opacity 0.25s;
          font-family: inherit;
        }
        .nl-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(107,142,122,0.45);
        }
        .brand-logo-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(168,197,171,0.15);
          border: 1px solid rgba(168,197,171,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .leaf-bg {
          position: absolute;
          pointer-events: none;
          animation: leafFloat 8s ease-in-out infinite;
        }
      `}</style>

      {/* Decorative botanical blobs */}
      <div
        className="leaf-bg"
        style={{
          top: "-80px",
          right: "-60px",
          width: "340px",
          height: "340px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #A8C5AB 0%, transparent 70%)",
          opacity: 0.07,
          animationDelay: "0s",
        }}
      />
      <div
        className="leaf-bg"
        style={{
          bottom: "80px",
          left: "-100px",
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #6B8E7A 0%, transparent 70%)",
          opacity: 0.08,
          animationDelay: "4s",
        }}
      />

      {/* ─────────────────────────────────────
          TOP: Big Statement + Newsletter
      ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-12 pb-10">
        <div className="grid lg:grid-cols-2 gap-12 items-end">

          {/* Statement */}
          <div>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{ background: "rgba(168,197,171,0.12)", border: "1px solid rgba(168,197,171,0.2)" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#A8C5AB">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 7-7 7-7 7-7s-14 0-4 10z"/>
              </svg>
              <span style={{ fontSize: "10px", letterSpacing: "0.25em", fontWeight: 700, color: "#A8C5AB", textTransform: "uppercase" }}>
                Est. 2024 • Natural Living
              </span>
            </div>

            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)",
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                fontStyle: "italic",
              }}
            >
              Gentle<br />
              <span style={{ color: "#A8C5AB" }}>by Nature.</span>
            </h2>
            <p
              className="mt-5 leading-relaxed"
              style={{ color: "rgba(255,255,255,0.5)", maxWidth: "400px", fontSize: "0.95rem" }}
            >
              A curated journal at the intersection of botanical wisdom and
              modern skin science. Crafted with intention.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3 mt-7">
              {SOCIALS.map((s) => (
                <a key={s.name} href={s.href} aria-label={s.name} className="social-btn">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <p
              className="mb-2"
              style={{ fontSize: "10px", letterSpacing: "0.32em", fontWeight: 700, textTransform: "uppercase", color: "#6B8E7A" }}
            >
              The Weekly Digest
            </p>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: "12px",
              }}
            >
              Let nature find its way<br />
              <span style={{ color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>to your inbox.</span>
            </h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem", marginBottom: "24px", lineHeight: 1.6 }}>
              Weekly rituals, ingredient deep-dives &amp; expert wisdom. No spam — ever.
            </p>

            {subscribed ? (
              <div
                className="flex items-center gap-3 p-5 rounded-2xl"
                style={{ background: "rgba(107,142,122,0.15)", border: "1px solid rgba(107,142,122,0.35)" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "#6B8E7A" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "#A8C5AB" }}>You're in the circle! 🌿</p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                    {successMsg || "Welcome to the Aura & Earth community."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleSubscribe()}
                    placeholder="your@email.com"
                    disabled={loading}
                    className="nl-input"
                  />
                  <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="nl-btn"
                    style={loading ? { opacity: 0.6, cursor: "wait" } : undefined}
                  >
                    {loading ? "Joining…" : "Join Free"}
                  </button>
                </div>
                {error ? (
                  <p style={{ fontSize: "11px", color: "#ffb4a8", marginTop: "10px" }}>
                    {error}
                  </p>
                ) : (
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "10px" }}>
                    Unsubscribe anytime. We value your peace. 🌸
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <hr className="footer-divider mx-6 md:mx-12" />

      {/* ─────────────────────────────────────
          MIDDLE: Navigation Grid
      ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div
              className="flex items-center gap-3 cursor-pointer mb-6"
              onClick={() => navigate("/")}
            >
              <div className="brand-logo-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8C5AB" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.25rem",
                  fontStyle: "italic",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                Aura &amp; Earth
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", lineHeight: 1.7, maxWidth: "200px" }}>
              Natural rituals for the modern person. Rooted in tradition, guided by science.
            </p>

            {/* Locations */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-6">
              {["London", "New York", "Mumbai"].map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1"
                  style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}
                >
                  <span style={{ color: "#6B8E7A", fontSize: "8px" }}>●</span>
                  {city}
                </span>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(NAV_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.28em",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: "20px",
                }}
              >
                {heading}
              </p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <span
                      className="footer-link"
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

      <hr className="footer-divider mx-6 md:mx-12" />

      {/* ─────────────────────────────────────
          BOTTOM: Legal + Copyright
      ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Copyright */}
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(168,197,171,0.15)" }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#A8C5AB">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
              </svg>
            </div>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
              © {new Date().getFullYear()} Aura &amp; Earth · Crafted with Intention
            </p>
          </div>

          {/* Legal links */}
          <div className="flex items-center gap-6">
            {["Privacy Policy", "Terms of Use", "Accessibility", "Cookies"].map((item, i, arr) => (
              <React.Fragment key={item}>
                <span
                  className="cursor-pointer transition-colors duration-200"
                  style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(168,197,171,0.8)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
                  {item}
                </span>
                {i < arr.length - 1 && (
                  <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "10px" }}>·</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Back to top */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="social-btn"
            title="Back to top"
            style={{ width: "38px", height: "38px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
