import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  Play,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Film,
} from "lucide-react";
import { REELS, Reel } from "../constants";
import { fetchReels } from "../store/reels/reels.action";
import { RootState, AppDispatch } from "../store/store";
import "./Reels.css";

/* Autoplay a muted video whenever its wrapper is comfortably in view — shared
   by the featured hero and the grid cards so both behave identically. */
function useInViewPlayback(
  wrapRef: React.RefObject<HTMLElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  useEffect(() => {
    const el = wrapRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [wrapRef, videoRef]);
}

/* ─── Featured hero — the first reel of the current view, editorial layout ─── */
const FeatureReel: React.FC<{ reel: Reel; onOpen: () => void }> = ({
  reel,
  onOpen,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useInViewPlayback(wrapRef, videoRef);

  return (
    <section className="reels-float-up mb-14 grid gap-8 md:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] md:items-center">
      {/* video frame */}
      <div
        ref={wrapRef}
        onClick={onOpen}
        className="group relative mx-auto w-full max-w-[300px] aspect-[9/16] overflow-hidden rounded-card-xl cursor-pointer shadow-card-lg ring-1 ring-line"
        onMouseEnter={() => videoRef.current?.play().catch(() => {})}
        onMouseLeave={() => {
          const v = videoRef.current;
          if (v) {
            v.pause();
            v.currentTime = 0;
          }
        }}
      >
        <video
          ref={videoRef}
          src={reel.src}
          poster={reel.poster}
          preload={reel.poster ? "none" : "metadata"}
          muted
          loop
          playsInline
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/15" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md ring-1 ring-white/40 transition-transform duration-300 group-hover:scale-110">
            <Play size={24} className="translate-x-0.5 fill-current" />
          </span>
        </div>
        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md">
          <Heart size={12} className="fill-current" />
          {reel.likes}
        </div>
      </div>

      {/* editorial copy */}
      <div className="text-center md:text-left">
        <span className="reels-eyebrow text-turmeric">Featured Ritual</span>
        <h2 className="mt-4 font-serif text-[clamp(1.8rem,3.4vw,2.9rem)] font-bold italic leading-[1.05] text-ink">
          {reel.title}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted md:mx-0">
          {reel.caption}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
          {reel.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold lowercase tracking-wide text-ink/70"
            >
              #{t.replace(/\s+/g, "")}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row md:items-center">
          <button
            onClick={onOpen}
            className="inline-flex items-center gap-2 rounded-full bg-sage px-7 py-3.5 text-sm font-semibold text-white shadow-card-sm transition-colors hover:bg-sage-dark"
          >
            <Play size={16} className="fill-current" />
            Watch now
          </button>
          <div className="flex items-center gap-2.5 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage text-[11px] font-bold text-white">
              A
            </span>
            <span className="font-semibold text-ink">{reel.author}</span>
            <span className="text-muted">{reel.handle}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── A single card in the grid (autoplays on hover / when in view) ─── */
const ReelCard: React.FC<{ reel: Reel; index: number; onOpen: () => void }> = ({
  reel,
  index,
  onOpen,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useInViewPlayback(wrapRef, videoRef);

  return (
    <div
      ref={wrapRef}
      onClick={onOpen}
      className="reel-card reels-float-up group relative flex-none aspect-[9/16] cursor-pointer overflow-hidden rounded-card-lg shadow-card-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-card-md"
      style={{ animationDelay: `${index * 0.05}s` }}
      onMouseEnter={() => videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const v = videoRef.current;
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
      }}
    >
      <video
        ref={videoRef}
        src={reel.src}
        poster={reel.poster}
        preload={reel.poster ? "none" : "metadata"}
        muted
        loop
        playsInline
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/5" />

      {/* play badge */}
      <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
        <Play size={13} className="translate-x-px fill-current" />
      </div>

      {/* likes pill */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
        <Heart size={11} className="fill-current" />
        {reel.likes}
      </div>

      {/* caption */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sage text-[9px] font-bold text-white">
            A
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/80">
            {reel.handle}
          </span>
        </div>
        <p className="font-serif text-[0.95rem] italic leading-tight text-white">
          {reel.title}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {reel.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="text-[9px] font-bold lowercase text-white/70"
            >
              #{t.replace(/\s+/g, "")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Immersive full-screen vertical player (TikTok / Reels style) ─── */
const ReelViewer: React.FC<{
  reels: Reel[];
  startIndex: number;
  onClose: () => void;
}> = ({ reels, startIndex, onClose }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const videoEls = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  /* Jump to the tapped reel on mount. */
  useEffect(() => {
    const el = scrollRef.current?.children[startIndex] as
      HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "auto" });
  }, [startIndex]);

  /* Play only the reel currently snapped into view. */
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          const vid = videoEls.current[idx];
          if (!vid) return;
          if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
            setActive(idx);
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        });
      },
      { root, threshold: [0, 0.7, 1] },
    );
    Array.from(root.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  /* Keyboard: Esc closes, ↑/↓ navigate. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.min(
          reels.length - 1,
          Math.max(0, active + (e.key === "ArrowDown" ? 1 : -1)),
        );
        (
          scrollRef.current?.children[next] as HTMLElement | undefined
        )?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active, onClose, reels.length]);

  const togglePlay = (idx: number) => {
    const vid = videoEls.current[idx];
    if (!vid) return;
    if (vid.paused) {
      void vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  };

  const goTo = (idx: number) =>
    (
      scrollRef.current?.children[idx] as HTMLElement | undefined
    )?.scrollIntoView({ behavior: "smooth" });

  const pad = (n: number) => String(n + 1).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[100] bg-ink/97 backdrop-blur-sm">
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-5 py-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/90 transition-colors hover:text-white"
        >
          <ArrowLeft size={20} />
          <span className="text-xs font-bold uppercase tracking-widest">
            Close
          </span>
        </button>
        <span className="font-serif text-sm italic tracking-wide text-white/80">
          <span className="text-white">{pad(active)}</span>
          <span className="mx-1 text-white/40">/</span>
          {pad(reels.length - 1)}
        </span>
        <button
          onClick={() => setMuted((m) => !m)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* progress rail — position within the feed */}
      <div className="pointer-events-none absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2 sm:flex">
        {reels.map((r, i) => (
          <span
            key={r.id}
            className={`w-[3px] rounded-full transition-all duration-300 ${
              i === active ? "h-7 bg-white" : "h-2.5 bg-white/30"
            }`}
          />
        ))}
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar h-full w-full snap-y snap-mandatory overflow-y-auto"
      >
        {reels.map((reel, idx) => (
          <div
            key={reel.id}
            data-idx={idx}
            className="relative flex h-full w-full snap-start items-center justify-center"
          >
            <div className="relative mx-auto flex h-full w-full max-w-[440px] items-center justify-center">
              <video
                ref={(el) => {
                  videoEls.current[idx] = el;
                }}
                src={reel.src}
                muted={muted}
                loop
                playsInline
                onClick={() => togglePlay(idx)}
                className="h-full w-full cursor-pointer object-cover sm:rounded-3xl"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35 sm:rounded-3xl" />

              {/* right action rail */}
              <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-5">
                <button
                  onClick={() =>
                    setLiked((p) => ({ ...p, [reel.id]: !p[reel.id] }))
                  }
                  className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition-colors ${
                      liked[reel.id] ? "bg-clay/80" : "bg-white/15"
                    }`}
                  >
                    <Heart
                      size={20}
                      className={liked[reel.id] ? "fill-current" : ""}
                    />
                  </span>
                  <span className="text-[10px] font-bold">{reel.likes}</span>
                </button>
                <div className="flex flex-col items-center gap-1 text-white">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/15 backdrop-blur-md">
                    <MessageCircle size={20} />
                  </span>
                  <span className="text-[10px] font-bold">Chat</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-white">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/15 backdrop-blur-md">
                    <Share2 size={19} />
                  </span>
                  <span className="text-[10px] font-bold">Share</span>
                </div>
              </div>

              {/* caption */}
              <div className="absolute bottom-10 left-4 right-20 z-10 text-white">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/40 bg-sage text-xs font-bold text-white">
                    A
                  </div>
                  <span className="text-sm font-bold">{reel.author}</span>
                  <span className="text-xs text-white/60">{reel.handle}</span>
                </div>
                <p className="mb-2 font-serif text-lg italic leading-snug">
                  {reel.title}
                </p>
                <p className="text-sm leading-relaxed text-white/80">
                  {reel.caption}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {reel.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-bold lowercase text-white/70"
                    >
                      #{t.replace(/\s+/g, "")}
                    </span>
                  ))}
                </div>
              </div>

              {/* subtle next-reel hint */}
              {idx < reels.length - 1 && (
                <button
                  onClick={() => goTo(idx + 1)}
                  className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 transition-colors hover:text-white/80"
                >
                  ↓ swipe
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Reels: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<string>("All");

  const { reels: liveReels } = useSelector((state: RootState) => state.reels);

  /* Live reels from the backend; fall back to bundled reels so the page never looks empty. */
  const reels: Reel[] = liveReels.length ? liveReels : REELS;

  /* Category chips derived from the reels' own tags. */
  const tags = useMemo(() => {
    const set = new Set<string>();
    reels.forEach((r) => r.tags.forEach((t) => set.add(t)));
    return ["All", ...Array.from(set)];
  }, [reels]);

  const visibleReels = useMemo(
    () =>
      activeTag === "All"
        ? reels
        : reels.filter((r) => r.tags.includes(activeTag)),
    [reels, activeTag],
  );

  const openViewer = useCallback((idx: number) => setViewerAt(idx), []);

  useEffect(() => {
    dispatch(fetchReels({}));
    window.scrollTo(0, 0);
  }, [dispatch]);

  /* Deep-link: /reels/:id opens the immersive viewer at that reel (over the full
     feed, so we clear any active filter first to keep indices aligned). */
  useEffect(() => {
    if (!id) return;
    const idx = reels.findIndex((r) => r.id === id);
    if (idx >= 0) {
      setActiveTag("All");
      setViewerAt(idx);
    }
  }, [id, reels]);

  const featured = visibleReels[0];
  const rest = visibleReels.slice(1);

  return (
    <div className="relative min-h-screen bg-paper text-ink">
      {/* ambient orbs */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="reels-float-orb absolute -left-20 -top-24 h-[26rem] w-[26rem] rounded-full bg-sage/10 blur-[90px]" />
        <div className="reels-float-orb absolute -right-24 top-1/2 h-[28rem] w-[28rem] rounded-full bg-turmeric/15 blur-[100px]" />
      </div>

      {/* masthead */}
      <header className="relative z-10 mx-auto max-w-7xl px-6 pb-8 pt-10">
        <button
          onClick={() => navigate(-1)}
          className="group mb-8 flex items-center gap-2 text-sm font-bold text-ink/70 transition-colors hover:text-ink"
        >
          <ArrowLeft
            size={16}
            className="transition-transform group-hover:-translate-x-1"
          />
          <span className="text-xs uppercase tracking-widest">Back</span>
        </button>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="reels-eyebrow items-center gap-2 text-sage">
              <Film size={13} />
              Aura &amp; Earth · Film Journal
            </span>
            <h1 className="mt-3 font-serif text-[clamp(2.4rem,5.5vw,4rem)] font-bold italic leading-[0.98] text-ink">
              Watch the Rituals
            </h1>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              Bite-sized botanical moments — tap any reel to slip into the
              full-screen feed.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold text-ink/70 shadow-card-sm sm:self-auto">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sage" />
            {reels.length} reels · new weekly
          </span>
        </div>

        {/* category filter */}
        <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto border-t border-line pt-6">
          {tags.map((t) => {
            const on = t === activeTag;
            return (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={`flex-none rounded-full px-4 py-2 text-xs font-semibold capitalize transition-colors ${
                  on
                    ? "bg-ink text-paper"
                    : "border border-line bg-surface text-ink/70 hover:border-ink/20 hover:text-ink"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </header>

      {/* content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-28">
        {featured && (
          <FeatureReel reel={featured} onOpen={() => openViewer(0)} />
        )}

        {rest.length > 0 && (
          <>
            <div className="mb-6 flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-ink/50">
                More reels
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {rest.map((reel, i) => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  index={i}
                  onOpen={() => openViewer(i + 1)}
                />
              ))}
            </div>
          </>
        )}

        {visibleReels.length === 0 && (
          <div className="py-24 text-center text-muted">
            <p className="font-serif text-2xl italic text-ink">
              Nothing here yet
            </p>
            <p className="mt-2 text-sm">
              No reels tagged “{activeTag}”. Try another filter.
            </p>
          </div>
        )}
      </main>

      {viewerAt !== null && (
        <ReelViewer
          reels={visibleReels}
          startIndex={viewerAt}
          onClose={() => setViewerAt(null)}
        />
      )}
    </div>
  );
};

export default Reels;
