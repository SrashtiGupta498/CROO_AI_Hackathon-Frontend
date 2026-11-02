import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import {
  fetchCategories,
  fetchSubCategories,
} from "../store/categories/categories.action";
import { fetchPostsByCategory } from "../store/article/article.action";
import { getPostCover } from "../services/uploadImage";
import { getCategoryName } from "../services/taxonomy";
import { PostCover } from "../components/PostCover";
import { CARD_GRADIENTS } from "../components/CategoryFlashCard";
import { ACCENT } from "../styles/brand";
import "./CategoryPage.css";

/* The hero reuses the card's gradient list so a category's hero matches the
   card you clicked to get here. These were duplicated, and the copies had
   drifted to different lengths — every category past the 5th showed one
   gradient on its card and another on its hero. */

/* ─── Skeleton card ─── */
const SkeletonCard = () => (
  <div className="bg-white rounded-3xl overflow-hidden shadow-sm animate-pulse">
    <div className="h-52 bg-neutral-200" />
    <div className="p-5 space-y-3">
      <div className="h-3 w-20 bg-neutral-200 rounded-full" />
      <div className="h-4 w-3/4 bg-neutral-200 rounded-full" />
      <div className="h-3 w-1/2 bg-neutral-200 rounded-full" />
    </div>
  </div>
);

/* ─── Article card ─── */
const ArticleCard: React.FC<{
  post: any;
  onClick: () => void;
  index: number;
}> = ({ post, onClick, index }) => (
  <div
    onClick={onClick}
    className="group bg-white rounded-3xl overflow-hidden cursor-pointer category-page-card"
    style={{ animationDelay: `${index * 0.06}s` }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)";
      (e.currentTarget as HTMLDivElement).style.boxShadow =
        "0 16px 48px rgba(0,0,0,0.12)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      (e.currentTarget as HTMLDivElement).style.boxShadow =
        "0 4px 24px rgba(0,0,0,0.07)";
    }}
  >
    {/* Thumbnail */}
    <div className="relative overflow-hidden h-[210px]">
      {getPostCover(post) ? (
        <PostCover
          src={getPostCover(post)}
          alt={post.title}
          className="w-full h-full object-cover category-page-card-img"
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLImageElement).style.transform =
              "scale(1.07)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")
          }
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center category-page-thumb-fallback">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke={ACCENT}
            strokeWidth="1.5"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
      )}
      {/* Category badge — the API populates `categoryId` (not `category`), so
          read the name through the taxonomy helper. */}
      {getCategoryName(post) && (
        <div className="absolute top-4 left-4">
          <span className="text-[9px] font-extrabold tracking-[0.2em] uppercase bg-sage text-white px-3 py-1 rounded-[100px]">
            {getCategoryName(post)}
          </span>
        </div>
      )}
    </div>

    {/* Content */}
    <div className="p-5">
      {/* Note: the previous inline `color` always overrode the old
          group-hover:text-[#3D5B4F] utility, so the title never changed
          color on hover; text-ink preserves that rendered behavior. */}
      <h3 className="font-bold leading-snug mb-3 font-serif text-[1.05rem] text-ink category-page-card-title">
        {post.title}
      </h3>

      {post.description && (
        <p className="text-[13px] text-ink/55 leading-[1.6] line-clamp-2 mb-[14px]">
          {post.description}
        </p>
      )}

      {/* Footer meta */}
      <div className="flex items-center justify-between border-t border-[rgba(0,0,0,0.06)] pt-3">
        <div className="flex items-center gap-2">
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              className="w-6 h-6 rounded-full object-cover"
              alt={post.author?.name}
            />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-sage">
              {(post.author?.name || "A")[0]}
            </div>
          )}
          <span className="text-[11px] font-semibold text-ink/50">
            {post.author?.name || "Aura Editor"}
          </span>
        </div>
        {post.readTime && (
          <span className="text-[10px] font-bold text-sage tracking-[0.06em]">
            {post.readTime}
          </span>
        )}
      </div>
    </div>
  </div>
);

