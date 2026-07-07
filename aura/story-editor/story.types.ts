/* ════════════════════════════════════════════════════════════
   Story domain types — shared across the Story Editor feature.
   ════════════════════════════════════════════════════════════ */

export type StoryStatus = "draft" | "published";

export interface Story {
  id?: string;
  status: StoryStatus;
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
  imageUrl: string;
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
