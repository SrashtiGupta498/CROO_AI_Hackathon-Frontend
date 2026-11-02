import React from "react";
import { useNavigate } from "react-router-dom";
import "./About.css";

/* ─── Static content ─── */
const VALUES = [
  {
    icon: "🌿",
    title: "Botanical First",
    body: "We start with what the earth already offers — plant oils, botanical extracts, and time-honored rituals — then let modern science refine them.",
  },
  {
    icon: "🔬",
    title: "Grounded in Science",
    body: "Every remedy and routine we publish is checked against dermatological evidence, not trends. Wisdom, backed by research.",
  },
  {
    icon: "🤍",
    title: "Gentle by Default",
    body: "Skin is the largest organ you have. We favor slow, consistent, low-irritation care over aggressive quick fixes.",
  },
  {
    icon: "♻️",
    title: "Made to Last",
    body: "Sustainable sourcing, minimal waste, and honest guidance. Beauty that respects both your skin and the planet.",
  },
];

const STATS = [
  { value: "500+", label: "Rituals & Remedies" },
  { value: "120+", label: "Ingredients Decoded" },
  { value: "50k+", label: "Community Members" },
  { value: "2024", label: "Rooted Since" },
];

const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="about-root">
      {/* ─── Hero ─── */}
      <section className="about-hero">
        <div className="about-hero-orb about-hero-orb-1" />
        <div className="about-hero-orb about-hero-orb-2" />
        <div className="about-hero-inner">
          <span className="about-eyebrow">Our Story</span>
          <h1 className="about-title">
            Where botanical wisdom
            <br />
            <span className="about-title-accent">
              meets modern skin science.
            </span>
          </h1>
          <p className="about-lede">
            Aura &amp; Earth is a curated journal for people who believe
            skincare should be intentional, natural, and rooted in real
            understanding — not marketing. We translate centuries of botanical
            tradition into rituals you can actually trust.
          </p>
        </div>
      </section>

      {/* ─── Mission ─── */}
      <section className="about-section about-mission">
        <p className="about-section-eyebrow">Why we exist</p>
        <h2 className="about-section-title">
          Skincare got loud. We wanted it to make sense again.
        </h2>
        <p className="about-mission-body">
          The internet is full of miracle claims, ten-step routines, and
          ingredients no one can pronounce. We built Aura &amp; Earth to cut
          through the noise — pairing the calm of nature with the clarity of
          science, so your skin gets what it genuinely needs. No hype. No
          gatekeeping. Just honest, beautiful guidance.
        </p>
      </section>

      {/* ─── Values ─── */}
      <section className="about-section">
        <p className="about-section-eyebrow">What we stand for</p>
        <h2 className="about-section-title">Our guiding principles</h2>
        <div className="about-values-grid">
          {VALUES.map((v) => (
            <div key={v.title} className="about-value-card">
              <span className="about-value-icon">{v.icon}</span>
              <h3 className="about-value-title">{v.title}</h3>
              <p className="about-value-body">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="about-stats">
        {STATS.map((s) => (
          <div key={s.label} className="about-stat">
            <p className="about-stat-value">{s.value}</p>
            <p className="about-stat-label">{s.label}</p>
          </div>
        ))}
      </section>

      {/* ─── CTA ─── */}
      <section className="about-cta">
        <div className="about-cta-card">
          <h2 className="about-cta-title">Ready to build your ritual?</h2>
          <p className="about-cta-body">
            Let our AI Skin Guide read your skin and craft a routine made just
            for you — grounded in the same philosophy you just read about.
          </p>
          <div className="about-cta-actions">
            <button
              className="about-cta-btn about-cta-btn--primary"
              onClick={() => navigate("/ai")}
            >
              Start AI Analysis
            </button>
            <button
              className="about-cta-btn about-cta-btn--ghost"
              onClick={() => navigate("/explore")}
            >
              Explore Rituals
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
