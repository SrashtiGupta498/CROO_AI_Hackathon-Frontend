import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  Search,
  Leaf,
  ShieldAlert,
  Sparkles,
  Info,
  BookOpen,
  Loader2,
  Droplet,
  Scissors,
  Heart,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Gauge,
  Hand,
  Users,
  Play,
  Film,
  Camera,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import API from "../services/api";
import Pagination from "../components/Pagination";
import { REELS } from "../constants";
import { RootState, AppDispatch } from "../store/store";
import { fetchReels } from "../store/reels/reels.action";
import { toAbsoluteUrl, getPostCover } from "../services/uploadImage";
import PostCover from "../components/PostCover";
import "./IngredientLibrary.css";
import "./IngredientDetail.css";

/* ---------------------------------------------------------------------------
 * API shape (GET /v1/posts/diy?type=FACE_OIL and ?type=INGREDIENT_REFERENCE)
 * Each item is a "post" with sections[]; the real content lives in:
 *   - title                       -> ingredient name
 *   - sections[type=text/About]   -> description ("About" body)
 *   - sections[type=source]       -> citation
 *   - tags                        -> 'plant-based' | 'oils-and-milks' drive the category
 *   - ai.summary                  -> short summary fallback
 * There are no images, benefits, how-to, or warnings in the API, so the UI
 * is adapted to the fields that actually exist.
 * ------------------------------------------------------------------------- */

interface ApiSection {
  type: string;
  title?: string;
  body?: string;
  order?: number;
  image?: string;
  images?: string[];
  videoUrl?: string;
  caption?: string;
}

interface ApiIngredient {
  _id: string;
  type?: string;
  title: string;
  slug?: string;
  subtitle?: string;
  sections?: ApiSection[];
  tags?: string[];
  ai?: { summary?: string };
  thumbnailUrl?: string;
}

interface MediaItem {
  kind: "image" | "gif" | "video";
  url: string;
  caption?: string;
}

interface Ingredient {
  id: string;
  name: string;
  summary: string;
  about: string;
  source: string;
  category: string;
  tags: string[];
  // Full, ordered content sections (everything except the hero) so the
  // detail view can render the WHOLE document, not just About/Source.
  // Only sections NOT already claimed by a dedicated editorial field below
  // (benefits/pros/cons/applySteps/bestFor/comedogenicScore/faq) end up here.
  sections: ApiSection[];
  // Visuals uploaded via the Story Editor's Image/Video/GIF blocks.
  coverImage: string;
  gallery: MediaItem[];
  // Editorial fields — all parsed from real section content (never invented).
  benefits: string[]; // bullet lines from Skin/Hair/Body Benefits sections
  pros: string[];
  cons: string[];
  applySteps: string[]; // "How to Apply" body, split into steps
  bestFor: string[]; // from "Best Skin Types" — the "Preferable for" list
  comedogenicScore: number | null; // parsed "N / 5" from the Comedogenic Rating section
  quote: string; // pull-quote — the most declarative sentence of About/summary
  faq: { q: string; a: string }[];
}

// Section types that carry visuals rather than prose — pulled into the
// gallery instead of rendered as an (empty) text card.
const MEDIA_SECTION_TYPES = new Set([
  "image",
  "hero",
  "gallery",
  "images",
  "video",
  "gif",
]);

// Map a raw tag / post type to a human-friendly category label.
const CATEGORY_LABELS: Record<string, string> = {
  "plant-based": "Plant-Based",
  "oils-and-milks": "Oils & Milks",
};
const TYPE_CATEGORY: Record<string, string> = {
  FACE_OIL: "Face Oil",
  INGREDIENT_REFERENCE: "Ingredient",
};

// Post types that make up the library list. /posts/diy matches one exact
// `type` per request, so this drives one request each (see the list fetch).
const LIBRARY_POST_TYPES = ["FACE_OIL", "INGREDIENT_REFERENCE"] as const;

// Tags that are noise for display chips (generic / category tags).
const HIDDEN_TAGS = new Set(["ingredient", "plant-based", "oils-and-milks"]);

/* ── Editorial-field parsers — every one operates on REAL section text
   already present in the post; none of them invent data. A parser that
   finds nothing simply returns an empty result, and the caller leaves the
   section out of the redesigned page rather than fabricate a placeholder. */

/* Section bodies are authored in the Story Editor's rich-text field, so they
   arrive as HTML — "<b>• Rich, occlusive moisturizer</b><b>• Antibacterial…</b>"
   — and sometimes double-escaped on top of that ("&amp;", "&lt;b&gt;"). Every
   renderer on this page prints plain strings into React text nodes, so any
   body still carrying markup shows its tags literally on screen. Normalising
   once, here at the API boundary, keeps all of them honest. */

const decodeEntities = (s: string): string =>
  s
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    // &amp; last, so "&amp;lt;" decodes to "&lt;" rather than "<".
    .replace(/&amp;/gi, "&");

