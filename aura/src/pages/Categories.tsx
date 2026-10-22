import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { fetchCategories } from "../store/categories/categories.action";
import CategoryFlashCard, { LeafIcon } from "../components/CategoryFlashCard";
import "./Categories.css";


import { ACCENT } from "../styles/brand";
const CardSkeleton = () => (
  <div className="rounded-[20px] bg-line animate-pulse min-h-[150px]" />
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
    <div className="font-sans min-h-screen bg-paper">
      {/* ── HERO ── */}
      <section className="categories-hero">
        <div className="categories-hero-blob" />
        <div className="max-w-7xl mx-auto px-6 md:px-10 categories-hero-fade">
          <span className="block mb-3 text-[10px] tracking-[0.3em] font-bold uppercase text-sage-light">
            Browse
          </span>
          <h1 className="font-serif text-[clamp(2.4rem,5vw,3.8rem)] font-bold text-white leading-[1.08] italic">
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
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-sage/8">
              <LeafIcon size={32} color={ACCENT} />
            </div>
            <h3 className="font-serif text-[1.6rem] font-bold text-ink">
              No categories yet
            </h3>
            <p className="text-ink/50 text-[0.9rem] mt-2">
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
