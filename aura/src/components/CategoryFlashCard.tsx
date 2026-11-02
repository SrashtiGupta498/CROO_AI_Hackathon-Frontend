import React from "react";
import { Category } from "../store/categories/categories.action";
import "./CategoryFlashCard.css";

/* ─── Card gradient palette (cycled by index) ─── */
export const CARD_GRADIENTS = [
  "linear-gradient(135deg, #2d4a3e 0%, #1e3329 100%)",
  "linear-gradient(135deg, #3a3a2e 0%, #2a2a1e 100%)",
  "linear-gradient(135deg, #2e3a4a 0%, #1e2a3a 100%)",
  "linear-gradient(135deg, #4a2e3a 0%, #3a1e2a 100%)",
  "linear-gradient(135deg, #2e4a3a 0%, #1e3a2a 100%)",
  "linear-gradient(135deg, #4a3e2e 0%, #3a2e1e 100%)",
];

export const LeafIcon = ({
  size = 22,
  color = "white",
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.6"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

/* ─── A single category / subcategory flashcard ─── */
const CategoryFlashCard: React.FC<{
  cat: Category;
  index: number;
  onClick: () => void;
  cta?: string;
}> = ({ cat, index, onClick, cta = "Explore" }) => {
  const bg = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  return (
    <button
      onClick={onClick}
      className="cat-card-root group relative text-left overflow-hidden"
      style={{
        background: bg,
        animation: `cardFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 0.05}s both`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "translateY(-6px)";
        el.style.boxShadow = "0 16px 40px rgba(0,0,0,0.18)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
      }}
    >
      {/* Cover image (falls back to gradient if missing/broken) */}
      {cat.coverImage && (
        <img
          src={cat.coverImage}
          alt=""
          aria-hidden
          onError={(e) =>
            ((e.currentTarget as HTMLImageElement).style.display = "none")
          }
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-50"
        />
      )}
      {/* Readability overlay */}
      <div className="absolute inset-0 cat-card-overlay" />
      {/* Decorative blob */}
      <div className="cat-card-blob" />

      <div className="relative w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.18)] flex items-center justify-center">
        <LeafIcon size={20} color="#DCE5DD" />
      </div>

      <div className="relative">
        <h3 className="font-serif text-[1.15rem] font-bold text-white leading-[1.2] mb-2">
          {cat.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] uppercase text-sage-light">
            {cta}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
          {typeof cat.postsCount === "number" && (
            <span className="text-[10px] font-bold text-[rgba(255,255,255,0.65)]">
              {cat.postsCount} {cat.postsCount === 1 ? "post" : "posts"}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default CategoryFlashCard;
