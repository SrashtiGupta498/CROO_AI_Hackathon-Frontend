import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  Leaf,
  ShieldAlert,
  Sparkles,
  Info,
  BookOpen,
  Loader2,
  Tag,
  Droplet,
  Scissors,
  Heart,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Gauge,
  Hand,
  Users,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import API from "../services/api";

/* ---------------------------------------------------------------------------
 * API shape (GET /v1/posts/diy?type=INGREDIENT_REFERENCE)
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
  sections: ApiSection[];
}

// Map a raw tag / post type to a human-friendly category label.
const CATEGORY_LABELS: Record<string, string> = {
  "plant-based": "Plant-Based",
  "oils-and-milks": "Oils & Milks",
};
const TYPE_CATEGORY: Record<string, string> = {
  FACE_OIL: "Face Oil",
  INGREDIENT_REFERENCE: "Ingredient",
};

// Tags that are noise for display chips (generic / category tags).
const HIDDEN_TAGS = new Set([
  "ingredient",
  "plant-based",
  "oils-and-milks",
]);

const sectionBody = (
  sections: ApiSection[] | undefined,
  predicate: (s: ApiSection) => boolean,
) => sections?.find(predicate)?.body?.trim() || "";

const normalizeIngredient = (item: ApiIngredient): Ingredient => {
  const rawSections = item.sections || [];
  const about =
    sectionBody(
      rawSections,
      (s) => s.title?.toLowerCase() === "about" || s.type === "text",
    ) ||
    item.ai?.summary ||
    "";
  const source = sectionBody(
    rawSections,
    (s) => s.type === "source" || s.title?.toLowerCase() === "source",
  );

  // Keep every meaningful section, ordered, dropping the empty hero
  // (its title duplicates the page heading).
  const sections = rawSections
    .filter((s) => s.type !== "hero" && (s.body || "").trim().length > 0)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const tags = item.tags || [];
  const categoryTag = tags.find((t) => CATEGORY_LABELS[t]);
  const category =
    (item.type && TYPE_CATEGORY[item.type]) ||
    (categoryTag ? CATEGORY_LABELS[categoryTag] : "Other");

  return {
    id: item._id || item.slug || item.title,
    name: item.title,
    summary: item.ai?.summary || item.subtitle || "",
    about,
    source,
    category,
    tags: tags.filter((t) => !HIDDEN_TAGS.has(t)),
    sections,
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
  const body = section.body || "";
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
              <p className="text-[#1a2e25] font-bold mb-1">
                {q.replace(/^q\s*:/i, "").trim()}
              </p>
              <p className="text-neutral-600 leading-relaxed">{a}</p>
            </div>
          );
        })}
      </div>
    );
  }

  const isSource =
    section.type === "source" || (section.title || "").toLowerCase() === "source";
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
 * Detail view — fetches a single post by id:
 *   GET http://localhost:3002/v1/posts/getpostById/${_id}
 * Falls back to the list item we already have so the page works even while
 * the by-id endpoint is unavailable.
 * ------------------------------------------------------------------------- */
interface IngredientDetailProps {
  id: string;
  fallback?: Ingredient;
  onBack: () => void;
}

