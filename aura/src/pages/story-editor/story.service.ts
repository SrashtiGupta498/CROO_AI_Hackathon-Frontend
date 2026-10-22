/* ════════════════════════════════════════════════════════════
   Story API service.

   The backend has NO "story" entity — the content model is `Post`
   (/v1/posts) with a STRICT DTO (whitelist + forbidNonWhitelisted),
   so we cannot send arbitrary Story fields. This service maps the
   rich Story shape onto the Post DTO (and back) — a lossy but
   functional bridge that requires no backend changes beyond adding
   'gif' to SECTION_TYPES (post.schema.ts) alongside 'video'.

   Post DTO (allowed): authorId, title, slug?, subtitle?,
   sections[]{type:'text'|'image'|'video'|'gif', body?, images?(urls),
   image?, videoUrl?, caption?, order},
   thumbnailUrl?, palette?, categoryId?(mongoId), subCategories?, tags?,
   ai{summary,keywords,hashtags,...}, seo{title,description,slug},
   isPublished?, visibility?, contentLanguage?, stats?
   ════════════════════════════════════════════════════════════ */

import API from "../../services/api";
import { uploadSingleImage } from "../../services/uploadImage";
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
      case "image": {
        // A carousel travels as the `gallery` section type, a single plate as
        // `image` — both already in SECTION_TYPES, so no schema change. A
        // "carousel" left with one slide is just a single image, and saves
        // as one.
        const slides = (
          b.layout === "carousel" && b.images?.length ? b.images : [b.imageUrl]
        ).filter(Boolean);
        if (slides.length) {
          push({
            type: b.layout === "carousel" && slides.length > 1 ? "gallery" : "image",
            images: slides,
            image: slides[0],
            ...(b.caption ? { caption: b.caption } : {}),
          });
        } else if (b.caption) pushPara(`<p><em>${esc(b.caption)}</em></p>`);
        break;
      }
      case "video":
        if (b.videoUrl) push({ type: "video", videoUrl: b.videoUrl, ...(b.caption ? { caption: b.caption } : {}) });
        break;
      case "gif": {
        const url = b.mediaUrl;
        if (!url) break;
        // A raw .gif plays natively as an <img>; anything else (the
        // recommended mp4/webm loop) goes through videoUrl and is rendered
        // autoplay/muted/loop to look like a GIF without the file weight.
        const isRawGif = /\.gif($|\?)/i.test(url) || url.startsWith("data:image/gif");
        push({
          type: "gif",
          ...(isRawGif ? { image: url } : { videoUrl: url }),
          ...(b.caption ? { caption: b.caption } : {}),
        });
        break;
      }
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

  // Disclaimer → native `warning` section (title "Disclaimer"), kept last so it
  // renders at the foot of the document / detail view. Scoped to FACE_OIL posts.
  if (story.contentType === "FACE_OIL" && story.disclaimer?.trim()) {
    push({ type: "warning", title: "Disclaimer", body: story.disclaimer.trim() });
  }

  // A reel is a short-video post: prepend its video as the first section so the
  // Reels page (and Article view) can play it, and mark the post `type: "reel"`.
  const isReel = story.postType === "reel";
  if (isReel && story.videoUrl?.trim()) {
    sections.unshift({ type: "video", videoUrl: story.videoUrl.trim(), order: 0 });
    // Re-number so `order` stays 0-based and contiguous after the unshift.
    sections.forEach((s, i) => (s.order = i));
  }

  const payload: any = {
    authorId: getAuthorId(),
    title: story.title,
    subtitle: story.subtitle || undefined,
    // Native Post type: "reel" for reels; leave unset for normal articles.
    type: isReel ? "reel" : undefined,
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

  // Pull the disclaimer out of the sections (a `warning` section, or one
  // titled "Disclaimer") so it maps to the dedicated field rather than a block.
  const disclaimerSection = (post.sections || []).find(
    (s: any) =>
      String(s?.type).toLowerCase() === "warning" ||
      String(s?.title || "").trim().toLowerCase() === "disclaimer",
  );
  const disclaimer = disclaimerSection?.body || "";

  const blocks: StoryBlock[] = (post.sections || [])
    .slice()
    .filter((s: any) => s !== disclaimerSection)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    .map((s: any): StoryBlock | null => {
      const type = String(s.type || "").toLowerCase();
      if (type === "image" || type === "hero" || type === "gallery" || type === "images") {
        const urls = (
          Array.isArray(s.images) && s.images.length ? s.images : s.image ? [s.image] : []
        ).filter(Boolean);
        if (!urls.length) return null;
        // Multi-image gallery sections come back as a carousel; a lone image
        // (whatever the section was called) comes back as a single plate.
        const carousel = urls.length > 1 && (type === "gallery" || type === "images");
        return {
          id: uid("blk"),
          type: "image",
          imageUrl: urls[0],
          layout: carousel ? "carousel" : "single",
          ...(carousel ? { images: urls } : {}),
          caption: s.caption || "",
        };
      }
      if (type === "quote") {
        return { id: uid("blk"), type: "quote", quote: s.body || "", author: s.author || "" };
      }
      if (type === "video" && s.videoUrl) {
        return { id: uid("blk"), type: "video", videoUrl: s.videoUrl, caption: s.caption || "" };
      }
      if (type === "gif" && (s.videoUrl || s.image)) {
        return { id: uid("blk"), type: "gif", mediaUrl: s.videoUrl || s.image, caption: s.caption || "" };
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
    postType: post.type === "reel" ? "reel" : "article",
    contentType: post.type || "",
    videoUrl:
      (Array.isArray(post.sections)
        ? post.sections.find(
            (s: any) => String(s?.type).toLowerCase() === "video" && s?.videoUrl,
          )?.videoUrl
        : "") ||
      post.videoUrl ||
      "",
    category: cat?.name || base.category,
    categoryId,
    subCategories,
    tags: Array.isArray(post.tags) ? post.tags : [],
    coverImage: post.thumbnailUrl || "",
    quickAnswer: post.ai?.summary || "",
    disclaimer,
    blocks,
    seo: {
      metaTitle: post.seo?.title || "",
      metaDescription: post.seo?.description || "",
      slug: post.seo?.slug || "",
      keywords: Array.isArray(post.ai?.keywords) ? post.ai.keywords : [],
    },
  };
};

/* ─── Guard: a data-URL that slips through means an upload failed and the
   uploader's offline fallback embedded the raw file instead. That's fine for
   continued local editing, but it must never reach the API — a multi-MB
   base64 string blows past the JSON body limit and 500s the whole save
   (PayloadTooLargeError), and even a small one has no business living in
   Mongo per the "URLs/metadata only, never blobs" policy this app follows.
   Fail fast with a message that names what to re-upload. ─── */
const isDataUrl = (s: unknown): s is string => typeof s === "string" && s.startsWith("data:");

const assertNoEmbeddedMedia = (payload: any) => {
  const offenders: string[] = [];
  if (isDataUrl(payload.thumbnailUrl)) offenders.push("cover image");
  (payload.sections || []).forEach((s: any, i: number) => {
    const label = `block #${i + 1} (${s.type})`;
    if (isDataUrl(s.image) || isDataUrl(s.videoUrl)) offenders.push(label);
    if (Array.isArray(s.images) && s.images.some(isDataUrl)) offenders.push(label);
  });
  if (offenders.length) {
    throw new Error(
      `These didn't finish uploading, so they can't be saved yet: ${[...new Set(offenders)].join(", ")}. ` +
        `Check your connection (or that you're still logged in) and re-upload them, then save again.`,
    );
  }
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
    const payload = toPostPayload(story);
    assertNoEmbeddedMedia(payload);
    const res = await API.post(`/posts`, payload);
    return fromPost(unwrap(res));
  },

  /** Update an existing post from a Story. */
  async update(id: string, story: Story): Promise<Story> {
    const payload = toPostPayload(story);
    assertNoEmbeddedMedia(payload);
    const res = await API.put(`/posts/update/${id}`, payload);
    return fromPost(unwrap(res));
  },

  /** Delete a post. */
  async remove(id: string): Promise<void> {
    await API.delete(`/posts/${id}`);
  },

  /**
   * Upload an image via POST /upload/image. If this fails (offline, auth
   * expired, server down), ImageUploader falls back to a local data-URL
   * preview so editing isn't blocked — but assertNoEmbeddedMedia (above)
   * refuses to save the story until it's re-uploaded to a real URL.
   */
  async uploadImage(file: File): Promise<string> {
    // Delegates rather than re-posting: the hand-rolled version here set
    // Content-Type: multipart/form-data explicitly, which suppresses the
    // boundary axios would otherwise generate (so multer saw no file), and
    // read the url from res.data.url / res.data.data.path — neither of which
    // exists, since the backend wraps responses as { status, message, data }
    // and the field is called `url`. Both bugs surfaced as a silent "" and
    // sent the editor down its local-preview fallback on every upload.
    return uploadSingleImage(file);
  },
};

export default StoryService;