/* ─── Main Component ─── */
const CategoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const {
    categories,
    loading: catLoading,
    subByParent,
  } = useSelector((state: RootState) => state.category);
  const { posts, loading: postsLoading } = useSelector(
    (state: RootState) => state.articles,
  );

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories());
  }, [dispatch, categories.length]);

  useEffect(() => {
    if (id) {
      dispatch(fetchPostsByCategory({ categoryId: id, limit: 50, page: 1 }));
      dispatch(fetchSubCategories(id));
    }
    setActiveFilter("All");
  }, [id, dispatch]);

  const currentCategory = categories.find((cat) => cat.id === id);
  const subCategories = (id && subByParent[id]) || [];

  // Find category's index for hero gradient
  const catIndex = categories.findIndex((c) => c.id === id);
  const heroBg =
    CARD_GRADIENTS[catIndex >= 0 ? catIndex % CARD_GRADIENTS.length : 0];

  // Filter posts by search
  const filteredPosts = (posts || []).filter((post: any) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      post.title?.toLowerCase().includes(q) ||
      post.description?.toLowerCase().includes(q)
    );
  });

  const isLoading = catLoading || postsLoading;

  return (
    <div className="font-sans min-h-screen bg-paper">
      {/* ─────────────────────────────────────
          HERO BANNER
      ───────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-12 pb-14"
        style={{ background: heroBg }}
      >
        {/* Decorative blob */}
        <div className="category-page-hero-blob-tr" />
        <div className="category-page-hero-blob-bl" />

        <div className="max-w-7xl mx-auto px-6 md:px-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8 category-page-hero-fade">
            <button
              onClick={() => navigate("/")}
              className="category-page-crumb-btn"
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.9)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.5)")
              }
            >
              Home
            </button>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span className="text-[11px] font-semibold text-white/70">
              Explore
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span className="text-[11px] font-bold text-white">
              {currentCategory?.name || "Category"}
            </span>
          </div>

          {/* Title row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 category-page-hero-fade-delayed">
            <div>
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 mb-5 category-page-back-btn"
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(255,255,255,0.18)";
                  el.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = "rgba(255,255,255,0.1)";
                  el.style.color = "rgba(255,255,255,0.6)";
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Back
              </button>

              {/* Category badge */}
              <div className="inline-flex items-center gap-2 mb-4 bg-sage-light/15 border border-sage-light/25 rounded-[100px] px-[14px] py-[5px]">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="var(--color-sage-light)"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="text-[9px] font-extrabold tracking-[0.28em] uppercase text-sage-light">
                  Category
                </span>
              </div>

              <h1 className="font-serif text-[clamp(2.2rem,5vw,3.8rem)] font-bold text-white leading-[1.08] tracking-[-0.01em] italic">
                {catLoading
                  ? "Loading..."
                  : currentCategory?.name || "Category"}
              </h1>

              {currentCategory?.description && (
                <p className="mt-3 text-base text-white/60 max-w-[500px] leading-[1.65]">
                  {currentCategory.description}
                </p>
              )}

              {/* Post count badge */}
              {!postsLoading && filteredPosts.length > 0 && (
                <div className="inline-flex items-center gap-2 mt-5 bg-white/10 border border-white/15 rounded-[100px] px-4 py-[6px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-light inline-block" />
                  <span className="text-[11px] font-bold text-white/75 tracking-[0.05em]">
                    {filteredPosts.length} article
                    {filteredPosts.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Search */}
            <div
              className={`category-page-search-box ${searchFocused ? "focused" : ""}`}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search in this category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-white/50 bg-transparent border-none cursor-pointer leading-none"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
          SUBCATEGORY PILLS
      ───────────────────────────────────── */}
      {subCategories.length > 0 && (
        <div className="bg-white border-b border-[rgba(0,0,0,0.06)] sticky top-[68px] z-40">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-4">
              <button
                className={`category-page-pill-btn ${activeFilter === "All" ? "active" : "inactive"} category-page-pill-anim`}
                onClick={() => {
                  setActiveFilter("All");
                  if (id)
                    dispatch(
                      fetchPostsByCategory({
                        categoryId: id,
                        limit: 50,
                        page: 1,
                      }),
                    );
                }}
              >
                All
              </button>

              {subCategories.map((sub, i) => (
                <button
                  key={sub.id}
                  className={`category-page-pill-btn ${activeFilter === sub.id ? "active" : "inactive"} category-page-pill-anim`}
                  style={{ animationDelay: `${(i + 1) * 0.05}s` }}
                  onClick={() => {
                    setActiveFilter(sub.id);
                    dispatch(
                      fetchPostsByCategory({
                        categoryId: sub.id,
                        limit: 50,
                        page: 1,
                      }),
                    );
                  }}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────
          CONTENT AREA
      ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredPosts.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-sage/8">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke={ACCENT}
                strokeWidth="1.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="font-serif text-[1.6rem] font-bold text-ink mb-[10px]">
              {searchQuery ? "No results found" : "No articles yet"}
            </h3>
            <p className="text-ink/50 text-[0.9rem] mb-6">
              {searchQuery
                ? `Try a different search term or browse all articles.`
                : "Check back soon for curated content in this category."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-6 py-2.5 rounded-[100px] bg-sage text-white border-none text-[13px] font-bold cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Articles grid */}
        {!isLoading && filteredPosts.length > 0 && (
          <>
            {/* Sort/count bar */}
            <div className="flex items-center justify-between mb-8">
              <p className="text-[13px] text-ink/50 font-semibold">
                Showing{" "}
                <span className="text-ink font-bold">
                  {filteredPosts.length}
                </span>{" "}
                {filteredPosts.length === 1 ? "article" : "articles"}
                {activeFilter !== "All" &&
                  ` in ${subCategories.find((s) => s.id === activeFilter)?.name || activeFilter}`}
              </p>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[rgba(0,0,0,0.07)]">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth="2"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span className="text-[11px] font-bold text-ink/60 tracking-[0.04em]">
                  Latest First
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredPosts.map((post: any, index: number) => (
                <ArticleCard
                  key={post._id}
                  post={post}
                  index={index}
                  onClick={() => navigate(`/article/${post._id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────
          BOTTOM CTA
      ───────────────────────────────────── */}
      {!isLoading && filteredPosts.length > 0 && (
        <section className="category-page-cta">
          <h3 className="font-serif text-[clamp(1.6rem,3vw,2.4rem)] font-bold text-white mb-3 italic">
            Explore More Rituals
          </h3>
          <p className="text-white/55 text-[0.95rem] max-w-[400px] mx-auto mb-7 leading-[1.6]">
            Discover more categories, ingredient guides, and DIY recipes crafted
            for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/explore")}
              className="category-page-cta-primary"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 12px 32px rgba(61,91,79,0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 8px 24px rgba(61,91,79,0.5)";
              }}
            >
              Browse All Categories
            </button>
            <button
              onClick={() => navigate("/ai")}
              className="category-page-cta-ghost"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.18)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.1)";
              }}
            >
              ✨ Try AI Skin Guide
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default CategoryPage;
