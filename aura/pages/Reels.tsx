import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { REELS, Reel } from "../constants";
import { fetchReels } from "../store/reels/reels.action";
import { RootState, AppDispatch } from "../store/store";

/* ─── Theme ─── */
const ACCENT = "#6B8E7A";
const DARK = "#1a2e25";

/* ─── A single card in the grid (autoplays on hover / when in view) ─── */
const ReelCard: React.FC<{ reel: Reel; index: number; onOpen: () => void }> = ({ reel, index, onOpen }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  /* Autoplay while the card is comfortably in view (mobile-friendly). */
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
  }, []);

  return (
    <div
      ref={wrapRef}
      onClick={onOpen}
      className="reel-card group relative flex-none aspect-[9/16] rounded-[28px] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 float-up"
      style={{ animationDelay: `${index * 0.06}s` }}
      onMouseEnter={() => videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const v = videoRef.current;
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
      }}
    >
      <video ref={videoRef} src={reel.src} muted loop playsInline preload="metadata" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/10" />

      {/* play badge */}
      <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </div>

      {/* likes pill */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md text-white text-[11px] font-bold">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-4.5-8-10a4.5 4.5 0 018-2.9A4.5 4.5 0 0120 11c0 5.5-8 10-8 10z" /></svg>
        {reel.likes}
      </div>

      {/* caption */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: ACCENT }}>A</div>
          <span className="text-white/80 text-[9px] font-bold tracking-[0.15em] uppercase">{reel.handle}</span>
        </div>
        <p className="text-white font-serif italic leading-tight text-[0.95rem]">{reel.title}</p>
        <div className="flex flex-wrap gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {reel.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[9px] font-bold text-white/70 lowercase">#{t.replace(/\s+/g, "")}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Immersive full-screen vertical player (TikTok / Reels style) ─── */
