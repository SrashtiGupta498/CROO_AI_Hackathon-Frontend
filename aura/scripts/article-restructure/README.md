# Article restructure pipeline

Turns the flat, single-blob articles in `BLOG.Post.json` into properly
sectioned articles that drop straight into the existing Story Editor.

**The source export is never written to.** Everything lands under `output/`.
**Nothing touches MongoDB or the live CMS** — this phase produces JSON only.
**No images are generated, downloaded or prompted for.** Existing image URLs
are carried through untouched.

## No API key, and what that costs

There is no `ANTHROPIC_API_KEY` anywhere in here, and no Claude SDK/REST call.
The rewriting is done by Claude Code reading the work items in-session and
writing the result files — so the pipeline is **semi-automated**, not
unattended. The scripts do all the mechanical work (extraction, noise
stripping, boundary detection, validation, assembly); the model does the
judgement work in batches.

That means: run `extract`, hand a batch of work items to Claude Code, let it
write `output/summaries/*.json` and `output/articles/*.json`, run `merge`.
Repeat. There is no way around the batching without an API key, and the
alternative — a regex/heuristic rewriter — cannot do steps 4–6 of the brief
(understand, then restructure) at any acceptable quality.

## Resuming

Every article is its own file in `output/summaries/` and `output/articles/`,
and `output/manifest.json` records `stage0`/`stage1`/`stage2` per article. Stop
at article 57 and the next batch starts at 58 — nothing is recomputed and
nothing is lost. `merge.cjs` reassembles the aggregates from whatever is on
disk at the time.

Find the next batch:

```bash
node -e "const m=require('./output/manifest.json');console.log(Object.entries(m.articles).filter(([,a])=>a.stage1!=='done').slice(0,10).map(([id,a])=>id+'  '+a.title).join('\n'))"
```

## Stages

| Stage | Who runs it | Input | Output |
|---|---|---|---|
| 0 — extract | `extract.cjs` (deterministic) | `BLOG.Post.json` | `output/work/<id>.json` |
| 1 — understand | Claude Code, in session | work item | `output/summaries/<id>.json` |
| 2 — regenerate | Claude Code, in session | work item + summary | `output/articles/<id>.json` |
| gate | `validate.cjs` | article | pass / fail |
| assemble | `merge.cjs` | all of the above | `article_summaries.json`, `processed_articles.json`, `failed_articles.json` |

```bash
node extract.cjs --ids <id>,<id>     # or --limit N, or no args for all 1081
node validate.cjs                    # gate every generated article
node merge.cjs                       # rebuild the three aggregate files
```

### Already-structured posts are left untouched

132 of the 1,081 never had the wall-of-text problem and are excluded from
stages 1 and 2 entirely — not restructured, not re-tagged, not rewritten.
`extract.cjs` marks them `stage1: "skipped"` in the manifest. They qualify
either by carrying native `ingredients`/`instructions` sections (115 recipe
posts) or by simply having three or more sections that already have their own
headings (17 older DIY posts, whose sections are typed `paragraph` but properly
titled). `--include-recipes` overrides the skip if that is ever wanted.

That leaves **949 articles to process**, 454 of which show a topic boundary.

### Stage 0 does the mechanical work

- HTML → plain text, split into paragraphs on **any** newline run (this export
  uses single `\n` between paragraphs as often as blank lines).
- Pulls out site furniture as `excludedLines`, tagged `nav` / `credit` /
  `promo` / `byline` / `artifact`. `artifact` catches bare numeric lines — CMS
  image ids left behind where a photo was stripped from the scrape.
- Preserves `ingredients` / `instructions` / `quote` / `source` sections
  verbatim in `structured` — recipe posts already have good structure and must
  not be re-prosed.
- Prefers `rawBody` over the section prose only when it actually carries more.
- **Boundary detection**: scores vocabulary cohesion between each paragraph and
  its neighbours; a sustained collapse to ~0 marks where a second, unrelated
  article was concatenated on. Reported as a *candidate* — stage 1 decides.
  `titleAffinity` per paragraph is the corroborating signal.

### Stage 2 gate (`validate.cjs`)

Schema: `_id` preserved and a valid Mongo id, `authorId` a Mongo id (the DTO
uses `@IsMongoId`), url-safe slug, every section type in `SECTION_TYPES`,
contiguous `order`, no empty bodies, no duplicate headings, no near-duplicate
sections, lowercase tags, SEO lengths.

Fidelity — the anti-fabrication checks:

- **Every number** in the output must appear in the source. Catches invented
  stats, doses and percentages outright.
- **Vocabulary drift**: distinctive words absent from the source are flagged;
  past 25% the article fails as likely fabricated.
- **Topic bleed**: words that exist *only* in a segment stage 1 removed must
  not reappear in the rewrite.

A failure writes the article to `failed_articles.json` and the run continues.

## Output shape

`processed_articles.json` entries are **`CreatePostDto` payloads** — the exact
body `PUT /v1/posts/update/:id` accepts — plus a `_pipeline` block the importer
strips. No invented fields.

| Brief asks for | Actual field in this app |
|---|---|
| excerpt | `subtitle` — what `ArticleCard.tsx` prints under the title |
| summary / TL;DR | `ai.summary` — the editor's "Quick Answer" |
| sections | `sections[]` with `{type,title,body,order}` |
| SEO title / description / slug | `seo.title` / `seo.description` / `seo.slug` |
| keywords | `ai.keywords` |
| tags | `tags[]` (schema lowercases them) |
| category / subcategory | `categoryId` / `subCategories[]` — **preserved, never invented** |
| author | `authorId` — preserved |
| reading time | *not stored*. The editor computes it from word count at render. |
| content type | `type` — preserved (`DIY`, `FACE_OIL`, …) |

`_pipeline` carries `originalTitle`, what was removed and why, and
`reviewFlags` for anything an editor should look at.

### Editor gotchas worth knowing

- `story.service.ts#fromPost` treats **any** `warning` section, or any section
  titled "Disclaimer", as the dedicated Disclaimer field — it will not appear
  as a content block. Don't emit `warning` sections unless you mean the
  disclaimer.
- The Story Editor's save path (`toPostPayload`) writes only
  `ai.summary` + `ai.keywords`. Opening a processed article there and saving
  **wipes `ai.highlights` and `ai.keyTakeaways`**. The other admin editor
  (`/admin/article-editor/:id`, `pages/ArticleEditor.tsx`) reads and edits both
  — use that one if those fields matter. Highlights cap at 4, takeaways at 6.
- Section bodies are sanitised server-side; only
  `p br b i em strong u s ul ol li blockquote a span h1-h4` survive. Tables and
  headings beyond `h4` are stripped.

## Rules the content generation follows

Section count is never fixed — it comes from the source. A recipe gets
what-it-is / ingredients / method / notes; a news explainer gets intro /
what happened / what still applies; a routine guide gets one section per step.

Nothing is invented: no facts, stats, studies, claims, quotes, ingredients or
citations that are not in the source. Where the source is missing something,
the field is left empty and the gap is recorded in the summary's `gaps` and in
`_pipeline.reviewFlags` — including the awkward cases, like a headline
promising seven items when only three survived the original import.
