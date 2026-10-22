import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import { toAbsoluteUrl } from "../services/uploadImage";
import PostCover from "../components/PostCover";
import ImageCarousel from "../components/ImageCarousel";
import Pagination from "../components/Pagination";
import {
  bookmarkPost,
  unbookmarkPost,
  getBookmarkStatus,
} from "../services/engagement";
import "./DIYCreator.css";

type RecipeStep = string | { instruction?: string; step?: number };
type RecipeIngredient = {
  name?: string;
  note?: string;
  img?: string;
} & Record<string, unknown>;
type RecipeSection = {
  type?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  author?: string;
  order?: number;
  image?: string;
  images?: string[];
  videoUrl?: string;
  video?: string;
  caption?: string;
};
type Recipe = {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  level?: string;
  description: string;
  time?: string;
  servings?: string;
  videoUrl?: string;
  highlights?: string[];
  hero?: string;
  sections?: RecipeSection[];
  ingredients?: Array<RecipeIngredient | string>;
  steps?: RecipeStep[];
};

type NormalizedIngredient = {
  name: string;
  note: string;
  img: string;
};

const FALLBACK_STEPS = [
  "No steps were found in this recipe entry.",
  "Please add step-by-step instructions in the source JSON file.",
];

// Map a post from GET /v1/posts/diy into the Recipe shape this page renders.
const normalizeRecipe = (post: any, index: number): Recipe => {
  const rawId = post?.id ?? post?._id ?? post?.slug ?? `recipe-${index}`;
  const id =
    rawId && typeof rawId === "object" && typeof rawId.$oid === "string"
      ? rawId.$oid
      : String(rawId);

  // Post content lives in an ordered `sections` array (hero / text / quote).
  const sections: RecipeSection[] = Array.isArray(post?.sections)
    ? [...post.sections].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
    : [];
  const hero = sections.find((s) => s?.type === "hero");
  const contentSections = sections.filter((s) => s?.type !== "hero");

  return {
    id,
    title: post?.title || hero?.title || "Untitled Recipe",
    subtitle: post?.subtitle || "",
    category:
      post?.category?.name || post?.category || post?.subtitle || post?.tags?.[0] || "",
    level: post?.level || "",
    description:
      post?.description || post?.excerpt || hero?.subtitle || post?.subtitle || "",
    time: post?.time || post?.readTime || "",
    servings: post?.servings || "",
    videoUrl: post?.videoUrl || post?.video || post?.videoURL || hero?.video || "",
    highlights: Array.isArray(post?.highlights)
      ? post.highlights
      : Array.isArray(post?.tags)
        ? post.tags
        : [],
    hero:
      post?.hero ||
      post?.thumbnail ||
      post?.thumbnailUrl ||
      post?.imageUrl ||
      post?.image ||
      "",
    sections: contentSections,
    ingredients: Array.isArray(post?.ingredients) ? post.ingredients : [],
    steps: Array.isArray(post?.steps) ? post.steps : [],
  };
};

/* A recipe's own cover, or "" — callers hide the slot rather than borrowing a
   bundled stock photo. Covers may be a photograph or a short clip, so they go
   through PostCover; the path is resolved because uploads come back relative
   ("/uploads/…") and must be served from the API host. */
const getRecipeImage = (recipe: Recipe) => toAbsoluteUrl(recipe.hero?.trim() || "");

const getLevelLabel = (value?: string) => value?.trim() || "Beginner";
const getCategoryLabel = (value?: string) => value?.trim() || "DIY";

// Return the recipe's own value, or "" when missing — callers hide the field
// instead of showing "not specified".
const cleanValue = (value?: string) => value?.trim() || "";

/// A recipe's own how-to video, or "" — the section is dropped when there is
// none rather than playing an unrelated sample clip.
const getRecipeVideo = (recipe: Recipe) => toAbsoluteUrl(recipe.videoUrl?.trim() || "");
const getTimeLabel = (value?: string) => value?.trim() || "Time not specified";
const getServingLabel = (value?: string) => value?.trim() || "Servings not specified";

