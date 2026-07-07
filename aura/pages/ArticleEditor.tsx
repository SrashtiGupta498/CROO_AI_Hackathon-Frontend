import React, { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { fetchCategories, fetchSubCategories } from "../store/categories/categories.action";
import { GeminiService } from "../services/geminiService";
import { uploadImageFiles, uploadMediaFile, toAbsoluteUrl } from "../services/uploadImage";
import { PostCover } from "../components/PostCover";

// Read a category's id whether the backend returned `_id` or the slice's `id`.
const catId = (c: any): string => String(c?._id || c?.id || "");

/* ═══════ TYPES ═══════ */
type SectionType =
  | "text"
  | "image"
  | "quote"
  | "divider"
  | "callout"
  | "hero"
  | "intro";

interface ContentSection {
  type: SectionType;
  body?: string;
  images?: string[];
  title?: string;
  subtitle?: string;
  image?: string;
  order: number;
}

interface ArticleAIMetadata {
  summary?: string;
  highlights?: string[];
  keyTakeaways?: string[];
  steps?: {
    stepLabel?: string;
    title?: string;
    body?: string;
  }[];
}

interface Article {
  _id: string;
  title: string;
  subtitle: string;
  description?: string;
  thumbnail?: string;
  sections: ContentSection[];
  ai?: ArticleAIMetadata;
  [key: string]: any;
}

/* ═══════ CONSTANTS ═══════ */
const ACCENT = "#D773A9";
const DARK = "#2F2744";

/* ═══════ ICONS ═══════ */
const BoldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
  </svg>
);
const ItalicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
  </svg>
);
const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" />
  </svg>
);
const QuoteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
  </svg>
);
const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
  </svg>
);
const ImageIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);
const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const PlusIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const EyeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EditIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const SplitIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);
const ArrowUpIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const ArrowDownIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);
const DividerIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);
const CalloutIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const HeadingIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M6 4v16M18 4v16M6 12h12" />
  </svg>
);
const HighlightIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="m9 11-6 6v3h9l3-3" />
    <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
  </svg>
);

const stripHtml = (value: string = "") => {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeAIMetadata = (raw: any = {}): ArticleAIMetadata => ({
  summary: typeof raw?.summary === "string" ? raw.summary.trim() : "",
  highlights: Array.isArray(raw?.highlights)
    ? raw.highlights.map((item: any) => String(item).trim()).filter(Boolean)
    : [],
  keyTakeaways: Array.isArray(raw?.keyTakeaways)
    ? raw.keyTakeaways.map((item: any) => String(item).trim()).filter(Boolean)
    : [],
  steps: Array.isArray(raw?.steps)
    ? raw.steps
        .map((step: any) => ({
          stepLabel:
            typeof step?.stepLabel === "string"
              ? step.stepLabel.trim()
              : `STEP ${(Math.floor(Math.random() * 99) + 1)
                  .toString()
                  .padStart(2, "0")}`,
          title:
            typeof step?.title === "string" && step.title.trim().length > 0
              ? step.title.trim()
              : "Step",
          body:
            typeof step?.body === "string"
              ? step.body.trim()
              : String(step?.body || "").trim(),
        }))
        .filter((step) => step.body.length > 0)
    : [],
});

const isTextSectionType = (type: string | undefined) => {
  const normalized = (type || "").toLowerCase();
  return normalized === "text" || normalized === "intro";
};

const inferStepsFromParagraphs = (paragraphs: string[]) => {
  const regex =
    /^(?:\s*(?:\d+\s*|step\s*\d+\s*|first|then|next)\s*[:.\-]?\s*)(.+)/i;
  const parsed: { stepLabel: string; title: string; body: string }[] = [];

  paragraphs.forEach((paragraph) => {
    if (parsed.length >= 3) return;
    const match = paragraph.match(regex);
    if (match && match[1]?.trim()) {
      parsed.push({
        stepLabel: `STEP ${(parsed.length + 1).toString().padStart(2, "0")}`,
        title: match[1].slice(0, 60).trim(),
        body: paragraph,
      });
      return;
    }
    if (paragraph.length > 36) {
      parsed.push({
        stepLabel: `STEP ${(parsed.length + 1).toString().padStart(2, "0")}`,
        title: `Step ${parsed.length + 1}`,
        body: paragraph,
      });
    }
  });

  return parsed.slice(0, 3);
};

const buildAiMetadataFromArticle = (
  article: Pick<Article, "title" | "subtitle" | "sections" | "ai">,
): ArticleAIMetadata => {
  const textSections = (article.sections || [])
    .filter((section) => isTextSectionType(section.type))
    .map((section) => stripHtml(section.body || ""))
    .filter(Boolean);
  const normalized = normalizeAIMetadata(article.ai);

  return {
    summary:
      normalized.summary ||
      textSections[0] ||
      `${article.title}${article.subtitle ? ` — ${article.subtitle}` : ""}`,
    highlights:
      normalized.highlights.length > 0
        ? normalized.highlights.slice(0, 4)
        : textSections
            .slice(1)
            .map((p) => p.slice(0, 150))
            .slice(0, 4),
    keyTakeaways:
      normalized.keyTakeaways.length > 0
        ? normalized.keyTakeaways.slice(0, 6)
        : textSections.slice(1, 7),
    steps:
      normalized.steps.length > 0
        ? normalized.steps.slice(0, 3)
        : inferStepsFromParagraphs(textSections),
  };
};

const inferAiMetadataFromText = (
  rawText: string,
  fallbackTitle: string,
): ArticleAIMetadata => {
  const cleanText = rawText
    .replace(/<[^>]*>/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  const paragraphs = cleanText
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return {
    summary:
      paragraphs[0] ||
      `${fallbackTitle || "Editorial guide"} built from your original content.`,
    highlights: paragraphs.slice(0, 3),
    keyTakeaways: paragraphs.slice(1, 7),
    steps: inferStepsFromParagraphs(paragraphs),
  };
};

const getCoverSectionImages = (article: Article): string[] => {
  if (!Array.isArray(article.sections)) return [];
  return article.sections.flatMap((section) => {
    const sectionType = String(section.type || "").toLowerCase();
    if (sectionType === "hero" && typeof section.image === "string") {
      const img = section.image.trim();
      return img ? [img] : [];
    }

    if (Array.isArray(section.images)) {
      return section.images
        .map((img) => (typeof img === "string" ? img.trim() : ""))
        .filter((img) => img.length > 0);
    }

    return [];
  });
};

const heuristicSplitContent = (rawText: string): ArticleAIMetadata => {
  const cleanText = rawText
    .replace(/<[^>]*>/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  const paragraphs = cleanText
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return normalizeAIMetadata({
    summary: paragraphs[0] || "Editorial guide generated from provided text.",
    highlights: paragraphs.slice(0, 3).map((p) => p.slice(0, 150)),
    keyTakeaways: paragraphs.slice(1, 7),
    steps: inferStepsFromParagraphs(paragraphs),
  });
};

/* ═══════ RICH TEXT EDITOR ═══════ */
// Curated swatches — highlight (background) and text colours.
const HIGHLIGHT_COLORS: { name: string; value: string }[] = [
  { name: "Mint", value: "#E6F0EA" },
  { name: "Blush", value: "#FCE4EF" },
  { name: "Butter", value: "#FFF3C4" },
  { name: "Peach", value: "#FFE0D2" },
  { name: "Lavender", value: "#EADCF8" },
  { name: "Sky", value: "#D9ECFF" },
  { name: "Leaf", value: "#D8F5D8" },
  { name: "Rose", value: "#FAD1DD" },
];

const TEXT_COLORS: { name: string; value: string }[] = [
  { name: "Ink", value: "#2F2744" },
  { name: "Accent", value: "#D773A9" },
  { name: "Sage", value: "#6B8E7A" },
  { name: "Rose", value: "#C2466B" },
  { name: "Amber", value: "#B8860B" },
  { name: "Ocean", value: "#3B6FB8" },
  { name: "Plum", value: "#7A3B8E" },
  { name: "Slate", value: "#6B6478" },
];

// Small inline glyphs used by the rich-text toolbar.
const UnderlineGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <line x1="4" y1="20" x2="20" y2="20" />
  </svg>
);
const StrikeGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="12" x2="20" y2="12" />
    <path d="M7 7a4 3 0 0 1 4-2h2a4 3 0 0 1 4 3M7 17a4 3 0 0 0 4 2h2a4 3 0 0 0 4-3" />
  </svg>
);
const OrderedListGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="10" y1="18" x2="20" y2="18" />
    <path d="M4 6h1v4M4 10h2M4.5 16.5a1 1 0 0 1 1.5.8c0 .7-1.5 1.2-1.5 1.7H6" />
  </svg>
);
const TextColorGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18 11 6h2l5 12" />
    <line x1="8" y1="14" x2="16" y2="14" />
  </svg>
);
const AlignLeftGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="18" y2="18" />
  </svg>
);
const AlignCenterGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="5" y1="18" x2="19" y2="18" />
  </svg>
);
const ClearFormatGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7V5h13v2M9.5 5 7 19M14 14l6 6M20 14l-6 6" />
  </svg>
);

