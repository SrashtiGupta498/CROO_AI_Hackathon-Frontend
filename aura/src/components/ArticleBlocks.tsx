/* ============================================================
   ArticleBlocks — renderers for the recipe / reference section
   types that live in the post data but had no UI before:
   ingredients, instructions, benefits, notes, source, tip,
   warning, faq, textless hero, and reel embeds.

   These shapes come from the production content (1086 posts):
     ingredients  → { title, items: [{ name, amount, note? }] }
     instructions → { title, steps: string[] }
     benefits/notes/source/tip/warning/faq → { title, body }
     hero         → { title, subtitle }  (often with NO image)

   Legacy bodies are plain text with \n\n paragraph breaks;
   admin-authored ones are HTML from the editor. renderBody()
   handles both.
   ============================================================ */

import React from "react";
import {
  Leaf,
  ListOrdered,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  NotebookPen,
  HelpCircle,
  ChevronDown,
  Play,
} from "lucide-react";
import "./ArticleBlocks.css";
import { sanitizeHtml } from "../utils/sanitize";

export interface ArticleSectionData {
  type?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  author?: string;
  image?: string;
  images?: string[];
  caption?: string;
  videoUrl?: string;
  reelId?: string;
  items?: { name?: string; amount?: string; note?: string }[];
  steps?: string[];
  order?: number;
}

/* ─── Body rendering ───────────────────────────────────────── */

const looksLikeHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

/** Renders a section body that may be either HTML or plain text with
 *  blank-line paragraph breaks. */
const Body: React.FC<{ text: string }> = ({ text }) => {
  if (looksLikeHtml(text)) {
    return (
      <div
        className="ab-body"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
      />
    );
  }
  return (
    <div className="ab-body">
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  );
};

/* ─── Shared shell ─────────────────────────────────────────── */

const Block: React.FC<{
  variant?: string;
  icon: React.ReactNode;
  title: string;
  chip?: string;
  children: React.ReactNode;
}> = ({ variant = "", icon, title, chip, children }) => (
  <section className={`ab-block ${variant}`}>
    <header className="ab-head">
      <span className="ab-head-icon" aria-hidden>
        {icon}
      </span>
      <h3 className="ab-head-title">{title}</h3>
      {chip && <span className="ab-chip">{chip}</span>}
    </header>
    {children}
  </section>
);

/* ─── Ingredients — the per-post ingredient library ────────── */

export const IngredientsBlock: React.FC<{ section: ArticleSectionData }> = ({
  section,
}) => {
  const items = (section.items || []).filter((i) => i && (i.name || i.amount));
  if (!items.length) return null;

  return (
    <Block
      variant="ab-ingredients"
      icon={<Leaf size={20} />}
      title={section.title || "Ingredients"}
      chip={`${items.length} item${items.length === 1 ? "" : "s"}`}
    >
      <ul className="ab-ing-list">
        {items.map((item, i) => (
          <li key={i} className="ab-ing-item">
            <span className="ab-ing-dot" aria-hidden />
            <span className="ab-ing-name">
              {item.name}
              {item.note && <span className="ab-ing-note">{item.note}</span>}
            </span>
            {item.amount && (
              <span className="ab-ing-amount">{item.amount}</span>
            )}
          </li>
        ))}
      </ul>
    </Block>
  );
};

/* ─── Instructions ─────────────────────────────────────────── */

export const InstructionsBlock: React.FC<{ section: ArticleSectionData }> = ({
  section,
}) => {
  const steps = (section.steps || [])
    .map((s) => (s || "").trim())
    .filter(Boolean);
  if (!steps.length) return null;

  return (
    <Block
      variant=""
      icon={<ListOrdered size={20} />}
      title={section.title || "Directions"}
      chip={`${steps.length} step${steps.length === 1 ? "" : "s"}`}
    >
      <ol className="ab-steps">
        {steps.map((step, i) => (
          <li key={i} className="ab-step">
            {/* The visible numeral is a CSS counter; it is decorative
                because <ol> already announces position to screen readers. */}
            <span className="ab-step-num" aria-hidden />
            <span className="ab-step-text">{step}</span>
          </li>
        ))}
      </ol>
    </Block>
  );
};

/* ─── Benefits / Tip / Warning / Notes ─────────────────────── */

export const BenefitsBlock: React.FC<{ section: ArticleSectionData }> = ({
  section,
}) =>
  section.body?.trim() ? (
    <Block
      variant="ab-benefits"
      icon={<Sparkles size={20} />}
      title={section.title || "Why It Works"}
    >
      <Body text={section.body} />
    </Block>
  ) : null;

export const TipBlock: React.FC<{ section: ArticleSectionData }> = ({
  section,
}) =>
  section.body?.trim() ? (
    <Block
      variant="ab-tip"
      icon={<Lightbulb size={20} />}
      title={section.title || "Tip"}
    >
      <Body text={section.body} />
    </Block>
  ) : null;

