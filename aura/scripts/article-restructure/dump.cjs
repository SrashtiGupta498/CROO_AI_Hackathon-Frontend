/* Compact dump of pending work items for in-session stages 1–2.
   Usage: node dump.cjs <count> [startIndex]  — skips FACE_OIL / INGREDIENT_REFERENCE. */
const fs = require("fs");
const { WORK_DIR, loadManifest } = require("./paths.cjs");
const path = require("path");
const SKIP_TYPES = ["FACE_OIL", "INGREDIENT_REFERENCE"];
const m = loadManifest();
const ids = Object.entries(m.articles)
  .filter(([, a]) => a.stage1 === "pending")
  .map(([id]) => id);
const n = Number(process.argv[2] || 5);
const start = Number(process.argv[3] || 0);
let shown = 0, seen = 0;
for (const id of ids) {
  const w = JSON.parse(fs.readFileSync(path.join(WORK_DIR, id + ".json"), "utf8"));
  if (SKIP_TYPES.includes(w.source.type)) continue;
  if (seen++ < start) continue;
  if (shown++ >= n) break;
  const s = w.source;
  console.log("═══ " + id + " ═══");
  console.log(JSON.stringify({
    title: s.title, subtitle: s.subtitle, slug: s.slug, type: s.type,
    authorId: s.authorId, categoryId: s.categoryId, subCategories: s.subCategories,
    tags: s.tags, isPublished: s.isPublished, visibility: s.visibility,
    contentLanguage: s.contentLanguage, sectionSignature: s.sectionSignature,
    sectionTitles: s.sectionTitles, existingAi: s.existingAi && s.existingAi.summary,
    thumbnailUrl: w.media.thumbnailUrl, images: w.media.images.length, videos: w.media.videos.length,
    flags: w.flags, boundaryCandidates: w.boundaryCandidates,
    excludedLines: w.excludedLines, structured: w.structured,
  }));
  console.log("--- prose (" + w.prose.wordCount + "w) ---");
  for (const p of w.prose.paragraphs) console.log("[" + p.i + "] " + p.text);
  console.log();
}
