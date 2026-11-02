import React, { useState, useRef, useCallback, useEffect } from "react";
import "./ArticleEditor.css";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import {
  fetchCategories,
  fetchSubCategories,
} from "../store/categories/categories.action";
import { GeminiService } from "../services/geminiService";
import {
  uploadImageFiles,
  uploadMediaFile,
  toAbsoluteUrl,
} from "../services/uploadImage";
import { API_BASE } from "../services/config";
import { PostCover } from "../components/PostCover";
import { useToast } from "../components/Toast";
import { describeError } from "../services/errorMessage";
import { ACCENT, DARK, SAGE_DARK } from "../styles/brand";
import {
  Leaf,
  ListOrdered,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  NotebookPen,
  HelpCircle,
  Play,
  BookMarked,
} from "lucide-react";
import {
  IngredientsEditor,
  InstructionsEditor,
  ReelPicker,
} from "../components/SectionBlockEditors";
import { sanitizeHtml } from "../utils/sanitize";
import { AuraMark } from "../components/Logo";

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
  | "intro"
  /* Recipe / reference blocks. These already existed in the content
     (~923 sections) but had no editor UI, so admins could not create
     them and re-saving a post that used them was lossy. */
  | "ingredients"
  | "instructions"
  | "benefits"
  | "notes"
  | "source"
  | "tip"
  | "warning"
  | "faq"
  | "reel";

interface SectionItem {
  name?: string;
  amount?: string;
  note?: string;
}

