import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Contact.css";

/* ─── Brand contact details ─── */
const COLLAB_EMAIL = "collaborate@auraandearth.com";
const GENERAL_EMAIL = "hello@auraandearth.com";
const PRESS_EMAIL = "press@auraandearth.com";
const PHONE = "+44 20 7946 0102";
const PHONE_HREF = "+442079460102";

/* Ways to reach us — quick-glance cards */
const CHANNELS = [
  {
    icon: "🤝",
    title: "Collaborations",
    body: "Brand partnerships, sponsored rituals, product features & affiliate work.",
    action: COLLAB_EMAIL,
    href: `mailto:${COLLAB_EMAIL}`,
  },
  {
    icon: "✍️",
    title: "Write for Us",
    body: "Pitch a story, become a contributor, or share your botanical expertise.",
    action: "editorial@auraandearth.com",
    href: "mailto:editorial@auraandearth.com",
  },
  {
    icon: "📣",
    title: "Press & Media",
    body: "Interviews, media kits, quotes and everything for the press.",
    action: PRESS_EMAIL,
    href: `mailto:${PRESS_EMAIL}`,
  },
  {
    icon: "💬",
    title: "General Enquiries",
    body: "Questions, feedback, or just want to say a gentle hello.",
    action: GENERAL_EMAIL,
    href: `mailto:${GENERAL_EMAIL}`,
  },
];

/* Types of collaboration we love */
const COLLAB_TYPES = [
  "Brand Partnerships",
  "Sponsored Content",
  "Product Reviews",
  "Guest Articles",
  "Affiliate Programs",
  "Ingredient Sourcing",
  "Events & Workshops",
  "Ambassador Program",
];

/* Studio locations */
const LOCATIONS = [
  {
    city: "London",
    tag: "HQ",
    lines: ["42 Botanic Row, Shoreditch", "London, EC2A 4RH", "United Kingdom"],
  },
  {
    city: "New York",
    tag: "Studio",
    lines: ["18 Greene Street, SoHo", "New York, NY 10013", "United States"],
  },
  {
    city: "Mumbai",
    tag: "Studio",
    lines: ["7 Turner Road, Bandra West", "Mumbai, 400050", "India"],
  },
];

const SOCIALS = [
  { name: "Instagram", handle: "@auraandearth", href: "#" },
  { name: "Pinterest", handle: "Aura & Earth", href: "#" },
  { name: "YouTube", handle: "Aura & Earth", href: "#" },
  { name: "Spotify", handle: "The Ritual", href: "#" },
];