const ReelViewer: React.FC<{ reels: Reel[]; startIndex: number; onClose: () => void }> = ({ reels, startIndex, onClose }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const videoEls = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  /* Jump to the tapped reel on mount. */
  useEffect(() => {
    const el = scrollRef.current?.children[startIndex] as HTMLElement | undefined;
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
        const next = Math.min(reels.length - 1, Math.max(0, active + (e.key === "ArrowDown" ? 1 : -1)));
        (scrollRef.current?.children[next] as HTMLElement | undefined)?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active, onClose]);

  const togglePlay = (idx: number) => {
    const vid = videoEls.current[idx];
    if (!vid) return;
    vid.paused ? vid.play().catch(() => {}) : vid.pause();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm">
      {/* top bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors">
          <span className="text-xl">←</span>
          <span className="text-xs font-bold uppercase tracking-widest">Close</span>
        </button>
        <span className="text-white/70 text-[10px] font-black uppercase tracking-[0.3em]">Reels</span>
        <button onClick={() => setMuted((m) => !m)} className="w-9 h-9 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white flex items-center justify-center" title={muted ? "Unmute" : "Mute"}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      <div ref={scrollRef} className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar">
        {reels.map((reel, idx) => (
          <div key={reel.id} data-idx={idx} className="snap-start h-full w-full flex items-center justify-center relative">
            <div className="relative h-full w-full max-w-[440px] mx-auto flex items-center justify-center">
              <video
                ref={(el) => { videoEls.current[idx] = el; }}
                src={reel.src}
                muted={muted}
                loop
                playsInline
                onClick={() => togglePlay(idx)}
                className="h-full w-full object-cover sm:rounded-2xl cursor-pointer"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 sm:rounded-2xl" />

              {/* right action rail */}
              <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
                <button
                  onClick={() => setLiked((p) => ({ ...p, [reel.id]: !p[reel.id] }))}
                  className="flex flex-col items-center gap-1 text-white active:scale-90 transition-transform"
                >
                  <span className={`w-12 h-12 rounded-full backdrop-blur-md border border-white/20 flex items-center justify-center text-xl ${liked[reel.id] ? "bg-[#C0584F]/80" : "bg-white/15"}`}>
                    {liked[reel.id] ? "❤️" : "🤍"}
                  </span>
                  <span className="text-[10px] font-bold">{reel.likes}</span>
                </button>
                <div className="flex flex-col items-center gap-1 text-white">
                  <span className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-lg">💬</span>
                  <span className="text-[10px] font-bold">Chat</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-white">
                  <span className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-lg">↗</span>
                  <span className="text-[10px] font-bold">Share</span>
                </div>
              </div>

              {/* caption */}
              <div className="absolute left-4 right-20 bottom-10 z-10 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/40" style={{ background: ACCENT }}>A</div>
                  <span className="font-bold text-sm">{reel.author}</span>
                  <span className="text-white/60 text-xs">{reel.handle}</span>
                </div>
                <p className="font-serif italic text-lg leading-snug mb-2">{reel.title}</p>
                <p className="text-white/80 text-sm leading-relaxed">{reel.caption}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {reel.tags.map((t) => (
                    <span key={t} className="text-[11px] font-bold text-white/70 lowercase">#{t.replace(/\s+/g, "")}</span>
                  ))}
                </div>
              </div>
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

  const { reels: liveReels } = useSelector((state: RootState) => state.reels);

  /* Live reels from the backend; fall back to bundled reels so the page never looks empty. */
  const reels: Reel[] = liveReels.length ? liveReels : REELS;

  const openViewer = useCallback((idx: number) => setViewerAt(idx), []);

  useEffect(() => {
    dispatch(fetchReels({}));
    window.scrollTo(0, 0);
  }, [dispatch]);

  /* Deep-link: /reels/:id opens the immersive viewer at that reel. */
  useEffect(() => {
    if (!id) return;
    const idx = reels.findIndex((r) => r.id === id);
    if (idx >= 0) setViewerAt(idx);
  }, [id, reels]);

  return (
    <div className="relative min-h-screen bg-[#f7f3ec] text-[#1a2e25]">
      <style>{`
        @keyframes floatUp { from { opacity:0; transform:translateY(20px);} to {opacity:1;transform:translateY(0);} }
        .float-up { animation: floatUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        @keyframes floatOrb { 0%,100%{ transform:translate(0,0) scale(1);} 50%{ transform:translate(18px,-24px) scale(1.07);} }
        .float-orb { animation: floatOrb 20s ease-in-out infinite; }
      `}</style>

      {/* ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -left-20 w-[26rem] h-[26rem] rounded-full bg-[#6B8E7A]/10 blur-[90px] float-orb" />
        <div className="absolute top-1/2 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#FFD9B0]/20 blur-[100px] float-orb" />
      </div>

      {/* header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-8">
        <button onClick={() => navigate(-1)} className="group flex items-center gap-2 mb-8 text-sm font-bold text-[#1a2e25]/70 hover:text-[#1a2e25] transition-colors">
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          <span className="uppercase tracking-widest text-xs">Back</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="block mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#6B8E7A]">Short Films · Reels</span>
            <h1 className="font-serif italic text-[#1a2e25]" style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.2rem, 5vw, 3.6rem)", fontWeight: 700 }}>
              Watch the Rituals
            </h1>
            <p className="mt-3 text-[#1a2e25]/60 max-w-md leading-relaxed">
              Bite-sized botanical moments — tap any reel to dive into the full-screen feed.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-black/5 text-xs font-bold text-[#1a2e25]/70 shadow-sm self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#6B8E7A] animate-pulse" />
            {reels.length} reels
          </span>
        </div>
      </header>

      {/* grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-28">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {reels.map((reel, idx) => (
            <ReelCard key={reel.id} reel={reel} index={idx} onOpen={() => openViewer(idx)} />
          ))}
        </div>
      </main>

      {viewerAt !== null && <ReelViewer reels={reels} startIndex={viewerAt} onClose={() => setViewerAt(null)} />}
    </div>
  );
};

export default Reels;
