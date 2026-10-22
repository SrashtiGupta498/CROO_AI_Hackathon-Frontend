/* ════════════════════════════════════════════════════════════
   Story domain types — shared across the Story Editor feature.
   ════════════════════════════════════════════════════════════ */

export type StoryStatus = "draft" | "published";

export interface Story {
  id?: string;
  status: StoryStatus;
  /** Content format. "article" = normal blog post; "reel" = short-video post
   *  (saved to the Post as `type: "reel"` and surfaced on the Reels page). */
  postType: "article" | "reel";
  /** Raw backend `type` of the post (e.g. "FACE_OIL", "INGREDIENT_REFERENCE",
   *  "reel"). Read-only in the editor — used to scope features like the
   *  disclaimer to specific post kinds. Empty for a plain article. */
  contentType: string;
  /** Video source URL for a reel (saved as a `video` section). */
  videoUrl: string;
  title: string;
  subtitle: string;
  /** Display name of the selected category (shown in the preview/card). */
  category: string;
  /** Mongo id of the selected parent category — saved to the Post as `categoryId`. */
  categoryId: string;
  /** Mongo ids of the selected subcategories — saved to the Post as `subCategories`. */
  subCategories: string[];
  tags: string[];
  coverImage: string;
  readingTime: number;
  quickAnswer: string;
  /** Admin-editable disclaimer / safety note. Saved to the Post as a
   *  `warning` section titled "Disclaimer" and shown prominently on the
   *  ingredient/oil detail view. */
  disclaimer: string;
  highlights: string[];
  blocks: StoryBlock[];
  beautyInsights: BeautyInsight[];
  faq: FAQItem[];
  sources: SourceItem[];
  seo: SEOData;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface SourceItem {
  id: string;
  title: string;
  url: string;
}

export interface SEOData {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  keywords: string[];
}

export interface BeautyInsight {
  id: string;
  type: "ingredient" | "myth" | "fact" | "expert";
  title: string;
  content: string;
}

export type StoryBlock =
  | TextBlock
  | ImageBlock
  | VideoBlock
  | GifBlock
  | QuoteBlock
  | TipBlock
  | WarningBlock
  | ChecklistBlock
  | CalloutBlock
  | ComparisonBlock;

export interface BaseBlock {
  id: string;
  type: string;
}

export interface TextBlock extends BaseBlock {
  type: "text";
  heading?: string;
  content: string;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  /** The first (or only) image. Kept populated in BOTH layouts so every
   *  existing consumer — thumbnails, back-compat readers — has one url to
   *  read without knowing about carousels. */
  imageUrl: string;
  /** Carousel slides, in order. Only meaningful when layout is "carousel". */
  images?: string[];
  /** "single" (default) renders one plate; "carousel" a swipeable strip.
   *  On the wire this is the section `type`: "image" vs "gallery". */
  layout?: "single" | "carousel";
  caption?: string;
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  /** Direct link to an mp4/webm file, or a Post id for embedded reels. */
  videoUrl: string;
  caption?: string;
}

export interface GifBlock extends BaseBlock {
  type: "gif";
  /** An animated .gif URL, or (preferred — far smaller) an mp4/webm loop
   *  that plays back like a GIF: autoplay, muted, looping, no controls. */
  mediaUrl: string;
  caption?: string;
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  quote: string;
  author?: string;
}

export interface TipBlock extends BaseBlock {
  type: "tip";
  title: string;
  content: string;
}

export interface WarningBlock extends BaseBlock {
  type: "warning";
  title: string;
  content: string;
}

export interface ChecklistBlock extends BaseBlock {
  type: "checklist";
  items: string[];
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  title: string;
  content: string;
}

export interface ComparisonBlock extends BaseBlock {
  type: "comparison";
  leftTitle: string;
  leftContent: string;
  rightTitle: string;
  rightContent: string;
}

export type BlockType = StoryBlock["type"];