const TOPICS = [
  "Brand Partnership",
  "Sponsored Content",
  "Guest Contribution",
  "Press / Media",
  "Affiliate Program",
  "Something Else",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    topic: TOPICS[0],
    budget: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Please tell us your name.";
    if (!EMAIL_RE.test(form.email.trim()))
      next.email = "A valid email helps us reply.";
    if (form.message.trim().length < 10)
      next.message = "A little more detail, please (min. 10 characters).";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const subject = `[${form.topic}] Collaboration enquiry from ${form.name}`;
    const body = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      form.company ? `Company / Brand: ${form.company}` : "",
      `Topic: ${form.topic}`,
      form.budget ? `Budget / Timeline: ${form.budget}` : "",
      "",
      "Message:",
      form.message,
    ]
      .filter(Boolean)
      .join("\n");

    // Honest handoff: opens the visitor's own mail client, pre-filled.
    window.location.href = `mailto:${COLLAB_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="contact-root">
      {/* ─── Hero ─── */}
      <section className="contact-hero">
        <div className="contact-orb contact-orb-1" />
        <div className="contact-orb contact-orb-2" />
        <div className="contact-hero-inner">
          <span className="contact-eyebrow">Let's Collaborate</span>
          <h1 className="contact-title">
            Great things grow
            <br />
            <span className="contact-title-accent">when we grow together.</span>
          </h1>
          <p className="contact-lede">
            Whether you're a brand rooted in clean beauty, a writer with a story
            to tell, or a fellow believer in botanical living — we'd love to
            hear from you. Reach out and let's create something intentional.
          </p>
          <div className="contact-hero-actions">
            <a href={`mailto:${COLLAB_EMAIL}`} className="contact-btn contact-btn--primary">
              Email the team
            </a>
            <a href="#contact-form" className="contact-btn contact-btn--ghost">
              Start a project
            </a>
          </div>
        </div>
      </section>

      {/* ─── Channels ─── */}
      <section className="contact-section">
        <p className="contact-section-eyebrow">How can we help?</p>
        <h2 className="contact-section-title">Pick the right door</h2>
        <div className="contact-channels-grid">
          {CHANNELS.map((c) => (
            <a key={c.title} href={c.href} className="contact-channel-card">
              <span className="contact-channel-icon">{c.icon}</span>
              <h3 className="contact-channel-title">{c.title}</h3>
              <p className="contact-channel-body">{c.body}</p>
              <span className="contact-channel-action">{c.action} →</span>
            </a>
          ))}
        </div>
      </section>

      {/* ─── Form + sidebar ─── */}
      <section className="contact-section contact-form-section" id="contact-form">
        <div className="contact-form-wrap">
          {/* Form */}
          <form className="contact-form-card" onSubmit={handleSubmit} noValidate>
            <p className="contact-section-eyebrow">Start a conversation</p>
            <h2 className="contact-form-title">Tell us about your idea</h2>

            <div className="contact-field-row">
              <label className="contact-field">
                <span className="contact-label">Your name *</span>
                <input
                  className={`contact-input ${errors.name ? "is-error" : ""}`}
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Jane Doe"
                />
                {errors.name && <span className="contact-err">{errors.name}</span>}
              </label>
              <label className="contact-field">
                <span className="contact-label">Email *</span>
                <input
                  className={`contact-input ${errors.email ? "is-error" : ""}`}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@brand.com"
                  type="email"
                />
                {errors.email && <span className="contact-err">{errors.email}</span>}
              </label>
            </div>

            <div className="contact-field-row">
              <label className="contact-field">
                <span className="contact-label">Company / Brand</span>
                <input
                  className="contact-input"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label className="contact-field">
                <span className="contact-label">Topic</span>
                <select
                  className="contact-input"
                  value={form.topic}
                  onChange={(e) => update("topic", e.target.value)}
                >
                  {TOPICS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="contact-field">
              <span className="contact-label">Budget / Timeline</span>
              <input
                className="contact-input"
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
                placeholder="Optional — e.g. £2–5k, launching in Q3"
              />
            </label>

            <label className="contact-field">
              <span className="contact-label">Message *</span>
              <textarea
                className={`contact-input contact-textarea ${
                  errors.message ? "is-error" : ""
                }`}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Tell us what you have in mind — the more detail, the better."
                rows={5}
              />
              {errors.message && (
                <span className="contact-err">{errors.message}</span>
              )}
            </label>

            <button type="submit" className="contact-btn contact-btn--primary contact-submit">
              Send message
            </button>
            <p className="contact-form-note">
              This opens your email app with everything pre-filled — or write us
              directly at{" "}
              <a href={`mailto:${COLLAB_EMAIL}`}>{COLLAB_EMAIL}</a>. We usually
              reply within 2 business days.
            </p>
          </form>

          {/* Sidebar */}
          <aside className="contact-sidebar">
            <div className="contact-info-block">
              <h4 className="contact-info-heading">Reach us directly</h4>
              <ul className="contact-info-list">
                <li>
                  <span className="contact-info-key">Collaborate</span>
                  <a href={`mailto:${COLLAB_EMAIL}`}>{COLLAB_EMAIL}</a>
                </li>
                <li>
                  <span className="contact-info-key">General</span>
                  <a href={`mailto:${GENERAL_EMAIL}`}>{GENERAL_EMAIL}</a>
                </li>
                <li>
                  <span className="contact-info-key">Press</span>
                  <a href={`mailto:${PRESS_EMAIL}`}>{PRESS_EMAIL}</a>
                </li>
                <li>
                  <span className="contact-info-key">Phone</span>
                  <a href={`tel:${PHONE_HREF}`}>{PHONE}</a>
                </li>
              </ul>
            </div>

            <div className="contact-info-block">
              <h4 className="contact-info-heading">Hours</h4>
              <p className="contact-info-text">
                Mon – Fri · 9:00 – 18:00 (GMT)
                <br />
                Weekends: we're touching grass 🌿
              </p>
            </div>

            <div className="contact-info-block">
              <h4 className="contact-info-heading">Follow along</h4>
              <ul className="contact-social-list">
                {SOCIALS.map((s) => (
                  <li key={s.name}>
                    <a href={s.href}>
                      <span className="contact-social-name">{s.name}</span>
                      <span className="contact-social-handle">{s.handle}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* ─── Collaboration types ─── */}
      <section className="contact-section">
        <p className="contact-section-eyebrow">Ways to work together</p>
        <h2 className="contact-section-title">What we love to collaborate on</h2>
        <div className="contact-tags">
          {COLLAB_TYPES.map((t) => (
            <span key={t} className="contact-tag">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ─── Locations ─── */}
      <section className="contact-section">
        <p className="contact-section-eyebrow">Find us</p>
        <h2 className="contact-section-title">Our studios</h2>
        <div className="contact-locations-grid">
          {LOCATIONS.map((loc) => (
            <div key={loc.city} className="contact-location-card">
              <div className="contact-location-head">
                <span className="contact-location-city">{loc.city}</span>
                <span className="contact-location-tag">{loc.tag}</span>
              </div>
              <address className="contact-location-address">
                {loc.lines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </address>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Closing CTA ─── */}
      <section className="contact-cta">
        <div className="contact-cta-card">
          <div className="contact-orb contact-orb-3" />
          <h2 className="contact-cta-title">Not sure where to start?</h2>
          <p className="contact-cta-body">
            Send us a note and we'll point you to the right person. Every good
            partnership begins with a simple hello.
          </p>
          <div className="contact-cta-actions">
            <a href={`mailto:${GENERAL_EMAIL}`} className="contact-btn contact-btn--primary">
              Say hello
            </a>
            <button
              className="contact-btn contact-btn--ghost"
              onClick={() => navigate("/about")}
            >
              Learn about us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
