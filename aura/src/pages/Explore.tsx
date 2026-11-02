import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { fetchAllPosts } from "../store/article/article.action";
import { setPagination } from "../store/article/article.slice";
import { getPostCover } from "../services/uploadImage";
import { PostCover } from "../components/PostCover";
import { getCategoryName } from "../services/taxonomy";
import { CONCERN_TAGS, filterPosts } from "../services/concernFilter";
import "./Explore.css";

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  // The `|| {}` fallback used to be a partial object, so every field read off
  // it was a type error. The slice always registers, so select it directly and
  // let the destructuring defaults cover a not-yet-hydrated store.
  const {
    posts = [],
    loading = false,
    error = null,
    totalPosts = 0,
    page = 1,
    limit = 10,
  } = useSelector((state: RootState) => state.articles) ?? {};

  // Seed the search box from ?q= so the header search (which navigates here)
  // actually filters the feed. Kept in sync when the param changes.
  const [searchParams] = useSearchParams();
  const [activeTag, setActiveTag] = useState(0);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchQuery(q);
  }, [searchParams]);
  // Local page and limit removed in favor of Redux state

  /* First page on mount — replaces, so a remount never stacks duplicates. */
  const loadFirstPage = useCallback(() => {
    dispatch(fetchAllPosts({ page: 1, limit }));
    dispatch(setPagination({ page: 1 }));
  }, [dispatch, limit]);

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  /* The concern pills and the search box filter the loaded feed. Both used to
     be decorative — the pill highlighted and the list never changed. */
  const query = searchQuery.trim();
  const concern = CONCERN_TAGS[activeTag] ?? CONCERN_TAGS[0];
  const isFiltered = activeTag !== 0 || query.length > 0;

  const visiblePosts = React.useMemo(
    () => filterPosts(posts, activeTag, query),
    [posts, activeTag, query],
  );

  /* More pages exist only while we hold fewer rows than the server reports.
     totalPosts of 0 means the count is unknown — trust a full page instead.
     Note this tracks the UNFILTERED list: filtering happens over what is
     loaded, so more pages still mean more potential matches. */
  const hasMore =
    totalPosts > 0 ? posts.length < totalPosts : posts.length >= limit * page;

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    dispatch(setPagination({ page: nextPage }));
    dispatch(fetchAllPosts({ page: nextPage, limit, append: true }));
  }, [dispatch, loading, hasMore, page, limit]);

  /* Progressive loading: the next page arrives as the reader approaches the end
     of the list, so there is no page flip and no jump back to the top. The
     button below stays as the explicit, keyboard-reachable control. */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && handleLoadMore(),
      { rootMargin: "600px 0px" }, // fetch before the reader actually hits it
    );
    io.observe(el);
    return () => io.disconnect();
  }, [handleLoadMore, hasMore]);

  return (
    <main className="min-w-0 font-sans">
      {/* ════════════════════════════════════════
          EXPLORE HERO + SEARCH
      ════════════════════════════════════════ */}
      <section className="explore-hero pt-20 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10 explore-anim-hero">
            <span className="block mb-3 text-[10px] tracking-[0.3em] font-bold uppercase text-sage-light">
              Discover
            </span>
            <h1 className="font-serif text-[length:clamp(2.5rem,5vw,3.8rem)] font-bold leading-[1.1] text-white italic">
              Explore Rituals
            </h1>
            <p className="text-white/45 mt-4 max-w-md leading-relaxed text-sm">
              Dive into curated botanical guides, ancient remedies, and holistic
              skincare wisdom from our expert community.
            </p>
          </div>

          {/* Search Bar */}
          <div className="explore-search-glass explore-anim-search rounded-2xl flex items-center gap-4 px-6 py-4 max-w-2xl">
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
      <section className="py-8 px-6 bg-paper">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-5 gap-4">
            <h2 className="font-bold text-sm uppercase tracking-[0.15em] text-ink">
              Filter by Concern
            </h2>
            {/* Reset only exists once there is something to reset. */}
            <button
              onClick={() => {
                setActiveTag(0);
                setSearchQuery("");
              }}
              className={`explore-reset text-xs font-bold uppercase tracking-widest text-sage ${
                isFiltered ? "" : "explore-reset-hidden"
              }`}
              tabIndex={isFiltered ? 0 : -1}
              aria-hidden={!isFiltered}
            >
              Reset
            </button>
          </div>

          <div
            className="explore-filter-row flex gap-2.5 overflow-x-auto pb-3 no-scrollbar"
            role="tablist"
            aria-label="Filter remedies by concern"
          >
            {CONCERN_TAGS.map((tag, i) => (
              <button
                key={tag.label}
                role="tab"
                aria-selected={i === activeTag}
                onClick={() => setActiveTag(i)}
                className={`explore-filter-pill whitespace-nowrap rounded-full text-[11px] font-bold tracking-[0.16em] uppercase ${
                  i === activeTag
                    ? "explore-filter-pill-active text-white"
                    : "bg-white text-neutral-500 border border-neutral-200"
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Result count — quiet, and only once a filter is doing something. */}
          <p
            aria-live="polite"
            className={`explore-filter-count text-[11px] tracking-[0.14em] uppercase font-bold text-neutral-400 ${
              isFiltered ? "is-shown" : ""
            }`}
          >
            {isFiltered
              ? `${visiblePosts.length} ${visiblePosts.length === 1 ? "remedy" : "remedies"}${
                  activeTag !== 0 ? ` for ${concern.label}` : ""
                }`
              : ""}
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          MASONRY GRID
      ════════════════════════════════════════ */}
      <section className="py-16 px-6 bg-paper">
        <div className="max-w-7xl mx-auto">
          <div className="explore-post-grid">
            {visiblePosts.map((item: any, i: number) => (
              <div
                key={item.id || item._id || i}
                className="explore-post-card explore-anim-card group cursor-pointer"
                onClick={() => navigate(`/article/${item.id || item._id}`)}
                style={{ animationDelay: `${0.08 * (i % limit)}s` }}
              >
                <div className="relative aspect-[5/7] rounded-[1.5rem] overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-500">
                  <PostCover
                    src={
                      getPostCover(item) ||
                      `https://picsum.photos/seed/${item.id || item._id}/800/600`
                    }
                    alt={item.title}
                    className="explore-card-img w-full h-full object-cover"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

                  {/* Hover Overlay */}
                  <div className="explore-card-overlay absolute inset-0 opacity-0 transition-opacity duration-500" />

                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 rounded-full font-bold shadow-lg text-[9px] tracking-[0.18em] uppercase bg-white/15 backdrop-blur-[8px] border border-white/20 text-white">
                      {getCategoryName(item) || "Ritual"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white leading-snug mb-2 group-hover:text-[#DCE5DD] transition-colors duration-300 font-serif text-[1.3rem] font-bold italic">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-white/50 font-bold text-[9px] tracking-[0.15em] uppercase">
                        {item.author?.name || "Aura & Earth"}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="text-white/50 font-bold text-[9px] tracking-[0.15em] uppercase">
                        {item.readTime || "5 min"} read
                      </span>
                    </div>

                    {/* Explore Arrow — appears on hover */}
                    <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] font-bold tracking-[0.12em] text-sage-light">
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

          {/* No matches — say what was searched, and be clear that filtering
              only covers what has loaded so far rather than implying the
              catalogue is empty. */}
          {!loading && visiblePosts.length === 0 && posts.length > 0 && (
            <div className="explore-empty py-20 text-center max-w-md mx-auto">
              <p className="font-serif italic text-[1.7rem] leading-snug text-ink">
                Nothing here yet
              </p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                No remedy in the {posts.length} loaded so far matches
                {activeTag !== 0 ? ` ${concern.label}` : ""}
                {query ? ` “${searchQuery.trim()}”` : ""}.
                {hasMore ? " Try loading more, or " : " Try "}
                <button
                  onClick={() => {
                    setActiveTag(0);
                    setSearchQuery("");
                  }}
                  className="font-bold text-sage home-link-underline"
                >
                  clear the filters
                </button>
                .
              </p>
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="mt-6 px-7 py-3 rounded-full bg-ink text-white text-xs font-bold tracking-widest uppercase hover:bg-sage transition-colors disabled:opacity-50"
                >
                  Load more remedies
                </button>
              )}
            </div>
          )}

          {/* First load, and every retry from the failed state. Without this the
              section is literally empty while the request is in flight, so a
              cold open looked like an empty catalogue and pressing "Try again"
              made the whole message vanish before it came back. */}
          {loading && posts.length === 0 && (
            <div className="py-20 flex flex-col items-center gap-4">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-sage/30 border-t-sage"
                role="status"
                aria-label="Loading remedies"
              />
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-neutral-400">
                Gathering remedies
              </p>
            </div>
          )}

          {/* Nothing loaded at all. The block above only covers "your filter
              matched none of the posts we have" — it is gated on posts.length,
              so when the fetch itself fails the reader used to get the hero,
              the pills and then a silent void with no way forward. These two
              cover that: a failed load offers a retry, an empty catalogue says
              so plainly instead of looking broken. */}
          {!loading && posts.length === 0 && (
            <div
              className="explore-empty py-20 text-center max-w-md mx-auto"
              role={error ? "alert" : undefined}
            >
              <p className="font-serif italic text-[1.7rem] leading-snug text-ink">
                {error ? "We couldn’t load the remedies" : "No remedies yet"}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                {error
                  ? "Something went wrong reaching our shelves — this is usually a passing connection hiccup."
                  : "The collection is being restocked. Check back shortly."}
              </p>
              {error && (
                <button
                  onClick={loadFirstPage}
                  disabled={loading}
                  className="mt-6 px-7 py-3 rounded-full bg-ink text-white text-xs font-bold tracking-widest uppercase hover:bg-sage transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  {loading ? "Retrying" : "Try again"}
                </button>
              )}
            </div>
          )}

          {/* ── Progressive loading ──────────────────────────────────
              Replaces page-flip controls: the list grows in place, the
              sentinel above pulls the next page in early, and this stays as
              the explicit control for keyboard and screen-reader users. */}
          <div className="mt-14 flex flex-col items-center gap-5">
            {/* Quiet progress read-out — how far through the shelf you are. */}
            {posts.length > 0 && (
              <div className="w-full max-w-xs flex flex-col items-center gap-2.5">
                <div
                  className="h-[3px] w-full rounded-full bg-[rgba(45,42,38,0.10)] overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={totalPosts || posts.length}
                  aria-valuenow={posts.length}
                  aria-label="Remedies loaded"
                >
                  <div
                    className="h-full rounded-full bg-[#3D5B4F] transition-[width] duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, totalPosts ? (posts.length / totalPosts) * 100 : 100)}%`,
                    }}
                  />
                </div>
                {/* While filtering, this must read as "how much has been
                    searched", not "how many results" — otherwise 2 matches out
                    of 10 loaded looks like the whole catalogue holds 2. */}
                <p
                  aria-live="polite"
                  className="text-[10px] font-black tracking-[0.2em] uppercase text-neutral-400"
                >
                  {isFiltered
                    ? totalPosts
                      ? `Searched ${posts.length} of ${totalPosts} loaded`
                      : `Searched ${posts.length} loaded`
                    : totalPosts
                      ? `${posts.length} of ${totalPosts} remedies`
                      : `${posts.length} remedies`}
                </p>
              </div>
            )}

            {/* Sentinel: sits above the button so the fetch starts early. */}
            <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

            {hasMore ? (
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="group flex items-center gap-2.5 px-8 py-3.5 rounded-full font-bold text-xs tracking-widest uppercase transition-colors disabled:opacity-50 disabled:cursor-wait bg-ink text-white hover:bg-sage shadow-md"
              >
                {loading ? "Loading" : "Load more"}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={
                    loading
                      ? "animate-spin"
                      : "transition-transform group-hover:translate-y-0.5"
                  }
                >
                  {loading ? (
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  ) : (
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  )}
                </svg>
              </button>
            ) : (
              posts.length > 0 && (
                <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-neutral-400">
                  That's every remedy
                </p>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Explore;
