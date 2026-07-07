import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { fetchCategories } from "../store/categories/categories.action";
import CategoryFlashCard, { LeafIcon } from "../components/CategoryFlashCard";

const ACCENT = "#6B8E7A";
const DARK = "#1a2e25";

const CardSkeleton = () => (
  <div className="rounded-[20px] bg-neutral-200 animate-pulse" style={{ minHeight: "150px" }} />
);

/* ─── Categories overview: grid of top-level categories ─── */
const Categories: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { categories, loading } = useSelector((state: RootState) => state.category);

  // Top-level (parent) categories.
  const parents = categories.filter((c) => !c.isSubCategory && !c.parentCategory);

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories());
  }, [dispatch, categories.length]);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: "100vh", background: "#f7f3ec" }}>
      <style>{`
        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── HERO ── */}
      <section
        style={{
          background: "linear-gradient(135deg, #2d4a3e 0%, #1e3329 50%, #1a2e25 100%)",
          padding: "56px 0 60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,197,171,0.16) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="max-w-7xl mx-auto px-6 md:px-10" style={{ animation: "heroFadeIn 0.6s ease both" }}>
          <span
            className="block mb-3"
            style={{
              fontSize: "10px",
              letterSpacing: "0.3em",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#A8C5AB",
            }}
          >
            Browse
          </span>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              fontWeight: 700,
              color: "white",
              lineHeight: 1.08,
              fontStyle: "italic",
            }}
          >
            All Categories
          </h1>
          <p className="text-white/45 mt-4 max-w-md leading-relaxed text-sm">
            Pick a category to explore its subcategories, rituals, and ingredient guides.
          </p>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14">
        {/* Loading skeletons */}
        {loading && categories.length === 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && parents.length === 0 && (
          <div className="text-center py-24">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(107,142,122,0.08)" }}
            >
              <LeafIcon size={32} color={ACCENT} />
            </div>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.6rem",
                fontWeight: 700,
                color: DARK,
              }}
            >
              No categories yet
            </h3>
            <p style={{ color: "rgba(26,46,37,0.5)", fontSize: "0.9rem", marginTop: "8px" }}>
              Check back soon for curated categories.
            </p>
          </div>
        )}

        {/* Parent category cards → open that category's subcategories page */}
        {parents.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {parents.map((cat, i) => (
              <CategoryFlashCard
                key={cat.id}
                cat={cat}
                index={i}
                cta="View topics"
                onClick={() => navigate(`/categories/${cat.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
