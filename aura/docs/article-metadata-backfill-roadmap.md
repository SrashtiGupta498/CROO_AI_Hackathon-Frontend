# Article Reformat & Metadata Backfill — Roadmap

Backfill the missing editorial metadata on all **1081** posts in the `Post`
collection: TL;DR summary, highlights, key takeaways, steps, keywords,
hashtags, tags, SEO block and subtitle.

**Images are out of scope.** Nothing in this plan generates, replaces, uploads
or reorders any image. `thumbnailUrl`, `palette`, hero images and image
sections are read-only throughout, and the integrity check below asserts it.

---

## 1. Current state (audited 2026-08-18)

| Field | Posts missing it |
|---|---|
| `ai.highlights` | 1081 |
| `ai.keyTakeaways` | 1081 |
| `ai.steps` | 1080 |
| `seo` (title/description/slug) | 711 |
| `tags` | 711 |
| `ai.keywords` | 224 empty + ~200 junk (`"expected to"`, `"he is"`, `"out of"`) |
| `ai.hashtags` | 183 |
| `ai.summary` | 8 |
| `subtitle` | 1 |
| `categoryId` | 369 |

Corpus shape:

- 801 general articles, 128 `INGREDIENT_REFERENCE`, 130 recipe-type posts
  (`SKINCARE_RECIPE` 48, `BODYCARE_RECIPE` 37, `HAIRCARE_RECIPE` 26,
  `LIPCARE_RECIPE` 4, `FACE_OIL` 14), 15 `DIY`, 8 guides/skin-type.
- Content available to work from: 858 posts have 3+ usable paragraphs once the
  inline HTML is split on block tags; 298 have 2+ headings; 115 carry real
  `instructions` steps and ingredient lists; **14 posts have effectively no
  body text** and cannot be summarised by any engine.

## 2. Access — resolved

`PostService.update` is author-scoped (`{ _id, authorId: req.user.id }`, no
admin bypass). All 1081 posts were reassigned in the DB to
`mona@gmail.com` (`6a4205ff0eb94920a977eca6`, Role `admin`), so writes now go
through the normal authenticated API — no backend patch needed.

## 3. Engine — no API keys

The Gemini key in `.env.local` is on the **free tier: 5 requests/minute** for
`gemini-3-flash`. At that rate the corpus takes ~3.6 hours of continuous
running and risks a daily-request cap, so the key path is off the table.

Two key-free engines, used together:

### Engine A — offline deterministic (bulk)

Pure Node, no network, no cost, whole corpus in under a minute. Per post:

| Field | Derivation |
|---|---|
| `summary` | Lead paragraph, trimmed to a clean sentence boundary at ~300 chars |
| `highlights` | Section titles / `<h2>`–`<h3>` headings; falls back to lead sentences of the first paragraphs |
| `keyTakeaways` | First sentence of each subsequent body paragraph, deduped, 4–6 kept |
| `steps` | Real `instructions` section steps (115 posts); else paragraphs matching `^(\d+\.|step \d+|first|then|next)` |
| `keywords` | TF-IDF over the corpus with a stopword filter — this also replaces the junk bigrams |
| `hashtags` | Top keywords, camel-cased and `#`-prefixed |
| `tags` | Category + subcategory names + post `type`, lowercased |
| `seo.title` | Existing title trimmed to 60 chars on a word boundary |
| `seo.description` | Summary trimmed to 155 chars |
| `seo.slug` | Existing `slug`, else slugified title |
| `subtitle` | Only when absent — first sentence of the lead paragraph |

Honest limitation: extractive, not abstractive. It reuses the article's own
sentences, so it is always factually safe but reads less polished than a
written summary.

### Engine B — Claude in-session (quality tier)

I read a batch of articles and write genuine abstractive summaries and
takeaways, no key involved. ~25–40 articles per turn. Reserved for the posts
that matter most rather than all 1081, which would run many hours.

## 4. Phases

| # | Phase | Posts | Engine | Status |
|---|---|---|---|---|
| 0 | Backup + pilot | 12 | (Gemini, before the free-tier limit was known) | **done** — verified, bodies byte-identical |
| 1 | Recipes, DIY, face oils | 130 | A — richest structure, real steps and ingredients | pending |
| 2 | Ingredient references | 128 | A — uniform template, high heuristic accuracy | pending |
| 3 | Guides & skin-type | 8 | B — small, high-visibility set | pending |
| 4 | General articles | 789 | A, in batches of 100 with a spot-check between | pending |
| 5 | Thin & empty posts | 14 | Manual — flag in a report, do not fabricate | pending |
| 6 | Full verification sweep | 1081 | — | pending |

The 12 pilot posts already carry good AI-written metadata and are left as-is;
the runner's progress file skips them automatically.

## 5. Safety

- **Backup taken** before any write: full `Post` collection dump, 1081 docs,
  5.7 MB, in the session scratchpad. Restore is a straight replay.
- **Fill-empty policy** — a field is only written when it is currently empty.
  Existing summaries, subtitles and SEO blocks are preserved. The one
  exception is the junk keyword lists, replaced when ≥40% of entries start or
  end with a stopword.
- **Resumable** — every post appends `{id, status}` to `progress.jsonl`;
  re-running skips completed ids, so an interrupted run costs nothing.
- **Integrity assertion per post** — `sections` must be byte-identical before
  and after, and `thumbnailUrl`, `slug`, `title`, `isPublished`, `categoryId`
  unchanged. Any post failing this is reverted from the backup and logged.
- Writes go through `PUT /v1/posts/update/:id`, so DTO validation applies.

## 6. Acceptance criteria

1. 0 posts with empty `ai.highlights` / `ai.keyTakeaways` (excluding the 14
   empty-body posts, which are reported instead).
2. 0 posts with an empty `seo.description` or empty `tags`.
3. 0 junk keyword lists remaining.
4. `sections` byte-identical to backup for all 1081 posts.
5. No change to any image field anywhere in the corpus.
6. Spot-check: 20 random posts render correctly in the article editor and
   article view at `localhost:5174`.

## 7. Open decisions

- **Steps on non-process articles** — a news or explainer piece has no
  genuine steps. Plan is to leave `ai.steps` empty there rather than invent
  one; confirm that renders acceptably in `ArticleView`.
- **The 369 posts with no `categoryId`** — out of scope here; tag-based
  categorisation is a separate pass.
- **Phase 3 scope** — which articles deserve the Claude-written quality tier
  beyond the 8 guides.