const IngredientDetail: React.FC<IngredientDetailProps> = ({
  id,
  fallback,
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

  const detailStyle = (
    <style>{`
      .glass-header { background: rgba(26, 46, 37, 0.95); backdrop-filter: blur(10px); }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      .animate-fadeUp { animation: fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    `}</style>
  );

  if (loading && !ingredient) {
    return (
      <main className="min-h-screen bg-[#f7f3ec] flex flex-col items-center justify-center text-[#6B8E7A]">
        <Loader2 className="animate-spin mb-4" size={36} />
        <p className="text-sm font-bold uppercase tracking-widest">
          Loading ingredient…
        </p>
      </main>
    );
  }

  if (!ingredient) {
    return (
      <main className="min-h-screen bg-[#f7f3ec] flex flex-col items-center justify-center text-center px-6">
        <ShieldAlert className="text-red-400 mb-4" size={36} />
        <p className="text-[#1a2e25] font-bold mb-2">
          Couldn’t load this ingredient
        </p>
        <p className="text-neutral-500 text-sm mb-8">{error}</p>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-2xl bg-[#1a2e25] text-white font-bold text-[10px] tracking-widest uppercase hover:bg-[#2d4a3e] transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Library
        </button>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#f7f3ec]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {detailStyle}

      {/* Hero */}
      <header className="glass-header text-white pt-24 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10 animate-fadeUp">
          <button
            onClick={onBack}
            className="mb-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase"
          >
            <ArrowLeft size={16} /> Library
          </button>
          <span className="inline-block px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#A8C5AB] text-[10px] font-bold tracking-[0.3em] uppercase mb-6">
            {ingredient.category}
          </span>
          <h1
            className="mb-4 leading-none"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(3rem, 8vw, 5rem)",
              fontWeight: 700,
            }}
          >
            {ingredient.name}
          </h1>
          <p className="text-white/60 text-sm font-bold uppercase tracking-widest">
            Ingredient Reference
          </p>
        </div>
        <div className="absolute top-0 right-0 w-[50%] h-full opacity-10 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-l from-[#A8C5AB] to-transparent" />
        </div>
      </header>

      {/* Body — render every section of the document, in order */}
      <section className="max-w-4xl mx-auto px-6 py-16 space-y-6">
        {loading && (
          <p className="text-xs font-bold uppercase tracking-widest text-[#6B8E7A] flex items-center gap-2">
            <Loader2 className="animate-spin" size={14} /> Refreshing…
          </p>
        )}

        {ingredient.sections.map((section, idx) => {
          const Icon = sectionIcon(section.title || "");
          return (
            <div
              key={`${section.title}-${idx}`}
              className="bg-white rounded-[2rem] p-8 md:p-10 border border-neutral-100 shadow-sm"
            >
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Icon size={14} className="text-[#6B8E7A]" />{" "}
                {section.title || "Details"}
              </p>
              <SectionBody section={section} />
            </div>
          );
        })}

        {/* Fallback if a post somehow has no sections */}
        {ingredient.sections.length === 0 && ingredient.about && (
          <div className="bg-white rounded-[2rem] p-8 md:p-10 border border-neutral-100 shadow-sm">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Leaf size={14} className="text-[#6B8E7A]" /> About
            </p>
            <p className="text-neutral-600 leading-relaxed whitespace-pre-line">
              {ingredient.about}
            </p>
          </div>
        )}

        {ingredient.tags.length > 0 && (
          <div className="bg-white rounded-[2rem] p-8 md:p-10 border border-neutral-100 shadow-sm">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Tag size={14} className="text-[#6B8E7A]" /> Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {ingredient.tags.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 rounded-full bg-[#A8C5AB]/15 text-[#6B8E7A] text-[11px] font-bold tracking-wide uppercase"
                >
                  {t.replace(/-/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
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

    // GET http://localhost:3002/v1/posts/diy?type=FACE_OIL&limit=200&page=1
    API.get("/posts/diy", { params: { type: "FACE_OIL", limit: 200, page: 1 } })
      .then((res) => {
        if (!active) return;
        const raw = res.data?.data ?? res.data;
        const items: ApiIngredient[] = Array.isArray(raw)
          ? raw
          : raw?.posts || [];
        setIngredients(
          items
            .map(normalizeIngredient)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .catch((err: any) => {
        if (!active) return;
        setError(
          err?.response?.data?.message ||
            "Failed to load the ingredient library.",
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

  // Detail view: a single ingredient selected via /ingredients/:id
  if (id) {
    return (
      <IngredientDetail
        id={id}
        fallback={ingredients.find((ing) => ing.id === id)}
        onBack={() => navigate("/ingredients")}
      />
    );
  }

  return (
    <main
      className="min-h-screen bg-[#f7f3ec]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp {
          animation: fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .glass-header {
          background: rgba(26, 46, 37, 0.95);
          backdrop-filter: blur(10px);
        }
        .ingredient-card:hover .card-img {
          transform: scale(1.1);
        }
        .card-img {
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      {/* Header Section */}
      <header className="glass-header text-white pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="mb-8 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="max-w-3xl animate-fadeUp">
            <span className="text-[#A8C5AB] text-[10px] font-bold tracking-[0.3em] uppercase mb-4 block">
              Botanical Wisdom
            </span>
            <h1
              className="mb-6 leading-none"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(3rem, 7vw, 4.5rem)",
                fontWeight: 700,
              }}
            >
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
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#A8C5AB]/50 transition-all placeholder:text-white/20"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all whitespace-nowrap ${
                      activeCategory === cat
                        ? "bg-[#A8C5AB] text-[#1a2e25]"
                        : "bg-white/5 text-white/60 border border-white/10 hover:border-white/30"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 w-[50%] h-full opacity-10 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-l from-[#A8C5AB] to-transparent" />
        </div>
      </header>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-[#6B8E7A]">
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
            <p className="text-[#1a2e25] font-bold mb-2">
              Couldn’t load the library
            </p>
            <p className="text-neutral-500 text-sm">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredIngredients.length === 0 && (
          <div className="py-24 text-center text-neutral-400">
            <Leaf className="mx-auto mb-4 text-[#A8C5AB]" size={36} />
            <p className="text-sm font-bold uppercase tracking-widest">
              No ingredients match your search
            </p>
          </div>
        )}

        {!loading && !error && filteredIngredients.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
            {filteredIngredients.map((ing, idx) => (
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
                className="ingredient-card bg-white rounded-[2.5rem] overflow-hidden border border-neutral-100 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A8C5AB]"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Decorative header (API provides no images) */}
                <div className="aspect-[4/3] overflow-hidden relative bg-gradient-to-br from-[#1a2e25] to-[#6B8E7A] flex items-center justify-center">
                  <span
                    className="card-img text-white/90 select-none"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "4.5rem",
                      fontWeight: 700,
                    }}
                  >
                    {ing.name?.charAt(0)?.toUpperCase()}
                  </span>
                  <Leaf
                    className="absolute bottom-5 right-5 text-white/20"
                    size={40}
                  />
                  <div className="absolute top-6 left-6">
                    <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[9px] font-bold tracking-widest uppercase">
                      {ing.category}
                    </span>
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-1">
                  <h3
                    className="text-2xl font-bold text-[#1a2e25] mb-2"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {ing.name}
                  </h3>
                  <p className="text-[#6B8E7A] text-xs font-bold uppercase tracking-wider mb-6">
                    Ingredient Reference
                  </p>

                  {ing.about && (
                    <p className="text-sm text-neutral-600 leading-relaxed mb-6 line-clamp-5">
                      {ing.about}
                    </p>
                  )}

                  {ing.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {ing.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full bg-[#A8C5AB]/15 text-[#6B8E7A] text-[10px] font-bold tracking-wide uppercase"
                        >
                          {tag.replace(/-/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}

                  {ing.source && (
                    <div className="mt-auto pt-6 border-t border-neutral-50">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <BookOpen size={13} /> Source
                      </p>
                      <p className="text-xs text-neutral-500 leading-relaxed italic">
                        {ing.source}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Educational Sections */}
        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          {/* What to Limit */}
          <div className="bg-[#1a2e25] rounded-[3rem] p-12 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
                <ShieldAlert className="text-[#A8C5AB]" size={28} />
              </div>
              <h2
                className="text-3xl font-bold mb-6"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                What to Limit
              </h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                If you're pursuing a low-chemical routine, consider reducing
                these synthetic powerhouses.
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
                    <div className="w-2 h-2 rounded-full bg-red-400" />
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

          {/* Natural Routine */}
          <div className="bg-[#A8C5AB]/10 border border-[#A8C5AB]/20 rounded-[3rem] p-12 relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-[#A8C5AB]/20 flex items-center justify-center mb-8">
              <Leaf className="text-[#6B8E7A]" size={28} />
            </div>
            <h2
              className="text-3xl font-bold text-[#1a2e25] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Simple Natural Routine
            </h2>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B8E7A] mb-4">
                  Morning
                </p>
                <ul className="space-y-2 text-sm text-neutral-600 font-medium">
                  <li>• Aloe Vera Gel</li>
                  <li>• Jojoba Oil</li>
                  <li>• Mineral Sunscreen</li>
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6B8E7A] mb-4">
                  Night
                </p>
                <ul className="space-y-2 text-sm text-neutral-600 font-medium">
                  <li>• Gentle Cleanse</li>
                  <li>• Rosehip Oil</li>
                  <li>• Aloe Vera Seal</li>
                </ul>
              </div>
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-[#6B8E7A]/5 border border-[#6B8E7A]/10">
              <p className="text-xs font-bold text-[#6B8E7A] uppercase tracking-widest mb-2 flex items-center gap-2">
                <Sparkles size={14} /> Weekly Ritual
              </p>
              <p className="text-sm text-[#1a2e25]/70">
                Turmeric & Honey mask (1-2x) followed by a Green Tea chilled
                toner mist.
              </p>
            </div>
          </div>
        </div>

        {/* Honest Truth Banner */}
        <div className="bg-white rounded-[3rem] p-12 border border-neutral-100 shadow-sm flex flex-col md:flex-row items-center gap-12">
          <div className="w-20 h-20 rounded-full bg-[#f7f3ec] flex items-center justify-center flex-none">
            <Info className="text-[#6B8E7A]" size={32} />
          </div>
          <div>
            <h2
              className="text-2xl font-bold text-[#1a2e25] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
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
            className="px-8 py-4 rounded-2xl bg-[#1a2e25] text-white font-bold text-[10px] tracking-widest uppercase hover:bg-[#2d4a3e] transition-all whitespace-nowrap"
          >
            Learn More in Journal
          </button>
        </div>
      </section>
    </main>
  );
};

export default IngredientLibrary;
