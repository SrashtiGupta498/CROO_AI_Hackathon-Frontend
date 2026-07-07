import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import {
  fetchCategories,
  fetchSubCategories,
} from "../store/categories/categories.action";
import CategoryFlashCard, { LeafIcon } from "../components/CategoryFlashCard";

const ACCENT = "#6B8E7A";
const DARK = "#1a2e25";

const CardSkeleton = () => (
  <div className="rounded-[20px] bg-neutral-200 animate-pulse" style={{ minHeight: "150px" }} />
);

/* ─── A single category's subcategory flashcards ─── */
const CategorySubcategories: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { categories, subByParent, subLoading } = useSelector(
    (state: RootState) => state.category
  );

  // Need the categories list to resolve the current category's name.
  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories());
  }, [dispatch, categories.length]);

  // Fetch this category's subcategories.
  useEffect(() => {
    if (id) dispatch(fetchSubCategories(id));
  }, [id, dispatch]);

  const currentCategory = categories.find((c) => c.id === id);
  const subs = id ? subByParent[id] : undefined;
  const isLoading = !id || subLoading[id] || subs === undefined;

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
          padding: "48px 0 56px",
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
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-7">
            <button
              onClick={() => navigate("/")}
              style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
            >
              Home
            </button>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            <button
              onClick={() => navigate("/categories")}
              style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
            >
              Categories
            </button>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "white" }}>
              {currentCategory?.name || "Category"}
            </span>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate("/categories")}
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
              fontFamily: "inherit",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            All Categories
          </button>

          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
              fontWeight: 700,
              color: "white",
              lineHeight: 1.08,
              fontStyle: "italic",
            }}
          >
            {currentCategory?.name || "Category"}
          </h1>
          {currentCategory?.description && (
            <p style={{ marginTop: "12px", fontSize: "1rem", color: "rgba(255,255,255,0.6)", maxWidth: "520px", lineHeight: 1.6 }}>
              {currentCategory.description}
            </p>
          )}
          {!isLoading && (
            <div
              className="inline-flex items-center gap-2 mt-5"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "100px", padding: "6px 16px" }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#A8C5AB", display: "inline-block" }} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.05em" }}>
                {(subs || []).length} {(subs || []).length === 1 ? "topic" : "topics"}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── SUBCATEGORY FLASHCARDS ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14">
        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* No subcategories → offer to view the category's articles directly */}
        {!isLoading && subs && subs.length === 0 && (
          <div className="text-center py-24">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(107,142,122,0.08)" }}
            >
              <LeafIcon size={32} color={ACCENT} />
            </div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color: DARK, marginBottom: "8px" }}>
              No subcategories yet
            </h3>
            <p style={{ color: "rgba(26,46,37,0.5)", fontSize: "0.9rem", marginBottom: "24px" }}>
              Browse all articles in {currentCategory?.name || "this category"} instead.
            </p>
            <button
              onClick={() => navigate(`/category/${id}`)}
              style={{ padding: "10px 24px", borderRadius: "100px", background: ACCENT, color: "white", border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              View Articles
            </button>
          </div>
        )}

        {!isLoading && subs && subs.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {subs.map((sub, i) => (
              <CategoryFlashCard
                key={sub.id}
                cat={sub}
                index={i}
                onClick={() => navigate(`/category/${sub.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategorySubcategories;