/*
 * RichTextEditor
 * A lightweight execCommand-based editor with an expanded toolbar:
 * headings, bold/italic/underline/strike, bullet + numbered lists,
 * a text-colour picker, a multi-colour highlight picker, quote, link,
 * alignment and clear-formatting. Used by every text-bearing block
 * (intro, paragraph, quote, callout).
 */
const RichTextEditor: React.FC<{
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  variant?: "default" | "quote" | "callout";
}> = ({ value, onChange, placeholder, variant = "default" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [openPicker, setOpenPicker] = useState<null | "text" | "highlight">(null);

  const sync = useCallback(() => {
    onChange(ref.current?.innerHTML || "");
  }, [onChange]);

  const exec = useCallback(
    (cmd: string, val?: string) => {
      ref.current?.focus();
      // Emit inline CSS styles (spans) so colours/highlights survive in the
      // stored HTML and render identically in the preview & published view.
      try {
        document.execCommand("styleWithCSS", false, "true");
      } catch {
        /* not supported everywhere — safe to ignore */
      }
      document.execCommand(cmd, false, val);
      sync();
    },
    [sync],
  );

  const applyHighlight = useCallback(
    (color: string | null) => {
      ref.current?.focus();
      try {
        document.execCommand("styleWithCSS", false, "true");
      } catch {
        /* ignore */
      }
      // hiliteColor is the standard; fall back to backColor for older engines.
      const ok = document.execCommand("hiliteColor", false, color || "transparent");
      if (!ok) document.execCommand("backColor", false, color || "transparent");
      sync();
      setOpenPicker(null);
    },
    [sync],
  );

  const applyTextColor = useCallback(
    (color: string) => {
      exec("foreColor", color);
      setOpenPicker(null);
    },
    [exec],
  );

  const Btn: React.FC<{
    title: string;
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
  }> = ({ title, onClick, active, children }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        minWidth: "32px",
        height: "32px",
        padding: "0 6px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "rgba(215,115,169,0.14)" : "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? ACCENT : "rgba(47,39,68,0.55)",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(215,115,169,0.1)";
        e.currentTarget.style.color = ACCENT;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active
          ? "rgba(215,115,169,0.14)"
          : "transparent";
        e.currentTarget.style.color = active ? ACCENT : "rgba(47,39,68,0.55)";
      }}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <span
      style={{
        width: "1px",
        height: "20px",
        background: "rgba(0,0,0,0.08)",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );

  const minHeight =
    variant === "callout" ? "70px" : variant === "quote" ? "90px" : "120px";

  return (
    <div
      style={{
        borderRadius: "18px",
        overflow: "visible",
        border: "1px solid rgba(0,0,0,0.08)",
        background: "white",
        position: "relative",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1px",
          padding: "8px 10px",
          background: "rgba(215,115,169,0.04)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          borderTopLeftRadius: "18px",
          borderTopRightRadius: "18px",
          position: "relative",
        }}
      >
        {/* Block format */}
        <select
          title="Text style"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            exec("formatBlock", e.target.value);
            e.target.selectedIndex = 0;
          }}
          defaultValue=""
          style={{
            height: "32px",
            borderRadius: "8px",
            border: "1px solid rgba(0,0,0,0.08)",
            background: "white",
            color: "rgba(47,39,68,0.7)",
            fontSize: "12px",
            fontWeight: 700,
            padding: "0 6px",
            cursor: "pointer",
            marginRight: "4px",
            fontFamily: "inherit",
          }}
        >
          <option value="" disabled>
            Style
          </option>
          <option value="P">Paragraph</option>
          <option value="H2">Heading</option>
          <option value="H3">Subheading</option>
        </select>

        <Divider />

        <Btn title="Bold" onClick={() => exec("bold")}>
          <BoldIcon />
        </Btn>
        <Btn title="Italic" onClick={() => exec("italic")}>
          <ItalicIcon />
        </Btn>
        <Btn title="Underline" onClick={() => exec("underline")}>
          <UnderlineGlyph />
        </Btn>
        <Btn title="Strikethrough" onClick={() => exec("strikeThrough")}>
          <StrikeGlyph />
        </Btn>

        <Divider />

        {/* Text colour */}
        <div style={{ position: "relative" }}>
          <Btn
            title="Text colour"
            active={openPicker === "text"}
            onClick={() =>
              setOpenPicker(openPicker === "text" ? null : "text")
            }
          >
            <TextColorGlyph />
          </Btn>
          {openPicker === "text" && (
            <ColorPopover
              label="Text colour"
              colors={TEXT_COLORS}
              onPick={applyTextColor}
              swatchStyle="solid"
            />
          )}
        </div>

        {/* Highlight colour */}
        <div style={{ position: "relative" }}>
          <Btn
            title="Highlight"
            active={openPicker === "highlight"}
            onClick={() =>
              setOpenPicker(openPicker === "highlight" ? null : "highlight")
            }
          >
            <HighlightIcon />
          </Btn>
          {openPicker === "highlight" && (
            <ColorPopover
              label="Highlight"
              colors={HIGHLIGHT_COLORS}
              onPick={(c) => applyHighlight(c)}
              onClear={() => applyHighlight(null)}
              swatchStyle="fill"
            />
          )}
        </div>

        <Divider />

        <Btn title="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <ListIcon />
        </Btn>
        <Btn title="Numbered list" onClick={() => exec("insertOrderedList")}>
          <OrderedListGlyph />
        </Btn>

        <Divider />

        <Btn title="Quote" onClick={() => exec("formatBlock", "blockquote")}>
          <QuoteIcon />
        </Btn>
        <Btn
          title="Insert link"
          onClick={() => {
            const url = prompt("Enter URL:");
            if (url) exec("createLink", url);
          }}
        >
          <LinkIcon />
        </Btn>

        <Divider />

        <Btn title="Align left" onClick={() => exec("justifyLeft")}>
          <AlignLeftGlyph />
        </Btn>
        <Btn title="Align center" onClick={() => exec("justifyCenter")}>
          <AlignCenterGlyph />
        </Btn>
        <Btn title="Clear formatting" onClick={() => exec("removeFormat")}>
          <ClearFormatGlyph />
        </Btn>
      </div>

      {/* Editable */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="rich-content"
        data-placeholder={placeholder || "Start writing..."}
        style={{
          minHeight,
          padding: "16px 20px",
          outline: "none",
          fontSize: variant === "quote" ? "1.1rem" : "15px",
          fontStyle: variant === "quote" ? "italic" : "normal",
          fontFamily:
            variant === "quote"
              ? "'Playfair Display', serif"
              : "'Plus Jakarta Sans', sans-serif",
          lineHeight: 1.8,
          color: DARK,
        }}
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={sync}
        onBlur={sync}
      />
    </div>
  );
};

// Reusable colour popover for the toolbar pickers.
const ColorPopover: React.FC<{
  label: string;
  colors: { name: string; value: string }[];
  onPick: (color: string) => void;
  onClear?: () => void;
  swatchStyle: "solid" | "fill";
}> = ({ label, colors, onPick, onClear, swatchStyle }) => (
  <div
    onMouseDown={(e) => e.preventDefault()}
    style={{
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      zIndex: 40,
      background: "white",
      borderRadius: "14px",
      boxShadow: "0 12px 36px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)",
      padding: "10px",
      width: "168px",
    }}
  >
    <p
      style={{
        fontSize: "9px",
        fontWeight: 800,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: ACCENT,
        margin: "2px 2px 8px",
      }}
    >
      {label}
    </p>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "6px",
      }}
    >
      {colors.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.name}
          onClick={() => onPick(c.value)}
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            borderRadius: "8px",
            border: "1px solid rgba(0,0,0,0.08)",
            cursor: "pointer",
            background: c.value,
            fontSize: "13px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {swatchStyle === "solid" ? (
            <span style={{ color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
              A
            </span>
          ) : null}
        </button>
      ))}
    </div>
    {onClear && (
      <button
        type="button"
        onClick={onClear}
        style={{
          marginTop: "8px",
          width: "100%",
          padding: "7px",
          borderRadius: "8px",
          border: "1px dashed rgba(0,0,0,0.15)",
          background: "transparent",
          cursor: "pointer",
          fontSize: "11px",
          fontWeight: 700,
          color: "rgba(47,39,68,0.6)",
          fontFamily: "inherit",
        }}
      >
        ✕ Remove highlight
      </button>
    )}
  </div>
);

