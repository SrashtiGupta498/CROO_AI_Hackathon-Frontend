import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* Shared page-navigation control. Used by the DIY (server-paginated) and
   Ingredient Library (client-paginated) lists so both read identically. */

interface PaginationProps {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Windowed page list with ellipses, e.g. 1 … 4 5 [6] 7 8 … 20. */
function pageWindow(current: number, total: number): (number | "…")[] {
  const delta = 1; // neighbours shown on each side of the current page
  const ends: number[] = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    ends.push(i);
  }
  const withEnds = [1, ...ends, total].filter(
    (v, i, a) => a.indexOf(v) === i && v >= 1 && v <= total,
  );
  const out: (number | "…")[] = [];
  let prev: number | undefined;
  for (const p of withEnds) {
    if (prev !== undefined) {
      if (p - prev === 2) out.push(prev + 1);
      else if (p - prev > 2) out.push("…");
    }
    out.push(p);
    prev = p;
  }
  return out;
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onChange, className = "" }) => {
  if (totalPages <= 1) return null;
  const go = (p: number) => {
    const next = Math.min(totalPages, Math.max(1, p));
    if (next !== page) onChange(next);
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1.5 py-8 ${className}`}
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-ink/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>

      {pageWindow(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1.5 text-sm text-muted select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-current={p === page ? "page" : undefined}
            className={`h-9 min-w-9 rounded-full px-3 text-sm font-semibold transition-colors ${
              p === page
                ? "bg-sage text-white"
                : "border border-line bg-surface text-ink/70 hover:border-ink/25 hover:text-ink"
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-ink/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
};

export default Pagination;
