import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { fetchCategories, fetchSubCategories } from "../store/categories/categories.action";
import { fetchPostsByCategory } from "../store/article/article.action";
import { getPostCover } from "../services/uploadImage";
import { PostCover } from "../components/PostCover";

/* ─── Hero background images per category index ─── */
const HERO_GRADIENTS = [
  "linear-gradient(135deg, #2d4a3e 0%, #1e3329 100%)",
  "linear-gradient(135deg, #3a3a2e 0%, #2a2a1e 100%)",
  "linear-gradient(135deg, #2e3a4a 0%, #1e2a3a 100%)",
  "linear-gradient(135deg, #4a2e3a 0%, #3a1e2a 100%)",
  "linear-gradient(135deg, #2e4a3a 0%, #1e3a2a 100%)",
];

const ACCENT = "#6B8E7A";
const DARK = "#1a2e25";

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
const ArticleCard: React.FC<{ post: any; onClick: () => void; index: number }> = ({
  post,
  onClick,
  index,
}) => (
  <div
    onClick={onClick}
    className="group bg-white rounded-3xl overflow-hidden cursor-pointer"
    style={{
      boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.35s",
      animation: `cardFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 0.06}s both`,
    }}
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
    <div className="relative overflow-hidden" style={{ height: "210px" }}>
      {getPostCover(post) ? (
        <PostCover
          src={getPostCover(post)}
          alt={post.title}
          className="w-full h-full object-cover"
          style={{ transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLImageElement).style.transform = "scale(1.07)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")
          }
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #e8f0ec 0%, #d4e4da 100%)" }}
        >
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
      {/* Category badge */}
      {post.category?.name && (
        <div className="absolute top-4 left-4">
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              background: ACCENT,
              color: "white",
              padding: "4px 12px",
              borderRadius: "100px",
            }}
          >
            {post.category.name}
          </span>
        </div>
      )}
    </div>

    {/* Content */}
    <div className="p-5">
      <h3
        className="font-bold leading-snug mb-3 group-hover:text-[#6B8E7A] transition-colors"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.05rem",
          color: DARK,
          transition: "color 0.2s",
        }}
      >
        {post.title}
      </h3>

      {post.description && (
        <p
          style={{
            fontSize: "13px",
            color: "rgba(26,46,37,0.55)",
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            marginBottom: "14px",
          }}
        >
          {post.description}
        </p>
      )}

      {/* Footer meta */}
      <div
        className="flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "12px" }}
      >
        <div className="flex items-center gap-2">
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              className="w-6 h-6 rounded-full object-cover"
              alt={post.author?.name}
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: ACCENT, fontSize: "9px" }}
            >
              {(post.author?.name || "A")[0]}
            </div>
          )}
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(26,46,37,0.5)",
            }}
          >
            {post.author?.name || "Aura Editor"}
          </span>
        </div>
        {post.readTime && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: "0.06em",
            }}
          >
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

  const { categories, loading: catLoading, subByParent } = useSelector(
    (state: RootState) => state.category
  );
  const { posts, loading: postsLoading } = useSelector(
    (state: RootState) => state.articles
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
    HERO_GRADIENTS[catIndex >= 0 ? catIndex % HERO_GRADIENTS.length : 0];

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
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: "100vh", background: "#f7f3ec" }}
    >
      <style>{`
        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pillSlide {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .pill-btn {
          padding: 8px 20px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          border: none;
          white-space: nowrap;
          transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
          font-family: inherit;
        }
        .pill-btn.active {
          background: ${ACCENT};
          color: white;
          box-shadow: 0 6px 18px rgba(107,142,122,0.4);
          transform: translateY(-1px);
        }
        .pill-btn.inactive {
          background: white;
          color: rgba(26,46,37,0.6);
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
        }
        .pill-btn.inactive:hover {
          background: rgba(107,142,122,0.08);
          color: ${DARK};
          transform: translateY(-1px);
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 14px;
          padding: 11px 16px;
          backdrop-filter: blur(12px);
          transition: background 0.25s, border-color 0.25s;
          max-width: 320px;
          width: 100%;
        }
        .search-box.focused {
          background: rgba(255,255,255,0.28);
          border-color: rgba(255,255,255,0.5);
        }
        .search-box input {
          background: transparent;
          border: none;
          outline: none;
          font-size: 13px;
          font-weight: 500;
          color: white;
          width: 100%;
          font-family: inherit;
        }
        .search-box input::placeholder { color: rgba(255,255,255,0.55); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ─────────────────────────────────────
          HERO BANNER
      ───────────────────────────────────── */}
      <section
        style={{
          background: heroBg,
          padding: "48px 0 56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative blob */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,197,171,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-40px",
            left: "10%",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,197,171,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-10">
          {/* Breadcrumb */}
          <div
            className="flex items-center gap-2 mb-8"
            style={{ animation: "heroFadeIn 0.5s ease both" }}
          >
            <button
              onClick={() => navigate("/")}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontFamily: "inherit",
                transition: "color 0.2s",
              }}
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
            <span
              style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}
            >
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
            <span style={{ fontSize: "11px", fontWeight: 700, color: "white" }}>
              {currentCategory?.name || "Category"}
            </span>
          </div>

          {/* Title row */}
          <div
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            style={{ animation: "heroFadeIn 0.6s ease 0.08s both" }}
          >
            <div>
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 mb-5"
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.6)",
                  letterSpacing: "0.1em",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "100px",
                  padding: "6px 14px",
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
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
              <div
                className="inline-flex items-center gap-2 mb-4"
                style={{
                  background: "rgba(168,197,171,0.15)",
                  border: "1px solid rgba(168,197,171,0.25)",
                  borderRadius: "100px",
                  padding: "5px 14px",
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="#A8C5AB"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: "#A8C5AB",
                  }}
                >
                  Category
                </span>
              </div>

              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
                  fontWeight: 700,
                  color: "white",
                  lineHeight: 1.08,
                  letterSpacing: "-0.01em",
                  fontStyle: "italic",
                }}
              >
                {catLoading
                  ? "Loading..."
                  : currentCategory?.name || "Category"}
              </h1>

              {currentCategory?.description && (
                <p
                  style={{
                    marginTop: "12px",
                    fontSize: "1rem",
                    color: "rgba(255,255,255,0.6)",
                    maxWidth: "500px",
                    lineHeight: 1.65,
                  }}
                >
                  {currentCategory.description}
                </p>
              )}

              {/* Post count badge */}
              {!postsLoading && filteredPosts.length > 0 && (
                <div
                  className="inline-flex items-center gap-2 mt-5"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "100px",
                    padding: "6px 16px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#A8C5AB",
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.75)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {filteredPosts.length} article
                    {filteredPosts.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Search */}
            <div
              className={`search-box ${searchFocused ? "focused" : ""}`}
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
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
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
        <div
          style={{
            background: "white",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            position: "sticky",
            top: "68px",
            zIndex: 40,
          }}
        >
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div
              className="flex gap-3 overflow-x-auto no-scrollbar py-4"
            >
              <button
                className={`pill-btn ${activeFilter === "All" ? "active" : "inactive"}`}
                onClick={() => {
                  setActiveFilter("All");
                  if (id) dispatch(fetchPostsByCategory({ categoryId: id, limit: 50, page: 1 }));
                }}
                style={{ animation: "pillSlide 0.4s ease both" }}
              >
                All
              </button>

              {subCategories.map((sub, i) => (
                <button
                  key={sub.id}
                  className={`pill-btn ${activeFilter === sub.id ? "active" : "inactive"}`}
                  style={{ animation: `pillSlide 0.4s ease ${(i + 1) * 0.05}s both` }}
                  onClick={() => {
                    setActiveFilter(sub.id);
                    dispatch(
                      fetchPostsByCategory({ categoryId: sub.id, limit: 50, page: 1 })
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
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(107,142,122,0.08)" }}
            >
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
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.6rem",
                fontWeight: 700,
                color: DARK,
                marginBottom: "10px",
              }}
            >
              {searchQuery ? "No results found" : "No articles yet"}
            </h3>
            <p style={{ color: "rgba(26,46,37,0.5)", fontSize: "0.9rem", marginBottom: "24px" }}>
              {searchQuery
                ? `Try a different search term or browse all articles.`
                : "Check back soon for curated content in this category."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  padding: "10px 24px",
                  borderRadius: "100px",
                  background: ACCENT,
                  color: "white",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
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
              <p style={{ fontSize: "13px", color: "rgba(26,46,37,0.5)", fontWeight: 600 }}>
                Showing{" "}
                <span style={{ color: DARK, fontWeight: 700 }}>
                  {filteredPosts.length}
                </span>{" "}
                {filteredPosts.length === 1 ? "article" : "articles"}
                {activeFilter !== "All" &&
                  ` in ${subCategories.find((s) => s.id === activeFilter)?.name || activeFilter}`}
              </p>
              <div
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)" }}
              >
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
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "rgba(26,46,37,0.6)",
                    letterSpacing: "0.04em",
                  }}
                >
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
        <section
          style={{
            background: "linear-gradient(135deg, #2d4a3e 0%, #1e3329 100%)",
            padding: "60px 24px",
            textAlign: "center",
            marginTop: "24px",
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              fontWeight: 700,
              color: "white",
              marginBottom: "12px",
              fontStyle: "italic",
            }}
          >
            Explore More Rituals
          </h3>
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "0.95rem",
              marginBottom: "28px",
              maxWidth: "400px",
              margin: "0 auto 28px",
              lineHeight: 1.6,
            }}
          >
            Discover more categories, ingredient guides, and DIY recipes crafted
            for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/explore")}
              style={{
                padding: "12px 32px",
                borderRadius: "100px",
                background: ACCENT,
                color: "white",
                border: "none",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.04em",
                boxShadow: "0 8px 24px rgba(107,142,122,0.5)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 12px 32px rgba(107,142,122,0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 8px 24px rgba(107,142,122,0.5)";
              }}
            >
              Browse All Categories
            </button>
            <button
              onClick={() => navigate("/ai")}
              style={{
                padding: "12px 32px",
                borderRadius: "100px",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s",
              }}
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
