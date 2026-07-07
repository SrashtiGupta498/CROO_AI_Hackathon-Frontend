/* ════════════════════════════════════════════════════════════
   Story API service.

   The backend has NO "story" entity — the content model is `Post`
   (/v1/posts) with a STRICT DTO (whitelist + forbidNonWhitelisted),
   so we cannot send arbitrary Story fields. This service maps the
   rich Story shape onto the Post DTO (and back) — a lossy but
   functional bridge that requires no backend changes.

   Post DTO (allowed): authorId, title, slug?, subtitle?,
   sections[]{type:'text'|'image'|'video', body?, images?(urls), videoUrl?, order},
   thumbnailUrl?, palette?, categoryId?(mongoId), subCategories?, tags?,
   ai{summary,keywords,hashtags,...}, seo{title,description,slug},
   isPublished?, visibility?, contentLanguage?, stats?
   ════════════════════════════════════════════════════════════ */

import API from "../services/api";
import { Story, StoryBlock } from "./story.types";
import { createEmptyStory, uid } from "./blockTypes";

/* ─── helpers ─── */
const unwrap = <T = any>(res: any): T => (res?.data?.data ?? res?.data) as T;

const getAuthorId = (): string => {
  try {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    return user?._id || user?.id || "";
  } catch {
    return "";
  }
};

const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Blocks the Post model has no native type for → rich HTML paragraph. */
const blockToHtml = (b: StoryBlock): string => {
  switch (b.type) {
    case "checklist":
      return `<ul>${b.items.filter(Boolean).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    case "comparison":
      return `<table class="post-compare"><thead><tr><th>${esc(b.leftTitle)}</th><th>${esc(
        b.rightTitle,
      )}</th></tr></thead><tbody><tr><td>${esc(b.leftContent)}</td><td>${esc(b.rightContent)}</td></tr></tbody></table>`;
    default:
      return "";
  }
};

/* ─── Story → Post (create/update payload) — uses native section types:
   hero | title | paragraph | quote | image | video ─── */
const toPostPayload = (story: Story) => {
  const sections: any[] = [];
  let order = 0;
  const push = (sec: any) => sections.push({ ...sec, order: order++ });
  const pushPara = (body: string, title?: string) => {
    if ((body && body.trim()) || title) push({ type: "paragraph", ...(title ? { title } : {}), body: body || "" });
  };

  // Highlights (no native Post field) → leading paragraph
  const highlights = story.highlights.filter(Boolean);
  if (highlights.length) {
    pushPara(`<ul>${highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`, "Highlights");
  }

  // Body blocks
  story.blocks.forEach((b) => {
    switch (b.type) {
      case "text":
        push({ type: "paragraph", ...(b.heading ? { title: b.heading } : {}), body: b.content || "" });
        break;
      case "image":
        if (b.imageUrl) push({ type: "image", images: [b.imageUrl], image: b.imageUrl, ...(b.caption ? { caption: b.caption } : {}) });
        else if (b.caption) pushPara(`<p><em>${esc(b.caption)}</em></p>`);
        break;
      case "quote":
        push({ type: "quote", body: b.quote || "", ...(b.author ? { author: b.author } : {}) });
        break;
      case "tip":
        push({ type: "paragraph", title: `💡 ${b.title}`, body: b.content || "" });
        break;
      case "warning":
        push({ type: "paragraph", title: `⚠️ ${b.title}`, body: b.content || "" });
        break;
      case "callout":
        push({ type: "paragraph", ...(b.title ? { title: b.title } : {}), body: b.content || "" });
        break;
      default:
        pushPara(blockToHtml(b));
    }
  });

  // Beauty insights → paragraph
  if (story.beautyInsights.length) {
    const items = story.beautyInsights
      .map((i) => `<li><strong>${esc(i.title)}</strong> — ${esc(i.content)}</li>`)
      .join("");
    pushPara(`<ul>${items}</ul>`, "Beauty Insights");
  }

  // FAQ → paragraph
  if (story.faq.length) {
    const items = story.faq.map((f) => `<p><strong>${esc(f.question)}</strong><br/>${esc(f.answer)}</p>`).join("");
    pushPara(items, "FAQ");
  }

  // Sources → paragraph
  if (story.sources.length) {
    const items = story.sources
      .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title || s.url)}</a></li>`)
      .join("");
    pushPara(`<ul>${items}</ul>`, "Sources");
  }

  const payload: any = {
    authorId: getAuthorId(),
    title: story.title,
    subtitle: story.subtitle || undefined,
    sections,
    // Taxonomy — assign the post to a category + subcategories (mongo ids).
    categoryId: story.categoryId || undefined,
    subCategories: story.subCategories?.length ? story.subCategories : undefined,
    tags: story.tags?.length ? story.tags : undefined,
    isPublished: story.status === "published",
    visibility: "public",
    ai: {
      // quickAnswer is the reader-facing TL;DR → ai.summary
      summary: story.quickAnswer || undefined,
      keywords: story.seo.keywords?.length ? story.seo.keywords : undefined,
    },
    seo: {
      title: story.seo.metaTitle || story.title || undefined,
      description: story.seo.metaDescription || story.subtitle || story.quickAnswer || undefined,
      slug: story.seo.slug || undefined,
    },
  };

  // thumbnailUrl is @IsString — accept any non-empty cover (incl. data-URL)
  if (story.coverImage) payload.thumbnailUrl = story.coverImage;

  return payload;
};

