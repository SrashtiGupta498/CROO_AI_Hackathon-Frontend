import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import {
  Img1,
  Img10,
  Img11,
  Img12,
  Img2,
  Img3,
  Img4,
  Img5,
  Img6,
  Img7,
  Img8,
  Img9,
} from "../assets/index";

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

const DEFAULT_DIY_IMAGES = [Img1, Img2, Img3, Img4, Img5, Img6, Img7, Img8, Img9, Img10, Img11, Img12];

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

const getSeedIndex = (seed: string) => {
  return (
    Math.abs(
      seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
    ) % DEFAULT_DIY_IMAGES.length
  );
};

const getRecipeImage = (recipe: Recipe, index: number) => {
  return recipe.hero || DEFAULT_DIY_IMAGES[index % DEFAULT_DIY_IMAGES.length];
};

const getLevelLabel = (value?: string) => value?.trim() || "Beginner";
const getCategoryLabel = (value?: string) => value?.trim() || "DIY";
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
      return {
        name: item || `Ingredient ${index + 1}`,
        note: "",
        img: DEFAULT_DIY_IMAGES[index % DEFAULT_DIY_IMAGES.length],
      };
    }

    return {
      name: item.name?.trim() || `Ingredient ${index + 1}`,
      note: item.note?.trim() || "",
      img: item.img || DEFAULT_DIY_IMAGES[index % DEFAULT_DIY_IMAGES.length],
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
  if (section.type === "quote") {
    return (
      <section className="mb-12 bg-[#fffdfa] rounded-[24px] diy-card p-8 md:p-10 border-l-4 border-[#6B8E7A]">
        {section.title && (
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#6B8E7A] mb-3">
            {section.title}
          </p>
        )}
        {section.body && (
          <p className="font-serif text-xl md:text-2xl italic leading-relaxed text-[#231a11]">
            {section.body}
          </p>
        )}
        {section.author && (
          <p className="mt-4 text-sm font-bold text-[#6a5a49]">— {section.author}</p>
        )}
      </section>
    );
  }

  const blocks = parseBodyBlocks(section.body);

  return (
    <section className="mb-12">
      {section.title && (
        <h3 className="font-serif text-2xl md:text-3xl text-[#1a2e25] mb-2">{section.title}</h3>
      )}
      {section.subtitle && (
        <p className="italic text-[#6a5a49] mb-5">{section.subtitle}</p>
      )}
      <div className="space-y-5">
        {blocks.map((block, index) => {
          if (block.kind === "ol") {
            return (
              <div key={index} className="space-y-6">
                {block.items.map((text, i) => (
                  <div key={i} className="step-item relative flex gap-6">
                    <div className="step-line relative">
                      <div className="w-4 h-4 rounded-full bg-[#6B8E7A] ring-4 ring-[#d7e7d2] mt-1.5 relative z-10" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#6B8E7A] mb-2">
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
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#6B8E7A] flex-shrink-0" />
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
  imageIndex,
}: {
  recipe: Recipe;
  onOpen: () => void;
  imageIndex: number;
}) => (
  <button onClick={onOpen} className="group text-left">
    <article className="bg-[#fffdfa] rounded-[20px] overflow-hidden border border-[#1a2e25]/5 card-shadow hover:-translate-y-1 transition-all">
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={getRecipeImage(recipe, imageIndex)}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
      </div>
      <div className="p-4 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#6B8E7A]">
          {getCategoryLabel(recipe.category)}
        </p>
        <h2 className="font-serif text-2xl text-[#1a2e25] group-hover:text-[#6B8E7A]">{recipe.title}</h2>
        <p className="text-sm text-[#6a5a49] leading-relaxed">{recipe.description}</p>
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] font-bold text-[#6a5a49]">
          <span className="flex items-center gap-1">
            <span className="material-icons-round text-sm">schedule</span>
            {getTimeLabel(recipe.time)}
          </span>
          <span>{getServingLabel(recipe.servings)}</span>
        </div>
      </div>
    </article>
  </button>
);

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
  const heroImage = getRecipeImage(recipe, getSeedIndex(recipe.id));

  return (
    <div className="min-h-screen bg-[#f7f3ec] text-mocha">
      <style>{`
        .diy-page-paper {
          background-image: url("https://www.transparenttextures.com/patterns/natural-paper.png");
          background-repeat: repeat;
        }
        .diy-card {
          box-shadow: 0 20px 40px rgba(74, 63, 53, 0.05);
        }
        .step-line::before {
          content: '';
          position: absolute;
          left: 7px;
          top: 24px;
          bottom: -12px;
          width: 1px;
          background-color: rgba(74, 56, 37, 0.25);
        }
        .step-item:last-child .step-line::before {
          display: none;
        }
      `}</style>

      <div className="diy-page-paper">
        <header className="max-w-4xl mx-auto px-4 md:px-6 pt-4">
          <div className="h-16 rounded-[20px] bg-[#fefcf7]/85 backdrop-blur-sm border border-[#1a2e25]/10 flex items-center justify-between px-4">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 transition-colors">
              <span className="material-icons-round text-primary">arrow_back</span>
            </button>
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-primary">Recipe</h1>
            <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
              <span className="material-icons-round text-primary">bookmark_border</span>
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 md:px-8 pt-6 pb-36">
          <section className="mb-12">
            <div className="overflow-hidden rounded-[24px] diy-card aspect-[1.34/1] w-full">
              <img src={heroImage} alt={recipe.title} className="w-full h-full object-cover" />
            </div>
          </section>

          <section className="mb-12">
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="px-4 py-1.5 bg-[#1a2e25]/5 text-[#3e342a] font-bold uppercase tracking-[0.16em] text-[11px] rounded-full">
                {getCategoryLabel(recipe.category)}
              </span>
              <span className="px-4 py-1.5 bg-[#1a2e25]/5 text-[#3e342a] font-bold uppercase tracking-[0.16em] text-[11px] rounded-full">
                {getLevelLabel(recipe.level)}
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-5xl leading-tight text-[#231a11] mb-3">{recipe.title}</h2>
            <p className="italic text-[#6a5a49] mb-8">{recipe.description}</p>
            <div className="flex items-center gap-8 border-t border-[#6a5a49]/20 pt-6">
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-[#6B8E7A] text-base">schedule</span>
                <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#6a5a49]">
                  {getTimeLabel(recipe.time)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-[#6B8E7A] text-base">restaurant</span>
                <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#6a5a49]">
                  {getServingLabel(recipe.servings)}
                </span>
              </div>
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
                <h3 className="font-serif text-3xl text-[#1a2e25] mb-8">Ingredients</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {ingredients.map((item, index) => (
                    <article key={`${item.name}-${index}`} className="bg-[#fffdfa] rounded-[20px] p-4 flex items-center gap-4 diy-card">
                      <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                        <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-serif text-xl text-[#1a2e25] mb-1">{item.name}</h4>
                        <p className="text-sm text-[#6a5a49] leading-relaxed">{item.note || "No notes added."}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="mb-20">
                <h3 className="font-serif text-3xl text-[#1a2e25] mb-10">How to make</h3>
                <div className="space-y-12">
                  {steps.map((text, index) => (
                    <div key={`${recipe.id}-step-${index}`} className="step-item relative flex gap-6">
                      <div className="step-line relative">
                        <div className="w-4 h-4 rounded-full bg-[#6B8E7A] ring-4 ring-[#d7e7d2] mt-1.5 relative z-10" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#6B8E7A] mb-2">
                          Step {String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="text-lg leading-relaxed text-[#231a11]">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-20 bg-[#fffdfa] rounded-[24px] diy-card p-8 md:p-10">
                <h3 className="font-serif text-3xl text-[#1a2e25] mb-6">Why You'll Love It</h3>
                <div className="flex flex-wrap gap-3">
                  {highlights.map((item) => (
                    <span
                      key={item}
                      className="px-6 py-2 bg-[#fdf8ef] border border-[#6b8e7a]/20 text-[#3e3429] rounded-full diy-card text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            </>
          )}

          <footer className="border-t border-[#6a5a49]/20 pt-8 pb-6 space-y-4">
            <div className="flex items-start gap-4 text-[#6a5a49]">
              <span className="material-icons-round mt-[2px]">inventory_2</span>
              <p className="leading-relaxed">Store in a cool, dry place away from direct sunlight.</p>
            </div>
            <div className="flex items-start gap-4 text-[#6a5a49]">
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

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // GET http://localhost:3002/v1/posts/diy?limit=10&page=1
    API.get("/posts/diy", { params: { limit: 10, page: 1 } })
      .then((res) => {
        if (!active) return;
        const rawData = res.data?.data ?? res.data;
        const items = Array.isArray(rawData) ? rawData : rawData?.posts || [];
        setRecipes(items.map(normalizeRecipe));
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
  }, []);

  const selected = id ? recipes.find((recipe) => recipe.id === id) : null;

  if (selected) {
    return <RecipeDetails recipe={selected} onBack={() => navigate("/diy")} />;
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec] text-mocha px-4 md:px-8 pb-28">
      <style>{`
        .diy-page-paper {
          background-image: url("https://www.transparenttextures.com/patterns/natural-paper.png");
          background-repeat: repeat;
          min-height: 100%;
        }
      `}</style>

      <div className="diy-page-paper max-w-6xl mx-auto">
        <header className="pt-6 pb-8">
          <h1 className="font-serif text-4xl md:text-5xl text-[#1a2e25]">DIY Recipes</h1>
          <p className="mt-2 text-[#6a5a49]">Choose a recipe card and open step-by-step instructions.</p>
        </header>

        {loading && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-[#fffdfa] rounded-[20px] overflow-hidden border border-[#1a2e25]/5 card-shadow animate-pulse"
              >
                <div className="aspect-[16/10] bg-[#1a2e25]/5" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-20 bg-[#1a2e25]/10 rounded-full" />
                  <div className="h-5 w-3/4 bg-[#1a2e25]/10 rounded-full" />
                  <div className="h-3 w-full bg-[#1a2e25]/10 rounded-full" />
                </div>
              </div>
            ))}
          </section>
        )}

        {!loading && error && (
          <div className="py-20 text-center">
            <p className="text-[#6a5a49] mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-full bg-[#6B8E7A] text-white text-sm font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && recipes.length === 0 && (
          <div className="py-20 text-center text-[#6a5a49]">No DIY recipes found.</div>
        )}

        {!loading && !error && recipes.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            {recipes.map((recipe, index) => (
              <RecipeBlock
                key={recipe.id}
                recipe={recipe}
                imageIndex={index}
                onOpen={() => navigate(`/diy/${recipe.id}`)}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default DIYCreator;
