import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { ARTICLES, REELS } from "../constants";
import {
  Img1,
  Img2,
  Img3,
  Img4,
  Img5,
  Img8,
  Img9,
  Img12,
  HeroRoller,
  HeroGuaSha,
  HeroMirror,
} from "../assets/index";

import { JOURNALS, resolveAsset } from "../data/journals";
import { getPostCover } from "../services/uploadImage";
import { PostCover } from "../components/PostCover";
import { getCategoryName } from "../services/taxonomy";

import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategories,
  fetchSubCategories,
} from "../store/categories/categories.action";
import { fetchAllPosts } from "../store/article/article.action";
import { fetchReels } from "../store/reels/reels.action";
import { RootState, AppDispatch } from "../store/store";

const FAQS = [
  {
    q: "Are natural remedies safe for all skin types?",
    a: "Natural ingredients can still cause irritation. Always patch test and consult a professional if you have sensitive skin.",
  },
  {
    q: "How long do remedies take to show results?",
    a: "Most remedies require consistent use for 2–4 weeks before noticeable improvement.",
  },
  {
    q: "Can I combine multiple remedies?",
    a: "Yes, but avoid layering strong active ingredients that may weaken your skin barrier.",
  },
  {
    q: "Is your content research-based?",
    a: "Yes. Our content is inspired by traditional knowledge and supported by dermatological research.",
  },
];

/* Hero background frames. A slow crossfade of stills rather than a video:
   same cinematic feel for a fraction of the bytes, and every frame is on
   palette (warm sand / olive / cream) instead of whatever a clip's mid-roll
   happens to land on. First frame is the LCP image — keep it first.
   Frames must be ≥2000px on the long side: full-bleed at hero scale, anything
   smaller (the ImgN mosaic shots are 740px) reads visibly soft. */