/* ─── Post → Story (read for editing) ─── */
const fromPost = (post: any): Story => {
  const base = createEmptyStory();
  if (!post) return base;

  const blocks: StoryBlock[] = (post.sections || [])
    .slice()
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    .map((s: any): StoryBlock | null => {
      const type = String(s.type || "").toLowerCase();
      if (type === "image" || type === "hero") {
        const url = s.image || (Array.isArray(s.images) ? s.images[0] : "");
        if (url) return { id: uid("blk"), type: "image", imageUrl: url, caption: s.caption || "" };
        return null;
      }
      if (type === "quote") {
        return { id: uid("blk"), type: "quote", quote: s.body || "", author: s.author || "" };
      }
      if (type === "video" && s.videoUrl) {
        return {
          id: uid("blk"),
          type: "text",
          content: `<p><a href="${s.videoUrl}" target="_blank" rel="noreferrer">▶ Watch video</a></p>`,
        };
      }
      // text | paragraph | title | intro | highlight | conclusion → text block
      return { id: uid("blk"), type: "text", heading: s.title || "", content: s.body || "" };
    })
    .filter(Boolean) as StoryBlock[];

  // categoryId may come back as a raw id string or a populated { _id, name } object.
  const cat: any = post.categoryId ?? post.category;
  const categoryId = (cat?._id || cat?.id || cat || "").toString();
  const subCategories: string[] = Array.isArray(post.subCategories)
    ? post.subCategories.map((s: any) => (s?._id || s?.id || s || "").toString()).filter(Boolean)
    : [];

  return {
    ...base,
    id: (post._id || post.id || "").toString(),
    title: post.title || "",
    subtitle: post.subtitle || "",
    status: post.isPublished ? "published" : "draft",
    category: cat?.name || base.category,
    categoryId,
    subCategories,
    tags: Array.isArray(post.tags) ? post.tags : [],
    coverImage: post.thumbnailUrl || "",
    quickAnswer: post.ai?.summary || "",
    blocks,
    seo: {
      metaTitle: post.seo?.title || "",
      metaDescription: post.seo?.description || "",
      slug: post.seo?.slug || "",
      keywords: Array.isArray(post.ai?.keywords) ? post.ai.keywords : [],
    },
  };
};

/* ─── Category (taxonomy) shape used by the editor's selects ─── */
export interface CategoryLite {
  id: string;
  name: string;
  slug?: string;
  parentCategory?: string | null;
}

const toCategoryLite = (c: any): CategoryLite => ({
  id: (c?._id || c?.id || "").toString(),
  name: c?.name || c?.title || "Untitled",
  slug: c?.slug,
  parentCategory: c?.parentCategory ?? null,
});

export const StoryService = {
  /** Fetch a single story (Post) by id, mapped to the Story shape. */
  async getById(id: string): Promise<Story> {
    const res = await API.get(`/posts/getpostById/${id}`);
    return fromPost(unwrap(res));
  },

  /** Fetch top-level (parent) categories — GET /categories/get. */
  async listCategories(): Promise<CategoryLite[]> {
    const res = await API.get(`/categories/get`);
    const rows = unwrap<any[]>(res) || [];
    return (Array.isArray(rows) ? rows : []).map(toCategoryLite);
  },

  /** Fetch subcategories of a parent category — GET /categories/subcategory/:id. */
  async listSubCategories(parentId: string): Promise<CategoryLite[]> {
    if (!parentId) return [];
    const res = await API.get(`/categories/subcategory/${parentId}`);
    const rows = unwrap<any[]>(res) || [];
    return (Array.isArray(rows) ? rows : []).map(toCategoryLite);
  },

  /** List posts (paginated). Returns the raw backend payload. */
  async list(params: { limit?: number; page?: number } = {}): Promise<any> {
    const { limit = 20, page = 1 } = params;
    const res = await API.get(`/posts?limit=${limit}&page=${page}`);
    return res.data;
  },

  /** Create a new post from a Story. */
  async create(story: Story): Promise<Story> {
    if (!getAuthorId()) {
      throw new Error("You must be logged in to publish (missing author id).");
    }
    const res = await API.post(`/posts`, toPostPayload(story));
    return fromPost(unwrap(res));
  },

  /** Update an existing post from a Story. */
  async update(id: string, story: Story): Promise<Story> {
    const res = await API.put(`/posts/update/${id}`, toPostPayload(story));
    return fromPost(unwrap(res));
  },

  /** Delete a post. */
  async remove(id: string): Promise<void> {
    await API.delete(`/posts/${id}`);
  },

  /**
   * Upload an image. The backend upload route is currently disabled,
   * so this will usually fail — callers (ImageUploader) fall back to a
   * local data-URL preview. NOTE: data-URL images are dropped on save
   * because the Post DTO requires real http(s) URLs for image sections.
   */
  async uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await API.post(`/upload/image`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res?.data?.url ?? res?.data?.data?.path ?? res?.data?.path ?? "";
  },
};

export default StoryService;
