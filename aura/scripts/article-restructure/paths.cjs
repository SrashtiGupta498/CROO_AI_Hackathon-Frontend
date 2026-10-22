/* ════════════════════════════════════════════════════════════
   Shared paths + tiny helpers for the article-restructure pipeline.

   The source export is treated as READ-ONLY throughout: nothing in this
   directory ever opens it for writing.
   ════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

/** Read-only source export. Override with SOURCE_JSON=… if it moves. */
const SOURCE_JSON =
  process.env.SOURCE_JSON || "C:/Users/medgr/Downloads/BLOG.Post.json";

const OUT_ROOT = path.join(ROOT, "output");
const WORK_DIR = path.join(OUT_ROOT, "work"); // stage 0 — extracted work items
const SUM_DIR = path.join(OUT_ROOT, "summaries"); // stage 1 — one file per article
const ART_DIR = path.join(OUT_ROOT, "articles"); // stage 2 — one file per article
const MANIFEST = path.join(OUT_ROOT, "manifest.json"); // resume state

const SUMMARIES_JSON = path.join(OUT_ROOT, "article_summaries.json");
const PROCESSED_JSON = path.join(OUT_ROOT, "processed_articles.json");
const FAILED_JSON = path.join(OUT_ROOT, "failed_articles.json");

const ensureDirs = () => {
  [OUT_ROOT, WORK_DIR, SUM_DIR, ART_DIR].forEach((d) =>
    fs.mkdirSync(d, { recursive: true }),
  );
};

/** Mongo extended-JSON ids arrive as { $oid }; plain strings pass through. */
const oid = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.$oid) return v.$oid;
  return String(v);
};

const readJson = (f, fallback = null) =>
  fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback;

const writeJson = (f, data) =>
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");

const loadManifest = () => readJson(MANIFEST, { articles: {} });
const saveManifest = (m) => {
  m.updatedAt = new Date().toISOString();
  writeJson(MANIFEST, m);
};

module.exports = {
  ROOT,
  SOURCE_JSON,
  OUT_ROOT,
  WORK_DIR,
  SUM_DIR,
  ART_DIR,
  MANIFEST,
  SUMMARIES_JSON,
  PROCESSED_JSON,
  FAILED_JSON,
  ensureDirs,
  oid,
  readJson,
  writeJson,
  loadManifest,
  saveManifest,
};