/* ═══════ LIVE PREVIEW COMPONENT ═══════ */
const LivePreview: React.FC<{ data: Article }> = ({ data }) => {
  const heroImages = getCoverSectionImages(data);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const activeIndex =
    heroImages.length > 0 ? activeHeroIndex % heroImages.length : 0;

  return (
    <article
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        maxWidth: "760px",
        margin: "0 auto",
        background: "#fff",
        border: "1px solid rgba(47,39,68,0.08)",
        borderRadius: "22px",
        padding: "28px 28px 36px",
        boxShadow: "0 20px 45px rgba(47,39,68,0.08)",
        color: "rgba(47,39,68,0.92)",
      }}
    >
      {/* Hero thumbnail */}
      {heroImages.length > 0 ? (
        <div
          style={{
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "32px",
            height: "260px",
            background: "rgba(215,115,169,0.08)",
          }}
        >
          <img
            src={toAbsoluteUrl(heroImages[activeIndex])}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {heroImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActiveHeroIndex(
                    (prev) =>
                      (prev - 1 + heroImages.length) % heroImages.length,
                  )
                }
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  borderRadius: "999px",
                  width: "30px",
                  height: "30px",
                  background: "rgba(255,255,255,0.8)",
                  color: DARK,
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 700,
                }}
              >
                {"<"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveHeroIndex((prev) => (prev + 1) % heroImages.length)
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  borderRadius: "999px",
                  width: "30px",
                  height: "30px",
                  background: "rgba(255,255,255,0.8)",
                  color: DARK,
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 700,
                }}
              >
                {">"}
              </button>
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: "6px",
                }}
              >
                {heroImages.map((_, idx) => (
                  <span
                    key={heroImages[idx] + idx}
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "999px",
                      background:
                        idx === activeIndex ? "#fff" : "rgba(255,255,255,0.55)",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : data.thumbnail ? (
        <div
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "32px",
            height: "260px",
          }}
        >
          <img
            src={toAbsoluteUrl(data.thumbnail || "")}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : null}

      {/* Title */}
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(2rem, 4vw, 3rem)",
          fontWeight: 700,
          fontStyle: "italic",
          lineHeight: 1.15,
          color: DARK,
          marginBottom: "12px",
          letterSpacing: "-0.01em",
        }}
      >
        {data.title || "Your article title..."}
      </h1>

      {/* Subtitle */}
      {data.subtitle && (
        <p
          style={{
            fontSize: "1.05rem",
            color: "rgba(47,39,68,0.5)",
            lineHeight: 1.6,
            marginBottom: "20px",
            fontStyle: "italic",
          }}
        >
          {data.subtitle}
        </p>
      )}

      {/* Meta bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          paddingBottom: "24px",
          borderBottom: "1px solid rgba(47,39,68,0.12)",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${ACCENT}, #B85D8D)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: DARK,
              letterSpacing: "0.01em",
            }}
          >
            Aura &amp; Earth
          </p>
          <p style={{ fontSize: "11px", color: "rgba(47,39,68,0.4)" }}>
            Just now ·{" "}
            {Math.max(1, Math.ceil((data.sections?.length || 1) * 1.5))} min
            read
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {["♥", "🔖", "↗"].map((e, i) => (
            <div
              key={i}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(215,115,169,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {e}
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      {data.sections?.map((s, i) => (
        <div key={i} style={{ marginBottom: "30px" }}>
          {s.type === "hero" && (
            <div
              style={{
                borderRadius: "20px",
                overflow: "hidden",
                border: "1px solid rgba(47,39,68,0.08)",
                background: "white",
              }}
            >
              {s.image || (s.images && s.images[0]) ? (
                <img
                  src={toAbsoluteUrl(s.image || (s.images ? s.images[0] : ""))}
                  alt={s.title || "Hero image"}
                  style={{
                    width: "100%",
                    display: "block",
                    maxHeight: "360px",
                    objectFit: "cover",
                  }}
                />
              ) : null}
              <div style={{ padding: "16px 20px" }}>
                {(s.title || s.subtitle) && (
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "'Playfair Display', serif",
                      color: DARK,
                      fontSize: "1.5rem",
                      lineHeight: 1.25,
                      marginBottom: s.subtitle ? "8px" : "0",
                    }}
                  >
                    {s.title}
                  </h2>
                )}
                {s.subtitle && (
                  <p
                    style={{
                      margin: 0,
                      fontStyle: "italic",
                      color: "rgba(47,39,68,0.68)",
                    }}
                  >
                    {s.subtitle}
                  </p>
                )}
              </div>
            </div>
          )}

          {s.type === "text" && s.body && (
            <div
              className="rich-content"
              dangerouslySetInnerHTML={{ __html: s.body }}
              style={{
                fontSize: "16px",
                lineHeight: 1.9,
                color: "rgba(47,39,68,0.8)",
              }}
            />
          )}

          {s.type === "intro" && s.body && (
            <div
              className="rich-content"
              dangerouslySetInnerHTML={{ __html: s.body }}
              style={{
                fontSize: "16px",
                lineHeight: 1.9,
                color: "rgba(47,39,68,0.88)",
                background: "rgba(215,115,169,0.05)",
                padding: "18px 20px",
                borderRadius: "16px",
                border: "1px solid rgba(215,115,169,0.18)",
              }}
            />
          )}

          {s.type === "quote" && s.body && (
            <div
              style={{
                position: "relative",
                padding: "28px 32px",
                margin: "24px 0",
                background: "rgba(215,115,169,0.06)",
                borderRadius: "20px",
                borderLeft: `4px solid ${ACCENT}`,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "18px",
                  fontSize: "3rem",
                  color: "rgba(215,115,169,0.15)",
                  lineHeight: 1,
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                "
              </span>
              <blockquote
                className="rich-content"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.45rem",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  color: DARK,
                }}
                dangerouslySetInnerHTML={{ __html: s.body }}
              />
            </div>
          )}

          {s.type === "callout" && s.body && (
            <div
              style={{
                padding: "20px 24px",
                margin: "16px 0",
                background:
                  "linear-gradient(135deg, rgba(215,115,169,0.08), rgba(215,115,169,0.04))",
                borderRadius: "16px",
                border: "1px solid rgba(215,115,169,0.15)",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "18px", marginTop: "2px" }}>💡</span>
              <div
                className="rich-content"
                style={{ fontSize: "14px", color: DARK, lineHeight: 1.65 }}
                dangerouslySetInnerHTML={{ __html: s.body }}
              />
            </div>
          )}

          {s.type === "divider" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                margin: "24px 0",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "rgba(215,115,169,0.15)",
                }}
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={ACCENT}
                strokeWidth="1.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "rgba(215,115,169,0.15)",
                }}
              />
            </div>
          )}

          {s.type === "image" &&
            s.images?.map((img, j) => (
              <div
                key={j}
                style={{
                  borderRadius: "18px",
                  overflow: "hidden",
                  margin: "16px 0",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                }}
              >
                <img
                  src={toAbsoluteUrl(img)}
                  alt=""
                  style={{ width: "100%", display: "block" }}
                />
              </div>
            ))}
        </div>
      ))}

      {/* End mark */}
      <div
        style={{
          textAlign: "center",
          padding: "32px 0",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          marginTop: "20px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.3em",
            color: "rgba(47,39,68,0.25)",
            textTransform: "uppercase",
          }}
        >
          End of Article ✿
        </span>
      </div>
    </article>
  );
};

