#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Assembles the per-article files written by stages 1 and 2 into the
   two deliverables, and refreshes the manifest's resume state.

   Per-article files are the unit of work precisely so the run is
   resumable: stopping at article 57 leaves 57 files on disk, and the
   next run picks up at 58. This script never regenerates content — it
   only collects, validates and reports.

     node merge.cjs
   Output: output/article_summaries.json
           output/processed_articles.json
           output/failed_articles.json
   ════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const {
  SUM_DIR, ART_DIR, WORK_DIR,
  SUMMARIES_JSON, PROCESSED_JSON, FAILED_JSON,
  ensureDirs, readJson, writeJson, loadManifest, saveManifest,
} = require("./paths.cjs");
const { validateArticle } = require("./validate.cjs");

const listJson = (dir) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];

function main() {
  ensureDirs();
  const manifest = loadManifest();
  manifest.articles = manifest.articles || {};

  /* ─── Stage 1 ─── */
  const summaries = listJson(SUM_DIR).map((f) => readJson(path.join(SUM_DIR, f)));
  writeJson(SUMMARIES_JSON, summaries);
  summaries.forEach((s) => {
    manifest.articles[s._id] = { ...(manifest.articles[s._id] || {}), stage1: "done" };
  });

  /* ─── Stage 2 (validated on the way through) ─── */
  const processed = [];
  const failed = [];
  for (const f of listJson(ART_DIR)) {
    const article = readJson(path.join(ART_DIR, f));
    const work = readJson(path.join(WORK_DIR, `${article._id}.json`));
    const summary = readJson(path.join(SUM_DIR, `${article._id}.json`));
    const result = validateArticle(article, { work, summary });

    const entry = manifest.articles[article._id] || {};
    if (result.ok) {
      processed.push({ ...article, _validation: { status: "passed", warnings: result.warnings } });
      manifest.articles[article._id] = { ...entry, stage2: "done", validation: "passed" };
    } else {
      failed.push({ _id: article._id, title: article.title, errors: result.errors, warnings: result.warnings });
      manifest.articles[article._id] = { ...entry, stage2: "failed", validation: "failed" };
    }
  }
  writeJson(PROCESSED_JSON, processed);
  writeJson(FAILED_JSON, failed);
  saveManifest(manifest);

  const rows = Object.values(manifest.articles);
  const pending = rows.filter((a) => a.stage1 === "pending").length;
  const skipped = rows.filter((a) => a.stage1 === "skipped").length;
  console.log(`merged:`);
  console.log(`  article_summaries.json   ${summaries.length}`);
  console.log(`  processed_articles.json  ${processed.length}`);
  console.log(`  failed_articles.json     ${failed.length}`);
  console.log(`  still awaiting stage 1:  ${pending}`);
  if (skipped) console.log(`  recipe posts left as-is: ${skipped}`);
  const warned = processed.filter((p) => p._validation.warnings.length).length;
  if (warned) console.log(`  passed with warnings:    ${warned}`);
  failed.forEach((f) => console.log(`  ! ${f._id} — ${f.errors.join("; ")}`));
}

if (require.main === module) main();