const HERO_SLIDES = [
  { src: HeroRoller, alt: "Jade roller drawn along the jaw in warm light" },
  { src: HeroGuaSha, alt: "Gua sha stone held to the eye after a treatment" },
  { src: HeroMirror, alt: "Morning skincare ritual in front of a mirror" },
];
const HERO_SLIDE_MS = 7000;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [heroQuery, setHeroQuery] = useState("");
  const [heroSlide, setHeroSlide] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeReels, setActiveReels] = useState<Record<number, boolean>>({});

  const dispatch = useDispatch<AppDispatch>();
  // No `|| {}` fallbacks: configureStore always mounts these slices, so the
  // fallbacks were unreachable — and they widened each selector's return to a
  // union, which is what made `categories`/`loading` unreadable.
  const {
    categories,
    loading: catLoading,
    subByParent,
    subLoading,
  } = useSelector((state: RootState) => state.category);
  const { posts: apiPosts = [] } = useSelector(
    (state: RootState) => state.articles,
  );
  const { reels: liveReels = [] } = useSelector(
    (state: RootState) => state.reels,
  );

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchAllPosts({ page: 1, limit: 4 }));
    dispatch(fetchReels({ page: 1, limit: 10 }));
  }, [dispatch]);

  const displayPosts = (apiPosts || []).length > 0 ? apiPosts : ARTICLES;

  /**
   * "Browse by Concern" used to render `categories` straight from
   * GET /categories/get — but that endpoint is `find({ parentCategory: null })`,
   * i.e. ROOT categories only, and the taxonomy has exactly one root
   * ("Skin Care"). So the grid could only ever paint a single tile in a
   * four-column layout, which read as "categories aren't loading".
   *
   * The concerns are the root's children — Face Care, Eye Care, Hair Care,
   * Body Care, Lip Care, Sun Care, Ingredients, Skin Conditions — so fetch
   * those and render them instead. Falls back to the roots if the subcategory
   * call returns nothing, so the section is never empty.
   */
  const rootCategory = (categories || []).find(
    (cat: any) => cat && !cat.isSubCategory,
  );
  const rootId = rootCategory?.id;

  useEffect(() => {
    if (rootId) dispatch(fetchSubCategories(rootId));
  }, [dispatch, rootId]);

  const concerns = rootId ? subByParent?.[rootId] : undefined;
  const mainCategories =
    concerns && concerns.length > 0
      ? concerns
      : (categories || []).filter((cat: any) => cat && !cat.isSubCategory);

  const categoriesLoading = catLoading || (!!rootId && !!subLoading?.[rootId]);

  /* Hero frames advance on a slow timer. Reduced-motion visitors keep the
     first frame — a 2s crossfade every 7s is exactly what they opted out of. */
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setHeroSlide((i) => (i + 1) % HERO_SLIDES.length),
      HERO_SLIDE_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  /* Smooth scroll parallax for every [data-parallax] surface (hero backdrop,
     philosophy image, guide covers). The element is rendered oversized so the
     shift — data-parallax = max px offset — never exposes an edge; the needed
     zoom is derived from depth and box height rather than fixed, so a deeper
     offset or a shorter box can't uncover a gap.
     rAF-throttled; respects prefers-reduced-motion. */
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const imgs = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    if (!imgs.length) return;

    let raf = 0;
    const update = () => {
      const vh = window.innerHeight;
      imgs.forEach((img) => {
        const box = img.parentElement;
        if (!box) return;
        const depth = Number(img.dataset.parallax) || 22;
        const rect = box.getBoundingClientRect();
        const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2);
        const offset = Math.max(-1, Math.min(1, progress)) * depth;
        // Cover the full travel (±depth) plus a hairline of slack.
        const scale = Math.max(
          1.04,
          1 + (2 * depth) / Math.max(rect.height, 1) + 0.01,
        );
        img.style.transform = `translate3d(0, ${offset}px, 0) scale(${scale.toFixed(3)})`;
      });
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // The hero backdrop and covers change box height as they load, and the zoom is
    // derived from that height — recompute once they have settled.
    window.addEventListener("load", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("load", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [displayPosts]);

  /* One-shot scroll reveal: sections marked .home-reveal rise in softly the
     first time they enter the viewport. */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".home-reveal");
    if (!els.length || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-inview"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-inview");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* Short-films rail: live reels from the backend, falling back to bundled reels. */
  const railReels = (liveReels || []).length > 0 ? liveReels : REELS;

  /* Reels grid: each of the 4 squares autoplays once it scrolls into the
     viewport, rather than waiting for hover — the grid doesn't scroll
     internally, so a plain viewport-rooted observer is enough (no need to
     root it on a scroll rail). This also covers touch devices, which have
     no hover. Reduced-motion visitors skip the observer entirely and every
     square just keeps its static poster frame, no autoplay. */
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.reelIndex);
          const video = videoRefs.current[idx];
          if (entry.isIntersecting) {
            video?.play().catch(() => {});
            setActiveReels((prev) => ({ ...prev, [idx]: true }));
          } else {
            if (video) {
              video.pause();
              video.currentTime = 0;
            }
            setActiveReels((prev) => ({ ...prev, [idx]: false }));
          }
        });
      },
      { threshold: 0.6 },
    );
    videoRefs.current.forEach((v) => v && io.observe(v));
    return () => io.disconnect();
  }, [railReels]);

  const categoryImages = [Img1, Img2, Img3, Img4, Img5, Img8, Img9, Img12];

  /* The wrapper below is overflow-x-CLIP, not hidden. `hidden` makes the
     element a scroll container, which reserves a vertical-scrollbar gutter
     inside it (15px here): every full-bleed band then stopped ~95px short of
     the right edge while the sticky header spanned the full width, so a strip
     of page background ran down the right of the whole page and read as a
     sidebar following the scroll. `clip` stops horizontal scroll without
     creating the scroll container, so no gutter and both margins match. */
  return (
    <main className="overflow-x-clip font-sans">
      {/* ════════════════════════════════════════
          HERO — concern-first + AI skin report
      ════════════════════════════════════════ */}
      {/* mt-*: a hairline of paper between the sticky header and the hero's
          full-bleed image. They used to be separated by the quick-access bar;
          with that removed the image butted straight into the header and the
          two read as one dark block. */}
      <section className="home-fullbleed relative overflow-hidden flex items-center min-h-[540px] lg:min-h-[70vh] py-14 lg:py-12 mt-3 lg:mt-4">
        {/* Background — editorial stills, crossfaded. Layered rather than flat:
            photograph → warm raking sunlight → vignette → grain. The parallax
            transform sits on the wrapper so each frame stays free to run its
            own slow ken-burns drift without JS overwriting it. */}
        <div className="absolute inset-0 overflow-hidden">
          <div data-parallax="46" className="home-px absolute inset-0">
            {HERO_SLIDES.map((s, i) => (
              <img
                key={s.src}
                src={s.src}
                alt={i === heroSlide ? s.alt : ""}
                aria-hidden={i === heroSlide ? undefined : true}
                fetchPriority={i === 0 ? "high" : "low"}
                className={`home-hero-slide absolute inset-0 w-full h-full object-cover${
                  i === heroSlide ? " is-active" : ""
                }`}
              />
            ))}
          </div>
          <div className="home-hero-sun pointer-events-none absolute inset-0" />
          <div className="home-hero-vignette pointer-events-none absolute inset-0" />
          <div className="home-hero-grain pointer-events-none absolute inset-0" />
        </div>

        {/* Readability overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#2D2A26]/92 via-[#2D2A26]/62 to-[#2D2A26]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2D2A26]/80 via-transparent to-[#2D2A26]/25" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* ── Left: copy + concern search ── */}
          <div>
            <span className="home-rise inline-flex items-center gap-2.5 text-[11px] font-bold tracking-[0.22em] uppercase text-[#DCE5DD]">
              <span className="w-6 h-px bg-[#C6A66B]" />
              Personal · Natural · Proven
            </span>
            <h1
              className="home-hero-title home-rise text-white mt-6"
              style={{ textShadow: "0 2px 30px rgba(0,0,0,0.35)" }}
            >
              The remedy your skin
              <br className="hidden md:block" />{" "}
              <span className="italic text-[#DCE5DD]">
                has been asking for.
              </span>
            </h1>

            {/* Concern search */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate(
                  heroQuery.trim()
                    ? `/explore?q=${encodeURIComponent(heroQuery.trim())}`
                    : "/explore",
                );
              }}
              className="home-rise mt-9 flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-white/40 rounded-full p-1.5 pl-5 shadow-[0_16px_44px_rgba(0,0,0,0.3)] max-w-lg focus-within:border-[#DCE5DD] transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6D6A65"
                strokeWidth="2"
                className="flex-none"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                placeholder="dark spots, dry scalp…"
                aria-label="Search remedies by concern"
                className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-ink placeholder:text-muted/60 py-2"
              />
              <button
                type="submit"
                className="flex-none bg-sage text-white rounded-full px-4 sm:px-5 py-3 text-[13px] font-bold hover:bg-[#4B695A] transition-colors"
              >
                <span className="hidden sm:inline">Find remedies</span>
                <span className="sm:hidden">Search</span>
              </button>
            </form>

            {/* Concern chips — three only; the rest live on Explore. */}
            <div className="home-rise mt-5 flex flex-wrap gap-2.5">
              {[
                { label: "🔥 Acne & marks", hot: true },
                { label: "Hair fall", hot: false },
                { label: "Pigmentation", hot: false },
              ].map((c) => (
                <button
                  key={c.label}
                  onClick={() =>
                    navigate(
                      `/explore?q=${encodeURIComponent(c.label.replace(/[^\w& ]/g, "").trim())}`,
                    )
                  }
                  className={`text-[13px] font-semibold px-3.5 py-2 rounded-full border backdrop-blur-sm transition-colors ${
                    c.hot
                      ? "border-transparent bg-turmeric text-ink hover:bg-turmeric/80"
                      : "border-white/30 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Trust row — the two claims that actually answer a hesitation. */}
            <div className="home-rise mt-7 flex flex-wrap gap-x-6 gap-y-2">
              {["Dermatologist-reviewed", "Your photo stays private"].map(
                (t) => (
                  <span
                    key={t}
                    className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-white/70"
                  >
                    <span className="w-[16px] h-[16px] rounded-full bg-[rgba(154,212,183,0.22)] text-[#DCE5DD] grid place-items-center text-[10px]">
                      ✓
                    </span>
                    {t}
                  </span>
                ),
              )}
            </div>

            {/* Mobile-only AI CTA (the full card is desktop-only to keep the hero short) */}
            <button
              onClick={() => navigate("/ai/analysis")}
              className="home-rise lg:hidden mt-7 inline-flex items-center gap-2 bg-white text-[#3D5B4F] rounded-full px-6 py-3.5 text-[13px] font-bold shadow-lg"
            >
              <span className="material-icons-round text-base">
                face_retouching_natural
              </span>
              Scan my skin — free
            </button>
          </div>

          {/* ── Right: floating AI result card (desktop only) ── */}
          <div className="relative hidden lg:flex justify-end">
            <div
              className="relative z-10 w-full max-w-[340px] rounded-card-lg p-6 text-white shadow-2xl ring-1 ring-white/15 overflow-hidden"
              style={{
                background:
                  "linear-gradient(160deg, rgba(61,91,79,0.92) 0%, rgba(13,23,18,0.92) 130%)",
                backdropFilter: "blur(6px)",
              }}
            >
              <div
                className="pointer-events-none absolute -top-14 -right-12 w-48 h-48 rounded-full opacity-50"
                style={{
                  background:
                    "radial-gradient(circle, rgba(198,166,107,0.55), transparent 70%)",
                }}
              />
              <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-white/60 mb-4">
                Your Skin Report · AI
              </p>

              {/* Gauge + score */}
              <div className="relative flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20 flex-none">
                  <svg
                    className="w-full h-full -rotate-90"
                    viewBox="0 0 120 120"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth="9"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#C6A66B"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * (1 - 0.82)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-serif text-3xl">
                    82
                  </div>
                </div>
                <div>
                  <p className="text-[#DCE5DD] text-[11px] font-bold uppercase tracking-[0.18em]">
                    Glowing
                  </p>
                  <p className="text-white/55 text-[12px] mt-0.5 leading-snug">
                    Hydration high · redness low
                  </p>
                </div>
              </div>

              {/* Remedy plan */}
              <div className="relative rounded-xl p-3.5 bg-white/[0.07] border border-white/15 mb-4">
                <p className="text-[11px] font-bold mb-2 flex items-center gap-2">
                  🌿 Your remedy plan
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["Aloe + turmeric", "Rosehip oil", "Niacinamide"].map(
                    (c) => (
                      <span
                        key={c}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-white/12"
                      >
                        {c}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <button
                onClick={() => navigate("/ai/analysis")}
                className="relative w-full bg-white text-[#3D5B4F] rounded-full py-3 text-[13px] font-bold hover:bg-[#FCFAF7] transition-colors inline-flex items-center justify-center gap-2"
              >
                <span className="material-icons-round text-base">
                  face_retouching_natural
                </span>
                Scan my skin — free
              </button>
            </div>
          </div>
        </div>

        {/* Frame indicators — hairlines, not UI dots. Desktop only: on mobile
            the hero is short enough that they'd crowd the CTA. */}
        <div className="absolute bottom-7 right-8 z-10 hidden md:flex items-center gap-2.5">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => setHeroSlide(i)}
              aria-label={`Show hero frame ${i + 1}`}
              aria-current={i === heroSlide}
              className={`home-hero-dot${i === heroSlide ? " is-active" : ""}`}
            />
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          PHILOSOPHY — editorial split
      ════════════════════════════════════════ */}
      <section className="home-reveal py-20 bg-paper">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image stack with rotating seal */}
          <div className="relative">
            <div className="relative h-[360px] md:h-[440px] rounded-card-xl overflow-hidden shadow-xl">
              <img
                src={Img8}
                alt="Natural skincare ritual"
                data-parallax="30"
                loading="lazy"
                decoding="async"
                className="home-px home-wipe w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-8 -right-2 md:right-8 w-32 h-40 md:w-40 md:h-52 rounded-[1.5rem] overflow-hidden shadow-2xl border-[6px] border-[#FCFAF7] hidden sm:block">
              <img
                src={Img3}
                alt="Botanical ingredients"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Rotating seal badge */}
            <div className="absolute -top-8 -left-6 md:-left-10 w-28 h-28 md:w-32 md:h-32 rounded-full bg-[#3D5B4F] flex items-center justify-center shadow-2xl">
              <div className="home-spin-badge absolute inset-0">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  <defs>
                    <path
                      id="sealCircle"
                      d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
                    />
                  </defs>
                  <text
                    fill="#DCE5DD"
                    fontFamily="'Hanken Grotesk', sans-serif"
                    className="text-[15px] font-bold tracking-[4px]"
                  >
                    <textPath href="#sealCircle" startOffset="0%">
                      ✦ PURELY NATURAL ✦ EARTH ROOTED&nbsp;
                    </textPath>
                  </text>
                </svg>
              </div>
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#DCE5DD"
                strokeWidth="1.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div>
            <span className="block mb-3 home-eyebrow">Our Philosophy</span>
            <h2 className="home-h2">
              Beauty, rooted in the{" "}
              <span className="italic text-[#3D5B4F]">earth.</span>
            </h2>
            <p className="mt-5 text-muted leading-relaxed font-serif text-lg max-w-[480px]">
              Skincare is a ritual, not a routine — every remedy draws on
              botanical wisdom to help your skin find its own balance.
            </p>
            <div className="mt-6 space-y-3">
              {[
                "Slow, intentional rituals over quick fixes",
                "Traditional knowledge meets modern dermatology",
                "Ingredients you can trace back to the soil",
              ].map((point, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex-none w-6 h-6 rounded-full bg-[#3D5B4F]/12 flex items-center justify-center">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3D5B4F"
                      strokeWidth="3"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  <span className="text-[#2D2A26]/80 text-[15px]">{point}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/explore")}
              className="mt-8 home-link-underline text-[#2D2A26] font-bold text-sm tracking-wide inline-flex items-center gap-2"
            >
              Discover our story
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

      {/* ════════════════════════════════════════
          AI SKIN TEST — 50/50 card + copy
      ════════════════════════════════════════ */}
      <section className="home-reveal relative overflow-hidden py-20 bg-paper-2">
        <div className="home-ai-glow" aria-hidden="true" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: interactive AI analysis card */}
          <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
            <div
              className="relative w-full max-w-md rounded-card-lg p-7 md:p-8 text-white shadow-2xl ring-1 ring-white/10 overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #3D5B4F 0%, #2D2A26 130%)",
              }}
            >
              <div
                className="pointer-events-none absolute -top-16 -right-14 w-56 h-56 rounded-full opacity-50"
                style={{
                  background:
                    "radial-gradient(circle, rgba(198,166,107,0.55), transparent 70%)",
                }}
              />
              <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-white/60 mb-6">
                Your Skin Report · AI
              </p>

              <div className="relative flex items-center gap-5 mb-6">
                <div className="relative w-24 h-24 flex-none">
                  <svg
                    className="w-full h-full -rotate-90"
                    viewBox="0 0 120 120"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#C6A66B"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * (1 - 0.82)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-serif text-4xl">
                    82
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  {[
                    { label: "Hydration", value: 90, color: "#DCE5DD" },
                    { label: "Texture", value: 66, color: "#C6A66B" },
                    { label: "Redness", value: 38, color: "#c67d63" },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-[11px] mb-1 font-semibold text-white/80">
                        <span>{m.label}</span>
                        <span>{m.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${m.value}%`, background: m.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative rounded-2xl p-4 bg-white/[0.07] border border-white/15 mb-6">
                <p className="text-[12px] font-bold mb-2.5 flex items-center gap-2">
                  🌿 Your remedy plan
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["Aloe + turmeric mask", "Rosehip oil", "Niacinamide"].map(
                    (c) => (
                      <span
                        key={c}
                        className="text-[11px] px-2.5 py-1.5 rounded-full bg-white/12"
                      >
                        {c}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <button
                onClick={() => navigate("/ai/analysis")}
                className="relative w-full bg-white text-[#3D5B4F] rounded-full py-3.5 text-[13px] font-bold hover:bg-[#FCFAF7] transition-colors inline-flex items-center justify-center gap-2"
              >
                <span className="material-icons-round text-base">
                  face_retouching_natural
                </span>
                Scan my skin — free
              </button>
            </div>
          </div>

          {/* Right: copy + steps */}
          <div className="order-1 lg:order-2">
            <span className="home-eyebrow inline-flex items-center gap-2.5">
              <span className="w-6 h-px bg-[#C6A66B]" />
              AI Skin Test
            </span>
            <h2 className="home-h2 mt-5">
              Let your skin tell us{" "}
              <span className="italic text-[#3D5B4F]">what it needs.</span>
            </h2>
            <p className="mt-5 text-muted leading-relaxed font-serif text-lg max-w-[460px]">
              Snap a selfie. Our AI reads your skin in seconds, then builds a
              routine around what it actually measured.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3">
              {[
                {
                  icon: "photo_camera",
                  t: "Snap a selfie",
                  d: "Camera or upload",
                },
                { icon: "auto_awesome", t: "AI reads it", d: "In ~10 seconds" },
                { icon: "spa", t: "Get your ritual", d: "Personalised picks" },
              ].map((s) => (
                <div
                  key={s.t}
                  className="rounded-2xl p-4 bg-paper border border-[rgba(45,42,38,0.08)]"
                >
                  <span className="material-icons-round text-[#3D5B4F] text-2xl">
                    {s.icon}
                  </span>
                  <p className="text-ink font-bold text-sm mt-2">{s.t}</p>
                  <p className="text-muted text-xs mt-0.5">{s.d}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate("/ai/analysis")}
                className="home-btn-primary text-white px-8 py-3.5 rounded-full font-bold text-sm shadow-lg inline-flex items-center gap-2"
              >
                <span className="material-icons-round text-base">
                  face_retouching_natural
                </span>
                Analyze my skin — free
              </button>
              <span className="flex items-center gap-2 text-muted text-xs font-semibold">
                <span className="material-icons-round text-sm text-sage">
                  lock
                </span>
                Your photo stays private
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-reveal py-20 bg-paper">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="block mb-3 home-eyebrow">Discover</span>
              <h2 className="home-h2">Browse by Concern</h2>
            </div>
            <p className="mt-4 md:mt-0 text-muted max-w-xs leading-relaxed">
              Start with what's bothering you.
            </p>
          </div>
        </div>

        {categoriesLoading && (
          <div className="home-fullbleed grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[300px] md:h-[360px] bg-line animate-pulse"
              />
            ))}
          </div>
        )}

        <div className="home-fullbleed grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {mainCategories.map((category, idx) => (
            <div
              key={category.id}
              onClick={() => navigate(`/categories/${category.id}`)}
              className="home-tile group cursor-pointer h-[300px] md:h-[360px]"
            >
              <img
                src={categoryImages[idx % categoryImages.length]}
                alt={category.name}
                loading="lazy"
                decoding="async"
                className="home-cat-img absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-colors duration-500" />

              <div className="absolute top-5 right-5">
                <div className="home-glass-card w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white tracking-[0.05em]">
                  {String(idx + 1).padStart(2, "0")}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <h3 className="text-white mb-2 font-serif text-[1.6rem] md:text-[1.8rem] font-bold leading-[1.1]">
                  {category.name}
                </h3>
                <p className="text-white/75 text-sm line-clamp-2 mb-4">
                  {category.description}
                </p>
                <span className="inline-flex items-center gap-2 text-white/90 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 text-[11px] font-bold tracking-[0.1em]">
                  EXPLORE
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
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-reveal py-20 bg-sage-light">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="block mb-3 home-eyebrow">Short Films</span>
              <h2 className="home-h2 italic">Latest Natural Rituals</h2>
            </div>
            <button
              onClick={() => navigate("/reels")}
              className="hidden md:flex items-center gap-2 text-sm font-bold text-[#3D5B4F] border-b-2 border-[#3D5B4F]/30 pb-1 hover:border-[#3D5B4F] transition-colors"
            >
              View All
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
            </button>
          </div>

          <div className="grid grid-cols-2 gap-5 max-w-2xl mx-auto">
            {railReels.slice(0, 2).map((reel, index) => (
              <div
                key={reel.id || index}
                className="home-video-card relative aspect-square rounded-3xl overflow-hidden cursor-pointer group shadow-card-md hover:shadow-card-lg ring-1 ring-[rgba(45,42,38,0.06)] transition-shadow duration-500"
                onClick={() => navigate(`/reels/${reel.id}`)}
              >
                {/* preload="none" is the whole point: without it the browser
                    range-requests all four clips (5–47 MB each) on first paint.
                    The poster carries the card until it scrolls into view and
                    the observer below triggers play(). Live reels have no
                    poster yet, so they keep "metadata" — enough for a first
                    frame, not a full buffer. */}
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  data-reel-index={index}
                  src={reel.src}
                  poster={reel.poster}
                  preload={reel.poster ? "none" : "metadata"}
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                    activeReels[index] ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <div className="relative w-14 h-14 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-[8px] border border-white/30">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="white"
                      className="ml-1"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold bg-sage">
                      A
                    </div>
                    <span className="text-white/80 text-[8px] font-bold tracking-[0.15em]">
                      AURA & EARTH
                    </span>
                  </div>
                  <p className="text-white leading-tight font-serif text-[0.9rem] italic line-clamp-2">
                    {reel.title || `Natural Ritual #${index + 1}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          DAILY RITUALS JOURNAL
      ════════════════════════════════════════ */}
      <section className="home-reveal py-20 bg-paper">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <span className="block mb-3 home-eyebrow">
              The Skincare Journal
            </span>
            <h2 className="home-h2">Rituals for Every Moment</h2>
            <p className="text-muted mt-4 max-w-md mx-auto leading-relaxed">
              Morning, night, or your weekly reset — pick the ritual that fits
              your vibe.
            </p>
          </div>
        </div>

        <div className="home-fullbleed grid grid-cols-1 md:grid-cols-3 gap-1.5">
          {JOURNALS.map((j) => (
            <div
              key={j.id}
              onClick={() => navigate(`/journal/${j.id}`)}
              className="home-tile group cursor-pointer h-[420px] md:h-[520px]"
            >
              <img
                src={resolveAsset(j.heroImage)}
                alt={j.title}
                loading="lazy"
                decoding="async"
                className="home-cat-img absolute inset-0 w-full h-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(to top, ${j.theme.primary}cc 0%, transparent 65%)`,
                }}
              />

              <div className="absolute top-5 left-5">
                <span
                  className="inline-block px-4 py-1.5 rounded-full text-white font-bold text-[10px] tracking-[0.18em] uppercase"
                  style={{ backgroundColor: j.theme.primary }}
                >
                  {j.emoji} {j.tag}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h3 className="text-white mb-2 font-serif text-[1.9rem] font-bold leading-[1.1]">
                  {j.title}
                </h3>
                <p className="text-white/75 text-sm leading-relaxed line-clamp-2 mb-5">
                  {j.subtitle}
                </p>
                <span className="inline-flex items-center gap-2 text-white font-bold text-[11px] tracking-[0.1em]">
                  OPEN RITUAL
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="group-hover:translate-x-1 transition-transform"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURED ARTICLES
      ════════════════════════════════════════ */}
      <section className="home-reveal py-20 bg-paper">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="block mb-3 home-eyebrow">Journal</span>
            <h2 className="home-h2">Featured Guides</h2>
          </div>

          {/* Four equal guides in a 2×2 — minimal card, parallax cover. Kept
              at max-w-4xl rather than widening to four-across: the card size
              is what reads as "featured", and shrinking it to fit a row of
              four would just reproduce the Explore grid. "View All Articles"
              below still carries the rest. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-7 max-w-4xl mx-auto">
            {displayPosts.slice(0, 4).map((article) => (
              <div
                key={article.id || article._id}
                onClick={() =>
                  navigate(`/article/${article.id || article._id}`)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/article/${article.id || article._id}`);
                  }
                }}
                className="home-article-card group cursor-pointer flex flex-col focus:outline-none"
              >
                <div className="relative rounded-card-lg p-1.5 bg-white shadow-card-md group-hover:shadow-card-lg ring-1 ring-[rgba(45,42,38,0.06)] transition-shadow duration-500">
                  <div className="relative overflow-hidden rounded-card-md aspect-[4/3]">
                    <PostCover
                      src={
                        getPostCover(article) ||
                        `https://picsum.photos/seed/${article.id || article._id}/800/1000`
                      }
                      alt={article.title}
                      data-parallax="34"
                      className="home-px absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />

                    {/* category chip */}
                    <span className="absolute top-3.5 left-3.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-sage font-bold text-[9px] tracking-[0.16em] uppercase shadow-sm">
                      {getCategoryName(article) || "Ritual"}
                    </span>

                    {/* Gen-Z "open" affordance — nudges out on hover */}
                    <span className="absolute bottom-3.5 right-3.5 w-11 h-11 rounded-full bg-[#C6A66B] text-[#2D2A26] flex items-center justify-center shadow-lg translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 17L17 7M17 7H8M17 7v9" />
                      </svg>
                    </span>

                    {/* read time, bottom-left */}
                    <span className="absolute bottom-4 left-4 text-white/90 text-[11px] font-semibold tracking-wide drop-shadow">
                      {article.readTime || "5 min read"}
                    </span>
                  </div>
                </div>
                <div className="pt-4 px-1">
                  <h3 className="group-hover:text-[#3D5B4F] transition-colors duration-300 mb-1.5 leading-snug font-serif text-[1.25rem] font-bold text-ink line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-muted text-[13px] leading-relaxed line-clamp-2">
                    {article?.content ||
                      article?.subtitle ||
                      article?.description ||
                      ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate("/explore")}
              className="home-btn-primary text-white px-10 py-4 rounded-full font-bold text-sm tracking-wide shadow-lg"
            >
              View All Articles
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          QUOTE BANNER
      ════════════════════════════════════════ */}
      <section className="home-reveal home-quote-banner py-16 px-6 text-center relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="home-blob-tl absolute top-0 left-0 w-48 h-48 rounded-full opacity-10" />
        <div className="home-blob-br absolute bottom-0 right-0 w-56 h-56 rounded-full opacity-10" />

        <div className="relative max-w-3xl mx-auto">
          <blockquote className="text-white/90 font-serif text-[clamp(1.4rem,3vw,2rem)] italic leading-[1.4]">
            Your skin is a living mirror of your internal garden. Tend to it
            with gentleness and nature's quiet whispers.
          </blockquote>
          <span className="mt-6 inline-block text-white/40 font-bold uppercase text-[11px] tracking-[0.3em]">
            Aura &amp; Earth
          </span>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FAQ SECTION
      ════════════════════════════════════════ */}
      <section className="home-reveal py-20 bg-paper">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="block mb-3 home-eyebrow">Support</span>
            <h2 className="home-h2">Common Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className="group overflow-hidden rounded-3xl border transition-all duration-300"
                style={{
                  background:
                    openFAQ === index ? "white" : "rgba(255,255,255,0.7)",
                  borderColor:
                    openFAQ === index
                      ? "rgba(61,91,79,0.4)"
                      : "rgba(0,0,0,0.07)",
                  boxShadow:
                    openFAQ === index
                      ? "0 8px 32px rgba(61,91,79,0.12)"
                      : "none",
                }}
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full text-left flex justify-between items-center p-5 gap-4"
                >
                  <span
                    className={`font-bold text-lg ${openFAQ === index ? "text-ink" : "text-ink/85"}`}
                  >
                    {faq.q}
                  </span>
                  <div
                    className="flex-none w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background:
                        openFAQ === index ? "#3D5B4F" : "rgba(61,91,79,0.1)",
                      transform:
                        openFAQ === index ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={openFAQ === index ? "white" : "#3D5B4F"}
                      strokeWidth="2.5"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                </button>

                <div
                  className="home-faq-answer"
                  style={{
                    maxHeight: openFAQ === index ? "300px" : "0",
                    opacity: openFAQ === index ? 1 : 0,
                  }}
                >
                  <p className="px-5 pb-5 text-muted leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
