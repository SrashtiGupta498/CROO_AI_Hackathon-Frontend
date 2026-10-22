/**
 * Concern filtering for the Explore feed.
 *
 * Kept out of the page component so it stays pure and testable: no React, no
 * asset imports. Posts are NOT tagged by concern server-side, so matching is
 * keyword-based over the post's own copy — filtering on the pill label alone
 * would drop a "blackheads" article from Acne.
 */
import { getCategoryName, getSubcategoryNames } from "./taxonomy";

export interface ConcernTag {
  label: string;
  /** Lowercase substrings that mark a post as belonging to this concern. */
  match: string[];
}

export const CONCERN_TAGS: ConcernTag[] = [
  { label: "All", match: [] },
  {
    label: "Acne",
    match: ["acne", "pimple", "breakout", "blackhead", "whitehead", "blemish", "zit"],
  },
  {
    label: "Dry Skin",
    match: ["dry skin", "dryness", "flaky", "flaking", "dehydrated", "moistur", "hydrat"],
  },
  {
    label: "Aging",
    match: ["aging", "ageing", "wrinkle", "fine line", "firmness", "collagen", "elasticity"],
  },
  {
    label: "Sensitivity",
    match: ["sensitiv", "irritat", "redness", "rosacea", "soothe", "soothing", "calming", "barrier"],
  },
  {
    label: "Pigmentation",
    match: ["pigment", "dark spot", "melasma", "hyperpigment", "brighten", "even tone", "sun spot"],
  },
  {
    label: "Hair Fall",
    match: ["hair", "scalp", "dandruff", "baldness", "follicle"],
  },
  {
    label: "Detox",
    match: ["detox", "cleanse", "clarify", "purify", "toxin", "clay", "charcoal"],
  },
];

/** Flatten a post into the lowercase text the filters search against. */
export function postHaystack(post: any): string {
  const sections = Array.isArray(post?.sections)
    ? post.sections
        .map((s: any) => `${s?.heading ?? ""} ${s?.title ?? ""} ${s?.text ?? ""}`)
        .join(" ")
    : "";
  const tags = Array.isArray(post?.tags) ? post.tags.join(" ") : post?.tags;

  return [
    post?.title,
    post?.subtitle,
    post?.description,
    post?.content,
    getCategoryName(post),
    getSubcategoryNames(post).join(" "),
    tags,
    sections,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Narrow `posts` by concern tag and free-text query. `tagIndex` 0 ("All") and an
 * empty query both mean "no constraint", so the untouched list passes through
 * by reference.
 */
export function filterPosts(
  posts: any[],
  tagIndex: number,
  rawQuery: string,
): any[] {
  const query = rawQuery.trim().toLowerCase();
  const concern = CONCERN_TAGS[tagIndex] ?? CONCERN_TAGS[0];
  if (!concern.match.length && !query) return posts;

  return posts.filter((post) => {
    const hay = postHaystack(post);
    const matchesConcern =
      !concern.match.length || concern.match.some((w) => hay.includes(w));
    return matchesConcern && (!query || hay.includes(query));
  });
}
