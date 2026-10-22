#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   STAGE 2 gate — validates a generated article before it is allowed
   into processed_articles.json.

   Two jobs:
     1. SCHEMA — would the backend actually accept this? Mirrors
        CreatePostDto / PostSectionDto (post/dto/*.dto.ts) and
        SECTION_TYPES (post/schema/post.schema.ts) in the API repo.
        Keep this list in sync if those change.
     2. FIDELITY — is the content still the source's content? Checks
        for fabricated numbers, vocabulary that only exists in a
        discarded segment, empty or duplicated sections, and prose
        that has drifted too far from the source wording.

   A failing article is recorded in failed_articles.json and skipped;
   the run continues.

     node validate.cjs            # validate everything in output/articles
     node validate.cjs <id>       # just one
   ════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const { SUM_DIR, ART_DIR, WORK_DIR, readJson } = require("./paths.cjs");

/* Mirrors SECTION_TYPES in the API's post.schema.ts. */
const SECTION_TYPES = [
  "hero", "title", "paragraph", "text", "quote", "intro", "conclusion",
  "highlight", "image", "images", "gallery", "video", "gif", "reel",
  "ingredients", "instructions", "benefits", "notes", "source", "tip",
  "faq", "warning", "callout", "divider",
];
/** Sections that carry no body of their own — exempt from the "must have
 *  content" rule. */
const MEDIA_TYPES = ["image", "images", "gallery", "video", "gif", "reel", "divider"];

const MONGO_ID = /^[0-9a-fA-F]{24}$/;

const stripHtml = (s) =>
  String(s || "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

const wordsOf = (s) =>
  stripHtml(s).toLowerCase().replace(/[^a-z0-9\s'’-]/g, " ").split(/\s+/).filter(Boolean);

/** Numbers as a reader would see them: 271, 450, 30, 2006 — but not the
 *  digits inside a word like "BS4" or a hyphenated range. */
const numbersOf = (s) => (stripHtml(s).match(/\b\d[\d,.]*\b/g) || []).map((n) => n.replace(/[,.]$/, ""));

const STOP = new Set(
  "a an the and or but if then than that this these those of in on at to for from with without by as is are was were be been being it its you your we our they their he she his her not no do does did have has had will would can could should may might more most other some such only own same so too very just now what which who whom when where why how all any both each few nor out up down over under again further once here there also into about after before their them then they there".split(" "),
);
const contentWords = (s) => wordsOf(s).filter((w) => w.length > 3 && !STOP.has(w));

/** Everything the source actually said, as one lowercase haystack. */
function sourceCorpus(work) {
  if (!work) return null;
  const parts = [
    work.source.title, work.source.subtitle,
    ...(work.prose.paragraphs || []).map((p) => p.text),
    ...(work.structured || []).map((s) => [s.title, s.body, (s.steps || []).join(" "),
      (s.items || []).map((i) => `${i.name || ""} ${i.amount || ""} ${i.note || ""}`).join(" ")].join(" ")),
  ];
  return parts.filter(Boolean).join("\n");
}

/** Text of the segments stage 1 decided did NOT belong to this article. */
function discardedCorpus(work, summary) {
  if (!work || !summary) return "";
  const segs = summary.boundary?.discardedSegments || [];
  const paras = work.prose.paragraphs || [];
  return segs
    .flatMap((seg) => {
      const [from, to] = seg.paragraphs || [];
      if (from == null) return [];
      return paras.filter((p) => p.i >= from && p.i <= to).map((p) => p.text);
    })
    .join("\n");
}

function validateArticle(article, { work, summary } = {}) {
  const errors = [];
  const warnings = [];
  const E = (m) => errors.push(m);
  const W = (m) => warnings.push(m);

  /* ─── 1. identity + required Post fields ─── */
  if (!article._id) E("missing _id — the article could not be mapped back to the CMS");
  else if (!MONGO_ID.test(article._id)) E(`_id "${article._id}" is not a 24-char Mongo id`);
  if (work && work._id !== article._id) E("_id does not match the source work item");
  if (!article.title || !article.title.trim()) E("missing title");
  if (article.title && article.title.length > 140) W(`title is ${article.title.length} chars — long for a card`);
  if (!article.slug || !/^[a-z0-9-]+$/.test(article.slug)) E("slug missing or not url-safe");
  if (!article.authorId || !MONGO_ID.test(String(article.authorId))) {
    E("authorId missing or not a Mongo id — CreatePostDto requires @IsMongoId");
  }
  if (article.categoryId && !MONGO_ID.test(article.categoryId)) E("categoryId is not a Mongo id");
  (article.subCategories || []).forEach((c) => {
    if (!MONGO_ID.test(c)) E(`subCategories entry "${c}" is not a Mongo id`);
  });

  /* ─── 2. sections ─── */
  const sections = article.sections || [];
  if (!sections.length) E("no sections");
  const headings = [];
  const bodies = [];
  sections.forEach((s, i) => {
    const at = `section ${i + 1}`;
    if (!SECTION_TYPES.includes(s.type)) E(`${at}: type "${s.type}" is not in SECTION_TYPES`);
    if (typeof s.order !== "number") E(`${at}: missing numeric order`);
    if (MEDIA_TYPES.includes(s.type)) return;

    const text = stripHtml(s.body);
    if (!text) E(`${at}: empty body`);
    else if (wordsOf(text).length < 8) W(`${at}: only ${wordsOf(text).length} words`);
    if (s.type === "quote") return; // a quote legitimately carries no heading

    if (!s.title || !s.title.trim()) {
      // The lede intentionally runs headingless, as it does in the editor.
      if (i > 1) W(`${at}: no heading`);
    } else headings.push(s.title.trim().toLowerCase());
    if (text) bodies.push(text);
  });
  sections.forEach((s, i) => {
    if (s.order !== i) W(`section ${i + 1}: order ${s.order} is not contiguous`);
  });

  const dupeHeading = headings.find((h, i) => headings.indexOf(h) !== i);
  if (dupeHeading) E(`duplicate section heading: "${dupeHeading}"`);

  // Near-duplicate bodies — the classic failure when one blob is split badly.
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const A = new Set(contentWords(bodies[i]));
      const B = new Set(contentWords(bodies[j]));
      if (!A.size || !B.size) continue;
      let hit = 0;
      for (const w of A) if (B.has(w)) hit += 1;
      if (hit / Math.min(A.size, B.size) > 0.8) {
        E(`sections ${i + 1} and ${j + 1} repeat the same content`);
      }
    }
  }

  /* ─── 3. metadata ─── */
  // `subtitle` IS the excerpt: it is what ArticleCard.tsx prints under the
  // title on every listing, and what the editor labels "Subtitle".
  if (!article.subtitle || !article.subtitle.trim()) E("missing subtitle (the card excerpt)");
  else {
    if (article.subtitle.length > 320) W(`subtitle is ${article.subtitle.length} chars — long for a card`);
    const firstBody = stripHtml(sections.find((s) => !MEDIA_TYPES.includes(s.type))?.body);
    if (firstBody && firstBody.slice(0, 120) === article.subtitle.slice(0, 120)) {
      W("subtitle is a verbatim copy of the opening paragraph");
    }
  }
  // ai.summary is the reader-facing TL;DR the editor calls "Quick Answer".
  if (!article.ai?.summary) W("no ai.summary (Quick Answer)");
  const tags = article.tags || [];
  if (!tags.length) W("no tags");
  if (tags.length > 8) W(`${tags.length} tags — reads as keyword stuffing`);
  tags.forEach((t) => {
    if (t !== t.toLowerCase()) E(`tag "${t}" is not lowercase (the schema lowercases tags)`);
    if (t.length > 40) W(`tag "${t}" is unusually long`);
  });
  if (new Set(tags).size !== tags.length) E("duplicate tags");

  if (article.seo?.title && article.seo.title.length > 70) W(`seo.title is ${article.seo.title.length} chars (>70)`);
  if (article.seo?.description) {
    const n = article.seo.description.length;
    if (n > 165) W(`seo.description is ${n} chars (>165)`);
    if (n < 50) W(`seo.description is only ${n} chars`);
  } else W("no seo.description");

  /* ─── 4. fidelity to the source ─── */
  const corpus = sourceCorpus(work);
  if (corpus) {
    const haystack = corpus.toLowerCase();
    const srcNums = new Set(numbersOf(corpus));
    const generated = [
      article.title, article.subtitle, article.excerpt,
      article.ai?.summary, article.seo?.title, article.seo?.description,
      ...sections.map((s) => `${s.title || ""} ${s.body || ""}`),
      ...(article.ai?.highlights || []), ...(article.ai?.keyTakeaways || []),
    ].filter(Boolean).join("\n");

    // Any number the article states must exist in the source. This is the
    // cheapest reliable catch for invented stats, doses and percentages.
    const invented = [...new Set(numbersOf(generated))].filter((n) => !srcNums.has(n));
    if (invented.length) E(`numbers not present in the source: ${invented.join(", ")}`);

    // Vocabulary drift: distinctive words that appear nowhere in the source
    // are either invention or paraphrase gone too far.
    const unseen = [...new Set(contentWords(generated))].filter((w) => !haystack.includes(w.slice(0, Math.max(4, w.length - 2))));
    const ratio = unseen.length / Math.max(1, new Set(contentWords(generated)).size);
    if (ratio > 0.25) E(`${Math.round(ratio * 100)}% of distinctive words are absent from the source — likely fabricated`);
    else if (ratio > 0.15) W(`${Math.round(ratio * 100)}% of distinctive words are absent from the source`);

    // Topic bleed: content from a segment stage 1 cut out must not reappear.
    const discarded = discardedCorpus(work, summary);
    if (discarded) {
      const keptText = [
        work.source.title,
        ...(work.prose.paragraphs || [])
          .filter((p) => {
            const [from, to] = summary.boundary?.keepParagraphs || [];
            return from == null || (p.i >= from && p.i <= to);
          })
          .map((p) => p.text),
      ].join("\n").toLowerCase();
      // Compare on stems, not exact words: "infections" in the kept text has
      // to cover "infection" in the rewrite, or every plural the editor
      // normalises reads as bleed from the removed segment.
      const inKept = (w) => keptText.includes(w.slice(0, Math.max(4, w.length - 2)));
      const onlyDiscarded = new Set(contentWords(discarded).filter((w) => !inKept(w)));
      const bleed = [...new Set(contentWords(generated))].filter((w) => onlyDiscarded.has(w) && !inKept(w));
      if (bleed.length > 2) E(`content from the removed segment bled in: ${bleed.slice(0, 6).join(", ")}`);
      else if (bleed.length) W(`possible bleed from the removed segment: ${bleed.join(", ")}`);
    }
  } else {
    W("no work item found — fidelity checks skipped");
  }

  if (summary?.gaps?.length) W(`stage 1 flagged ${summary.gaps.length} gap(s) for editorial review`);

  return { ok: errors.length === 0, errors, warnings };
}

/* ─── cli ─── */
function main() {
  const only = process.argv[2];
  const files = fs.existsSync(ART_DIR)
    ? fs.readdirSync(ART_DIR).filter((f) => f.endsWith(".json") && (!only || f.startsWith(only)))
    : [];
  if (!files.length) return console.log("nothing to validate");
  let bad = 0;
  for (const f of files) {
    const article = readJson(path.join(ART_DIR, f));
    const r = validateArticle(article, {
      work: readJson(path.join(WORK_DIR, `${article._id}.json`)),
      summary: readJson(path.join(SUM_DIR, `${article._id}.json`)),
    });
    if (!r.ok) bad += 1;
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${article._id}  ${article.title}`);
    r.errors.forEach((e) => console.log(`      ✗ ${e}`));
    r.warnings.forEach((w) => console.log(`      ~ ${w}`));
  }
  console.log(`\n${files.length - bad}/${files.length} passed`);
}

if (require.main === module) main();
module.exports = { validateArticle, SECTION_TYPES, MEDIA_TYPES };