/* ═══════ MAIN EDITOR COMPONENT ═══════ */
export const ArticleEditor = ({
  article,
  onSave,
  onCancel,
}: {
  article: Article;
  onSave?: (a: Article) => void;
  onCancel?: () => void;
}) => {
  const [data, setData] = useState<Article>({
    ...article,
    // Backend stores the cover as `thumbnailUrl`; the editor uses `thumbnail`.
    thumbnail: article.thumbnail || (article as any).thumbnailUrl || "",
    // Normalize taxonomy to id strings (the backend may return populated objects).
    categoryId:
      typeof (article as any).categoryId === "object"
        ? catId((article as any).categoryId)
        : (article as any).categoryId || "",
    subCategories: Array.isArray((article as any).subCategories)
      ? (article as any).subCategories.map((s: any) =>
          typeof s === "object" ? catId(s) : String(s),
        )
      : [],
    sections: article.sections || [],
    ai: normalizeAIMetadata(article.ai),
  });

  /* ── Categories & subcategories (assign taxonomy to the post) ── */
  const dispatch = useDispatch<AppDispatch>();
  const { categories = [], subByParent = {} } = useSelector(
    (state: RootState) => (state as any).category || {},
  );

  // Load top-level categories once.
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const selectedCategoryId: string = (data as any).categoryId || "";
  const selectedSubs: string[] = (data as any).subCategories || [];
  const subOptions: any[] = subByParent[selectedCategoryId] || [];

  // Load this category's subcategories whenever the selected category changes.
  useEffect(() => {
    if (selectedCategoryId) dispatch(fetchSubCategories(selectedCategoryId));
  }, [dispatch, selectedCategoryId]);

  const onSelectCategory = (id: string) => {
    // Changing the parent clears subcategories that no longer apply.
    setData((prev) => ({ ...prev, categoryId: id, subCategories: [] } as any));
  };

  const toggleSubCategory = (id: string) => {
    setData((prev) => {
      const current: string[] = (prev as any).subCategories || [];
      const next = current.includes(id)
        ? current.filter((s) => s !== id)
        : [...current, id];
      return { ...prev, subCategories: next } as any;
    });
  };
  const [viewMode, setViewMode] = useState<"split" | "edit" | "preview">(
    "split",
  );
  const [saving, setSaving] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  // Result popup shown after pressing Publish/Save (success or failure).
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showAutoStructureModal, setShowAutoStructureModal] = useState(false);
  const [autoStructureLoading, setAutoStructureLoading] = useState(false);
  const [autoStructureError, setAutoStructureError] = useState("");
  const [autoStructureInput, setAutoStructureInput] = useState("");
  const [autoStructureEngine, setAutoStructureEngine] = useState<
    "ai" | "heuristic"
  >("ai");
  const [autoStructureSource, setAutoStructureSource] = useState<
    "current" | "custom"
  >("current");
  const [editorCoverIndex, setEditorCoverIndex] = useState(0);
  const sectionHeroImages = getCoverSectionImages(data);
  const safeEditorCoverIndex = sectionHeroImages.length
    ? editorCoverIndex % sectionHeroImages.length
    : 0;
  const editorCoverImage =
    sectionHeroImages[safeEditorCoverIndex] || data.thumbnail || "";

  const updateField = (key: keyof Article, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const updateSection = (
    index: number,
    key: keyof ContentSection,
    value: any,
  ) => {
    const updated = [...data.sections];
    updated[index] = { ...updated[index], [key]: value };
    setData({ ...data, sections: updated });
  };

  /* ── Image uploads from the user's device ── */
  // Tracks which section index is currently uploading, to show a busy state.
  const [uploadingSection, setUploadingSection] = useState<Record<number, boolean>>(
    {},
  );
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Cover/thumbnail: upload an image OR a short video from the device.
  const handleThumbnailUpload = async (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    setUploadingThumbnail(true);
    try {
      const { url } = await uploadMediaFile(fileList[0]);
      if (url) updateField("thumbnail", url);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Upload failed.");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Hero block: upload a single image and store it on `image`.
  const handleHeroFileUpload = async (
    index: number,
    fileList: FileList | null,
  ) => {
    if (!fileList || !fileList.length) return;
    setUploadingSection((prev) => ({ ...prev, [index]: true }));
    try {
      const [url] = await uploadImageFiles([fileList[0]]);
      if (url) updateSection(index, "image", url);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Image upload failed.");
    } finally {
      setUploadingSection((prev) => ({ ...prev, [index]: false }));
    }
  };

  // Image block: upload one or more images and append them to `images`.
  const handleSectionFilesUpload = async (
    index: number,
    fileList: FileList | null,
  ) => {
    if (!fileList || !fileList.length) return;
    setUploadingSection((prev) => ({ ...prev, [index]: true }));
    try {
      const urls = await uploadImageFiles(Array.from(fileList));
      const existing = data.sections[index]?.images || [];
      updateSection(index, "images", [...existing, ...urls]);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Image upload failed.");
    } finally {
      setUploadingSection((prev) => ({ ...prev, [index]: false }));
    }
  };

  const addSection = (type: SectionType) => {
    const baseOrder = data.sections.length + 1;
    const emptySection: ContentSection = { type, body: "", order: baseOrder };

    if (type === "hero") {
      setData({
        ...data,
        sections: [
          ...data.sections,
          {
            ...emptySection,
            title: data.title,
            subtitle: data.subtitle,
            image: "",
            images: [],
          },
        ],
      });
      setShowBlockPicker(false);
      return;
    }

    setData({
      ...data,
      sections: [
        ...data.sections,
        {
          ...emptySection,
          images: type === "image" ? [] : emptySection.images,
        },
      ],
    });
    setShowBlockPicker(false);
  };

  const removeSection = (index: number) => {
    setData({ ...data, sections: data.sections.filter((_, i) => i !== index) });
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const sections = [...data.sections];
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    [sections[index], sections[newIdx]] = [sections[newIdx], sections[index]];
    setData({ ...data, sections });
  };

  /* ── AI metadata (TL;DR, highlights, steps, takeaways) editing ── */
  const updateAi = (key: keyof ArticleAIMetadata, value: any) => {
    setData((prev) => ({
      ...prev,
      ai: { ...(prev.ai || {}), [key]: value },
    }));
  };

  const updateAiStep = (
    index: number,
    key: "stepLabel" | "title" | "body",
    value: string,
  ) => {
    const steps = [...(data.ai?.steps || [])];
    steps[index] = { ...steps[index], [key]: value };
    updateAi("steps", steps);
  };

  const addAiStep = () => {
    const steps = [...(data.ai?.steps || [])];
    steps.push({
      stepLabel: `STEP ${(steps.length + 1).toString().padStart(2, "0")}`,
      title: "",
      body: "",
    });
    updateAi("steps", steps);
  };

  const removeAiStep = (index: number) => {
    updateAi(
      "steps",
      (data.ai?.steps || []).filter((_, i) => i !== index),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const {
        id,
        createdAt,
        updatedAt,
        schemaVersion,
        stats,
        publishedAt,
        ...payload
      } = data as any;

      // Taxonomy — send category as an id string and subcategories as id[].
      const normalizedCategoryId =
        typeof payload.categoryId === "object"
          ? catId(payload.categoryId)
          : payload.categoryId;
      if (normalizedCategoryId) {
        payload.categoryId = normalizedCategoryId;
      } else {
        // Empty string fails @IsMongoId — omit it entirely when unset.
        delete payload.categoryId;
      }
      payload.subCategories = Array.isArray(payload.subCategories)
        ? payload.subCategories.map((s: any) =>
            typeof s === "object" ? catId(s) : String(s),
          )
        : [];
      // Persist the AI metadata exactly as edited (so clearing the TL;DR or a
      // step actually removes it) rather than re-deriving it from the body.
      const computedAi = normalizeAIMetadata(data.ai);
      payload.ai = computedAi;
      if ("ritualTemplate" in payload) {
        delete payload.ritualTemplate;
      }
      // The backend schema field is `thumbnailUrl`; the editor uses `thumbnail`.
      // Map it over and drop the unknown `thumbnail` prop (whitelist rejects it).
      if ("thumbnail" in payload) {
        if (payload.thumbnail) payload.thumbnailUrl = payload.thumbnail;
        delete payload.thumbnail;
      }
      // Strip client-side ids the backend schema doesn't accept (Mongo owns _id)
      if (Array.isArray(payload.sections)) {
        payload.sections = payload.sections.map(({ id, _id, ...section }: any) => section);
      }
      if (payload.seo && typeof payload.seo === "object") {
        const { id: _seoId, _id: _seoMongoId, ...seo } = payload.seo;
        payload.seo = seo;
      }
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (!currentUser?.AccessToken) {
        setSaveResult({ ok: false, msg: "You're not logged in — please log in and try again." });
        return;
      }
      await axios.put(`http://localhost:3002/v1/posts/update/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${currentUser?.AccessToken}`,
        },
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      setSaveResult({ ok: true, msg: "Post updated successfully." });
      onSave?.({ ...data, ai: computedAi });
    } catch (err: any) {
      console.error(err);
      const backendMsg = err?.response?.data?.message;
      setSaveResult({
        ok: false,
        msg:
          (Array.isArray(backendMsg) ? backendMsg.join(", ") : backendMsg) ||
          "Could not update the post. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  /* Run Auto-Structure algorithm */
  const runAutoStructure = async () => {
    if (!autoStructureInput.trim()) return;
    setAutoStructureLoading(true);
    setAutoStructureError("");

    try {
      if (autoStructureEngine === "ai") {
        const gemini = new GeminiService();
        const systemInstruction =
          "You are an expert content architect for holistic skincare journalism. Return compact metadata JSON only, with no additional commentary, notes, or markdown formatting.";

        const prompt = `
You are given the following article title, subtitle, and raw content.
Read it fully, identify main ideas and process-like segments, then derive compact metadata for a dynamic editorial renderer.

Article Title: "${data.title}"
Article Subtitle: "${data.subtitle}"
Raw Content:
${autoStructureInput}

You MUST return a JSON object with this compact metadata interface only. Do not return any other text, markdown blocks (like \`\`\`json), or explanations. Return valid JSON only:
{
  "summary": "A short one- or two-sentence editorial summary.",
  "highlights": [
    "Compact highlight sentence 1",
    "Compact highlight sentence 2"
  ],
  "keyTakeaways": [
    "Takeaway sentence 1",
    "Takeaway sentence 2",
    "Takeaway sentence 3"
  ],
  "steps": [
    {
      "stepLabel": "STEP 01",
      "title": "Step title",
      "body": "Step body as a compact instruction."
    }
  ]
}`;

        const responseText = await gemini.generateCustomContent(
          prompt,
          systemInstruction,
        );
        // Clean JSON response (strip markdown blocks if AI accidentally included them)
        const cleanedJson = responseText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        const parsed = JSON.parse(cleanedJson);
        setData((prev) => ({ ...prev, ai: normalizeAIMetadata(parsed) }));
        setShowAutoStructureModal(false);
      } else {
        // Run heuristic offline splitter
        const structuredData = inferAiMetadataFromText(
          autoStructureInput,
          `${data.title}${data.subtitle ? ` — ${data.subtitle}` : ""}`,
        );
        setData((prev) => ({
          ...prev,
          ai: normalizeAIMetadata(structuredData),
        }));
        setShowAutoStructureModal(false);
      }
    } catch (err: any) {
      console.error(err);
      setAutoStructureError(
        "Could not auto-structure using AI. Please verify API key is set, or try the offline 'Heuristic' engine option.",
      );
    } finally {
      setAutoStructureLoading(false);
    }
  };

  const BLOCK_TYPES: {
    type: SectionType;
    icon: React.ReactNode;
    label: string;
    desc: string;
  }[] = [
    {
      type: "hero",
      icon: <HeadingIcon />,
      label: "Hero",
      desc: "Add a lead image with title and subtitle",
    },
    {
      type: "text",
      icon: <BoldIcon />,
      label: "Paragraph",
      desc: "Rich text block",
    },
    { type: "image", icon: <ImageIcon />, label: "Image", desc: "Add a photo" },
    {
      type: "quote",
      icon: <QuoteIcon />,
      label: "Quote",
      desc: "Standout blockquote",
    },
    {
      type: "callout",
      icon: <CalloutIcon />,
      label: "Callout",
      desc: "Highlight info",
    },
    {
      type: "divider",
      icon: <DividerIcon />,
      label: "Divider",
      desc: "Visual separator",
    },
    {
      type: "intro",
      icon: <BoldIcon />,
      label: "Intro",
      desc: "Top intro block",
    },
  ];
  const SECTION_LABELS: Record<SectionType, string> = {
    text: "Paragraph",
    hero: "Hero",
    intro: "Intro",
    image: "Image",
    quote: "Quote",
    callout: "Callout",
    divider: "Divider",
  };

  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        minHeight: "100vh",
        background:
          "linear-gradient(165deg, #fff8fd 0%, #ffeef9 35%, #f6effc 75%, #f5f7ff 100%)",
      }}
    >
      <style>{`
        @keyframes editorFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes savedPulse {
          0%   { transform: scale(0.9); opacity: 0; }
          40%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .editor-section {
          animation: editorFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
          position: relative;
        }
        .editor-section:hover .section-controls { opacity: 1; }
        .section-controls {
          opacity: 0;
          transition: opacity 0.2s;
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 4px;
          z-index: 5;
        }
        .ctrl-btn {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: white; border: 1px solid rgba(0,0,0,0.1);
          cursor: pointer; color: rgba(47,39,68,0.5);
          transition: all 0.15s; font-size: 12px;
        }
        .ctrl-btn:hover { color: #cf4444; border-color: #cf444444; background: #fff5f5; }
        .ctrl-btn.move:hover { color: ${ACCENT}; border-color: ${ACCENT}44; background: rgba(215,115,169,0.06); }
        .mode-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 12px;
          font-size: 12px; font-weight: 700;
          cursor: pointer; border: 1px solid transparent;
          transition: all 0.2s;
          font-family: inherit;
        }
        .mode-btn.active {
          background: linear-gradient(135deg, ${DARK}, #7f3f73);
          color: white;
          box-shadow: 0 6px 18px rgba(47,39,68,0.2);
          border-color: transparent;
        }
        .mode-btn.inactive {
          background: rgba(255,255,255,0.75);
          color: rgba(47,39,68,0.5);
        }
        .mode-btn.inactive:hover {
          color: ${DARK};
          border-color: rgba(47,39,68,0.16);
          background: rgba(47,39,68,0.08);
        }
        .preview-edit-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 12px;
          border: 1px solid rgba(47,39,68,0.14);
          background: rgba(255,255,255,0.92);
          color: ${DARK};
          cursor: pointer;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.02em;
          transition: all 0.2s;
          font-family: inherit;
        }
        .preview-edit-btn:hover {
          border-color: ${ACCENT};
          color: ${ACCENT};
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(215,115,169,0.18);
        }
        .block-option {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px; border-radius: 14px;
          cursor: pointer; border: none; width: 100%;
          text-align: left; background: transparent;
          transition: background 0.15s;
          font-family: inherit;
        }
        .block-option:hover { background: rgba(215,115,169,0.06); }
        .preview-pane::-webkit-scrollbar { width: 4px; }
        .preview-pane::-webkit-scrollbar-track { background: transparent; }
        .preview-pane::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .editor-pane::-webkit-scrollbar { width: 4px; }
        .editor-pane::-webkit-scrollbar-track { background: transparent; }
        .editor-pane::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: rgba(47,39,68,0.25);
          pointer-events: none;
        }
        .rich-content h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 0.75rem; color: ${DARK}; font-style: italic; }
        .rich-content h3 { font-family: 'Playfair Display', serif; font-size: 1.2rem; margin-top: 1.25rem; margin-bottom: 0.5rem; color: ${DARK}; font-style: italic; }
        .rich-content ul { padding-left: 1.5rem; list-style-type: disc; margin: 1rem 0; }
        .rich-content ol { padding-left: 1.5rem; list-style-type: decimal; margin: 1rem 0; }
        .rich-content li { margin-bottom: 0.5rem; }
        .rich-content p { margin-bottom: 1rem; }
        .rich-content a { color: ${ACCENT}; text-decoration: underline; }
        .rich-content u { text-decoration: underline; }
        .rich-content s, .rich-content strike { text-decoration: line-through; }
        .rich-content mark { padding: 0 2px; border-radius: 3px; }
        .rich-content blockquote { border-left: 3px solid rgba(215,115,169,0.4); padding-left: 1rem; margin: 1rem 0; font-style: italic; color: rgba(47,39,68,0.85); }
      `}</style>

      {/* ═══════ TOP BAR ═══════ */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,248,253,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          padding: "12px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "1500px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyBetween: "space-between",
            justifyContent: "space-between",
          }}
        >
          {/* Left */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {onCancel && (
              <button
                onClick={onCancel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "10px",
                  background: "rgba(47,39,68,0.06)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "rgba(47,39,68,0.6)",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(47,39,68,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(47,39,68,0.06)";
                }}
              >
                ← Back
              </button>
            )}
            <div>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: DARK,
                  letterSpacing: "-0.01em",
                }}
              >
                ✍️ Article Studio
              </h2>
              <p
                style={{
                  fontSize: "10px",
                  color: "rgba(47,39,68,0.4)",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                {data.sections.length} block
                {data.sections.length !== 1 ? "s" : ""} · Auto-saved
              </p>
            </div>
          </div>

          {/* Center — View Mode */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              background: "rgba(47,39,68,0.05)",
              borderRadius: "12px",
              padding: "3px",
            }}
          >
            <button
              className={`mode-btn ${
                viewMode === "edit" ? "active" : "inactive"
              }`}
              onClick={() => setViewMode("edit")}
            >
              <EditIcon /> Edit
            </button>
            <button
              className={`mode-btn ${
                viewMode === "split" ? "active" : "inactive"
              }`}
              onClick={() => setViewMode("split")}
            >
              <SplitIcon /> Split
            </button>
            <button
              className={`mode-btn ${
                viewMode === "preview" ? "active" : "inactive"
              }`}
              onClick={() => setViewMode("preview")}
            >
              <EyeIcon /> Preview
            </button>
          </div>

          {/* Right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              position: "relative",
            }}
          >
            {/* Saved flash */}
            {savedFlash && (
              <span
                style={{
                  position: "absolute",
                  right: "130px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: ACCENT,
                  animation: "savedPulse 2s ease both",
                }}
              >
                ✓ Saved!
              </span>
            )}

            {/* Publish/Save result popup — clearly says updated or not */}
            {saveResult && (
              <div
                onClick={() => setSaveResult(null)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 1000,
                  background: "rgba(20,12,30,0.45)",
                  backdropFilter: "blur(3px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "white",
                    borderRadius: "20px",
                    padding: "28px 28px 22px",
                    width: "min(92vw, 380px)",
                    textAlign: "center",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "999px",
                      margin: "0 auto 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "26px",
                      background: saveResult.ok
                        ? "rgba(107,142,122,0.15)"
                        : "rgba(207,68,68,0.12)",
                    }}
                  >
                    {saveResult.ok ? "✓" : "⚠️"}
                  </div>
                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      color: saveResult.ok ? "#3f7d5c" : "#cf4444",
                      marginBottom: "6px",
                    }}
                  >
                    {saveResult.ok ? "Post Updated" : "Update Failed"}
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "rgba(47,39,68,0.65)",
                      lineHeight: 1.5,
                      marginBottom: "18px",
                    }}
                  >
                    {saveResult.msg}
                  </p>
                  <button
                    onClick={() => setSaveResult(null)}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "12px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "13px",
                      fontFamily: "inherit",
                      color: "white",
                      background: saveResult.ok ? "#6B8E7A" : "#cf4444",
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowAutoStructureModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(47,39,68,0.16)",
                background: "rgba(47,39,68,0.08)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
                fontFamily: "inherit",
                color: DARK,
              }}
            >
              AI Metadata
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 26px",
                borderRadius: "12px",
                background: saving
                  ? "rgba(215,115,169,0.5)"
                  : `linear-gradient(135deg, ${ACCENT} 0%, #B85D8D 100%)`,
                color: "white",
                border: "none",
                cursor: saving ? "wait" : "pointer",
                fontSize: "13px",
                fontWeight: 700,
                fontFamily: "inherit",
                boxShadow: "0 6px 20px rgba(215,115,169,0.35)",
                transition: "all 0.2s",
                letterSpacing: "0.02em",
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 28px rgba(215,115,169,0.45)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(215,115,169,0.35)";
              }}
            >
              {saving ? "Saving..." : "Publish ✨"}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 65px)",
          overflow: "hidden",
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        {/* ── EDITOR PANE ── */}
        {viewMode !== "preview" && (
          <div
            className="editor-pane"
            style={{
              flex: viewMode === "split" ? "1 1 50%" : "1 1 100%",
              overflowY: "auto",
              padding: "32px 24px",
              borderRight:
                viewMode === "split" ? "1px solid rgba(0,0,0,0.07)" : "none",
            }}
          >
            <div style={{ maxWidth: "680px", margin: "0 auto" }}>
              {/* Thumbnail uploader */}
              <div
                style={{
                  borderRadius: "20px",
                  overflow: "hidden",
                  marginBottom: "28px",
                  height: "200px",
                  background: editorCoverImage
                    ? "none"
                    : "linear-gradient(135deg, rgba(215,115,169,0.08), rgba(215,115,169,0.04))",
                  border: editorCoverImage
                    ? "none"
                    : "2px dashed rgba(215,115,169,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                }}
                onClick={() => {
                  if (!uploadingThumbnail) thumbnailInputRef.current?.click();
                }}
              >
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    handleThumbnailUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
                {editorCoverImage ? (
                  <PostCover
                    src={toAbsoluteUrl(editorCoverImage)}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <ImageIcon />
                    <p
                      style={{
                        fontSize: "12px",
                        color: ACCENT,
                        fontWeight: 600,
                        marginTop: "8px",
                      }}
                    >
                      {uploadingThumbnail ? "Uploading…" : "Add Cover Image or Video from device"}
                    </p>
                  </div>
                )}

                {sectionHeroImages.length > 1 && editorCoverImage && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditorCoverIndex(
                          (prev) =>
                            (prev - 1 + sectionHeroImages.length) %
                            sectionHeroImages.length,
                        );
                      }}
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        border: "none",
                        borderRadius: "999px",
                        width: "28px",
                        height: "28px",
                        background: "rgba(255,255,255,0.85)",
                        color: DARK,
                        cursor: "pointer",
                        fontSize: "15px",
                        fontWeight: 700,
                      }}
                    >
                      {"<"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditorCoverIndex(
                          (prev) => (prev + 1) % sectionHeroImages.length,
                        );
                      }}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        border: "none",
                        borderRadius: "999px",
                        width: "28px",
                        height: "28px",
                        background: "rgba(255,255,255,0.85)",
                        color: DARK,
                        cursor: "pointer",
                        fontSize: "15px",
                        fontWeight: 700,
                      }}
                    >
                      {">"}
                    </button>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        gap: "6px",
                      }}
                    >
                      {sectionHeroImages.map((_, idx) => (
                        <span
                          key={sectionHeroImages[idx] + idx}
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "999px",
                            background:
                              idx === safeEditorCoverIndex
                                ? "rgba(255,255,255,0.95)"
                                : "rgba(255,255,255,0.55)",
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}

                {editorCoverImage && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "0";
                    }}
                  >
                    <span
                      style={{
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      Click to change cover
                    </span>
                  </div>
                )}
              </div>

              {/* Title */}
              <textarea
                value={data.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Your article title goes here..."
                rows={1}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  background: "transparent",
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                  fontWeight: 700,
                  fontStyle: "italic",
                  lineHeight: 1.2,
                  color: DARK,
                  marginBottom: "8px",
                  overflow: "hidden",
                }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = t.scrollHeight + "px";
                }}
              />

              {/* Subtitle */}
              <input
                value={data.subtitle}
                onChange={(e) => updateField("subtitle", e.target.value)}
                placeholder="A brief subtitle or tagline..."
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "1rem",
                  color: "rgba(47,39,68,0.45)",
                  fontStyle: "italic",
                  marginBottom: "32px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />

              {/* Category & subcategory assignment */}
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  marginBottom: "32px",
                  padding: "16px",
                  borderRadius: "16px",
                  border: "1px solid rgba(215,115,169,0.18)",
                  background: "rgba(215,115,169,0.04)",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: ACCENT,
                      marginBottom: "6px",
                    }}
                  >
                    Category
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => onSelectCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(0,0,0,0.1)",
                      background: "white",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      color: DARK,
                      cursor: "pointer",
                    }}
                  >
                    <option value="">— Select a category —</option>
                    {categories.map((c: any) => (
                      <option key={catId(c)} value={catId(c)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCategoryId && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: ACCENT,
                        marginBottom: "6px",
                      }}
                    >
                      Subcategories
                    </label>
                    {subOptions.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "rgba(47,39,68,0.45)" }}>
                        No subcategories for this category.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {subOptions.map((sc: any) => {
                          const id = catId(sc);
                          const active = selectedSubs.includes(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleSubCategory(id)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "999px",
                                fontSize: "12px",
                                fontWeight: 700,
                                fontFamily: "inherit",
                                cursor: "pointer",
                                border: active
                                  ? `1px solid ${ACCENT}`
                                  : "1px solid rgba(0,0,0,0.12)",
                                background: active ? ACCENT : "white",
                                color: active ? "white" : DARK,
                              }}
                            >
                              {active ? "✓ " : ""}
                              {sc.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sections */}
              {data.sections.map((s, i) => (
                <div
                  key={i}
                  className="editor-section"
                  style={{
                    marginBottom: "20px",
                    padding: "8px",
                    borderRadius: "20px",
                    border: "1px solid rgba(0,0,0,0.05)",
                    background: "rgba(255,255,255,0.5)",
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  {/* Section label */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 12px 8px",
                      borderBottom: "1px solid rgba(0,0,0,0.04)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "rgba(47,39,68,0.35)",
                      }}
                    >
                      {SECTION_LABELS[s.type]}
                    </span>
                  </div>

                  {/* Controls */}
                  <div className="section-controls">
                    <button
                      className="ctrl-btn move"
                      title="Move up"
                      onClick={() => moveSection(i, -1)}
                    >
                      <ArrowUpIcon />
                    </button>
                    <button
                      className="ctrl-btn move"
                      title="Move down"
                      onClick={() => moveSection(i, 1)}
                    >
                      <ArrowDownIcon />
                    </button>
                    <button
                      className="ctrl-btn"
                      title="Delete"
                      onClick={() => removeSection(i)}
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  {/* Content */}
                  <div style={{ padding: "12px" }}>
                    {s.type === "hero" && (
                      <div style={{ display: "grid", gap: "10px" }}>
                        <input
                          value={s.title || ""}
                          onChange={(e) =>
                            updateSection(i, "title", e.target.value)
                          }
                          placeholder="Hero title"
                          style={{
                            border: "none",
                            outline: "none",
                            borderRadius: "12px",
                            padding: "12px 14px",
                            fontSize: "1rem",
                            fontFamily: "'Playfair Display', serif",
                            fontWeight: 700,
                            color: DARK,
                            background: "rgba(215,115,169,0.04)",
                          }}
                        />
                        <input
                          value={s.subtitle || ""}
                          onChange={(e) =>
                            updateSection(i, "subtitle", e.target.value)
                          }
                          placeholder="Hero subtitle"
                          style={{
                            border: "none",
                            outline: "none",
                            borderRadius: "12px",
                            padding: "12px 14px",
                            fontSize: "14px",
                            fontStyle: "italic",
                            color: "rgba(47,39,68,0.7)",
                            background: "rgba(215,115,169,0.03)",
                          }}
                        />
                        {/* Hero image — uploaded from the user's device */}
                        {s.image || (s.images && s.images[0]) ? (
                          <div
                            style={{
                              position: "relative",
                              borderRadius: "14px",
                              overflow: "hidden",
                            }}
                          >
                            <img
                              src={toAbsoluteUrl(s.image || (s.images && s.images[0]) || "")}
                              alt=""
                              style={{
                                width: "100%",
                                display: "block",
                                maxHeight: "220px",
                                objectFit: "cover",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => updateSection(i, "image", "")}
                              style={{
                                position: "absolute",
                                top: "8px",
                                right: "8px",
                                background: "rgba(0,0,0,0.6)",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                padding: "6px 10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              padding: "20px",
                              borderRadius: "12px",
                              border: "2px dashed rgba(215,115,169,0.25)",
                              background: "rgba(215,115,169,0.03)",
                              cursor: uploadingSection[i] ? "wait" : "pointer",
                              fontSize: "13px",
                              fontWeight: 700,
                              color: ACCENT,
                            }}
                          >
                            <ImageIcon />
                            {uploadingSection[i]
                              ? "Uploading…"
                              : "Upload hero image from device"}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingSection[i]}
                              onChange={(e) => {
                                handleHeroFileUpload(i, e.target.files);
                                e.target.value = "";
                              }}
                              style={{ display: "none" }}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    {s.type === "intro" && (
                      <RichTextEditor
                        value={s.body || ""}
                        onChange={(val) => updateSection(i, "body", val)}
                        placeholder="Write your intro paragraph..."
                      />
                    )}
                    {s.type === "text" && (
                      <RichTextEditor
                        value={s.body || ""}
                        onChange={(val) => updateSection(i, "body", val)}
                        placeholder="Write your paragraph..."
                      />
                    )}
                    {s.type === "quote" && (
                      <RichTextEditor
                        value={s.body || ""}
                        onChange={(val) => updateSection(i, "body", val)}
                        placeholder="Write an inspiring quote..."
                        variant="quote"
                      />
                    )}
                    {s.type === "callout" && (
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ fontSize: "20px", marginTop: "4px" }}>
                          💡
                        </span>
                        <div style={{ flex: 1 }}>
                          <RichTextEditor
                            value={s.body || ""}
                            onChange={(val) => updateSection(i, "body", val)}
                            placeholder="Write a helpful tip or note..."
                            variant="callout"
                          />
                        </div>
                      </div>
                    )}
                    {s.type === "divider" && (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "12px 0",
                          color: "rgba(47,39,68,0.3)",
                          fontSize: "12px",
                        }}
                      >
                        ── Visual separator ──
                      </div>
                    )}
                    {s.type === "image" && (
                      <div>
                        {s.images.length > 0
                          ? s.images.map((img, j) => (
                              <div
                                key={j}
                                style={{
                                  position: "relative",
                                  borderRadius: "14px",
                                  overflow: "hidden",
                                  marginBottom: "8px",
                                }}
                              >
                                <img
                                  src={toAbsoluteUrl(img)}
                                  alt=""
                                  style={{ width: "100%", display: "block" }}
                                />
                                <button
                                  onClick={() =>
                                    updateSection(
                                      i,
                                      "images",
                                      s.images.filter((_, idx) => idx !== j),
                                    )
                                  }
                                  style={{
                                    position: "absolute",
                                    top: "8px",
                                    right: "8px",
                                    background: "rgba(0,0,0,0.6)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "6px 10px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          : null}
                        {/* Upload one or more images from the user's device */}
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "24px",
                            borderRadius: "14px",
                            border: "2px dashed rgba(215,115,169,0.2)",
                            background: "rgba(215,115,169,0.03)",
                            cursor: uploadingSection[i] ? "wait" : "pointer",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: ACCENT,
                            fontFamily: "inherit",
                            textAlign: "center",
                          }}
                        >
                          <ImageIcon />
                          {uploadingSection[i]
                            ? "Uploading…"
                            : "+ Add image(s) from device"}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={uploadingSection[i]}
                            onChange={(e) => {
                              handleSectionFilesUpload(i, e.target.files);
                              e.target.value = "";
                            }}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* ADD BLOCK BUTTON */}
              <div style={{ marginTop: "12px", position: "relative" }}>
                <button
                  onClick={() => setShowBlockPicker(!showBlockPicker)}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "16px",
                    border: "2px dashed rgba(215,115,169,0.2)",
                    background: showBlockPicker
                      ? "rgba(215,115,169,0.06)"
                      : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: ACCENT,
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}
                >
                  <PlusIcon /> Add Content Block
                </button>

                {/* Block Picker Dropdown */}
                {showBlockPicker && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      left: 0,
                      right: 0,
                      background: "white",
                      borderRadius: "18px",
                      boxShadow:
                        "0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
                      padding: "8px",
                      zIndex: 20,
                      animation: "slideUp 0.25s ease both",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "0.2em",
                        color: ACCENT,
                        padding: "10px 14px 6px",
                        textTransform: "uppercase",
                      }}
                    >
                      Choose Block Type
                    </p>
                    {BLOCK_TYPES.map((bt) => (
                      <button
                        key={bt.type}
                        className="block-option"
                        onClick={() => addSection(bt.type)}
                      >
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "12px",
                            background: "rgba(215,115,169,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: ACCENT,
                            flexShrink: 0,
                          }}
                        >
                          {bt.icon}
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: DARK,
                            }}
                          >
                            {bt.label}
                          </p>
                          <p
                            style={{
                              fontSize: "11px",
                              color: "rgba(47,39,68,0.4)",
                            }}
                          >
                            {bt.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => setShowBlockPicker(false)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        textAlign: "center",
                        fontSize: "12px",
                        color: "rgba(47,39,68,0.4)",
                        fontWeight: 600,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        borderTop: "1px solid rgba(0,0,0,0.05)",
                        marginTop: "4px",
                        fontFamily: "inherit",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* ═══════ ARTICLE INSIGHTS (AI METADATA) ═══════ */}
              <div
                style={{
                  marginTop: "28px",
                  padding: "20px",
                  borderRadius: "20px",
                  border: "1px solid rgba(215,115,169,0.2)",
                  background:
                    "linear-gradient(135deg, rgba(215,115,169,0.06), rgba(255,255,255,0.6))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "4px",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.3rem",
                      fontWeight: 700,
                      fontStyle: "italic",
                      color: DARK,
                    }}
                  >
                    ✨ Article Insights
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAutoStructureModal(true)}
                    style={{
                      padding: "7px 12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(215,115,169,0.3)",
                      background: "white",
                      color: ACCENT,
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      flexShrink: 0,
                    }}
                  >
                    ✨ Auto-fill
                  </button>
                </div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "rgba(47,39,68,0.5)",
                    lineHeight: 1.6,
                    marginBottom: "18px",
                  }}
                >
                  These power the TL;DR, Key Highlights, Glow-Up Steps and Key
                  Takeaways on the published article. Leave a field empty to
                  auto-derive it from your content when you publish.
                </p>

                {/* TL;DR */}
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: ACCENT,
                    marginBottom: "6px",
                  }}
                >
                  ⚡ TL;DR
                </label>
                <textarea
                  value={data.ai?.summary || ""}
                  onChange={(e) => updateAi("summary", e.target.value)}
                  placeholder="A short one- or two-sentence summary..."
                  rows={2}
                  style={{
                    width: "100%",
                    borderRadius: "14px",
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "white",
                    padding: "12px 14px",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    color: DARK,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    marginBottom: "18px",
                  }}
                />

                {/* Highlights */}
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: ACCENT,
                    marginBottom: "6px",
                  }}
                >
                  ✨ Key Highlights{" "}
                  <span
                    style={{
                      fontWeight: 600,
                      textTransform: "none",
                      letterSpacing: 0,
                      color: "rgba(47,39,68,0.4)",
                    }}
                  >
                    (one per line)
                  </span>
                </label>
                <textarea
                  value={(data.ai?.highlights || []).join("\n")}
                  onChange={(e) =>
                    updateAi("highlights", e.target.value.split("\n"))
                  }
                  placeholder={"First highlight\nSecond highlight"}
                  rows={3}
                  style={{
                    width: "100%",
                    borderRadius: "14px",
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "white",
                    padding: "12px 14px",
                    fontSize: "13px",
                    lineHeight: 1.7,
                    color: DARK,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    marginBottom: "18px",
                  }}
                />

                {/* Steps */}
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: ACCENT,
                    marginBottom: "8px",
                  }}
                >
                  🌿 Glow-Up Steps
                </label>
                <div style={{ display: "grid", gap: "10px" }}>
                  {(data.ai?.steps || []).map((step, i) => (
                    <div
                      key={i}
                      style={{
                        position: "relative",
                        borderRadius: "14px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "white",
                        padding: "12px",
                        display: "grid",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          value={step.stepLabel || ""}
                          onChange={(e) =>
                            updateAiStep(i, "stepLabel", e.target.value)
                          }
                          placeholder="STEP 01"
                          style={{
                            width: "90px",
                            flexShrink: 0,
                            borderRadius: "10px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            background: "rgba(215,115,169,0.04)",
                            padding: "8px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: DARK,
                            outline: "none",
                            fontFamily: "inherit",
                          }}
                        />
                        <input
                          value={step.title || ""}
                          onChange={(e) =>
                            updateAiStep(i, "title", e.target.value)
                          }
                          placeholder="Step title"
                          style={{
                            flex: 1,
                            borderRadius: "10px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            padding: "8px 10px",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: DARK,
                            outline: "none",
                            fontFamily: "inherit",
                          }}
                        />
                        <button
                          type="button"
                          title="Remove step"
                          onClick={() => removeAiStep(i)}
                          style={{
                            width: "32px",
                            flexShrink: 0,
                            borderRadius: "10px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            background: "white",
                            color: "rgba(47,39,68,0.5)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                      <textarea
                        value={step.body || ""}
                        onChange={(e) =>
                          updateAiStep(i, "body", e.target.value)
                        }
                        placeholder="Step instructions..."
                        rows={2}
                        style={{
                          width: "100%",
                          borderRadius: "10px",
                          border: "1px solid rgba(0,0,0,0.08)",
                          padding: "8px 10px",
                          fontSize: "13px",
                          lineHeight: 1.6,
                          color: DARK,
                          outline: "none",
                          resize: "vertical",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addAiStep}
                  style={{
                    marginTop: "10px",
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "2px dashed rgba(215,115,169,0.25)",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: ACCENT,
                    fontFamily: "inherit",
                    marginBottom: "18px",
                  }}
                >
                  + Add Step
                </button>

                {/* Key Takeaways */}
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: ACCENT,
                    marginBottom: "6px",
                  }}
                >
                  🔑 Key Takeaways{" "}
                  <span
                    style={{
                      fontWeight: 600,
                      textTransform: "none",
                      letterSpacing: 0,
                      color: "rgba(47,39,68,0.4)",
                    }}
                  >
                    (one per line)
                  </span>
                </label>
                <textarea
                  value={(data.ai?.keyTakeaways || []).join("\n")}
                  onChange={(e) =>
                    updateAi("keyTakeaways", e.target.value.split("\n"))
                  }
                  placeholder={"First takeaway\nSecond takeaway"}
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: "14px",
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "white",
                    padding: "12px 14px",
                    fontSize: "13px",
                    lineHeight: 1.7,
                    color: DARK,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ height: "80px" }} />
            </div>
          </div>
        )}

        {/* ── PREVIEW PANE ── */}
        {viewMode !== "edit" && (
          <div
            className="preview-pane"
            style={{
              flex: viewMode === "split" ? "1 1 50%" : "1 1 100%",
              overflowY: "auto",
              padding: "32px 24px",
              background: "white",
            }}
          >
            {/* Preview header */}
            <div
              style={{
                textAlign: "left",
                marginBottom: "28px",
                padding: "12px 14px",
                borderRadius: "14px",
                background:
                  "linear-gradient(135deg, rgba(215,115,169,0.12), rgba(255,255,255,0.8))",
                border: "1px solid rgba(215,115,169,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.25em",
                  color: ACCENT,
                  textTransform: "uppercase",
                }}
              >
                👁️ Live Preview
              </span>
              <button
                className="preview-edit-btn"
                onClick={() => setViewMode("edit")}
                title="Go back to editor"
              >
                <EditIcon /> Edit Mode
              </button>
            </div>

            <div style={{ maxWidth: "680px", margin: "0 auto" }}>
              <LivePreview data={data} />
            </div>
          </div>
        )}
      </div>

      {/* ═══════ BEAUTIFUL GLASSMORPHIC AUTO-STRUCTURE MODAL ═══════ */}
      {showAutoStructureModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(47,39,68,0.4)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              borderRadius: "32px",
              border: "1px solid rgba(255,255,255,0.6)",
              boxShadow: "0 24px 60px rgba(47,39,68,0.18)",
              width: "100%",
              maxWidth: "600px",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              animation: "slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "28px",
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: DARK,
                  marginBottom: "6px",
                }}
              >
                ✨ Auto-Structure Article
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "rgba(47,39,68,0.6)",
                  lineHeight: 1.5,
                }}
              >
                Instantly structure your raw text or draft content into an a
                structured editorial format with highlights, steps, key
                takeaways, and story flow.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                background: "rgba(47,39,68,0.04)",
                borderRadius: "14px",
                padding: "4px",
              }}
            >
              <button
                onClick={() => {
                  setAutoStructureSource("current");
                  const merged = data.sections
                    .filter(
                      (s) =>
                        s.type === "text" ||
                        s.type === "quote" ||
                        s.type === "callout",
                    )
                    .map((s) => stripHtml(s.body || ""))
                    .join("\n\n");
                  setAutoStructureInput(merged);
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background:
                    autoStructureSource === "current" ? "white" : "transparent",
                  color:
                    autoStructureSource === "current"
                      ? DARK
                      : "rgba(47,39,68,0.5)",
                  boxShadow:
                    autoStructureSource === "current"
                      ? "0 4px 10px rgba(0,0,0,0.06)"
                      : "none",
                  transition: "all 0.2s",
                }}
              >
                📄 Current Article Blocks
              </button>
              <button
                onClick={() => {
                  setAutoStructureSource("custom");
                  setAutoStructureInput("");
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background:
                    autoStructureSource === "custom" ? "white" : "transparent",
                  color:
                    autoStructureSource === "custom"
                      ? DARK
                      : "rgba(47,39,68,0.5)",
                  boxShadow:
                    autoStructureSource === "custom"
                      ? "0 4px 10px rgba(0,0,0,0.06)"
                      : "none",
                  transition: "all 0.2s",
                }}
              >
                ✍️ Custom Draft / Clipboard
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "rgba(47,39,68,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {autoStructureSource === "current"
                  ? "Previewing Content to Structure"
                  : "Paste raw draft text"}
              </label>
              <textarea
                value={autoStructureInput}
                onChange={(e) => setAutoStructureInput(e.target.value)}
                placeholder={
                  autoStructureSource === "current"
                    ? "No text content found in current sections."
                    : "Paste your raw article or ritual draft here..."
                }
                rows={6}
                disabled={
                  autoStructureSource === "current" || autoStructureLoading
                }
                style={{
                  borderRadius: "16px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  padding: "14px",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  background:
                    autoStructureSource === "current"
                      ? "rgba(0,0,0,0.02)"
                      : "white",
                  outline: "none",
                  resize: "none",
                  color: DARK,
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Engine Selection */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyBetween: "space-between",
                justifyContent: "space-between",
                background: "rgba(215,115,169,0.06)",
                padding: "12px 16px",
                borderRadius: "16px",
                border: "1px solid rgba(215,115,169,0.15)",
              }}
            >
              <div>
                <p style={{ fontSize: "12px", fontWeight: 700, color: DARK }}>
                  Processing Engine
                </p>
                <p style={{ fontSize: "10px", color: "rgba(47,39,68,0.5)" }}>
                  {autoStructureEngine === "ai"
                    ? "Leverages Gemini 3.5 Flash for deep semantics"
                    : "Instant offline heuristic sentence split"}
                </p>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  onClick={() => setAutoStructureEngine("ai")}
                  disabled={autoStructureLoading}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    background:
                      autoStructureEngine === "ai" ? ACCENT : "transparent",
                    color:
                      autoStructureEngine === "ai"
                        ? "white"
                        : "rgba(47,39,68,0.5)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (autoStructureEngine !== "ai")
                      e.currentTarget.style.background =
                        "rgba(215,115,169,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    if (autoStructureEngine !== "ai")
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  Gemini AI
                </button>
                <button
                  onClick={() => setAutoStructureEngine("heuristic")}
                  disabled={autoStructureLoading}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    background:
                      autoStructureEngine === "heuristic"
                        ? ACCENT
                        : "transparent",
                    color:
                      autoStructureEngine === "heuristic"
                        ? "white"
                        : "rgba(47,39,68,0.5)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (autoStructureEngine !== "heuristic")
                      e.currentTarget.style.background =
                        "rgba(215,115,169,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    if (autoStructureEngine !== "heuristic")
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  Heuristic
                </button>
              </div>
            </div>

            {autoStructureError && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#cf4444",
                  background: "#fff5f5",
                  border: "1px solid #cf444422",
                  padding: "10px 14px",
                  borderRadius: "12px",
                }}
              >
                ⚠️ {autoStructureError}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={() => setShowAutoStructureModal(false)}
                disabled={autoStructureLoading}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "14px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "white",
                  color: "rgba(47,39,68,0.6)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={runAutoStructure}
                disabled={autoStructureLoading || !autoStructureInput.trim()}
                style={{
                  flex: 1.5,
                  padding: "12px",
                  borderRadius: "14px",
                  border: "none",
                  background: `linear-gradient(135deg, ${ACCENT} 0%, #B85D8D 100%)`,
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor:
                    autoStructureLoading || !autoStructureInput.trim()
                      ? "not-allowed"
                      : "pointer",
                  boxShadow: "0 6px 18px rgba(215,115,169,0.25)",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {autoStructureLoading ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "12px",
                        height: "12px",
                        border: "2px solid white",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "savedPulse 1s linear infinite",
                      }}
                    />
                    Structuring...
                  </>
                ) : (
                  "Structure Content ✨"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