interface ContentSection {
  type: SectionType;
  body?: string;
  images?: string[];
  title?: string;
  subtitle?: string;
  image?: string;
  /** ingredients */
  items?: SectionItem[];
  /** instructions */
  steps?: string[];
  /** reel — id of an existing post with type 'reel' */
  reelId?: string;
  caption?: string;
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

/* Exported so ArticleEditorPage can type its fetched draft against the shape
   the editor actually requires. It is NOT the `Article` in src/types.ts — that
   one is the article-card shape and has no `sections`. */
export interface Article {
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
    /^(?:\s*(?:\d+\s*|step\s*\d+\s*|first|then|next)\s*[:.-]?\s*)(.+)/i;
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

/* Unreferenced. `inferAiMetadataFromText` below is the path the editor
   actually calls; this is its superseded sibling, kept because it is working
   logic nobody has decided to retire. Delete it or wire it up — but do that
   deliberately, not because a linter asked. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

/* Unreferenced. `inferAiMetadataFromText` below is the path the editor
   actually calls; this is its superseded sibling, kept because it is working
   logic nobody has decided to retire. Delete it or wire it up — but do that
   deliberately, not because a linter asked. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  { name: "Ink", value: "#2D2A26" },
  { name: "Accent", value: "#4A7060" },
  { name: "Sage", value: "#3D5B4F" },
  { name: "Rose", value: "#C2466B" },
  { name: "Amber", value: "#B8860B" },
  { name: "Ocean", value: "#3B6FB8" },
  { name: "Plum", value: "#7A3B8E" },
  { name: "Slate", value: "#6B6478" },
];

// Small inline glyphs used by the rich-text toolbar.
const UnderlineGlyph = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <line x1="4" y1="20" x2="20" y2="20" />
  </svg>
);
const StrikeGlyph = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="4" y1="12" x2="20" y2="12" />
    <path d="M7 7a4 3 0 0 1 4-2h2a4 3 0 0 1 4 3M7 17a4 3 0 0 0 4 2h2a4 3 0 0 0 4-3" />
  </svg>
);
const OrderedListGlyph = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="10" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="10" y1="18" x2="20" y2="18" />
    <path d="M4 6h1v4M4 10h2M4.5 16.5a1 1 0 0 1 1.5.8c0 .7-1.5 1.2-1.5 1.7H6" />
  </svg>
);
const TextColorGlyph = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 18 11 6h2l5 12" />
    <line x1="8" y1="14" x2="16" y2="14" />
  </svg>
);
const AlignLeftGlyph = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="14" y2="12" />
    <line x1="4" y1="18" x2="18" y2="18" />
  </svg>
);
const AlignCenterGlyph = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="5" y1="18" x2="19" y2="18" />
  </svg>
);
const ClearFormatGlyph = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
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
  const [openPicker, setOpenPicker] = useState<null | "text" | "highlight">(
    null,
  );

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
      const ok = document.execCommand(
        "hiliteColor",
        false,
        color || "transparent",
      );
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
      className="article-editor-rte-btn"
      style={{
        background: active ? "rgba(61,91,79,0.14)" : "transparent",
        color: active ? ACCENT : "rgba(45,42,38,0.55)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(61,91,79,0.1)";
        e.currentTarget.style.color = ACCENT;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active
          ? "rgba(61,91,79,0.14)"
          : "transparent";
        e.currentTarget.style.color = active ? ACCENT : "rgba(45,42,38,0.55)";
      }}
    >
      {children}
    </button>
  );

  const Divider = () => <span className="article-editor-rte-divider" />;

  return (
    <div className="article-editor-rte">
      {/* Toolbar */}
      <div className="article-editor-rte-toolbar">
        {/* Block format */}
        <select
          title="Text style"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            exec("formatBlock", e.target.value);
            e.target.selectedIndex = 0;
          }}
          defaultValue=""
          className="article-editor-rte-select"
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
        <div className="relative">
          <Btn
            title="Text colour"
            active={openPicker === "text"}
            onClick={() => setOpenPicker(openPicker === "text" ? null : "text")}
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
        <div className="relative">
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
        className={`article-editor-rich-content article-editor-rte-content ${
          variant === "quote"
            ? "article-editor-rte-content--quote font-serif"
            : variant === "callout"
              ? "article-editor-rte-content--callout font-sans"
              : "font-sans"
        }`}
        data-placeholder={placeholder || "Start writing..."}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
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
    className="article-editor-color-popover"
  >
    <p className="article-editor-color-popover-label">{label}</p>
    <div className="grid grid-cols-4 gap-[6px]">
      {colors.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.name}
          onClick={() => onPick(c.value)}
          className="article-editor-swatch"
          style={{ background: c.value }}
        >
          {swatchStyle === "solid" ? (
            <span className="article-editor-swatch-letter">A</span>
          ) : null}
        </button>
      ))}
    </div>
    {onClear && (
      <button
        type="button"
        onClick={onClear}
        className="article-editor-popover-clear"
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
    <article className="article-editor-preview-article font-sans">
      {/* Hero thumbnail */}
      {heroImages.length > 0 ? (
        <div className="article-editor-preview-hero">
          <img
            src={toAbsoluteUrl(heroImages[activeIndex])}
            alt=""
            className="w-full h-full object-cover"
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
                className="article-editor-preview-hero-nav article-editor-preview-hero-nav--prev"
              >
                {"<"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveHeroIndex((prev) => (prev + 1) % heroImages.length)
                }
                className="article-editor-preview-hero-nav article-editor-preview-hero-nav--next"
              >
                {">"}
              </button>
              <div className="article-editor-preview-hero-dots">
                {heroImages.map((_, idx) => (
                  <span
                    key={heroImages[idx] + idx}
                    className="article-editor-preview-hero-dot"
                    style={{
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
        <div className="article-editor-preview-thumb">
          <img
            src={toAbsoluteUrl(data.thumbnail || "")}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      {/* Title */}
      <h1 className="article-editor-preview-title font-serif">
        {data.title || "Your article title..."}
      </h1>

      {/* Subtitle */}
      {data.subtitle && (
        <p className="article-editor-preview-subtitle">{data.subtitle}</p>
      )}

      {/* Meta bar */}
      <div className="article-editor-preview-meta">
        {/* This preview was the last copy of the retired shield glyph. It
            stays a circle because here the brand stands in as the article's
            author, next to UserAvatar's shape — but the mark is now the
            real one. */}
        <div className="article-editor-preview-avatar">
          <AuraMark size={18} />
        </div>
        <div>
          <p className="article-editor-preview-brand">Aura &amp; Earth</p>
          <p className="text-[11px] text-[rgba(45,42,38,0.4)]">
            Just now ·{" "}
            {Math.max(1, Math.ceil((data.sections?.length || 1) * 1.5))} min
            read
          </p>
        </div>
        {/* Dead chips that mimic the real article actions — decorative, so
            they stay out of the accessibility tree entirely. */}
        <div className="ml-auto flex gap-[8px]" aria-hidden="true">
          {["🤍", "🏷️", "↗"].map((e, i) => (
            <div key={i} className="article-editor-preview-action">
              {e}
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      {data.sections?.map((s, i) => (
        <div key={i} className="mb-[30px]">
          {s.type === "hero" && (
            <div className="article-editor-preview-heroblock">
              {s.image || (s.images && s.images[0]) ? (
                <img
                  src={toAbsoluteUrl(s.image || (s.images ? s.images[0] : ""))}
                  alt={s.title || "Hero image"}
                  className="w-full block max-h-[360px] object-cover"
                />
              ) : null}
              <div className="px-[20px] py-[16px]">
                {(s.title || s.subtitle) && (
                  <h2
                    className="article-editor-preview-heroblock-title font-serif"
                    style={{
                      marginBottom: s.subtitle ? "8px" : "0",
                    }}
                  >
                    {s.title}
                  </h2>
                )}
                {s.subtitle && (
                  <p className="m-0 italic text-[rgba(45,42,38,0.68)]">
                    {s.subtitle}
                  </p>
                )}
              </div>
            </div>
          )}

          {s.type === "text" && s.body && (
            <div
              className="article-editor-rich-content article-editor-preview-text"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.body) }}
            />
          )}

          {s.type === "intro" && s.body && (
            <div
              className="article-editor-rich-content article-editor-preview-intro"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.body) }}
            />
          )}

          {s.type === "quote" && s.body && (
            <div className="article-editor-preview-quote">
              <span className="article-editor-preview-quotemark font-serif">
                "
              </span>
              <blockquote
                className="article-editor-rich-content article-editor-preview-blockquote font-serif"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.body) }}
              />
            </div>
          )}

          {s.type === "callout" && s.body && (
            <div className="article-editor-preview-callout">
              <span className="text-[18px] mt-[2px]">💡</span>
              <div
                className="article-editor-rich-content article-editor-preview-callout-body"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.body) }}
              />
            </div>
          )}

          {s.type === "divider" && (
            <div className="flex items-center gap-[16px] my-[24px]">
              <div className="article-editor-preview-divider-line" />
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
              <div className="article-editor-preview-divider-line" />
            </div>
          )}

          {s.type === "image" &&
            s.images?.map((img, j) => (
              <div key={j} className="article-editor-preview-imagewrap">
                <img src={toAbsoluteUrl(img)} alt="" className="w-full block" />
              </div>
            ))}
        </div>
      ))}

      {/* End mark */}
      <div className="article-editor-preview-end">
        <span className="article-editor-preview-end-label">
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
  const toast = useToast();
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
    setData((prev) => ({ ...prev, categoryId: id, subCategories: [] }) as any);
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
  const [saveResult, setSaveResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
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
  const [uploadingSection, setUploadingSection] = useState<
    Record<number, boolean>
  >({});
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
      toast.error(describeError(err, "Couldn't upload that file."));
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
      toast.error(describeError(err, "Couldn't upload that image."));
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
      toast.error(describeError(err, "Couldn't upload that image."));
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
        payload.sections = payload.sections.map(
          ({ id, _id, ...section }: any) => section,
        );
      }
      if (payload.seo && typeof payload.seo === "object") {
        const { id: _seoId, _id: _seoMongoId, ...seo } = payload.seo;
        payload.seo = seo;
      }
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "null",
      );
      if (!currentUser?.AccessToken) {
        setSaveResult({
          ok: false,
          msg: "You're not logged in — please log in and try again.",
        });
        return;
      }
      await axios.put(`${API_BASE}/posts/update/${id}`, payload, {
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
        // Prompt + JSON parsing live on the backend (/v1/ai/article-structure).
        const parsed = await new GeminiService().getArticleStructure({
          title: data.title,
          subtitle: data.subtitle,
          content: autoStructureInput,
        });
        setData((prev) => ({
          ...prev,
          ai: normalizeAIMetadata(parsed as any),
        }));
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
        "Could not auto-structure using AI. Please try again, or use the offline 'Heuristic' engine option.",
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
    /* ── Recipe / reference blocks ── */
    {
      type: "ingredients",
      icon: <Leaf size={16} />,
      label: "Ingredients",
      desc: "Shopping list with amounts",
    },
    {
      type: "instructions",
      icon: <ListOrdered size={16} />,
      label: "Directions",
      desc: "Numbered steps",
    },
    {
      type: "benefits",
      icon: <Sparkles size={16} />,
      label: "Why It Works",
      desc: "Benefits of this ritual",
    },
    {
      type: "tip",
      icon: <Lightbulb size={16} />,
      label: "Tip",
      desc: "A helpful aside",
    },
    {
      type: "warning",
      icon: <AlertTriangle size={16} />,
      label: "Caution",
      desc: "Safety note",
    },
    {
      type: "notes",
      icon: <NotebookPen size={16} />,
      label: "Notes",
      desc: "Storage, frequency, extras",
    },
    {
      type: "faq",
      icon: <HelpCircle size={16} />,
      label: "FAQ",
      desc: "Q&A accordion",
    },
    {
      type: "reel",
      icon: <Play size={16} />,
      label: "Sample Reel",
      desc: "Embed an existing reel",
    },
    {
      type: "source",
      icon: <BookMarked size={16} />,
      label: "Source",
      desc: "Citation / credit",
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
    ingredients: "Ingredients",
    instructions: "Directions",
    benefits: "Why It Works",
    tip: "Tip",
    warning: "Caution",
    notes: "Notes",
    faq: "FAQ",
    reel: "Sample Reel",
    source: "Source",
  };

  return (
    <div className="article-editor-root font-sans">
      {/* ═══════ TOP BAR ═══════ */}
      <div className="article-editor-topbar">
        <div className="article-editor-topbar-inner">
          {/* Left */}
          <div className="flex items-center gap-[12px]">
            {onCancel && (
              <button
                onClick={onCancel}
                className="article-editor-back-btn"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(45,42,38,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(45,42,38,0.06)";
                }}
              >
                ← Back
              </button>
            )}
            <div>
              <h2 className="article-editor-topbar-title">✍️ Article Studio</h2>
              <p className="article-editor-topbar-sub">
                {data.sections.length} block
                {data.sections.length !== 1 ? "s" : ""} · Auto-saved
              </p>
            </div>
          </div>

          {/* Center — View Mode */}
          <div className="article-editor-mode-switch">
            <button
              className={`article-editor-mode-btn ${
                viewMode === "edit"
                  ? "article-editor-mode-btn--active"
                  : "article-editor-mode-btn--inactive"
              }`}
              onClick={() => setViewMode("edit")}
            >
              <EditIcon /> Edit
            </button>
            <button
              className={`article-editor-mode-btn ${
                viewMode === "split"
                  ? "article-editor-mode-btn--active"
                  : "article-editor-mode-btn--inactive"
              }`}
              onClick={() => setViewMode("split")}
            >
              <SplitIcon /> Split
            </button>
            <button
              className={`article-editor-mode-btn ${
                viewMode === "preview"
                  ? "article-editor-mode-btn--active"
                  : "article-editor-mode-btn--inactive"
              }`}
              onClick={() => setViewMode("preview")}
            >
              <EyeIcon /> Preview
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-[10px] relative">
            {/* Saved flash */}
            {savedFlash && (
              <span className="article-editor-saved-flash">✓ Saved!</span>
            )}

            {/* Publish/Save result popup — clearly says updated or not */}
            {saveResult && (
              <div
                onClick={() => setSaveResult(null)}
                className="article-editor-result-overlay"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="article-editor-result-card"
                >
                  <div
                    className="article-editor-result-icon"
                    style={{
                      background: saveResult.ok
                        ? "rgba(61,91,79,0.15)"
                        : "rgba(207,68,68,0.12)",
                    }}
                  >
                    {saveResult.ok ? "✓" : "⚠️"}
                  </div>
                  <h3
                    className="article-editor-result-title"
                    style={{
                      color: saveResult.ok ? "#3f7d5c" : "#b4413c",
                    }}
                  >
                    {saveResult.ok ? "Post Updated" : "Update Failed"}
                  </h3>
                  <p className="article-editor-result-msg">{saveResult.msg}</p>
                  <button
                    onClick={() => setSaveResult(null)}
                    className="article-editor-result-ok"
                    style={{
                      background: saveResult.ok ? "#3D5B4F" : "#b4413c",
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowAutoStructureModal(true)}
              className="article-editor-ai-btn"
            >
              AI Metadata
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="article-editor-publish-btn"
              style={{
                background: saving
                  ? "rgba(61,91,79,0.5)"
                  : `linear-gradient(135deg, ${ACCENT} 0%, ${SAGE_DARK} 100%)`,
                cursor: saving ? "wait" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 28px rgba(61,91,79,0.45)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(61,91,79,0.35)";
              }}
            >
              {saving ? "Saving..." : "Publish ✨"}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <div className="article-editor-main">
        {/* ── EDITOR PANE ── */}
        {viewMode !== "preview" && (
          <div
            className="article-editor-editor-pane"
            style={{
              flex: viewMode === "split" ? "1 1 50%" : "1 1 100%",
              borderRight:
                viewMode === "split" ? "1px solid rgba(0,0,0,0.07)" : "none",
            }}
          >
            <div className="max-w-[680px] mx-auto">
              {/* Thumbnail uploader */}
              <div
                className="article-editor-cover"
                style={{
                  background: editorCoverImage
                    ? "none"
                    : "linear-gradient(135deg, rgba(61,91,79,0.08), rgba(61,91,79,0.04))",
                  border: editorCoverImage
                    ? "none"
                    : "2px dashed rgba(61,91,79,0.2)",
                }}
                onClick={() => {
                  if (!uploadingThumbnail) thumbnailInputRef.current?.click();
                }}
              >
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    handleThumbnailUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
                {editorCoverImage ? (
                  <PostCover
                    src={toAbsoluteUrl(editorCoverImage)}
                    alt=""
                    loading="eager"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <ImageIcon />
                    <p className="article-editor-cover-hint">
                      {uploadingThumbnail
                        ? "Uploading…"
                        : "Add Cover Image or Video from device"}
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
                      className="article-editor-cover-nav article-editor-cover-nav--prev"
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
                      className="article-editor-cover-nav article-editor-cover-nav--next"
                    >
                      {">"}
                    </button>
                    <div className="article-editor-cover-dots">
                      {sectionHeroImages.map((_, idx) => (
                        <span
                          key={sectionHeroImages[idx] + idx}
                          className="article-editor-cover-dot"
                          style={{
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
                    className="article-editor-cover-overlay"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "0";
                    }}
                  >
                    <span className="text-white text-[13px] font-bold">
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
                className="article-editor-title-input font-serif"
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
                className="article-editor-subtitle-input font-sans"
              />

              {/* Category & subcategory assignment */}
              <div className="article-editor-taxonomy">
                <div>
                  <label className="article-editor-field-label">Category</label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => onSelectCategory(e.target.value)}
                    className="article-editor-category-select"
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
                    <label className="article-editor-field-label">
                      Subcategories
                    </label>
                    {subOptions.length === 0 ? (
                      <p className="text-[12px] text-[rgba(45,42,38,0.45)]">
                        No subcategories for this category.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-[8px]">
                        {subOptions.map((sc: any) => {
                          const id = catId(sc);
                          const active = selectedSubs.includes(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleSubCategory(id)}
                              className="article-editor-subcat-chip"
                              style={{
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
                  className="article-editor-section"
                  style={{
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  {/* Section label */}
                  <div className="article-editor-section-head">
                    <span className="text-[11px] font-bold text-[rgba(45,42,38,0.35)]">
                      {SECTION_LABELS[s.type]}
                    </span>
                  </div>

                  {/* Controls */}
                  <div className="article-editor-section-controls">
                    <button
                      className="article-editor-ctrl-btn article-editor-ctrl-btn-move"
                      title="Move up"
                      onClick={() => moveSection(i, -1)}
                    >
                      <ArrowUpIcon />
                    </button>
                    <button
                      className="article-editor-ctrl-btn article-editor-ctrl-btn-move"
                      title="Move down"
                      onClick={() => moveSection(i, 1)}
                    >
                      <ArrowDownIcon />
                    </button>
                    <button
                      className="article-editor-ctrl-btn"
                      title="Delete"
                      onClick={() => removeSection(i)}
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-[12px]">
                    {s.type === "hero" && (
                      <div className="grid gap-[10px]">
                        <input
                          value={s.title || ""}
                          onChange={(e) =>
                            updateSection(i, "title", e.target.value)
                          }
                          placeholder="Hero title"
                          className="article-editor-hero-title-input font-serif"
                        />
                        <input
                          value={s.subtitle || ""}
                          onChange={(e) =>
                            updateSection(i, "subtitle", e.target.value)
                          }
                          placeholder="Hero subtitle"
                          className="article-editor-hero-subtitle-input"
                        />
                        {/* Hero image — uploaded from the user's device */}
                        {s.image || (s.images && s.images[0]) ? (
                          <div className="relative rounded-[14px] overflow-hidden">
                            <img
                              src={toAbsoluteUrl(
                                s.image || (s.images && s.images[0]) || "",
                              )}
                              alt=""
                              className="w-full block max-h-[220px] object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => updateSection(i, "image", "")}
                              className="article-editor-img-remove"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label
                            className="article-editor-hero-upload"
                            style={{
                              cursor: uploadingSection[i] ? "wait" : "pointer",
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
                              className="hidden"
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
                      <div className="flex gap-[10px] items-start">
                        <span className="text-[20px] mt-[4px]">💡</span>
                        <div className="flex-1">
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
                      <div className="text-center py-[12px] text-[rgba(45,42,38,0.3)] text-[12px]">
                        ── Visual separator ──
                      </div>
                    )}

                    {/* ── Recipe / reference blocks ──
                        All of them render `title` as the block heading, so
                        they share one heading input. Left blank, the reader
                        falls back to a sensible default per type. */}
                    {(s.type === "ingredients" ||
                      s.type === "instructions" ||
                      s.type === "benefits" ||
                      s.type === "tip" ||
                      s.type === "warning" ||
                      s.type === "notes" ||
                      s.type === "faq" ||
                      s.type === "source" ||
                      s.type === "reel") && (
                      <input
                        value={s.title || ""}
                        onChange={(e) =>
                          updateSection(i, "title", e.target.value)
                        }
                        placeholder={`Heading (default: “${SECTION_LABELS[s.type]}”)`}
                        aria-label="Block heading"
                        className="sbe-input"
                        style={{ marginBottom: 10 }}
                      />
                    )}

                    {s.type === "ingredients" && (
                      <IngredientsEditor
                        items={s.items || []}
                        onChange={(items) => updateSection(i, "items", items)}
                      />
                    )}
                    {s.type === "instructions" && (
                      <InstructionsEditor
                        steps={s.steps || []}
                        onChange={(steps) => updateSection(i, "steps", steps)}
                      />
                    )}
                    {s.type === "reel" && (
                      <ReelPicker
                        reelId={s.reelId}
                        caption={s.caption}
                        onChange={(patch) => {
                          if ("reelId" in patch)
                            updateSection(i, "reelId", patch.reelId);
                          if ("caption" in patch)
                            updateSection(i, "caption", patch.caption);
                        }}
                      />
                    )}
                    {/* Body-only blocks all share the rich text editor; only
                        their heading and rendered treatment differ. */}
                    {(s.type === "benefits" ||
                      s.type === "tip" ||
                      s.type === "warning" ||
                      s.type === "notes" ||
                      s.type === "faq" ||
                      s.type === "source") && (
                      <RichTextEditor
                        value={s.body || ""}
                        onChange={(val) => updateSection(i, "body", val)}
                        placeholder={
                          s.type === "faq"
                            ? "Q: Your question\nA: The answer\n\nQ: Another question\nA: …"
                            : s.type === "source"
                              ? "Book, article or credit line…"
                              : s.type === "warning"
                                ? "Safety note readers should see before starting…"
                                : "Write this section…"
                        }
                      />
                    )}
                    {s.type === "image" && (
                      <div>
                        {s.images.length > 0
                          ? s.images.map((img, j) => (
                              <div
                                key={j}
                                className="relative rounded-[14px] overflow-hidden mb-[8px]"
                              >
                                <img
                                  src={toAbsoluteUrl(img)}
                                  alt=""
                                  className="w-full block"
                                />
                                <button
                                  onClick={() =>
                                    updateSection(
                                      i,
                                      "images",
                                      s.images.filter((_, idx) => idx !== j),
                                    )
                                  }
                                  className="article-editor-img-remove"
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          : null}
                        {/* Upload one or more images from the user's device */}
                        <label
                          className="article-editor-image-upload"
                          style={{
                            cursor: uploadingSection[i] ? "wait" : "pointer",
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
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* ADD BLOCK BUTTON */}
              <div className="mt-[12px] relative">
                <button
                  onClick={() => setShowBlockPicker(!showBlockPicker)}
                  className="article-editor-add-block"
                  style={{
                    background: showBlockPicker
                      ? "rgba(61,91,79,0.06)"
                      : "transparent",
                  }}
                >
                  <PlusIcon /> Add Content Block
                </button>

                {/* Block Picker Dropdown */}
                {showBlockPicker && (
                  <div className="article-editor-block-picker">
                    <p className="article-editor-block-picker-title">
                      Choose Block Type
                    </p>
                    {BLOCK_TYPES.map((bt) => (
                      <button
                        key={bt.type}
                        className="article-editor-block-option"
                        onClick={() => addSection(bt.type)}
                      >
                        <div className="article-editor-block-icon">
                          {bt.icon}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-ink">
                            {bt.label}
                          </p>
                          <p className="text-[11px] text-[rgba(45,42,38,0.4)]">
                            {bt.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => setShowBlockPicker(false)}
                      className="article-editor-block-picker-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* ═══════ ARTICLE INSIGHTS (AI METADATA) ═══════ */}
              <div className="article-editor-insights">
                <div className="flex items-center justify-between gap-[12px] mb-[4px]">
                  <h3 className="article-editor-insights-title font-serif">
                    ✨ Article Insights
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAutoStructureModal(true)}
                    className="article-editor-autofill-btn"
                  >
                    ✨ Auto-fill
                  </button>
                </div>
                <p className="article-editor-insights-desc">
                  These power the TL;DR, Key Highlights, Glow-Up Steps and Key
                  Takeaways on the published article. Leave a field empty to
                  auto-derive it from your content when you publish.
                </p>

                {/* TL;DR */}
                <label className="article-editor-ai-label">⚡ TL;DR</label>
                <textarea
                  value={data.ai?.summary || ""}
                  onChange={(e) => updateAi("summary", e.target.value)}
                  placeholder="A short one- or two-sentence summary..."
                  rows={2}
                  className="article-editor-ai-textarea article-editor-ai-textarea--tldr"
                />

                {/* Highlights */}
                <label className="article-editor-ai-label">
                  ✨ Key Highlights{" "}
                  <span className="article-editor-ai-label-hint">
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
                  className="article-editor-ai-textarea article-editor-ai-textarea--highlights"
                />

                {/* Steps */}
                <label className="article-editor-ai-label article-editor-ai-label--steps">
                  🌿 Glow-Up Steps
                </label>
                <div className="grid gap-[10px]">
                  {(data.ai?.steps || []).map((step, i) => (
                    <div key={i} className="article-editor-step-card">
                      <div className="flex gap-[8px]">
                        <input
                          value={step.stepLabel || ""}
                          onChange={(e) =>
                            updateAiStep(i, "stepLabel", e.target.value)
                          }
                          placeholder="STEP 01"
                          className="article-editor-step-label-input"
                        />
                        <input
                          value={step.title || ""}
                          onChange={(e) =>
                            updateAiStep(i, "title", e.target.value)
                          }
                          placeholder="Step title"
                          className="article-editor-step-title-input"
                        />
                        <button
                          type="button"
                          title="Remove step"
                          onClick={() => removeAiStep(i)}
                          className="article-editor-step-remove"
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
                        className="article-editor-step-body"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addAiStep}
                  className="article-editor-add-step"
                >
                  + Add Step
                </button>

                {/* Key Takeaways */}
                <label className="article-editor-ai-label">
                  🔑 Key Takeaways{" "}
                  <span className="article-editor-ai-label-hint">
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
                  className="article-editor-ai-textarea article-editor-ai-textarea--takeaways"
                />
              </div>

              <div className="h-[80px]" />
            </div>
          </div>
        )}

        {/* ── PREVIEW PANE ── */}
        {viewMode !== "edit" && (
          <div
            className="article-editor-preview-pane"
            style={{
              flex: viewMode === "split" ? "1 1 50%" : "1 1 100%",
            }}
          >
            {/* Preview header */}
            <div className="article-editor-preview-header">
              <span className="article-editor-preview-header-label">
                👁️ Live Preview
              </span>
              <button
                className="article-editor-preview-edit-btn"
                onClick={() => setViewMode("edit")}
                title="Go back to editor"
              >
                <EditIcon /> Edit Mode
              </button>
            </div>

            <div className="max-w-[680px] mx-auto">
              <LivePreview data={data} />
            </div>
          </div>
        )}
      </div>

      {/* ═══════ BEAUTIFUL GLASSMORPHIC AUTO-STRUCTURE MODAL ═══════ */}
      {showAutoStructureModal && (
        <div className="article-editor-modal-overlay font-sans">
          <div className="article-editor-modal-card">
            <div>
              <h3 className="article-editor-modal-title font-serif">
                ✨ Auto-Structure Article
              </h3>
              <p className="article-editor-modal-desc">
                Instantly structure your raw text or draft content into an a
                structured editorial format with highlights, steps, key
                takeaways, and story flow.
              </p>
            </div>

            <div className="article-editor-source-switch">
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
                className="article-editor-source-btn"
                style={{
                  background:
                    autoStructureSource === "current" ? "white" : "transparent",
                  color:
                    autoStructureSource === "current"
                      ? DARK
                      : "rgba(45,42,38,0.5)",
                  boxShadow:
                    autoStructureSource === "current"
                      ? "0 4px 10px rgba(0,0,0,0.06)"
                      : "none",
                }}
              >
                📄 Current Article Blocks
              </button>
              <button
                onClick={() => {
                  setAutoStructureSource("custom");
                  setAutoStructureInput("");
                }}
                className="article-editor-source-btn"
                style={{
                  background:
                    autoStructureSource === "custom" ? "white" : "transparent",
                  color:
                    autoStructureSource === "custom"
                      ? DARK
                      : "rgba(45,42,38,0.5)",
                  boxShadow:
                    autoStructureSource === "custom"
                      ? "0 4px 10px rgba(0,0,0,0.06)"
                      : "none",
                }}
              >
                ✍️ Custom Draft / Clipboard
              </button>
            </div>

            <div className="flex flex-col gap-[6px]">
              <label className="article-editor-modal-label">
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
                className="article-editor-modal-textarea"
                style={{
                  background:
                    autoStructureSource === "current"
                      ? "rgba(0,0,0,0.02)"
                      : "white",
                }}
              />
            </div>

            {/* Engine Selection */}
            <div className="article-editor-engine-row">
              <div>
                <p className="text-[12px] font-bold text-ink">
                  Processing Engine
                </p>
                <p className="text-[10px] text-[rgba(45,42,38,0.5)]">
                  {autoStructureEngine === "ai"
                    ? "Leverages Gemini 3.5 Flash for deep semantics"
                    : "Instant offline heuristic sentence split"}
                </p>
              </div>
              <div className="flex gap-[4px]">
                <button
                  onClick={() => setAutoStructureEngine("ai")}
                  disabled={autoStructureLoading}
                  className="article-editor-engine-btn"
                  style={{
                    background:
                      autoStructureEngine === "ai" ? ACCENT : "transparent",
                    color:
                      autoStructureEngine === "ai"
                        ? "white"
                        : "rgba(45,42,38,0.5)",
                  }}
                  onMouseEnter={(e) => {
                    if (autoStructureEngine !== "ai")
                      e.currentTarget.style.background = "rgba(61,91,79,0.1)";
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
                  className="article-editor-engine-btn"
                  style={{
                    background:
                      autoStructureEngine === "heuristic"
                        ? ACCENT
                        : "transparent",
                    color:
                      autoStructureEngine === "heuristic"
                        ? "white"
                        : "rgba(45,42,38,0.5)",
                  }}
                  onMouseEnter={(e) => {
                    if (autoStructureEngine !== "heuristic")
                      e.currentTarget.style.background = "rgba(61,91,79,0.1)";
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
              <div className="article-editor-modal-error">
                ⚠️ {autoStructureError}
              </div>
            )}

            <div className="flex gap-[10px] mt-[10px]">
              <button
                onClick={() => setShowAutoStructureModal(false)}
                disabled={autoStructureLoading}
                className="article-editor-modal-cancel"
              >
                Cancel
              </button>
              <button
                onClick={runAutoStructure}
                disabled={autoStructureLoading || !autoStructureInput.trim()}
                className="article-editor-modal-submit"
                style={{
                  cursor:
                    autoStructureLoading || !autoStructureInput.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {autoStructureLoading ? (
                  <>
                    <span className="article-editor-spinner" />
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