const stripTags = (s: string): string =>
  s
    .replace(/<\s*br\s*\/?>/gi, "\n")
    // Closing tags become line breaks: in this data each bullet is its own
    // <b>…</b>, so dropping them silently would run every bullet together.
    .replace(/<\/\s*(p|div|li|ul|ol|b|strong|em|i|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "");

const toPlainText = (raw?: string | null): string => {
  if (!raw) return "";
  // Two passes: markup that arrives double-escaped only becomes strippable
  // after its entities have been decoded.
  return stripTags(decodeEntities(stripTags(raw)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const parseBullets = (body: string): string[] =>
  toPlainText(body)
    // Rich-text lists often survive as a single line with the markers inline
    // ("• a • b • c"), so split ahead of each marker as well as on newlines.
    .split(/\n|(?=[•‣▪]\s)/)
    .map((l) => l.replace(/^[•‣▪\-*]\s*/, "").trim())
    .filter(Boolean);

// "Best Skin Types" bodies read like:
//   Preferable for:\n• Dry\n• Mature\n\nUse with caution:\n• Oily
// — only the "Preferable for" list is a genuine "best for" claim.
const parseBestFor = (body: string): string[] => {
  const m = body.match(
    /preferable for:?\s*\n([\s\S]*?)(?:\n\s*\n|use with caution|$)/i,
  );
  return m ? parseBullets(m[1]) : [];
};

const parseComedogenicScore = (body: string): number | null => {
  const m = body.match(/(\d)\s*\/\s*5/);
  return m ? Number(m[1]) : null;
};

// A short, declarative pull-quote lifted straight from the ingredient's own
// About copy or AI summary — an editorial pull-quote is always an excerpt of
// existing body text, never new claims.
const pickPullQuote = (about: string, summary: string): string => {
  const source = (about || summary || "").trim();
  if (!source) return "";
  const firstSentence = source.split(/(?<=[.!?])\s+/)[0] || source;
  return firstSentence.length > 20 ? firstSentence : source.slice(0, 180);
};

const parseFaq = (body: string): { q: string; a: string }[] =>
  body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      const q = lines.find((l) => /^q\s*[:.]/i.test(l)) || lines[0];
      const a = lines
        .filter((l) => l !== q)
        .join(" ")
        .replace(/^a\s*[:.]/i, "")
        .trim();
      return { q: q.replace(/^q\s*[:.]/i, "").trim(), a };
    })
    .filter((p) => p.q && p.a);

const normalizeIngredient = (item: ApiIngredient): Ingredient => {
  const rawSections = item.sections || [];
  const aboutSection = rawSections.find(
    (s) => s.title?.toLowerCase() === "about" || s.type === "text",
  );
  const about =
    toPlainText(aboutSection?.body) || toPlainText(item.ai?.summary);
  const sourceSection = rawSections.find(
    (s) => s.type === "source" || s.title?.toLowerCase() === "source",
  );
  const source = toPlainText(sourceSection?.body);

  // Editorial fields — each parsed from a specific real section, by title.
  // A section that's successfully claimed here is excluded from the
  // generic leftover `sections` list below so it isn't rendered twice.
  const findByTitle = (re: RegExp) =>
    rawSections.find((s) => re.test((s.title || "").trim()));
  const skinBenefits = findByTitle(/^skin benefits$/i);
  const hairBenefits = findByTitle(/^hair benefits$/i);
  const bodyBenefits = findByTitle(/^body benefits$/i);
  const prosSection = findByTitle(/^pros$/i);
  const consSection = findByTitle(/^cons$/i);
  const applySection = findByTitle(/how to apply/i);
  const bestForSection = findByTitle(/best skin types|best for/i);
  const comedoSection = findByTitle(/comedogenic/i);
  const faqSection = rawSections.find(
    (s) => s.type === "faq" || (s.title || "").toLowerCase() === "faq",
  );

  const benefits = [skinBenefits, hairBenefits, bodyBenefits]
    .filter(Boolean)
    .flatMap((s) => parseBullets(s!.body || ""));
  const pros = prosSection ? parseBullets(prosSection.body || "") : [];
  const cons = consSection ? parseBullets(consSection.body || "") : [];
  const applySteps = applySection
    ? toPlainText(applySection.body)
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const bestFor = bestForSection
    ? parseBestFor(toPlainText(bestForSection.body))
    : [];
  const comedogenicScore = comedoSection
    ? parseComedogenicScore(comedoSection.body || "")
    : null;
  const faq = faqSection ? parseFaq(toPlainText(faqSection.body)) : [];

  const claimed = new Set<ApiSection>(
    [
      skinBenefits,
      hairBenefits,
      bodyBenefits,
      prosSection,
      consSection,
      applySection,
      bestForSection,
      comedoSection,
      faqSection,
      aboutSection,
      sourceSection,
    ].filter((s): s is ApiSection => Boolean(s)),
  );

  // Keep every remaining meaningful TEXT section, ordered, dropping the
  // empty hero (its title duplicates the page heading), anything visual
  // (that goes to the gallery instead) and anything already claimed above.
  const sections = rawSections
    .filter(
      (s) =>
        s.type !== "hero" &&
        !MEDIA_SECTION_TYPES.has((s.type || "").toLowerCase()) &&
        !claimed.has(s) &&
        // Measured after tag-stripping, so a section holding nothing but
        // empty markup ("<ul><li></li></ul>") drops out instead of
        // rendering as a titled but blank block.
        toPlainText(s.body).length > 0,
    )
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Gallery — every image/video/gif in the document, in order. The cover
  // image is excluded so it isn't shown twice (once as the hero backdrop,
  // once as a gallery tile).
  const coverImage = getPostCover(item);
  const gallery: MediaItem[] = [];
  rawSections
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .forEach((s) => {
      const t = (s.type || "").toLowerCase();
      if (t === "video" && s.videoUrl) {
        gallery.push({
          kind: "video",
          url: toAbsoluteUrl(s.videoUrl),
          caption: s.caption,
        });
      } else if (t === "gif" && (s.videoUrl || s.image)) {
        gallery.push({
          kind: "gif",
          url: toAbsoluteUrl(s.videoUrl || s.image),
          caption: s.caption,
        });
      } else if (
        t === "image" ||
        t === "hero" ||
        t === "gallery" ||
        t === "images"
      ) {
        const urls = (
          s.images?.length ? s.images : s.image ? [s.image] : []
        ).map(toAbsoluteUrl);
        urls.forEach(
          (u) =>
            u && gallery.push({ kind: "image", url: u, caption: s.caption }),
        );
      }
    });
  const dedupedGallery = gallery.filter((m) => m.url && m.url !== coverImage);

  const tags = item.tags || [];
  const categoryTag = tags.find((t) => CATEGORY_LABELS[t]);
  const category =
    (item.type && TYPE_CATEGORY[item.type]) ||
    (categoryTag ? CATEGORY_LABELS[categoryTag] : "Other");

  return {
    id: item._id || item.slug || item.title,
    name: item.title,
    summary: toPlainText(item.ai?.summary) || toPlainText(item.subtitle),
    about,
    source,
    coverImage,
    gallery: dedupedGallery,
    category,
    tags: tags.filter((t) => !HIDDEN_TAGS.has(t)),
    sections,
    benefits,
    pros,
    cons,
    applySteps,
    bestFor,
    comedogenicScore,
    quote: pickPullQuote(
      about,
      toPlainText(item.ai?.summary) || toPlainText(item.subtitle),
    ),
    faq,
  };
};

// Pick an icon for a section based on its title.
const sectionIcon = (title: string) => {
  const t = (title || "").toLowerCase();
  if (t.includes("skin")) return Sparkles;
  if (t.includes("hair")) return Scissors;
  if (t.includes("body")) return Heart;
  if (t.includes("pro")) return ThumbsUp;
  if (t.includes("con")) return ThumbsDown;
  if (t.includes("apply") || t.includes("how to")) return Hand;
  if (t.includes("best") || t.includes("type")) return Users;
  if (t.includes("comedogenic") || t.includes("rating")) return Gauge;
  if (t.includes("faq")) return HelpCircle;
  if (t.includes("source")) return BookOpen;
  if (t.includes("drop") || t.includes("oil")) return Droplet;
  return Leaf;
};

// Render the body of one section. FAQ bodies are parsed into Q/A pairs;
// everything else preserves the original line breaks and bullet markers.
const SectionBody: React.FC<{ section: ApiSection }> = ({ section }) => {
  const body = toPlainText(section.body);
  const isFaq =
    section.type === "faq" || (section.title || "").toLowerCase() === "faq";

  if (isFaq) {
    const pairs = body
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean);
    return (
      <div className="space-y-5">
        {pairs.map((block, i) => {
          const lines = block.split("\n");
          const q = lines.find((l) => /^q\s*:/i.test(l)) || lines[0];
          const a = lines
            .filter((l) => l !== q)
            .join(" ")
            .replace(/^a\s*:/i, "")
            .trim();
          return (
            <div key={i}>
              <p className="text-ink font-bold mb-1">
                {q.replace(/^q\s*:/i, "").trim()}
              </p>
              <p className="text-muted leading-relaxed">{a}</p>
            </div>
          );
        })}
      </div>
    );
  }

  const isSource =
    section.type === "source" ||
    (section.title || "").toLowerCase() === "source";
  return (
    <p
      className={`leading-relaxed whitespace-pre-line ${
        isSource ? "text-sm text-neutral-500 italic" : "text-neutral-600"
      }`}
    >
      {body}
    </p>
  );
};

/* ---------------------------------------------------------------------------
 * Gallery — a Pinterest-style waterfall of every image/video/gif uploaded
 * for this ingredient via the Story Editor. CSS columns (not a fixed-ratio
 * grid like Explore's card grid) so tiles keep their natural aspect ratio —
 * that variable-height waterfall is what actually reads as "Pinterest".
 * Visual language (gradient overlay, hover-scale, backdrop-blur chip) is
 * borrowed from Explore's post-card treatment for consistency.
 * ------------------------------------------------------------------------- */

const IngredientGallery: React.FC<{ name: string; items: MediaItem[] }> = ({
  name,
  items,
}) => {
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight")
        setLightbox((i) => (i === null ? i : (i + 1) % items.length));
      if (e.key === "ArrowLeft")
        setLightbox((i) =>
          i === null ? i : (i - 1 + items.length) % items.length,
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, items.length]);

  if (!items.length) return null;
  const active = lightbox !== null ? items[lightbox] : null;

  return (
    <>
      <div className="ingredient-lib-masonry">
        {items.map((m, i) => (
          <div key={i} className="ingredient-lib-masonry-tile group">
            {m.kind === "video" ? (
              <video
                src={m.url}
                controls
                playsInline
                preload="metadata"
                className="block w-full h-auto rounded-[1.5rem]"
              />
            ) : m.kind === "gif" ? (
              <video
                src={m.url}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="block w-full h-auto rounded-[1.5rem]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setLightbox(i)}
                className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-[#DCE5DD] rounded-[1.5rem]"
                aria-label={`Open ${m.caption || name} full size`}
              >
                <div className="relative overflow-hidden rounded-[1.5rem]">
                  <img
                    src={m.url}
                    alt={m.caption || name}
                    loading="lazy"
                    className="ingredient-lib-masonry-img block w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </button>
            )}
            {m.caption && (
              <p className="mt-2 mb-1 text-xs text-neutral-500 italic leading-snug">
                {m.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      {active && active.kind === "image" && (
        <div
          role="dialog"
          aria-modal="true"
          className="ingredient-lib-lightbox"
          onClick={() => setLightbox(null)}
        >
          <button
            aria-label="Close"
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
          <img
            src={active.url}
            alt={active.caption || name}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {active.caption && (
            <p className="mt-4 text-white/70 text-sm italic text-center max-w-lg px-6">
              {active.caption}
            </p>
          )}
        </div>
      )}
    </>
  );
};

/* ── Scroll-reveal wrapper — fades/slides a section in once, the first
   time it enters the viewport. Pure CSS transition + IntersectionObserver,
   no animation library. ─────────────────────────────────────────────── */
const Reveal: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`ing-ed-reveal ${visible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
};

// Icon for a single benefit line, chosen by keyword — purely decorative,
// doesn't affect the (real) text it labels.
const benefitIcon = (text: string) => {
  const t = text.toLowerCase();
  if (t.includes("hydrat") || t.includes("moistur") || t.includes("lock"))
    return Droplet;
  if (
    t.includes("hair") ||
    t.includes("frizz") ||
    t.includes("shine") ||
    t.includes("curl")
  )
    return Scissors;
  if (t.includes("soft") || t.includes("smooth") || t.includes("glow"))
    return Sparkles;
  if (t.includes("body") || t.includes("skin")) return Heart;
  return Leaf;
};

/* ── Related ingredients — same category, drawn from the library list
   already loaded by the parent (no extra fetch). Real data only; renders
   nothing (not even the heading) when there's no other ingredient in the
   same category. ─────────────────────────────────────────────────────── */
const RelatedIngredients: React.FC<{
  current: Ingredient;
  all: Ingredient[];
}> = ({ current, all }) => {
  const navigate = useNavigate();
  const related = all
    .filter((i) => i.id !== current.id && i.category === current.category)
    .slice(0, 6);
  if (!related.length) return null;
  return (
    <Reveal>
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="ing-ed-section-title mb-8 text-center">
          Related Ingredients
        </p>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {related.map((ing) => (
            <button
              key={ing.id}
              onClick={() => navigate(`/ingredients/${ing.id}`)}
              className="ing-ed-card ing-ed-card-lift flex-none w-[180px] text-left p-5"
            >
              <p className="ing-ed-serif text-lg font-semibold mb-1">
                {ing.name}
              </p>
              <p className="ing-ed-caption not-italic text-xs">
                {ing.category}
              </p>
            </button>
          ))}
        </div>
      </section>
    </Reveal>
  );
};

/* ── DIY recipes that actually use this ingredient — matched by real tag
   overlap against /posts/diy. Hidden entirely when nothing matches; this
   deliberately never shows fabricated placeholder recipes. ──────────── */
const RelatedRecipes: React.FC<{ ingredient: Ingredient }> = ({
  ingredient,
}) => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<any[] | null>(null);

  useEffect(() => {
    let active = true;
    API.get("/posts/diy", { params: { limit: 60, page: 1 } })
      .then((res) => {
        if (!active) return;
        const raw = res.data?.data ?? res.data;
        const items: any[] = Array.isArray(raw) ? raw : raw?.posts || [];
        const tagSet = new Set(ingredient.tags.map((t) => t.toLowerCase()));
        const matches = items.filter((p) => {
          if (String(p._id) === String(ingredient.id)) return false;
          if (p.type === "FACE_OIL" || p.type === "INGREDIENT_REFERENCE")
            return false;
          const pTags: string[] = Array.isArray(p.tags) ? p.tags : [];
          return pTags.some((t) => tagSet.has(String(t).toLowerCase()));
        });
        setRecipes(matches.slice(0, 4));
      })
      .catch(() => {
        if (active) setRecipes([]);
      });
    return () => {
      active = false;
    };
  }, [ingredient.id, ingredient.tags]);

  if (!recipes || recipes.length === 0) return null;

  return (
    <Reveal>
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="ing-ed-section-title mb-8 text-center">DIY Recipes</p>
        <div className="grid sm:grid-cols-2 gap-6">
          {recipes.map((p) => {
            const cover = getPostCover(p);
            return (
              <button
                key={p._id}
                onClick={() => navigate(`/diy/${p._id}`)}
                className="ing-ed-card ing-ed-card-lift ing-ed-img-zoom text-left overflow-hidden"
              >
                {cover && (
                  <PostCover
                    src={cover}
                    alt={p.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-5">
                  <p className="ing-ed-serif text-xl font-semibold mb-1">
                    {p.title}
                  </p>
                  {p.subtitle && (
                    <p className="ing-ed-caption not-italic">{p.subtitle}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </Reveal>
  );
};

/* ---------------------------------------------------------------------------
 * Detail view — fetches a single post by id:
 *   GET http://localhost:3002/v1/posts/getpostById/${_id}
 * Falls back to the list item we already have so the page works even while
 * the by-id endpoint is unavailable.
 *
 * Layout below follows the editorial brief: hero → quick facts → photography
 * → about → benefits → quote → application timeline → pros/cons → facts →
 * gallery → recipes → related → faq → sources → tags. Every section is
 * conditional on real data existing — nothing here is invented content.
 * ------------------------------------------------------------------------- */
interface IngredientDetailProps {
  id: string;
  fallback?: Ingredient;
  allIngredients: Ingredient[];
  onBack: () => void;
}

const IngredientDetail: React.FC<IngredientDetailProps> = ({
  id,
  fallback,
  allIngredients,
  onBack,
}) => {
  const [fetched, setFetched] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prefer the freshly fetched post, otherwise the list item we already have.
  const ingredient = fetched || fallback || null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // GET http://localhost:3002/v1/posts/getpostById/{id}
    API.get(`/posts/getpostById/${id}`)
      .then((res) => {
        if (!active) return;
        const raw = res.data?.data ?? res.data;
        if (raw && raw._id) setFetched(normalizeIngredient(raw));
        else if (!fallback) setError("Ingredient not found.");
      })
      .catch((err: any) => {
        if (!active) return;
        // Keep the fallback (from the list) on screen if we have one.
        if (!fallback)
          setError(
            err?.response?.data?.message || "Failed to load this ingredient.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, fallback]);

  // Subtle hero-photo parallax — a small, cheap scroll-linked translateY,
  // rAF-throttled. Not tied to `scrolled`/layout-affecting state, so it can
  // never cause the reflow-jank the site's header had.
  const heroImgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = heroImgRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const progress = Math.min(
          1,
          Math.max(0, 1 - rect.top / window.innerHeight),
        );
        el.style.transform = `translateY(${progress * 22}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [id]);

  if (loading && !ingredient) {
    return (
      <main className="min-h-screen bg-paper flex flex-col items-center justify-center text-[#3D5B4F]">
        <Loader2 className="animate-spin mb-4" size={36} />
        <p className="text-sm font-bold uppercase tracking-widest">
          Loading ingredient…
        </p>
      </main>
    );
  }

  if (!ingredient) {
    return (
      <main className="min-h-screen bg-paper flex flex-col items-center justify-center text-center px-6">
        <ShieldAlert className="text-[#b4413c] mb-4" size={36} />
        <p className="text-ink font-bold mb-2">Couldn’t load this ingredient</p>
        <p className="text-muted text-sm mb-8">{error}</p>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-2xl bg-[#2D2A26] text-white font-bold text-[10px] tracking-widest uppercase hover:bg-[#3D5B4F] transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Library
        </button>
      </main>
    );
  }

  // Real photography only — never a stock/placeholder image. The hero uses
  // the cover if there is one, else the first uploaded photo; "Large
  // Photography" (a few sections later) uses a DIFFERENT photo so nothing
  // repeats, and whatever's left goes to the Gallery masonry at the end.
  const firstImage = ingredient.gallery.find((m) => m.kind === "image");
  const heroPhoto = ingredient.coverImage || firstImage?.url || "";
  // A photograph is the preferred break, but fall back to a clip when the
  // ingredient only has motion. Without the fallback an ingredient with one
  // photo and one video left the reader 2000+px of unbroken text before the
  // first visual, while the lone clip sat by itself in the Gallery masonry.
  const bigMedia =
    ingredient.gallery.find((m) => m.kind === "image" && m.url !== heroPhoto) ||
    ingredient.gallery.find((m) => m.url !== heroPhoto);
  const galleryRest = ingredient.gallery.filter((m) => m.url !== bigMedia?.url);

  const hasQuickFacts =
    ingredient.comedogenicScore !== null || ingredient.bestFor.length > 0;
  const hasSciFacts =
    ingredient.comedogenicScore !== null ||
    ingredient.category ||
    ingredient.tags.length > 0;

  return (
    <main className="ing-ed min-h-screen">
      {/* ── Hero — editorial two-column: facts left, photograph right ── */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10 md:pt-24">
        <button
          onClick={onBack}
          className="ing-ed-btn mb-10 inline-flex items-center gap-2 text-[var(--ie-muted)]"
        >
          <ArrowLeft size={14} /> Library
        </button>

        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left — chips, title, description, quick stat row */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-7">
              <span className="ing-ed-chip">LIBRARY</span>
              <span className="ing-ed-chip ing-ed-chip-sage">
                {ingredient.category}
              </span>
              <span className="ing-ed-chip ing-ed-chip-sand">
                Natural Ingredient
              </span>
            </div>

            <h1 className="ing-ed-hero-title mb-4">{ingredient.name}</h1>
            <p className="ing-ed-eyebrow mb-6">Ingredient Reference</p>

            {(ingredient.quote || ingredient.summary) && (
              <p
                className="ing-ed-body mb-9 max-w-md"
                style={{ color: "var(--ie-muted)" }}
              >
                {ingredient.quote || ingredient.summary}
              </p>
            )}

            {hasQuickFacts && (
              <div className="flex flex-wrap gap-2.5">
                {ingredient.comedogenicScore !== null && (
                  <span className="ing-ed-chip">
                    <Gauge size={13} /> Comedogenic{" "}
                    {ingredient.comedogenicScore}/5
                  </span>
                )}
                {ingredient.bestFor.slice(0, 4).map((b) => (
                  <span key={b} className="ing-ed-chip">
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right — the large botanical photograph, with grain + parallax */}
          <div
            ref={heroImgRef}
            className="ing-ed-grain ing-ed-img-zoom relative rounded-[28px] overflow-hidden shadow-[0_30px_60px_rgba(43,41,39,0.12)] aspect-[4/5]"
          >
            {heroPhoto ? (
              // Cover may be a photograph or a short clip; PostCover picks the
              // right element and loops video silently.
              <PostCover
                src={heroPhoto}
                alt={ingredient.name}
                loading="eager"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, var(--ie-sage) 0%, var(--ie-sand) 100%)",
                }}
              >
                <Leaf className="text-white/70" size={64} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      {ingredient.about && (
        <Reveal>
          <section className="max-w-2xl mx-auto px-6 py-16">
            <p className="ing-ed-section-title mb-6">About</p>
            <p
              className="ing-ed-body first-letter:ing-ed-serif"
              style={{ whiteSpace: "pre-line" }}
            >
              {ingredient.about}
            </p>
          </section>
        </Reveal>
      )}

      {/* ── Large photography moment ── */}
      {bigMedia && (
        <Reveal>
          <section className="max-w-5xl mx-auto px-6 pb-16">
            <div className="ing-ed-grain ing-ed-img-zoom rounded-[28px] overflow-hidden shadow-[0_24px_50px_rgba(43,41,39,0.1)]">
              {bigMedia.kind === "image" ? (
                <img
                  src={bigMedia.url}
                  alt={bigMedia.caption || ingredient.name}
                  className="w-full h-auto max-h-[70vh] object-cover"
                  loading="lazy"
                />
              ) : (
                // A full-bleed editorial moment, not a media player: it loops
                // silently like the hero photograph it stands in for. Muted is
                // what makes autoplay legal in every browser.
                <video
                  src={bigMedia.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="w-full h-auto max-h-[70vh] object-cover"
                />
              )}
            </div>
            {bigMedia.caption && (
              <p className="ing-ed-caption text-center mt-4">
                {bigMedia.caption}
              </p>
            )}
          </section>
        </Reveal>
      )}

      {/* ── Benefits grid ── */}
      {ingredient.benefits.length > 0 && (
        <Reveal>
          <section className="max-w-5xl mx-auto px-6 py-16">
            <p className="ing-ed-section-title mb-10 text-center">Benefits</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ingredient.benefits.map((b, i) => {
                const Icon = benefitIcon(b);
                return (
                  <div
                    key={i}
                    className="ing-ed-card ing-ed-card-lift p-7 flex items-start gap-4"
                  >
                    <Icon
                      size={20}
                      style={{ color: "var(--ie-sage)" }}
                      className="flex-none mt-0.5"
                    />
                    <p className="ing-ed-body text-[15px]">{b}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </Reveal>
      )}

      {/* ── Quote section ── */}
      {ingredient.quote && (
        <Reveal>
          <div className="ing-ed-quote-wrap">
            <span className="ing-ed-quote-mark">&ldquo;</span>
            <p className="ing-ed-quote-text">{ingredient.quote}</p>
          </div>
        </Reveal>
      )}

      {/* ── Application timeline ── */}
      {ingredient.applySteps.length > 0 && (
        <Reveal>
          <section className="max-w-2xl mx-auto px-6 py-16">
            <p className="ing-ed-section-title mb-10 flex items-center gap-2">
              <Hand size={14} /> How To Apply
            </p>
            <div className="ing-ed-timeline">
              {ingredient.applySteps.map((step, i) => (
                <div key={i} className="ing-ed-timeline-step">
                  <p className="ing-ed-body">{step}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* ── Pros & cons ── */}
      {(ingredient.pros.length > 0 || ingredient.cons.length > 0) && (
        <Reveal>
          <section className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-2 gap-6">
            {ingredient.pros.length > 0 && (
              <div className="ing-ed-card p-9">
                <p className="ing-ed-section-title mb-6 flex items-center gap-2">
                  <ThumbsUp size={14} /> Pros
                </p>
                <ul className="space-y-3">
                  {ingredient.pros.map((p, i) => (
                    <li
                      key={i}
                      className="ing-ed-body text-[15px] flex items-start gap-2.5"
                    >
                      <span style={{ color: "var(--ie-sage)" }}>✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ingredient.cons.length > 0 && (
              <div className="ing-ed-card p-9">
                <p className="ing-ed-section-title mb-6 flex items-center gap-2">
                  <ThumbsDown size={14} /> Cons
                </p>
                <ul className="space-y-3">
                  {ingredient.cons.map((c, i) => (
                    <li
                      key={i}
                      className="ing-ed-body text-[15px] flex items-start gap-2.5"
                    >
                      <span style={{ color: "#a9701f" }}>⚠</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </Reveal>
      )}

      {/* ── Scientific / reference facts ── */}
      {hasSciFacts && (
        <Reveal>
          <section className="max-w-5xl mx-auto px-6 py-16">
            <p className="ing-ed-section-title mb-10 text-center">
              Reference Facts
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {ingredient.comedogenicScore !== null && (
                <div className="ing-ed-card p-7 text-center">
                  <p className="ing-ed-serif text-3xl font-semibold mb-1">
                    {ingredient.comedogenicScore}/5
                  </p>
                  <p className="ing-ed-eyebrow">Comedogenic</p>
                </div>
              )}
              <div className="ing-ed-card p-7 text-center">
                <p className="ing-ed-serif text-3xl font-semibold mb-1">
                  {ingredient.category}
                </p>
                <p className="ing-ed-eyebrow">Category</p>
              </div>
              {ingredient.bestFor.length > 0 && (
                <div className="ing-ed-card p-7 text-center">
                  <p className="ing-ed-serif text-3xl font-semibold mb-1">
                    {ingredient.bestFor.length}
                  </p>
                  <p className="ing-ed-eyebrow">Best-For Skin Types</p>
                </div>
              )}
              {ingredient.tags.length > 0 && (
                <div className="ing-ed-card p-7 text-center">
                  <p className="ing-ed-serif text-3xl font-semibold mb-1">
                    {ingredient.tags.length}
                  </p>
                  <p className="ing-ed-eyebrow">Related Tags</p>
                </div>
              )}
            </div>
          </section>
        </Reveal>
      )}

      {/* ── Gallery — Pinterest masonry of every remaining upload ── */}
      {galleryRest.length > 0 && (
        <Reveal>
          <section className="max-w-5xl mx-auto px-6 py-16">
            <p className="ing-ed-section-title mb-8 text-center flex items-center justify-center gap-2">
              <Camera size={14} /> Gallery
            </p>
            <IngredientGallery name={ingredient.name} items={galleryRest} />
          </section>
        </Reveal>
      )}

      {/* ── DIY recipes that use this ingredient (real matches only) ── */}
      <RelatedRecipes ingredient={ingredient} />

      {/* ── Related ingredients ── */}
      <RelatedIngredients current={ingredient} all={allIngredients} />

      {/* ── FAQ ── */}
      {ingredient.faq.length > 0 && (
        <Reveal>
          <section className="max-w-2xl mx-auto px-6 py-16">
            <p className="ing-ed-section-title mb-8 flex items-center gap-2">
              <HelpCircle size={14} /> FAQ
            </p>
            <div className="space-y-6">
              {ingredient.faq.map((f, i) => (
                <div key={i} className="ing-ed-card p-7">
                  <p
                    className="font-semibold mb-2"
                    style={{ color: "var(--ie-text)" }}
                  >
                    {f.q}
                  </p>
                  <p
                    className="ing-ed-body text-[15px]"
                    style={{ color: "var(--ie-muted)" }}
                  >
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* ── Any content not claimed by a dedicated section above — kept so
         nothing real is ever silently dropped for post shapes this redesign
         didn't anticipate. ── */}
      {ingredient.sections.length > 0 && (
        <section className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          {ingredient.sections.map((section, idx) => {
            const isDisclaimer =
              section.type === "warning" ||
              (section.title || "").trim().toLowerCase() === "disclaimer";
            const Icon = sectionIcon(section.title || "");
            return (
              <div
                key={`${section.title}-${idx}`}
                className="ing-ed-card p-8"
                style={
                  isDisclaimer
                    ? {
                        borderColor: "rgba(169,112,31,0.3)",
                        background: "rgba(215,194,165,0.12)",
                      }
                    : undefined
                }
              >
                <p className="ing-ed-section-title mb-4 flex items-center gap-2">
                  <Icon size={14} /> {section.title || "Note"}
                </p>
                <SectionBody section={section} />
              </div>
            );
          })}
        </section>
      )}

      {/* ── Sources ── */}
      {ingredient.source && (
        <section className="max-w-2xl mx-auto px-6 py-8">
          <p className="ing-ed-eyebrow mb-2">Source</p>
          <p className="ing-ed-caption">{ingredient.source}</p>
        </section>
      )}

      {/* ── Tags ── */}
      {ingredient.tags.length > 0 && (
        <section className="max-w-2xl mx-auto px-6 pt-4 pb-24">
          <div className="flex flex-wrap gap-2">
            {ingredient.tags.map((t) => (
              <span key={t} className="ing-ed-chip">
                {t.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

/* ---------------------------------------------------------------------------
 * Side content for the library list view: a short-reels rail and a photo
 * carousel of recent journal posts, shown in an aside next to the oils grid.
 * ------------------------------------------------------------------------- */

const SideReelsRail: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { reels: liveReels = [] } = useSelector(
    (state: RootState) => state.reels,
  );

  // This rail used to render REELS.slice(0,3) — the bundled fallback — so it
  // never showed a real reel even when the API had them. Fetch on mount and
  // fall back only when the API returns nothing.
  useEffect(() => {
    if (!liveReels.length) dispatch(fetchReels({ page: 1, limit: 3 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const reels = (liveReels.length ? liveReels : REELS)
    .filter((r: any) => r?.src)
    .slice(0, 3);

  return (
    <div className="bg-paper rounded-[2.5rem] p-6 border border-line shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <Film size={14} className="text-sage" /> Short Rituals
        </p>
        <button
          onClick={() => navigate("/reels")}
          className="text-[10px] font-bold uppercase tracking-widest text-[#3D5B4F] hover:text-[#2D2A26] transition-colors"
        >
          Watch all →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {reels.map((reel) => (
          <div
            key={reel.id}
            onClick={() => navigate(`/reels/${reel.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/reels/${reel.id}`);
              }
            }}
            className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DCE5DD]"
            onMouseEnter={(e) => {
              e.currentTarget
                .querySelector("video")
                ?.play()
                .catch(() => {});
            }}
            onMouseLeave={(e) => {
              const v = e.currentTarget.querySelector("video");
              if (v) {
                v.pause();
                v.currentTime = 0;
              }
            }}
          >
            <video
              src={reel.src}
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-80 group-hover:opacity-0 transition-opacity">
                <Play size={12} fill="currentColor" />
              </span>
            </div>
            <p className="absolute inset-x-0 bottom-0 p-2.5 text-white text-[10px] font-bold leading-tight line-clamp-2">
              {reel.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CarouselPhoto {
  id: string;
  title: string;
  img: string;
}

const CAROUSEL_PAGE_SIZE = 6;

/** Map an API post to the carousel's shape. */
function toCarouselPhoto(p: any): CarouselPhoto {
  const pid = p._id || p.id;
  // Posts often carry their imagery in sections, not thumbnailUrl.
  const sectionImg = (p.sections || [])
    .map((s: any) => s.image || (Array.isArray(s.images) && s.images[0]) || "")
    .find(Boolean);
  return {
    id: pid,
    title: p.title || "From the Journal",
    img:
      toAbsoluteUrl(
        p.thumbnailUrl || p.thumbnail || p.imageUrl || sectionImg,
      ) || `https://picsum.photos/seed/${pid}/600/750`,
  };
}

const SidePhotoCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<CarouselPhoto[]>([]);
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0); // 0 = nothing loaded yet
  const [total, setTotal] = useState<number | null>(null);
  const loadingRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /* Paginated loader. The carousel used to fetch a fixed page-1/limit-6 and
     loop those six forever; it now pulls the next page as the reader
     approaches the end of what is loaded, de-duped by id. */
  const loadNextPage = useCallback(async () => {
    if (loadingRef.current) return;
    const next = page + 1;
    if (total !== null && photos.length >= total) return; // everything loaded
    loadingRef.current = true;
    try {
      const res = await API.get("/posts", {
        params: { limit: CAROUSEL_PAGE_SIZE, page: next },
      });
      if (!aliveRef.current) return;
      const raw = res.data?.data ?? res.data;
      const items: any[] =
        raw?.docs || raw?.posts || (Array.isArray(raw) ? raw : []);
      const reported =
        res.data?.total ?? res.data?.totalDocuments ?? raw?.total ?? null;
      if (typeof reported === "number") setTotal(reported);

      setPhotos((prev) => {
        const seen = new Set(prev.map((p) => String(p.id)));
        const fresh = items
          .map(toCarouselPhoto)
          .filter((p) => p.id && !seen.has(String(p.id)));
        return prev.concat(fresh);
      });
      setPage(next);
      // A short page means the server has nothing more, even without a total.
      if (items.length < CAROUSEL_PAGE_SIZE) {
        setTotal((t) => t ?? photos.length + items.length);
      }
    } catch {
      /* no photos — the carousel simply doesn't render */
    } finally {
      loadingRef.current = false;
    }
  }, [page, total, photos.length]);

  // First page on mount.
  useEffect(() => {
    loadNextPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull the next page once the reader is within two slides of the end.
  useEffect(() => {
    const more = total === null || photos.length < total;
    if (more && photos.length > 0 && index >= photos.length - 2) loadNextPage();
  }, [index, photos.length, total, loadNextPage]);

  // Auto-advance every 4s.
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % photos.length), 4000);
    return () => clearInterval(t);
  }, [photos.length]);

  if (photos.length === 0) return null;
  const go = (delta: number) =>
    setIndex((i) => (i + delta + photos.length) % photos.length);

  return (
    <div className="bg-paper rounded-[2.5rem] p-6 border border-line shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
          <Camera size={14} className="text-sage" /> From the Journal
        </p>
        <button
          onClick={() => navigate("/explore")}
          className="text-[10px] font-bold uppercase tracking-widest text-[#3D5B4F] hover:text-[#2D2A26] transition-colors"
        >
          Explore →
        </button>
      </div>

      <div className="relative aspect-[4/5] rounded-[1.8rem] overflow-hidden group">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            onClick={() => navigate(`/article/${photo.id}`)}
            className={`absolute inset-0 cursor-pointer transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <img
              src={photo.img}
              alt={photo.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <p className="absolute inset-x-0 bottom-0 p-4 text-white text-sm font-bold italic leading-snug line-clamp-2 font-serif">
              {photo.title}
            </p>
          </div>
        ))}

        {photos.length > 1 && (
          <>
            <button
              aria-label="Previous photo"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Next photo"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/25 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {photos.map((p, i) => (
            <button
              key={p.id}
              aria-label={`Go to photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-5 bg-[#3D5B4F]" : "w-1.5 bg-neutral-200"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const IngredientLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  // ?q= lets other pages (e.g. skin-analysis recommendations) deep-link
  // straight into a pre-filtered library view.
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setSearchQuery(q);
  }, [searchParams]);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // The library is both post types; /posts/diy filters on a single exact
    // `type`, so one request per type and merge. A type that fails is skipped
    // rather than blanking the page - the error only shows if none loaded.
    // GET /v1/posts/diy?type=FACE_OIL|INGREDIENT_REFERENCE&limit=200&page=1
    Promise.all(
      LIBRARY_POST_TYPES.map((type) =>
        API.get("/posts/diy", { params: { type, limit: 200, page: 1 } })
          .then((res) => {
            const raw = res.data?.data ?? res.data;
            const items: ApiIngredient[] = Array.isArray(raw)
              ? raw
              : raw?.posts || [];
            return { items, error: null as any };
          })
          .catch((err: any) => ({ items: [] as ApiIngredient[], error: err })),
      ),
    )
      .then((results) => {
        if (!active) return;
        const failed = results.filter((r) => r.error);
        if (failed.length === results.length) {
          setError(
            failed[0].error?.response?.data?.message ||
              "Failed to load the ingredient library.",
          );
          return;
        }
        // Same post could in principle come back under both calls; keep one.
        const byId = new Map<string, Ingredient>();
        results
          .flatMap((r) => r.items)
          .map(normalizeIngredient)
          .forEach((ing) => {
            if (!byId.has(ing.id)) byId.set(ing.id, ing);
          });
        setIngredients(
          [...byId.values()].sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Build the category filter list dynamically from the data we received.
  const categories = useMemo(() => {
    const set = new Set<string>();
    ingredients.forEach((ing) => set.add(ing.category));
    // Keep a stable, friendly order; only show categories that exist.
    const ordered = [
      "Face Oil",
      "Ingredient",
      "Plant-Based",
      "Oils & Milks",
      "Other",
    ].filter((c) => set.has(c));
    return ["All", ...ordered];
  }, [ingredients]);

  const filteredIngredients = ingredients.filter((ing) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      ing.name.toLowerCase().includes(q) ||
      ing.summary.toLowerCase().includes(q) ||
      ing.about.toLowerCase().includes(q) ||
      ing.tags.some((t) => t.toLowerCase().includes(q));
    const matchesCategory =
      activeCategory === "All" || ing.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Client-side pagination (12 per page). The whole library is loaded once, so
  // search + category filters still span every ingredient; we page the filtered
  // result. Server-side paging would scope those filters to a single page.
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredIngredients.length / PAGE_SIZE),
  );
  // Clamp so a shrinking filter (e.g. a new search) never lands on an empty page.
  const safePage = Math.min(page, totalPages);
  const pagedIngredients = filteredIngredients.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Jump back to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeCategory]);

  // Detail view: a single ingredient selected via /ingredients/:id
  if (id) {
    return (
      <IngredientDetail
        id={id}
        fallback={ingredients.find((ing) => ing.id === id)}
        allIngredients={ingredients}
        onBack={() => navigate("/ingredients")}
      />
    );
  }

  return (
    <main className="ingredient-lib-page min-h-screen font-sans">
      {/* Header Section */}
      <header className="ingredient-lib-glass-header text-white pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="mb-8 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="max-w-3xl ingredient-lib-animate-fadeUp">
            <span className="text-[#DCE5DD] text-[10px] font-bold tracking-[0.3em] uppercase mb-4 block">
              Botanical Wisdom
            </span>
            <h1 className="mb-6 leading-none font-serif text-[length:clamp(3rem,7vw,4.5rem)] font-bold">
              The <span className="italic">Ingredient</span> <br /> Library
            </h1>
            <p className="text-white/60 text-lg max-w-xl leading-relaxed mb-10">
              A clean, natural-focused guide to botanical powerhouses for
              gentle, long-term skin health.
            </p>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search by name or benefit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#DCE5DD]/50 transition-all placeholder:text-white/20"
                />
              </div>
              {/* Only show the type filter when the data actually spans more
                  than one category — otherwise it's a dead control. */}
              {categories.length > 2 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-6 py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all whitespace-nowrap ${
                        activeCategory === cat
                          ? "bg-[#DCE5DD] text-[#2D2A26]"
                          : "bg-white/5 text-white/60 border border-white/10 hover:border-white/30"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 w-[50%] h-full opacity-10 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-l from-[#DCE5DD] to-transparent" />
        </div>
      </header>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-[#3D5B4F]">
            <Loader2 className="animate-spin mb-4" size={36} />
            <p className="text-sm font-bold uppercase tracking-widest">
              Gathering botanicals…
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-white rounded-[2.5rem] p-12 border border-red-100 shadow-sm flex flex-col items-center text-center mb-24">
            <ShieldAlert className="text-red-400 mb-4" size={36} />
            <p className="text-[#2D2A26] font-bold mb-2">
              Couldn’t load the library
            </p>
            <p className="text-neutral-500 text-sm">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredIngredients.length === 0 && (
          <div className="py-24 text-center text-neutral-400">
            <Leaf className="mx-auto mb-4 text-[#DCE5DD]" size={36} />
            <p className="text-sm font-bold uppercase tracking-widest">
              No ingredients match your search
            </p>
          </div>
        )}

        {!loading && !error && filteredIngredients.length > 0 && (
          <div className="mb-16">
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-[38px]">
                {pagedIngredients.map((ing, idx) => (
                  <div
                    key={ing.id}
                    onClick={() => navigate(`/ingredients/${ing.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/ingredients/${ing.id}`);
                      }
                    }}
                    className="ingredient-lib-ingredient-card bg-white rounded-[1.5rem] overflow-hidden border border-neutral-100 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DCE5DD]"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    {/* Card header — the ingredient's own photograph where it has
                    one. The monogram sits underneath rather than instead of
                    it, so it also covers a photo that fails to load. Many
                    ingredients genuinely have no image yet; those keep the
                    monogram rather than borrowing stock photography. */}
                    <div className="aspect-[4/3] overflow-hidden relative bg-gradient-to-br from-[#2D2A26] to-[#3D5B4F] flex items-center justify-center">
                      <span className="ingredient-lib-card-img text-white/90 select-none font-serif text-[4.5rem] font-bold">
                        {ing.name?.charAt(0)?.toUpperCase()}
                      </span>

                      {ing.coverImage && (
                        <>
                          {/* A cover may be a photograph OR a short clip — the
                          editor's cover slot uploads through /upload/media,
                          which takes both. fallback={null} lets the monogram
                          behind show through if the file is gone. */}
                          <PostCover
                            src={ing.coverImage}
                            alt={ing.name}
                            fallback={null}
                            className="ingredient-lib-card-img absolute inset-0 w-full h-full object-cover"
                          />
                          {/* Keeps the category chip legible over a bright cover. */}
                          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/5 to-transparent pointer-events-none" />
                        </>
                      )}

                      {!ing.coverImage && (
                        <Leaf
                          className="absolute bottom-5 right-5 text-white/20"
                          size={40}
                        />
                      )}
                      <div className="absolute top-6 left-6">
                        <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[9px] font-bold tracking-widest uppercase">
                          {ing.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-xl font-bold text-[#2D2A26] mb-1 font-serif">
                        {ing.name}
                      </h3>
                      <p className="ae-eyebrow mb-3">Ingredient Reference</p>

                      {ing.about && (
                        <p className="text-sm text-[var(--ae-muted)] leading-relaxed mb-4 line-clamp-3">
                          {ing.about}
                        </p>
                      )}

                      {ing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {ing.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1 rounded-full bg-[#DCE5DD]/15 text-[#3D5B4F] text-[10px] font-bold tracking-wide uppercase"
                            >
                              {tag.replace(/-/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}

                      {ing.source && (
                        <div className="mt-auto pt-4 border-t border-line flex items-center gap-2">
                          <BookOpen
                            size={13}
                            className="text-[var(--ae-muted)] shrink-0"
                          />
                          <p className="text-xs text-[var(--ae-muted)] italic line-clamp-1">
                            {ing.source}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onChange={goToPage}
            />
          </div>
        )}

        {/* Short reels + photo carousel. A band under the grid, not a 340px
            sticky rail beside it: pinned, it followed the reader down a much
            longer masonry, and un-pinning it alone left its column empty for
            the rest of the page. Full width the grid gets its third column
            back on xl. */}
        {!loading && !error && filteredIngredients.length > 0 && (
          <div className="grid md:grid-cols-2 gap-8 mb-24 items-start">
            <SideReelsRail />
            <SidePhotoCarousel />
          </div>
        )}

        {/* Educational Sections */}
        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          {/* What to Limit — synthetic / chemical actives (lowest priority) */}
          <div className="bg-[#2D2A26] rounded-[3rem] p-12 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[#8a94a6]/20 flex items-center justify-center">
                  <ShieldAlert className="text-[#a9b1bf]" size={28} />
                </div>
                <span className="px-3 py-1.5 rounded-full bg-[#8a94a6]/20 border border-[#8a94a6]/30 text-[#a9b1bf] text-[9px] font-bold tracking-[0.2em] uppercase">
                  Use last
                </span>
              </div>
              <h2 className="text-3xl font-bold mb-6 font-serif">
                Chemical Actives
              </h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                Lowest priority in a natural routine. If you're keeping things
                low-chemical, reduce these synthetic powerhouses.
              </p>
              <ul className="space-y-4">
                {[
                  "Strong synthetic Vitamin C",
                  "High % Niacinamide serums",
                  "Lab-formulated harsh acids",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-4 text-sm font-bold tracking-wide text-white/80"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#8a94a6]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-10 p-6 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs italic text-white/40">
                  *Don’t completely avoid them if you have active acne, deep
                  pigmentation, or large pores. Natural solutions alone offer
                  slower results.
                </p>
              </div>
            </div>
          </div>

          {/* Natural Routine — organic / Ayurvedic / home remedies (top priority) */}
          <div className="bg-[#DCE5DD]/10 border border-[#DCE5DD]/20 rounded-[3rem] p-12 relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[#DCE5DD]/25 flex items-center justify-center">
                <Leaf className="text-[#3D5B4F]" size={28} />
              </div>
              <span className="px-3 py-1.5 rounded-full bg-[#C6A66B]/15 border border-[#C6A66B]/30 text-[#a9701f] text-[9px] font-bold tracking-[0.2em] uppercase">
                Start here
              </span>
            </div>
            <h2 className="text-3xl font-bold text-[#2D2A26] mb-6 font-serif">
              Simple Natural Routine
            </h2>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3D5B4F] mb-4">
                  Morning
                </p>
                <ul className="space-y-2 text-sm text-neutral-600 font-medium">
                  <li>• Aloe Vera Gel</li>
                  <li>• Jojoba Oil</li>
                  <li>• Mineral Sunscreen</li>
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3D5B4F] mb-4">
                  Night
                </p>
                <ul className="space-y-2 text-sm text-neutral-600 font-medium">
                  <li>• Gentle Cleanse</li>
                  <li>• Rosehip Oil</li>
                  <li>• Aloe Vera Seal</li>
                </ul>
              </div>
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-[#3D5B4F]/5 border border-[#3D5B4F]/10">
              <p className="text-xs font-bold text-[#3D5B4F] uppercase tracking-widest mb-2 flex items-center gap-2">
                <Sparkles size={14} /> Weekly Ritual
              </p>
              <p className="text-sm text-[#2D2A26]/70">
                Turmeric & Honey mask (1-2x) followed by a Green Tea chilled
                toner mist.
              </p>
            </div>
          </div>
        </div>

        {/* Honest Truth Banner */}
        <div className="bg-white rounded-[3rem] p-12 border border-neutral-100 shadow-sm flex flex-col md:flex-row items-center gap-12">
          <div className="w-20 h-20 rounded-full bg-[#FCFAF7] flex items-center justify-center flex-none">
            <Info className="text-[#3D5B4F]" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#2D2A26] mb-4 font-serif">
              The Honest Truth
            </h2>
            <p className="text-neutral-500 leading-relaxed">
              Natural skincare is **gentle, safe, and slow**. Actives are
              **fast, targeted, and powerful**. The best approach for most is
              **balance**, not extremes. Embrace botanical wisdom for daily
              health, and use actives thoughtfully for specific concerns.
            </p>
          </div>
          <button
            onClick={() => navigate("/journal")}
            className="px-8 py-4 rounded-2xl bg-[#2D2A26] text-white font-bold text-[10px] tracking-widest uppercase hover:bg-[#3D5B4F] transition-all whitespace-nowrap"
          >
            Learn More in Journal
          </button>
        </div>
      </section>
    </main>
  );
};

export default IngredientLibrary;