export const WarningBlock: React.FC<{ section: ArticleSectionData }> = ({
  section,
}) =>
  section.body?.trim() ? (
    /* role="note" rather than "alert": this is standing safety copy,
       not something that appeared in response to a user action. */
    <div role="note">
      <Block
        variant="ab-warning"
        icon={<AlertTriangle size={20} />}
        title={section.title || "Caution"}
      >
        <Body text={section.body} />
      </Block>
    </div>
  ) : null;

export const NotesBlock: React.FC<{ section: ArticleSectionData }> = ({
  section,
}) =>
  section.body?.trim() ? (
    <Block
      variant="ab-notes"
      icon={<NotebookPen size={20} />}
      title={section.title || "Notes"}
    >
      <Body text={section.body} />
    </Block>
  ) : null;

/* ─── Source — a citation, deliberately quiet ──────────────── */

export const SourceBlock: React.FC<{ section: ArticleSectionData }> = ({
  section,
}) => {
  const text = section.body?.trim();
  if (!text) return null;
  return (
    <aside className="ab-source">
      <span className="ab-source-label">{section.title || "Source"}</span>
      <p className="ab-source-text">{text}</p>
    </aside>
  );
};

/* ─── FAQ — plain-text "Q: … / A: …" pairs become an accordion ─ */

const parseFaq = (body: string) => {
  const pairs: { q: string; a: string }[] = [];
  body
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .forEach((chunk) => {
      const m = chunk.match(
        /^Q\s*[:.-]\s*([\s\S]*?)\n\s*A\s*[:.-]\s*([\s\S]*)$/i,
      );
      if (m) pairs.push({ q: m[1].trim(), a: m[2].trim() });
    });
  return pairs;
};

export const FaqBlock: React.FC<{ section: ArticleSectionData }> = ({
  section,
}) => {
  const body = section.body?.trim();
  if (!body) return null;
  const pairs = parseFaq(body);

  /* Not in Q/A form (e.g. HTML written in the editor) — fall back to
     rendering it as an ordinary block rather than dropping it. */
  if (!pairs.length) {
    return (
      <Block icon={<HelpCircle size={20} />} title={section.title || "FAQ"}>
        <Body text={body} />
      </Block>
    );
  }

  return (
    <Block
      icon={<HelpCircle size={20} />}
      title={section.title || "FAQ"}
      chip={`${pairs.length} question${pairs.length === 1 ? "" : "s"}`}
    >
      {pairs.map((p, i) => (
        /* <details> gives keyboard + screen-reader behaviour for free. */
        <details key={i} className="ab-faq-item" open={i === 0}>
          <summary className="ab-faq-q">
            {p.q}
            <ChevronDown size={18} className="ab-faq-caret" aria-hidden />
          </summary>
          <div className="ab-faq-a">{p.a}</div>
        </details>
      ))}
    </Block>
  );
};

/* ─── Textless hero — title + subtitle, no image ───────────── */

export const HeroTextBlock: React.FC<{ section: ArticleSectionData }> = ({
  section,
}) => {
  if (!section.title && !section.subtitle) return null;
  return (
    <div className="ab-hero-text">
      {section.title && <h2 className="ab-hero-title">{section.title}</h2>}
      {section.subtitle && <p className="ab-hero-sub">{section.subtitle}</p>}
      <div className="ab-hero-rule" aria-hidden />
    </div>
  );
};

/* ─── Reel embed — references an existing reel post ────────── */

export const ReelBlock: React.FC<{
  section: ArticleSectionData;
  /** Resolves a reel id to its playable source + title. */
  resolveReel?: (
    id: string,
  ) => { src?: string; title?: string; poster?: string } | undefined;
  onOpen?: (id: string) => void;
}> = ({ section, resolveReel, onOpen }) => {
  const id = section.reelId;
  /* A reel section can also carry a direct videoUrl (uploaded rather
     than picked), so fall back to that before giving up. */
  const reel = id && resolveReel ? resolveReel(id) : undefined;
  const src = reel?.src || section.videoUrl;
  if (!src) return null;

  const title = section.title || reel?.title || "Watch the ritual";

  return (
    <Block icon={<Play size={20} />} title="Sample Reel">
      <div className="ab-reel">
        <button
          type="button"
          className="ab-reel-thumb"
          onClick={() => id && onOpen?.(id)}
          aria-label={`Play reel: ${title}`}
        >
          <span className="ab-reel-play" aria-hidden>
            <Play size={20} fill="currentColor" />
          </span>
          <video
            src={src}
            muted
            playsInline
            preload="metadata"
            poster={reel?.poster}
          />
        </button>
        <div className="ab-reel-meta">
          <h4
            className="ab-head-title"
            style={{ fontSize: "1.25rem", fontStyle: "italic" }}
          >
            {title}
          </h4>
          {section.caption && (
            <p className="ab-body" style={{ marginTop: 8 }}>
              {section.caption}
            </p>
          )}
        </div>
      </div>
    </Block>
  );
};
