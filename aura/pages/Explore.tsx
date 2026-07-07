import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { fetchAllPosts } from "../store/article/article.action";
import { setPagination } from "../store/article/article.slice";
import {
  Img1,
  Img2,
  Img3,
  Img4,
  Img5,
  Img6,
  Img7,
  Img8,
  Img9,
  Img10,
  Img11,
  Img12,
} from "../assets/index";
import { getPostCover } from "../services/uploadImage";
import { PostCover } from "../components/PostCover";
import { getCategoryName } from "../services/taxonomy";

const CONCERN_TAGS = [
  "All",
  "Acne",
  "Dry Skin",
  "Aging",
  "Sensitivity",
  "Pigmentation",
  "Hair Fall",
  "Detox",
];

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const {
    posts = [],
    loading = false,
    totalPosts = 0,
    page,
    limit,
  } = useSelector((state: RootState) => state.articles || { page: 1, limit: 10 });
  
  console.log("DEBUG Explore State:", { postsCount: posts.length, totalPosts, loading, page, limit });

  const [activeTag, setActiveTag] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  // Local page and limit removed in favor of Redux state

  useEffect(() => {
    console.log(
      "Explore mounted. Dispatch:",
      !!dispatch,
      "fetchAllPosts:",
      typeof fetchAllPosts,
    );
    if (typeof fetchAllPosts === "function") {
      console.log("Dispatching fetchAllPosts with Redux state params...");
      dispatch(fetchAllPosts({ page, limit }));
    } else {
      console.error("fetchAllPosts is not a function!");
    }
  }, [dispatch]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    dispatch(setPagination({ page: nextPage }));
    dispatch(fetchAllPosts({ page: nextPage, limit }));
  };

  const images = [
    Img1,
    Img2,
    Img3,
    Img4,
    Img5,
    Img6,
    Img7,
    Img8,
    Img9,
    Img10,
    Img11,
    Img12,
  ];

  return (
    <main
      className="min-w-0"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .explore-hero {
          background: linear-gradient(135deg, #2d4a3e 0%, #1e3329 50%, #1a2e25 100%);
        }
        .search-glass {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          transition: all 0.35s ease;
        }
        .search-glass:focus-within {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(168, 197, 171, 0.5);
          box-shadow: 0 0 0 4px rgba(168, 197, 171, 0.12);
        }
        .filter-pill {
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .filter-pill:hover {
          transform: translateY(-1px);
        }
        .masonry-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .masonry-item {
          break-inside: avoid;
          margin-bottom: 1.5rem;
        }
        .masonry-item .card-img {
          transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .masonry-item:hover .card-img {
          transform: scale(1.06);
        }
        .masonry-item:hover .card-overlay {
          opacity: 1;
        }
      `}</style>

      {/* ════════════════════════════════════════
          EXPLORE HERO + SEARCH
      ════════════════════════════════════════ */}
      <section className="explore-hero pt-20 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div
            className="max-w-2xl mb-10"
            style={{
              animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
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
              Discover
            </span>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2.5rem, 5vw, 3.8rem)",
                fontWeight: 700,
                lineHeight: 1.1,
                color: "white",
                fontStyle: "italic",
              }}
            >
              Explore Rituals
            </h1>
            <p className="text-white/45 mt-4 max-w-md leading-relaxed text-sm">
              Dive into curated botanical guides, ancient remedies, and holistic
              skincare wisdom from our expert community.
            </p>
          </div>

          {/* Search Bar */}
          <div
            className="search-glass rounded-2xl flex items-center gap-4 px-6 py-4 max-w-2xl"
            style={{
              animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.15s both",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concerns, ingredients, remedies..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/25 text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-white/30 hover:text-white/60 transition-colors text-xs font-bold tracking-widest uppercase"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FILTER CONCERNS
      ════════════════════════════════════════ */}
      <section className="py-8 px-6" style={{ background: "#f7f3ec" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2
              className="font-bold text-sm uppercase tracking-widest"
              style={{ color: "#1a2e25", letterSpacing: "0.15em" }}
            >
              Filter by Concern
            </h2>
            <button
              onClick={() => setActiveTag(0)}
              className="text-xs font-bold uppercase tracking-widest transition-colors"
              style={{ color: "#6B8E7A" }}
            >
              Reset
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
            {CONCERN_TAGS.map((tag, i) => (
              <button
                key={tag}
                onClick={() => setActiveTag(i)}
                className={`filter-pill whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase ${
                  i === activeTag
                    ? "text-white shadow-lg"
                    : "bg-white text-neutral-500 border border-neutral-200 hover:border-[#6B8E7A]/40 hover:text-[#6B8E7A]"
                }`}
                style={
                  i === activeTag
                    ? {
                        background:
                          "linear-gradient(135deg, #6B8E7A 0%, #4a7060 100%)",
                        boxShadow: "0 8px 24px rgba(107,142,122,0.3)",
                      }
                    : {}
                }
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          MASONRY GRID
      ════════════════════════════════════════ */}
      <section className="py-16 px-6" style={{ background: "#f7f3ec" }}>
        <div className="max-w-7xl mx-auto">
          <div className="masonry-grid">
            {posts.map((item: any, i: number) => (
              <div
                key={item.id || item._id || i}
                className="masonry-item group cursor-pointer"
                onClick={() => navigate(`/article/${item.id || item._id}`)}
                style={{
                  animation: `fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) ${
                    0.08 * (i % limit)
                  }s both`,
                }}
              >
                <div className="relative rounded-[1.5rem] overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-500">
                  <PostCover
                    src={getPostCover(item) || `https://picsum.photos/seed/${item.id || item._id}/800/600`}
                    alt={item.title}
                    className="card-img w-full object-cover"
                    style={{ height: `${280 + (i % 3) * 60}px` }}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

                  {/* Hover Overlay */}
                  <div
                    className="card-overlay absolute inset-0 opacity-0 transition-opacity duration-500"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(107,142,122,0.65) 0%, transparent 55%)",
                    }}
                  />

                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span
                      className="px-3 py-1.5 rounded-full font-bold shadow-lg"
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        background: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "white",
                      }}
                    >
                      {getCategoryName(item) || "Ritual"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3
                      className="text-white leading-snug mb-2 group-hover:text-[#A8C5AB] transition-colors duration-300"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "1.3rem",
                        fontWeight: 700,
                        fontStyle: "italic",
                      }}
                    >
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-white/50 font-bold"
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.author?.name || "Aura & Earth"}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-white/30" />
                      <span
                        className="text-white/50 font-bold"
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.readTime || "5 min"} read
                      </span>
                    </div>

                    {/* Explore Arrow — appears on hover */}
                    <div
                      className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: "#A8C5AB",
                      }}
                    >
                      READ MORE
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-center gap-6 mt-14">
            <button
              onClick={() => {
                const prevPage = Math.max(1, page - 1);
                dispatch(setPagination({ page: prevPage }));
                dispatch(fetchAllPosts({ page: prevPage, limit }));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={false}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-[#1a2e25] border border-neutral-200 hover:border-[#6B8E7A] hover:text-[#6B8E7A] shadow-sm"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest uppercase text-neutral-400">
                Page
              </span>
              <span className="w-10 h-10 rounded-full bg-[#6B8E7A] text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-[#6B8E7A]/20">
                {page}
              </span>
              <span className="text-[10px] font-black tracking-widest uppercase text-neutral-400">
                of {Math.ceil(totalPosts / limit) || 1}
              </span>
            </div>

            <button
              onClick={() => {
                const nextPage = page + 1;
                dispatch(setPagination({ page: nextPage }));
                dispatch(fetchAllPosts({ page: nextPage, limit }));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={false}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#1a2e25] text-white hover:bg-[#2d4a3e] shadow-md"
            >
              Next
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Explore;