const normalizeSteps = (steps?: RecipeStep[]) => {
  const parsed = (steps || []).map((entry) => {
    if (typeof entry === "string") return entry.trim();
    if (entry && typeof entry === "object" && typeof entry.instruction === "string")
      return entry.instruction.trim();
    return "";
  });

  const filtered = parsed.filter((entry) => entry.length > 0);
  return filtered.length > 0 ? filtered : FALLBACK_STEPS;
};

const normalizeIngredients = (ingredients: Array<RecipeIngredient | string> = []) => {
  return ingredients.map((item, index): NormalizedIngredient => {
    if (typeof item === "string") {
      // A bare string ingredient carries no picture of its own.
      return {
        name: item || `Ingredient ${index + 1}`,
        note: "",
        img: "",
      };
    }

    return {
      name: item.name?.trim() || `Ingredient ${index + 1}`,
      note: item.note?.trim() || "",
      // Only a picture the recipe actually supplies; the card drops the
      // avatar rather than showing an unrelated stock photo of it.
      img: toAbsoluteUrl(item.img || ""),
    };
  });
};

// Parse a section body (markdown-ish text with bullet/numbered lines) into blocks.
type BodyBlock = { kind: "ul" | "ol" | "p"; items: string[] };
const parseBodyBlocks = (body?: string): BodyBlock[] => {
  const lines = (body || "").split("\n").map((line) => line.trim());
  const blocks: BodyBlock[] = [];

  for (const line of lines) {
    if (!line) continue;
    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    const unordered = line.match(/^[-•*]\s+(.*)$/);
    const last = blocks[blocks.length - 1];

    if (ordered) {
      if (last?.kind === "ol") last.items.push(ordered[1]);
      else blocks.push({ kind: "ol", items: [ordered[1]] });
    } else if (unordered) {
      if (last?.kind === "ul") last.items.push(unordered[1]);
      else blocks.push({ kind: "ul", items: [unordered[1]] });
    } else if (last?.kind === "p") {
      last.items.push(line);
    } else {
      blocks.push({ kind: "p", items: [line] });
    }
  }

  return blocks;
};

