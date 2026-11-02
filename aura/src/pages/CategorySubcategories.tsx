import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import {
  fetchCategories,
  fetchSubCategories,
} from "../store/categories/categories.action";
import CategoryFlashCard, { LeafIcon } from "../components/CategoryFlashCard";
import "./CategorySubcategories.css";

import { ACCENT } from "../styles/brand";
const CardSkeleton = () => (
  <div className="rounded-[20px] bg-line animate-pulse min-h-[150px]" />
);

/* ─── A single category's subcategory flashcards ─── */
const CategorySubcategories: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { categories, subByParent, subLoading } = useSelector(
    (state: RootState) => state.category,
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
    <div className="font-sans min-h-screen bg-paper">
      {/* ── HERO ── */}
      <section className="category-subs-hero">
        <div className="category-subs-hero-blob" />
        <div className="max-w-7xl mx-auto px-6 md:px-10 category-subs-hero-fade">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-7">
            <button
              onClick={() => navigate("/")}
              className="text-[11px] font-semibold text-white/50 bg-transparent border-none cursor-pointer p-0"
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
            <button
              onClick={() => navigate("/categories")}
              className="text-[11px] font-semibold text-white/70 bg-transparent border-none cursor-pointer p-0"
            >
              Categories
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
            <span className="text-[11px] font-bold text-white">
              {currentCategory?.name || "Category"}
            </span>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate("/categories")}
            className="flex items-center gap-2 mb-5 category-subs-back-btn"
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
            All Categories
          </button>

          <h1 className="font-serif text-[clamp(2.2rem,5vw,3.6rem)] font-bold text-white leading-[1.08] italic">
            {currentCategory?.name || "Category"}
          </h1>
          {currentCategory?.description && (
            <p className="mt-3 text-base text-white/60 max-w-[520px] leading-[1.6]">
              {currentCategory.description}
            </p>
          )}
          {!isLoading && (
            <div className="inline-flex items-center gap-2 mt-5 bg-white/10 border border-white/15 rounded-[100px] px-4 py-[6px]">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-light inline-block" />
              <span className="text-[11px] font-bold text-white/75 tracking-[0.05em]">
                {(subs || []).length}{" "}
                {(subs || []).length === 1 ? "topic" : "topics"}
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
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-sage/8">
              <LeafIcon size={32} color={ACCENT} />
            </div>
            <h3 className="font-serif text-[1.6rem] font-bold text-ink mb-2">
              No subcategories yet
            </h3>
            <p className="text-ink/50 text-[0.9rem] mb-6">
              Browse all articles in {currentCategory?.name || "this category"}{" "}
              instead.
            </p>
            <button
              onClick={() => navigate(`/category/${id}`)}
              className="px-6 py-2.5 rounded-[100px] bg-sage text-white border-none text-[13px] font-bold cursor-pointer"
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
