import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { fetchCategories } from "../store/categories/categories.action";
import { fetchPostsByCategory } from "../store/article/article.action";
import { ArticleCard } from "./ArticleCard";
import "./Article.css";

import { ACCENT } from "../styles/brand";
/* ─── Design tokens ─── */

const HERO_GRADIENTS = [
  "linear-gradient(135deg, #2d4a3e 0%, #1e3329 100%)",
  "linear-gradient(135deg, #3a3a2e 0%, #2a2a1e 100%)",
  "linear-gradient(135deg, #2e3a4a 0%, #1e2a3a 100%)",
  "linear-gradient(135deg, #4a2e3a 0%, #3a1e2a 100%)",
  "linear-gradient(135deg, #2e4a3a 0%, #1e3a2a 100%)",
];

/* ─── Skeleton card ─── */
const SkeletonCard = () => (
  <div className="bg-paper rounded-3xl overflow-hidden shadow-sm animate-pulse">
    <div className="h-52 bg-line" />
    <div className="p-5 space-y-3">
      <div className="h-3 w-20 bg-line rounded-full" />
      <div className="h-4 w-3/4 bg-line rounded-full" />
      <div className="h-3 w-1/2 bg-line rounded-full" />
    </div>
  </div>
);

/* ══════════════════════════════════════
     MAIN — Article (All Articles by Category & SubCategory)
   ══════════════════════════════════════ */
const Article = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { categories, loading: catLoading } = useSelector(
    (state: RootState) => state.category
  );
  // No `|| { posts: [] }` fallback: configureStore always mounts the slice, so
  // the fallback was unreachable — and it widened the selector's type to a
  // union, which is what made `loading` unreadable.
  const { posts = [], loading: postsLoading = false } = useSelector(
    (state: RootState) => state.articles
  );

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  /* Fetch categories once */
  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories());
  }, [dispatch, categories.length]);

  /* Fetch posts whenever categoryId changes */
  useEffect(() => {
    if (categoryId) {
      dispatch(fetchPostsByCategory({ categoryId, limit: 50, page: 1 }));
    }
    setActiveFilter("All");
    setSearchQuery("");
  }, [categoryId, dispatch]);

  /* Derived data */
  const currentCategory = categories.find((cat) => cat.id === categoryId);
  const subCategories = categories.filter(
    (cat) => cat.parentCategory?.toString() === categoryId
  );

  const catIndex = categories.findIndex((c) => c.id === categoryId);
  const heroBg =
    HERO_GRADIENTS[catIndex >= 0 ? catIndex % HERO_GRADIENTS.length : 0];

  /* Filter posts by search query */
  const filteredPosts = (posts || []).filter((post: any) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      post.title?.toLowerCase().includes(q) ||
      post.subtitle?.toLowerCase().includes(q) ||
      post.description?.toLowerCase().includes(q)
    );
  });

  const isLoading = catLoading || postsLoading;

  return (
    <div className="font-sans min-h-screen bg-paper">
      {/* ─────────────────────────────────
          HERO BANNER
      ───────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-12 pb-14"
        style={{ background: heroBg }}
      >
        {/* Decorative blobs */}
        <div className="article-page-hero-blob-tr" />
        <div className="article-page-hero-blob-bl" />

        <div className="max-w-7xl mx-auto px-6 md:px-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8 article-page-hero-fade">
            <button
              onClick={() => navigate("/")}
              className="article-page-crumb-btn"
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span className="text-[11px] font-semibold text-white/50">
              Articles
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span className="text-[11px] font-bold text-white">
              {currentCategory?.name || "Category"}
            </span>
          </div>

          {/* Title row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 article-page-hero-fade-delayed">
            <div>
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 mb-5 article-page-back-btn"
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Back
              </button>

              {/* Articles badge */}
              <div className="inline-flex items-center gap-2 mb-4 bg-sage-light/15 border border-sage-light/25 rounded-[100px] px-[14px] py-[5px]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#DCE5DD">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
                <span className="text-[9px] font-extrabold tracking-[0.28em] uppercase text-sage-light">
                  Articles
                </span>
              </div>

              <h1 className="font-serif text-[clamp(2.2rem,5vw,3.8rem)] font-bold text-white leading-[1.08] tracking-[-0.01em] italic">
                {catLoading
                  ? "Loading..."
                  : currentCategory?.name || "All Articles"}
              </h1>

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
            <div className={`article-page-search-box ${searchFocused ? "focused" : ""}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search articles..."
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

      {/* ─────────────────────────────────
          SUBCATEGORY PILLS
      ───────────────────────────────── */}
      {subCategories.length > 0 && (
        <div className="bg-white border-b border-[rgba(0,0,0,0.06)] sticky top-[68px] z-40">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-4">
              <button
                className={`article-page-pill-btn ${activeFilter === "All" ? "active" : "inactive"} article-page-pill-anim`}
                onClick={() => {
                  setActiveFilter("All");
                  if (categoryId)
                    dispatch(fetchPostsByCategory({ categoryId, limit: 50, page: 1 }));
                }}
              >
                All
              </button>

              {subCategories.map((sub, i) => (
                <button
                  key={sub.id}
                  className={`article-page-pill-btn ${activeFilter === sub.id ? "active" : "inactive"} article-page-pill-anim`}
                  style={{ animationDelay: `${(i + 1) * 0.05}s` }}
                  onClick={() => {
                    setActiveFilter(sub.id);
                    dispatch(fetchPostsByCategory({ categoryId: sub.id, limit: 50, page: 1 }));
                  }}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────
          CONTENT AREA
      ───────────────────────────────── */}
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
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                <path d="M7 7h10M7 12h10M7 17h7" />
              </svg>
            </div>
            <h3 className="font-serif text-[1.6rem] font-bold text-ink mb-[10px]">
              {searchQuery ? "No results found" : "No articles yet"}
            </h3>
            <p className="text-ink/50 text-[0.9rem] mb-6">
              {searchQuery
                ? "Try a different search term or browse all articles."
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2">
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
                <div
                  key={post.id || post._id || index}
                  className="article-page-card-wrapper"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <ArticleCard
                    article={post}
                    onClick={() => navigate(`/article/${post.id || post._id}`)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─────────────────────────────────
          BOTTOM CTA
      ───────────────────────────────── */}
      {!isLoading && filteredPosts.length > 0 && (
        <section className="article-page-cta">
          <h3 className="font-serif text-[clamp(1.6rem,3vw,2.4rem)] font-bold text-white mb-3 italic">
            Discover More Rituals
          </h3>
          <p className="text-white/55 text-[0.95rem] max-w-[440px] mx-auto mb-7 leading-[1.7]">
            Explore our curated collection of natural beauty rituals, tips, and
            expert-backed routines.
          </p>
          <button
            onClick={() => navigate("/explore")}
            className="article-page-cta-btn"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
            }}
          >
            Explore All Categories
          </button>
        </section>
      )}
    </div>
  );
};

export default Article;