const SectionBlock = ({ section }: { section: RecipeSection }) => {
  const type = (section.type || "").toLowerCase();

  // Photos uploaded via the Story Editor's Image block — previously fell
  // through to the generic text branch below (which has nothing to show
  // for an image section: no title, no body) and silently rendered blank.
  if (type === "image" || type === "hero" || type === "gallery" || type === "images") {
    const urls = (section.images?.length ? section.images : section.image ? [section.image] : []).map(
      toAbsoluteUrl,
    );
    if (!urls.length) return null;
    // `gallery`/`images` is what the editor's Carousel layout saves as; a
    // plain `image` section is a single plate. ImageCarousel handles both and
    // reserves each slide's aspect ratio — the old markup used h-auto with no
    // reserved box, which collapsed every photo to 0px, and a zero-height
    // element never triggers its own loading="lazy" fetch, so the photos in
    // an article never appeared at all.
    return (
      <section className="mb-12">
        {section.title && (
          <h3 className="font-serif text-2xl md:text-3xl text-ink mb-4">{section.title}</h3>
        )}
        <div className="diy-card rounded-[24px] overflow-hidden">
          <ImageCarousel
            images={urls}
            alt={section.caption || section.title || "Recipe photo"}
            aspect="16 / 10"
          />
        </div>
        {section.caption && <p className="mt-3 text-sm italic text-muted text-center">{section.caption}</p>}
      </section>
    );
  }

  // A real video clip.
  if (type === "video" && section.videoUrl) {
    return (
      <section className="mb-12">
        {section.title && (
          <h3 className="font-serif text-2xl md:text-3xl text-ink mb-4">{section.title}</h3>
        )}
        <div className="rounded-[24px] overflow-hidden diy-card bg-black">
          <video
            src={toAbsoluteUrl(section.videoUrl)}
            controls
            playsInline
            preload="metadata"
            className="w-full h-auto max-h-[520px] object-cover"
          />
        </div>
        {section.caption && <p className="mt-3 text-sm italic text-muted text-center">{section.caption}</p>}
      </section>
    );
  }

  // A GIF-style clip — a raw .gif plays natively; the recommended mp4/webm
  // loop plays autoplay/muted/loop so it reads exactly like a GIF.
  if (type === "gif" && (section.videoUrl || section.image)) {
    return (
      <section className="mb-12">
        <div className="rounded-[24px] overflow-hidden diy-card">
          {section.videoUrl ? (
            <video
              src={toAbsoluteUrl(section.videoUrl)}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-auto max-h-[520px] object-cover"
            />
          ) : (
            <img
              src={toAbsoluteUrl(section.image)}
              alt={section.caption || "Recipe clip"}
              loading="lazy"
              className="w-full h-auto max-h-[520px] object-cover"
            />
          )}
        </div>
        {section.caption && <p className="mt-3 text-sm italic text-muted text-center">{section.caption}</p>}
      </section>
    );
  }

  if (section.type === "quote") {
    return (
      <section className="mb-12 bg-paper rounded-[24px] diy-card p-8 md:p-10 border-l-4 border-sage">
        {section.title && (
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-sage mb-3">
            {section.title}
          </p>
        )}
        {section.body && (
          <p className="font-serif text-xl md:text-2xl italic leading-relaxed text-[#231a11]">
            {section.body}
          </p>
        )}
        {section.author && (
          <p className="mt-4 text-sm font-bold text-muted">— {section.author}</p>
        )}
      </section>
    );
  }

  const blocks = parseBodyBlocks(section.body);

  return (
    <section className="mb-12">
      {section.title && (
        <h3 className="font-serif text-2xl md:text-3xl text-ink mb-2">{section.title}</h3>
      )}
      {section.subtitle && (
        <p className="italic text-muted mb-5">{section.subtitle}</p>
      )}
      <div className="space-y-5">
        {blocks.map((block, index) => {
          if (block.kind === "ol") {
            return (
              <div key={index} className="space-y-6">
                {block.items.map((text, i) => (
                  <div key={i} className="diy-step-item relative flex gap-6">
                    <div className="diy-step-line relative">
                      <div className="w-4 h-4 rounded-full bg-sage ring-4 ring-sage-light mt-1.5 relative z-10" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-sage mb-2">
                        Step {String(i + 1).padStart(2, "0")}
                      </p>
                      <p className="text-lg leading-relaxed text-[#231a11]">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          if (block.kind === "ul") {
            return (
              <ul key={index} className="space-y-2">
                {block.items.map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#231a11] leading-relaxed">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-sage flex-shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            );
          }

          return block.items.map((text, i) => (
            <p key={`${index}-${i}`} className="text-lg leading-relaxed text-[#231a11]">
              {text}
            </p>
          ));
        })}
      </div>
    </section>
  );
};

const RecipeBlock = ({
  recipe,
  onOpen,
}: {
  recipe: Recipe;
  onOpen: () => void;
}) => {
  const cover = getRecipeImage(recipe);
  return (
  <button onClick={onOpen} className="group text-left">
    <article className="bg-paper rounded-[20px] overflow-hidden border border-ink/5 card-shadow hover:-translate-y-1 transition-all">
      <div className="aspect-[16/10] overflow-hidden">
        {cover ? (
          <PostCover
            src={cover}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          // A recipe with no cover of its own gets the quiet branded tile —
          // the same "no cover" language PostCover itself falls back to.
          <div
            className="w-full h-full"
            style={{ background: "linear-gradient(135deg, var(--color-sage) 0%, var(--color-ink) 100%)" }}
          />
        )}
      </div>
      <div className="p-4 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-sage">
          {getCategoryLabel(recipe.category)}
        </p>
        <h2 className="font-serif text-2xl text-ink group-hover:text-sage">{recipe.title}</h2>
        <p className="text-sm text-muted leading-relaxed">{recipe.description}</p>
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] font-bold text-muted">
          {/* Promised a video guide unconditionally before, including for the
              many recipes that have no clip at all. */}
          {getRecipeVideo(recipe) && (
            <span className="flex items-center gap-1">
              <span className="material-icons-round text-sm">play_circle</span>
              Video guide
            </span>
          )}
          {cleanValue(recipe.time) && (
            <span className="flex items-center gap-1">
              <span className="material-icons-round text-sm">schedule</span>
              {cleanValue(recipe.time)}
            </span>
          )}
        </div>
      </div>
    </article>
  </button>
  );
};

/* Save (bookmark) toggle for a recipe, backed by the engagement endpoints:
   POST /engagements {type:'bookmark'}, DELETE /engagements/bookmark/:postId,
   GET /engagements/bookmark/:postId/status. The service side also keeps the
   post's stats.bookmarks counter in step, so nothing extra is needed here. */
const SaveRecipeButton = ({ recipeId }: { recipeId: string }) => {
  const navigate = useNavigate();
  const signedIn = Boolean(
    JSON.parse(localStorage.getItem("currentUser") || "null"),
  );
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Status is an authenticated call; signed out there is nothing to ask for
    // and the button simply starts unsaved.
    if (!signedIn) return;
    let active = true;
    getBookmarkStatus(recipeId)
      .then((v) => active && setSaved(v))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [recipeId, signedIn]);

  const toggle = async () => {
    if (busy) return;
    if (!signedIn) {
      navigate("/Login");
      return;
    }
    const next = !saved;
    setBusy(true);
    setSaved(next); // optimistic — the toggle should feel instant
    try {
      await (next ? bookmarkPost(recipeId) : unbookmarkPost(recipeId));
    } catch {
      setSaved(!next); // put it back; the save didn't happen
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-50"
      title={signedIn ? (saved ? "Saved — tap to remove" : "Save recipe") : "Sign in to save"}
      aria-label={saved ? "Remove from saved" : "Save recipe"}
      aria-pressed={saved}
    >
      <span className="material-icons-round text-primary">
        {saved ? "bookmark" : "bookmark_border"}
      </span>
    </button>
  );
};

const RecipeDetails = ({
  recipe,
  onBack,
}: {
  recipe: Recipe;
  onBack: () => void;
}) => {
  const sections = recipe.sections || [];
  const hasSections = sections.length > 0;
  const steps = normalizeSteps(recipe.steps);
  const ingredients = normalizeIngredients(recipe.ingredients || []);
  const highlights = recipe.highlights && recipe.highlights.length > 0
    ? recipe.highlights
    : ["No highlights added for this recipe."];
  const heroImage = getRecipeImage(recipe);
  const heroVideo = getRecipeVideo(recipe);

  return (
    <div className="min-h-screen bg-paper-2 text-mocha">
      <div className="diy-page-paper">
        <header className="max-w-4xl mx-auto px-4 md:px-6 pt-4">
          <div className="h-16 rounded-[20px] bg-paper/85 backdrop-blur-sm border border-ink/10 flex items-center justify-between px-4">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 transition-colors">
              <span className="material-icons-round text-primary">arrow_back</span>
            </button>
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-primary">Recipe</h1>
            <SaveRecipeButton recipeId={recipe.id} />
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 md:px-8 pt-6 pb-36">
          {/* Hero and how-to video both render only from the recipe's own
              media. Previously each fell back to a bundled stock photo or an
              unrelated sample clip, which read as though every recipe shipped
              with its own photography and walkthrough. */}
          {heroImage && (
            <section className="mb-8">
              <div className="overflow-hidden rounded-[24px] diy-card aspect-[1.34/1] w-full">
                <PostCover src={heroImage} alt={recipe.title} className="w-full h-full object-cover" />
              </div>
            </section>
          )}

          {heroVideo && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-icons-round text-sage">play_circle</span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-sage">Watch &amp; make it</h3>
              </div>
              <div className="overflow-hidden rounded-[24px] diy-card bg-black aspect-video w-full">
                <video
                  src={heroVideo}
                  poster={heroImage || undefined}
                  controls
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              </div>
            </section>
          )}

          <section className="mb-12">
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="px-4 py-1.5 bg-ink/5 text-ink/80 font-bold uppercase tracking-[0.16em] text-[11px] rounded-full">
                {getCategoryLabel(recipe.category)}
              </span>
              <span className="px-4 py-1.5 bg-ink/5 text-ink/80 font-bold uppercase tracking-[0.16em] text-[11px] rounded-full">
                {getLevelLabel(recipe.level)}
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-5xl leading-tight text-[#231a11] mb-3">{recipe.title}</h2>
            <p className="italic text-muted mb-8">{recipe.description}</p>
            <div className="flex items-center gap-8 border-t border-muted/20 pt-6">
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-sage text-base">spa</span>
                <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted">
                  {getLevelLabel(recipe.level)}
                </span>
              </div>
              {cleanValue(recipe.time) && (
                <div className="flex items-center gap-2">
                  <span className="material-icons-round text-sage text-base">schedule</span>
                  <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted">
                    {cleanValue(recipe.time)}
                  </span>
                </div>
              )}
              {cleanValue(recipe.servings) && (
                <div className="flex items-center gap-2">
                  <span className="material-icons-round text-sage text-base">restaurant</span>
                  <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted">
                    {cleanValue(recipe.servings)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {hasSections ? (
            <div className="mb-20">
              {sections.map((section, index) => (
                <SectionBlock key={`${recipe.id}-section-${index}`} section={section} />
              ))}
            </div>
          ) : (
            <>
              <section className="mb-20">
                <h3 className="font-serif text-3xl text-ink mb-8">Ingredients</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {ingredients.map((item, index) => (
                    <article key={`${item.name}-${index}`} className="bg-paper rounded-[20px] p-4 flex items-center gap-4 diy-card">
                      {item.img && (
                        <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                          <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-serif text-xl text-ink mb-1">{item.name}</h4>
                        <p className="text-sm text-muted leading-relaxed">{item.note || "No notes added."}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="mb-20">
                <h3 className="font-serif text-3xl text-ink mb-10">How to make</h3>
                <div className="space-y-12">
                  {steps.map((text, index) => (
                    <div key={`${recipe.id}-step-${index}`} className="diy-step-item relative flex gap-6">
                      <div className="diy-step-line relative">
                        <div className="w-4 h-4 rounded-full bg-sage ring-4 ring-sage-light mt-1.5 relative z-10" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-sage mb-2">
                          Step {String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="text-lg leading-relaxed text-[#231a11]">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-20 bg-paper rounded-[24px] diy-card p-8 md:p-10">
                <h3 className="font-serif text-3xl text-ink mb-6">Why You'll Love It</h3>
                <div className="flex flex-wrap gap-3">
                  {highlights.map((item) => (
                    <span
                      key={item}
                      className="px-6 py-2 bg-paper border border-sage/20 text-ink/80 rounded-full diy-card text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            </>
          )}

          <footer className="border-t border-muted/20 pt-8 pb-6 space-y-4">
            <div className="flex items-start gap-4 text-muted">
              <span className="material-icons-round mt-[2px]">inventory_2</span>
              <p className="leading-relaxed">Store in a cool, dry place away from direct sunlight.</p>
            </div>
            <div className="flex items-start gap-4 text-muted">
              <span className="material-icons-round mt-[2px]">history</span>
              <p className="leading-relaxed">Shelf life: approximately 6 months.</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

const DIYCreator: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const PAGE_SIZE = 12;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-side pagination: fetch one page (12 recipes) at a time. The backend
  // returns pagination metadata under res.data.pagination once the response
  // interceptor stops discarding it.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // GET http://localhost:3002/v1/posts/diy?limit=12&page=<page>
    API.get("/posts/diy", { params: { limit: PAGE_SIZE, page } })
      .then((res) => {
        if (!active) return;
        const rawData = res.data?.data ?? res.data;
        const items = Array.isArray(rawData) ? rawData : rawData?.posts || [];
        setRecipes(items.map(normalizeRecipe));
        const meta = res.data?.pagination;
        if (meta?.totalPages) {
          setTotalPages(meta.totalPages);
        } else if (meta?.total && meta?.limit) {
          setTotalPages(Math.max(1, Math.ceil(meta.total / meta.limit)));
        } else {
          // No metadata (older API) → infer: a full page might have more.
          setTotalPages(items.length < PAGE_SIZE ? page : page + 1);
        }
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load DIY recipes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page]);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // The list above only ever loads the first page (limit: 10). Opening a
  // recipe outside that page used to silently fall through to the list view
  // instead of its detail — fetch it directly by id, same as the Ingredient
  // Library's detail page, with the list-derived copy as an instant fallback
  // while that request is in flight.
  const [fetchedRecipe, setFetchedRecipe] = useState<Recipe | null>(null);
  useEffect(() => {
    if (!id) {
      setFetchedRecipe(null);
      return;
    }
    let active = true;
    // GET http://localhost:3002/v1/posts/getpostById/{id}
    API.get(`/posts/getpostById/${id}`)
      .then((res) => {
        if (!active) return;
        const raw = res.data?.data ?? res.data;
        if (raw && (raw._id || raw.id)) setFetchedRecipe(normalizeRecipe(raw, 0));
      })
      .catch(() => {
        /* keep whatever list-derived fallback we already have, if any */
      });
    return () => {
      active = false;
    };
  }, [id]);

  const selected = fetchedRecipe || (id ? recipes.find((recipe) => recipe.id === id) : null);

  if (selected) {
    return <RecipeDetails recipe={selected} onBack={() => navigate("/diy")} />;
  }

  return (
    <div className="min-h-screen bg-paper-2 text-mocha px-4 md:px-8 pb-28">
      <div className="diy-page-paper min-h-full max-w-6xl mx-auto">
        <header className="pt-6 pb-8">
          <h1 className="font-serif text-4xl md:text-5xl text-ink">DIY Recipes</h1>
          <p className="mt-2 text-muted">Choose a recipe card and open step-by-step instructions.</p>
        </header>

        {loading && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-paper rounded-[20px] overflow-hidden border border-ink/5 card-shadow animate-pulse"
              >
                <div className="aspect-[16/10] bg-ink/5" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-20 bg-ink/10 rounded-full" />
                  <div className="h-5 w-3/4 bg-ink/10 rounded-full" />
                  <div className="h-3 w-full bg-ink/10 rounded-full" />
                </div>
              </div>
            ))}
          </section>
        )}

        {!loading && error && (
          <div className="py-20 text-center">
            <p className="text-muted mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-full bg-sage text-white text-sm font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && recipes.length === 0 && (
          <div className="py-20 text-center text-muted">No DIY recipes found.</div>
        )}

        {!loading && !error && recipes.length > 0 && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              {recipes.map((recipe, index) => (
                <RecipeBlock
                  key={recipe.id}
                  recipe={recipe}
                  onOpen={() => navigate(`/diy/${recipe.id}`)}
                />
              ))}
            </section>
            <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
          </>
        )}
      </div>
    </div>
  );
};

export default DIYCreator;
