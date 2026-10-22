#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   STAGE 0 — deterministic extraction / pre-processing.

   Reads the read-only source export (BLOG.Post.json) and, for every
   article, produces a "work item": the raw prose split into paragraphs,
   with navigation / promo / credit lines pulled out and candidate topic
   boundaries marked. NOTHING here rewrites content — this stage only does
   the mechanical work, so the model-driven stages (1 & 2) spend their
   budget on judgement instead of on string handling.

   Usage:
     node extract.js                 # all articles
     node extract.js --ids a,b,c     # only these _id values
     node extract.js --limit 25      # first N
   Output: output/work/<id>.json  +  output/manifest.json
   ════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const {
  SOURCE_JSON, WORK_DIR, ensureDirs, oid, loadManifest, saveManifest,
} = require("./paths.cjs");

/* ─── Lines that are site furniture, not article prose. Anchored at the
   start of a line so a mid-sentence "read more about…" isn't mistaken
   for a nav link. ─── */
const NAV_PATTERNS = [
  /^also\s*read\s*[:\-–]/i,
  /^read\s*(also|more|next)\s*[:\-–]/i,
  /^(don'?t|do not)\s*miss\s*[:\-–]/i,
  /^you\s*(may|might)\s*also\s*(like|read)\s*[:\-–]?/i,
  /^related\s*(article|story|stories|reading|news)?\s*[:\-–]/i,
  /^more\s*(on|from|like)\s*this\s*[:\-–]?/i,
  /^watch\s*[:\-–]/i,
  /^see\s*(also|more)\s*[:\-–]/i,
  /^in\s*case\s*you\s*missed\s*it\s*[:\-–]?/i,
  /^trending\s*(now|stories)?\s*[:\-–]/i,
];
const CREDIT_PATTERNS = [
  /^(image|photo|picture|pic)\s*(credit|courtesy|source)s?\s*[:\-–]/i,
  /^(credit|courtesy)s?\s*[:\-–]/i,
  /^\(?\s*(representative\s+)?(image|photo)\s*[:\-–]/i,
  /^source\s*[:\-–]\s*\S/i,
  /^\s*(getty|shutterstock|unsplash|istock|pexels|freepik)\b/i,
];
const PROMO_PATTERNS = [
  /^(subscribe|sign up|download the app|follow us|join our)\b/i,
  /^(advertisement|sponsored|paid content)\b/i,
  /^click here\b/i,
  /^(share|tweet) this\b/i,
  /^for more (news|stories|articles|updates)\b/i,
  /^(visit|check out) (the |our )?\w+.{0,40}\bfor more\b/i,
];
/* Bare numeric lines are the CMS's image ids, left behind where a photo was
   stripped out of the scrape (e.g. "122045423" between listicle points).
   They read as prose to every other rule, so match them explicitly. */
const ARTIFACT_PATTERNS = [
  /^[0-9]{4,}$/,
  /^[\s•·\-–—*]+$/,
];
const BYLINE_PATTERNS = [
  /^(by|written by|authored by|reported by)\s+[A-Z][\w.'’-]+(\s+[A-Z][\w.'’-]+){0,3}\s*$/,
  /^(published|updated|last updated)\s*(on)?\s*[:\-–]?\s*\w/i,
];

const classifyLine = (line) => {
  const t = line.trim();
  if (!t) return "blank";
  if (NAV_PATTERNS.some((r) => r.test(t))) return "nav";
  if (ARTIFACT_PATTERNS.some((r) => r.test(t))) return "artifact";
  if (CREDIT_PATTERNS.some((r) => r.test(t))) return "credit";
  if (PROMO_PATTERNS.some((r) => r.test(t))) return "promo";
  if (BYLINE_PATTERNS.some((r) => r.test(t))) return "byline";
  return "prose";
};

/* ─── HTML → plain text. Bodies in the export are a mix of raw prose and
   light HTML; both must collapse to the same paragraph list. ─── */
const htmlToText = (html) =>
  String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

/* ─── Vocabulary overlap between neighbouring paragraphs. A sustained drop
   to ~zero is the signal that a second, unrelated article was concatenated
   onto the first. Reported as a CANDIDATE only — stage 1 decides. ─── */
const STOP = new Set(
  ("a an the and or but if then than that this these those of in on at to for from with without by as is are was were be been being it its you your we our they their he she his her not no do does did have has had will would can could should may might more most other some such only own same so too very just now what which who whom when where why how all any both each few nor out up down over under again further once here there").split(" "),
);
const bag = (s) =>
  new Set(
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );
const overlap = (a, b) => {
  const A = bag(a);
  const B = bag(b);
  if (!A.size || !B.size) return 1;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit += 1;
  return hit / Math.min(A.size, B.size);
};

/**
 * Flag paragraph indexes where the topic plausibly changes. Compares the
 * preceding three paragraphs against the next two, so a single off-topic
 * sentence doesn't trip it but a whole new article does.
 */
const boundaryCandidates = (paras) => {
  const out = [];
  for (let i = 1; i < paras.length; i += 1) {
    const before = paras.slice(Math.max(0, i - 3), i).join(" ");
    const after = paras.slice(i, i + 2).join(" ");
    if (words(before) < 40 || words(after) < 40) continue;
    const cohesion = overlap(before, after);
    if (cohesion <= 0.06) {
      out.push({ index: i, cohesion: +cohesion.toFixed(3), preview: paras[i].slice(0, 160) });
    }
  }
  return out;
};

/* Overlap against the article title: a paragraph sharing nothing with the
   title AND sitting after a low-cohesion break is the strongest
   concatenation signal there is. */
const titleAffinity = (title, para) => +overlap(title, para).toFixed(3);

function buildWorkItem(post) {
  const id = oid(post._id);
  const sections = (post.sections || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const media = { thumbnailUrl: post.thumbnailUrl || null, images: [], videos: [] };
  const structured = []; // ingredients / instructions / quotes / sources — preserved verbatim
  const proseChunks = [];

  for (const s of sections) {
    const type = String(s.type || "").toLowerCase();

    if (["image", "images", "gallery", "hero"].includes(type)) {
      const urls = (Array.isArray(s.images) && s.images.length ? s.images : s.image ? [s.image] : []).filter(Boolean);
      media.images.push(...urls);
      // A hero can also carry a lede — keep its prose, drop its picture.
      if (type === "hero" && (s.title || s.body)) {
        proseChunks.push({ sourceType: type, title: s.title || "", text: htmlToText(s.body) });
      }
      continue;
    }
    if (["video", "gif", "reel"].includes(type)) {
      if (s.videoUrl) media.videos.push(s.videoUrl);
      if (s.image) media.images.push(s.image);
      continue;
    }
    if (["ingredients", "instructions"].includes(type) || (s.items || []).length || (s.steps || []).length) {
      structured.push({
        sourceType: type,
        title: s.title || "",
        items: s.items || [],
        steps: s.steps || [],
        body: htmlToText(s.body),
      });
      continue;
    }
    if (["quote", "source"].includes(type)) {
      structured.push({
        sourceType: type,
        title: s.title || "",
        body: htmlToText(s.body),
        author: s.author || "",
      });
      continue;
    }
    if (type === "divider") continue;

    proseChunks.push({ sourceType: type, title: s.title || "", text: htmlToText(s.body) });
  }

  // rawBody (the 90 scraped posts) is sometimes the fuller original — prefer
  // it only when it actually carries more prose, so nothing is lost either way.
  const sectionProse = proseChunks
    .map((c) => (c.title ? `${c.title}\n\n${c.text}` : c.text))
    .filter(Boolean)
    .join("\n\n");
  const raw = htmlToText(post.rawBody);
  const usedRawBody = Boolean(raw) && words(raw) > words(sectionProse) * 1.15;
  const prose = usedRawBody ? raw : sectionProse;

  // Split on ANY newline run: this export uses a single "\n" between
  // paragraphs as often as a blank line, and collapsing only on blank lines
  // welds a nav link ("Also read: …") onto the paragraph beside it.
  // How many real content sections came in with their own heading — the
  // signal that an article was already written as sections, not as one blob.
  const titledSections = sections.filter(
    (s) =>
      (s.title || "").trim() &&
      !["image", "images", "gallery", "hero", "video", "gif", "reel", "divider", "source"].includes(
        String(s.type || "").toLowerCase(),
      ),
  ).length;

  const lines = prose.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const paragraphs = [];
  const excludedLines = [];
  lines.forEach((line, i) => {
    const kind = classifyLine(line);
    if (kind === "prose") paragraphs.push(line);
    else excludedLines.push({ line, kind, atIndex: i });
  });

  return {
    _id: id,
    stage0Version: 1,
    source: {
      title: post.title || "",
      subtitle: post.subtitle || "",
      slug: post.slug || "",
      type: post.type || null,
      authorId: post.authorId || null,
      tags: post.tags || [],
      categoryId: oid(post.categoryId),
      subCategories: (post.subCategories || []).map(oid).filter(Boolean),
      isPublished: !!post.isPublished,
      visibility: post.visibility || "public",
      contentLanguage: post.contentLanguage || null,
      publishedAt: post.publishedAt || null,
      existingAi: post.ai || null,
      existingSeo: post.seo || null,
      provenance: post.source || null,
      sectionSignature: sections.map((s) => s.type).join("+"),
      sectionTitles: sections.map((s) => s.title || null),
    },
    media,
    structured,
    prose: {
      usedRawBody,
      wordCount: words(prose),
      paragraphCount: paragraphs.length,
      paragraphs: paragraphs.map((text, i) => ({
        i,
        words: words(text),
        titleAffinity: titleAffinity(post.title || "", text),
        text,
      })),
    },
    excludedLines,
    boundaryCandidates: boundaryCandidates(paragraphs),
    flags: {
      empty: paragraphs.length === 0,
      thin: words(prose) < 120,
      hasNavLines: excludedLines.some((e) => e.kind === "nav"),
      likelyConcatenated: boundaryCandidates(paragraphs).length > 0,
      hasStructuredRecipe: structured.some((s) => ["ingredients", "instructions"].includes(s.sourceType)),
      // Already organised, so nothing to restructure. Two ways to qualify:
      // native recipe section types, or simply three-plus sections that each
      // already carry their own heading (how the older DIY posts were written
      // — every section typed `paragraph`, but properly titled).
      alreadyStructured:
        structured.some((s) => ["ingredients", "instructions"].includes(s.sourceType)) ||
        titledSections >= 3,
    },
  };
}

/* ─── main ─── */
function main() {
  const argv = process.argv.slice(2);
  const arg = (k) => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : null;
  };
  const onlyIds = (arg("--ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const limit = arg("--limit") ? Number(arg("--limit")) : null;
  const includeRecipes = argv.includes("--include-recipes");
  let skipped = 0;

  ensureDirs();
  const all = JSON.parse(fs.readFileSync(SOURCE_JSON, "utf8"));
  let picked = all;
  if (onlyIds.length) picked = all.filter((p) => onlyIds.includes(oid(p._id)));
  if (limit) picked = picked.slice(0, limit);

  const manifest = loadManifest();
  manifest.articles = manifest.articles || {};

  for (const post of picked) {
    const item = buildWorkItem(post);
    fs.writeFileSync(path.join(WORK_DIR, `${item._id}.json`), JSON.stringify(item, null, 2));
    const prev = manifest.articles[item._id] || {};
    // Recipe posts already carry real ingredients/instructions/benefits
    // sections — they never had the wall-of-text problem, so they are left
    // exactly as they are: excluded from stages 1 and 2 entirely, not even
    // re-tagged. Pass --include-recipes to override.
    const skipRecipe = item.flags.alreadyStructured && !includeRecipes;
    manifest.articles[item._id] = {
      ...prev,
      title: item.source.title,
      words: item.prose.wordCount,
      flags: item.flags,
      stage0: "done",
      stage1: skipRecipe ? "skipped" : prev.stage1 || "pending",
      stage2: skipRecipe ? "skipped" : prev.stage2 || "pending",
      ...(skipRecipe ? { skipReason: "already structured (recipe post) — left untouched" } : {}),
    };
    if (skipRecipe) skipped += 1;
  }
  manifest.sourceTotal = all.length;
  saveManifest(manifest);

  const f = picked.map((p) => manifest.articles[oid(p._id)].flags);
  const n = (k) => f.filter((x) => x[k]).length;
  console.log(`stage 0: extracted ${picked.length} article(s) -> ${WORK_DIR}`);
  console.log(
    `  empty:${n("empty")}  thin:${n("thin")}  nav-lines:${n("hasNavLines")}  ` +
      `concat-candidates:${n("likelyConcatenated")}  already-structured:${n("alreadyStructured")}`,
  );
  if (skipped) console.log(`  ${skipped} recipe post(s) left untouched (already structured)`);
}

if (require.main === module) main();
module.exports = { buildWorkItem, htmlToText, classifyLine, overlap };
