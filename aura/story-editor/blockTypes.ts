/* ════════════════════════════════════════════════════════════
   Block constants, config, factories & small pure helpers.
   ════════════════════════════════════════════════════════════ */

import {
  Story,
  StoryBlock,
  BlockType,
  BeautyInsight,
} from "./story.types";

/* ─── Editor visual theme (mirrors the legacy editor palette) ─── */
export const EDITOR_THEME = {
  accent: "#D773A9",
  accentSoft: "rgba(215,115,169,0.10)",
  accentMed: "rgba(215,115,169,0.22)",
  dark: "#2F2744",
  muted: "rgba(47,39,68,0.55)",
  faint: "rgba(47,39,68,0.35)",
  bg: "#F7F5FA",
  surface: "#FFFFFF",
  border: "rgba(47,39,68,0.10)",
  serif: "'Playfair Display', serif",
  sans: "'Plus Jakarta Sans', sans-serif",
};

/* ─── Unique id generator ─── */
export const uid = (prefix = "id"): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/* ─── Block palette shown in the "Add block" picker ─── */
export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  { type: "text", label: "Text", description: "Paragraph with an optional heading", icon: "📝" },
  { type: "image", label: "Image", description: "Photo with a caption", icon: "🖼️" },
  { type: "quote", label: "Quote", description: "Standout blockquote", icon: "❝" },
  { type: "tip", label: "Tip", description: "Helpful pro tip", icon: "💡" },
  { type: "warning", label: "Warning", description: "Caution / patch-test note", icon: "⚠️" },
  { type: "checklist", label: "Checklist", description: "List of steps or items", icon: "✅" },
  { type: "callout", label: "Callout", description: "Highlighted info box", icon: "📣" },
  { type: "comparison", label: "Comparison", description: "Side-by-side compare", icon: "⚖️" },
];

export const blockDef = (type: string): BlockDefinition =>
  BLOCK_DEFINITIONS.find((b) => b.type === type) ?? BLOCK_DEFINITIONS[0];

/* ─── Beauty-insight type options ─── */
export const INSIGHT_TYPES: { value: BeautyInsight["type"]; label: string; icon: string }[] = [
  { value: "ingredient", label: "Ingredient", icon: "🌿" },
  { value: "myth", label: "Myth", icon: "🚫" },
  { value: "fact", label: "Fact", icon: "✔️" },
  { value: "expert", label: "Expert", icon: "👩‍⚕️" },
];

export const insightMeta = (type: string) =>
  INSIGHT_TYPES.find((t) => t.value === type) ?? INSIGHT_TYPES[0];

/* ─── Category options ─── */
export const STORY_CATEGORIES = [
  "Skincare",
  "Haircare",
  "Wellness",
  "DIY Recipes",
  "Ingredients",
  "Lifestyle",
];

/* ─── Editor section navigation map ─── */
export const EDITOR_SECTIONS = [
  { id: "details", label: "Post Details", icon: "📄" },
  { id: "content", label: "Content Blocks", icon: "🧱" },
  { id: "highlights", label: "Highlights", icon: "⭐" },
  { id: "insights", label: "Beauty Insights", icon: "💎" },
  { id: "faq", label: "FAQ", icon: "❓" },
  { id: "sources", label: "Sources", icon: "🔗" },
  { id: "seo", label: "SEO", icon: "🔍" },
];

/* ─── Block factory ─── */
export function createEmptyBlock(type: BlockType): StoryBlock {
  const id = uid("blk");
  switch (type) {
    case "text":
      return { id, type, heading: "", content: "" };
    case "image":
      return { id, type, imageUrl: "", caption: "" };
    case "quote":
      return { id, type, quote: "", author: "" };
    case "tip":
      return { id, type, title: "Pro Tip", content: "" };
    case "warning":
      return { id, type, title: "Heads up", content: "" };
    case "checklist":
      return { id, type, items: [""] };
    case "callout":
      return { id, type, title: "", content: "" };
    case "comparison":
      return { id, type, leftTitle: "", leftContent: "", rightTitle: "", rightContent: "" };
    default:
      return { id, type: "text", content: "" } as StoryBlock;
  }
}

/* ─── Empty story factory ─── */
export function createEmptyStory(): Story {
  return {
    status: "draft",
    title: "",
    subtitle: "",
    category: "",
    categoryId: "",
    subCategories: [],
    tags: [],
    coverImage: "",
    readingTime: 1,
    quickAnswer: "",
    highlights: [],
    blocks: [],
    beautyInsights: [],
    faq: [],
    sources: [],
    seo: { metaTitle: "", metaDescription: "", slug: "", keywords: [] },
  };
}

/* ─── Small pure helpers ─── */
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const stripHtml = (html: string): string =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/* Extract plain text from a block for word-count purposes. */
export const blockPlainText = (b: StoryBlock): string => {
  switch (b.type) {
    case "text":
      return `${b.heading || ""} ${stripHtml(b.content)}`;
    case "image":
      return b.caption || "";
    case "quote":
      return `${b.quote} ${b.author || ""}`;
    case "tip":
    case "warning":
    case "callout":
      return `${b.title} ${stripHtml(b.content)}`;
    case "checklist":
      return b.items.join(" ");
    case "comparison":
      return `${b.leftTitle} ${stripHtml(b.leftContent)} ${b.rightTitle} ${stripHtml(b.rightContent)}`;
    default:
      return "";
  }
};

export const WORDS_PER_MINUTE = 200;

export function countWords(story: Story): number {
  const parts = [
    story.quickAnswer,
    story.subtitle,
    ...story.highlights,
    ...story.blocks.map(blockPlainText),
  ];
  const text = parts.join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export const estimateReadingTime = (story: Story): number =>
  Math.max(1, Math.round(countWords(story) / WORDS_PER_MINUTE));
