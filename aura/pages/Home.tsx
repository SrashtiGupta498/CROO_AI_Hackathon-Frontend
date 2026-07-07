import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ARTICLES, REELS } from "../constants";
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

import { JOURNALS, resolveAsset } from "../journals";
import { getPostCover } from "../services/uploadImage";
import { PostCover } from "../components/PostCover";
import { getCategoryName } from "../services/taxonomy";

import { useDispatch, useSelector } from "react-redux";
import { fetchCategories } from "../store/categories/categories.action";
import { fetchAllPosts } from "../store/article/article.action";
import { fetchReels } from "../store/reels/reels.action";
import { RootState, AppDispatch } from "../store/store";

const HERO_SLIDES = [
  {
    image: Img10,
    tag: "MORNING GLOW",
    title: "Waking up with\nBotanicals.",
    description:
      "Transform your morning air into a sanctuary of healing scents and organic textures.",
    accent: "#A8C5AB",
  },
  {
    image: Img6,
    tag: "HERBAL HEALING",
    title: "The Power of\nAncient Roots.",
    description:
      "Rediscover the lost secrets of cold-pressed oils and raw ingredients from the earth.",
    accent: "#C5B5A8",
  },
  {
    image: Img7,
    tag: "NIGHT RITUALS",
    title: "Reset Your\nInner Canvas.",
    description:
      "A dedicated routine to purge the city dust and invite deep, cellular restoration.",
    accent: "#A8B5C5",
  },
];

const STATS = [
  { label: "Natural Ingredients", value: "200+" },
  { label: "Trusted Remedies", value: "1.2K" },
  { label: "Community Members", value: "80K+" },
  { label: "Expert Authors", value: "45" },
];

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

const SKINCARE_HABITS = [
  { title: "Check Expiration Dates", desc: "Refresh your shelf by checking PAO symbols for safety.", icon: "📅" },
  { title: "Incorporate Gentle Retinol", desc: "Start once a week to speed up cell renewal gently.", icon: "✨" },
  { title: "Streamline Your Routine", desc: "Consistency beats complexity; stick to the essentials.", icon: "🧼" },
  { title: "Proper Cleansing", desc: "Double cleanse to remove all impurities and SPF.", icon: "🧴" },
  { title: "Use Skincare Tools", desc: "Gua sha or rollers help sculpt and stimulate circulation.", icon: "💎" },
  { title: "Protect Your Lips", desc: "Use SPF lip balm to prevent sun damage and dryness.", icon: "👄" },
  { title: "Pair Vitamin C with SPF", desc: "Vitamin C under SPF supercharges your antioxidant shield.", icon: "☀️" },
  { title: "Internal Nourishment", desc: "Support skin with Zinc, Collagen, or Vitamin E.", icon: "🌿" },
  { title: "Keep Products Cool", desc: "Store eye creams in the fridge to soothe puffiness.", icon: "❄️" },
  { title: "Facial Massage", desc: "Improve blood flow and support lymphatic drainage.", icon: "💆" },
  { title: "At-Home Spa Nights", desc: "Weekly masks or exfoliation for deep rejuvenation.", icon: "🕯️" },
  { title: "Consistent Wellness", desc: "Hydration, sleep, and diet impact skin clarity.", icon: "🧘" },
];



const Home: React.FC = () => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeHabit, setActiveHabit] = useState(0);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const dispatch = useDispatch<AppDispatch>();
  const { categories, loading: catLoading } = useSelector(
    (state: RootState) => state.category || {},
  );
  const { posts: apiPosts = [], loading: postsLoading } = useSelector(
    (state: RootState) => state.articles || { posts: [] },
  );
  const { reels: liveReels = [] } = useSelector(
    (state: RootState) => state.reels || { reels: [] },
  );

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchAllPosts({ page: 1, limit: 4 }));
    dispatch(fetchReels({ page: 1, limit: 10 }));
  }, [dispatch]);

  const displayPosts = (apiPosts || []).length > 0 ? apiPosts : ARTICLES;

  const mainCategories = (categories || []).filter((cat: any) => cat && !cat.isSubCategory);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHabit((prev) => (prev + 1) % SKINCARE_HABITS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.15 },
    );
    const sections = document.querySelectorAll("[data-animate]");
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  /* Short-films rail: live reels from the backend, falling back to bundled reels. */
  const railReels = (liveReels || []).length > 0 ? liveReels : REELS;

  const categoryImages = [Img1, Img2, Img3, Img4, Img5, Img8, Img9, Img12];

  return (
    <main
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className="overflow-x-hidden"
    >
      <style>{`
        @keyframes slowZoom {
          0%   { transform: scale(1.03); }
          50%  { transform: scale(1.09); }
          100% { transform: scale(1.03); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .hero-img { animation: slowZoom 26s ease-in-out infinite; }
        .hero-content > * { opacity: 0; }
        .hero-content.is-active > * { animation: fadeUp 1s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .hero-content.is-active > *:nth-child(1) { animation-delay: 0.15s; }
        .hero-content.is-active > *:nth-child(2) { animation-delay: 0.32s; }
        .hero-content.is-active > *:nth-child(3) { animation-delay: 0.49s; }
        .hero-content.is-active > *:nth-child(4) { animation-delay: 0.66s; }
        .animate-fadeUp { animation: fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-fadeIn { animation: fadeIn 0.6s ease forwards; }
        .float-anim { animation: float 4s ease-in-out infinite; }
        .stat-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        .tag-pill {
          display: inline-block;
          letter-spacing: 0.25em;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 6px 16px;
          border-radius: 100px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.25);
          color: white;
        }
        .glass-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.6);
        }
        .faq-answer {
          overflow: hidden;
          transition: max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
        }
        .scroll-section-visible {
          animation: fadeUp 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .video-card:hover video { transform: scale(1.04); }
        .video-card video { transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
        .category-card:hover .cat-img { transform: scale(1.1); }
        .cat-img { transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1); }
        .article-card:hover .art-img { transform: scale(1.06); }
        .art-img { transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-primary {
          background: linear-gradient(135deg, #6B8E7A 0%, #4a7060 100%);
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .btn-primary:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 16px 40px rgba(107, 142, 122, 0.45);
        }
        .btn-outline {
          transition: background 0.25s, color 0.25s, transform 0.25s;
        }
        .btn-outline:hover {
          transform: translateY(-2px);
        }
        .slide-dot { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        .quote-mark {
          font-family: 'Playfair Display', serif;
          font-size: 8rem;
          line-height: 0.6;
          color: rgba(107,142,122,0.15);
          user-select: none;
        }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        .marquee-track { display: inline-flex; white-space: nowrap; animation: marquee 30s linear infinite; }
        .spin-badge { animation: spinSlow 24s linear infinite; }
        .editorial-frame {
          pointer-events: none;
          position: absolute;
          inset: 22px;
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 26px;
          z-index: 24;
        }
        .v-rail { writing-mode: vertical-rl; text-orientation: mixed; }
        .link-underline {
          background-image: linear-gradient(currentColor, currentColor);
          background-size: 0% 1px;
          background-position: 0 100%;
          background-repeat: no-repeat;
          transition: background-size 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        .link-underline:hover { background-size: 100% 1px; }
      `}</style>

      <section className="relative h-screen w-full overflow-hidden bg-[#1a2e25]">
        {HERO_SLIDES.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              index === activeSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.tag}
              className="hero-img w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />
          </div>
        ))}

        {/* Editorial inset frame */}
        <div className="editorial-frame hidden md:block" />

        {/* Top meta bar */}
        <div className="absolute top-0 left-0 right-0 z-30 px-8 md:px-16 pt-10 md:pt-12 flex items-center justify-between">
          <span
            className="text-white"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700, letterSpacing: "0.18em" }}
          >
            AURA <span className="italic font-normal">&amp;</span> EARTH
          </span>
          <span
            className="hidden md:block text-white/65"
            style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.32em", textTransform: "uppercase" }}
          >
            Natural Rituals — Est. 2024
          </span>
        </div>

        {/* Vertical side rail */}
        <div className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 z-30 hidden lg:block">
          <span
            className="v-rail text-white/55"
            style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.45em", textTransform: "uppercase" }}
          >
            Skincare · Wellness · Earth
          </span>
        </div>

        <div className="absolute inset-0 flex items-center z-20">
          <div className="max-w-7xl mx-auto px-8 md:px-24 w-full">
            {HERO_SLIDES.map((slide, index) => (
              <div
                key={index}
                className={`hero-content flex-col gap-7 max-w-2xl ${index === activeSlide ? "is-active flex" : "hidden"}`}
              >
                <span className="tag-pill w-fit">{slide.tag}</span>
                <h1
                  className="text-white whitespace-pre-line"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(3rem, 7vw, 5.75rem)",
                    lineHeight: 1.02,
                    letterSpacing: "-0.02em",
                    fontStyle: "italic",
                    fontWeight: 600,
                    textShadow: "0 6px 30px rgba(0,0,0,0.3)",
                  }}
                >
                  {slide.title}
                </h1>
                <p
                  className="text-white/80 leading-relaxed"
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: "1.2rem",
                    maxWidth: "460px",
                    textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  {slide.description}
                </p>
                <div className="flex flex-wrap gap-4 mt-3">
                  <button
                    onClick={() => navigate("/explore")}
                    className="px-9 py-4 rounded-full bg-[#F7F3EC] text-[#1a2e25] font-bold text-[13px] tracking-wide shadow-xl hover:bg-white hover:-translate-y-0.5 transition-all"
                  >
                    Explore Remedies
                  </button>
                  <button
                    onClick={() => navigate("/ai")}
                    className="btn-outline px-9 py-4 rounded-full font-bold text-[13px] tracking-wide text-white border border-white/40 hover:bg-white/10 backdrop-blur-sm"
                  >
                    Try AI Skin Guide
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-10 left-8 md:left-16 z-30 flex gap-3 items-center">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`slide-dot rounded-full ${
                i === activeSlide
                  ? "w-10 h-2 bg-white"
                  : "w-2 h-2 bg-white/40 hover:bg-white/65"
              }`}
            />
          ))}
          <span className="ml-4 text-white/50" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em" }}>
            0{activeSlide + 1} <span className="text-white/25">/ 0{HERO_SLIDES.length}</span>
          </span>
        </div>

        <div className="absolute bottom-10 right-8 z-30 flex flex-col items-center gap-2 text-white/50">
          <span style={{ fontSize: "9px", letterSpacing: "0.25em", fontWeight: 700 }}>SCROLL</span>
          <div className="w-px h-10 bg-white/30 relative overflow-hidden">
            <div
              className="w-full bg-white/80 absolute top-0"
              style={{ height: "40%", animation: "float 1.8s ease-in-out infinite" }}
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          BRAND VALUES MARQUEE
      ════════════════════════════════════════ */}
      <section className="bg-[#1a2e25] py-5 overflow-hidden border-y border-white/5">
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
              {["100% Natural", "Cold-Pressed Oils", "Cruelty Free", "Botanical Wisdom", "Slow Beauty", "Earth Rooted"].map((item, i) => (
                <span key={i} className="flex items-center">
                  <span
                    className="text-[#A8C5AB] px-8"
                    style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: "1.5rem" }}
                  >
                    {item}
                  </span>
                  <span className="text-white/25 text-lg">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          PHILOSOPHY — editorial split
      ════════════════════════════════════════ */}
      <section className="py-28" style={{ background: "#F7F3EC" }}>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Image stack with rotating seal */}
          <div className="relative">
            <div className="relative h-[460px] md:h-[560px] rounded-[2.5rem] overflow-hidden shadow-xl">
              <img src={Img8} alt="Natural skincare ritual" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-10 -right-2 md:right-10 w-40 h-52 md:w-48 md:h-64 rounded-[1.75rem] overflow-hidden shadow-2xl border-[6px] border-[#F7F3EC] hidden sm:block">
              <img src={Img3} alt="Botanical ingredients" className="w-full h-full object-cover" />
            </div>
            {/* Rotating seal badge */}
            <div className="absolute -top-8 -left-6 md:-left-10 w-28 h-28 md:w-32 md:h-32 rounded-full bg-[#1a2e25] flex items-center justify-center shadow-2xl">
              <div className="spin-badge absolute inset-0">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  <defs>
                    <path id="sealCircle" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
                  </defs>
                  <text fill="#A8C5AB" fontFamily="'Plus Jakarta Sans', sans-serif" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 4 }}>
                    <textPath href="#sealCircle" startOffset="0%">
                      ✦ PURELY NATURAL ✦ EARTH ROOTED&nbsp;
                    </textPath>
                  </text>
                </svg>
              </div>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#A8C5AB" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div>
            <span
              className="block mb-5"
              style={{ fontSize: "10px", letterSpacing: "0.34em", fontWeight: 700, textTransform: "uppercase", color: "#6B8E7A" }}
            >
              Our Philosophy
            </span>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
                fontWeight: 700,
                lineHeight: 1.08,
                color: "#1a2e25",
              }}
            >
              Beauty, rooted in the{" "}
              <span className="italic text-[#6B8E7A]">earth.</span>
            </h2>
            <p
              className="mt-7 text-neutral-600 leading-relaxed"
              style={{ fontFamily: "'Newsreader', serif", fontSize: "1.15rem", maxWidth: "480px" }}
            >
              We believe skincare is a ritual, not a routine. Every remedy we share draws
              from time-honoured botanical wisdom — cold-pressed oils, raw extracts, and the
              quiet intelligence of plants — to help your skin find its own balance.
            </p>
            <div className="mt-9 space-y-4">
              {[
                "Slow, intentional rituals over quick fixes",
                "Traditional knowledge meets modern dermatology",
                "Ingredients you can trace back to the soil",
              ].map((point, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex-none w-6 h-6 rounded-full bg-[#6B8E7A]/12 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B8E7A" strokeWidth="3">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  <span className="text-[#1a2e25]/80 text-[15px]">{point}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/explore")}
              className="mt-10 link-underline text-[#1a2e25] font-bold text-sm tracking-wide inline-flex items-center gap-2"
            >
              Discover our story
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Refined stats row */}
        <div className="max-w-7xl mx-auto px-6 mt-24">
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-[#1a2e25]/10">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className={`py-10 text-center md:text-left md:px-10 ${i !== 0 ? "md:border-l border-[#1a2e25]/10" : ""}`}
              >
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "2.6rem",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "#1a2e25",
                  }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-neutral-500 mt-1"
                  style={{ fontSize: "10px", letterSpacing: "0.22em", fontWeight: 700, textTransform: "uppercase" }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28" style={{ background: "#f7f3ec" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
            <div>
              <span
                className="block mb-3"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.3em",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#6B8E7A",
                }}
              >
                Discover
              </span>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: "#1a2e25",
                }}
              >
                Browse by Topic
              </h2>
            </div>
            <p className="mt-4 md:mt-0 text-neutral-500 max-w-xs leading-relaxed">
              Curated guides for modern skin &amp; holistic wellness.
            </p>
          </div>

          {catLoading && (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-3xl bg-neutral-200 animate-pulse"
                />
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {mainCategories.map((category, idx) => (
              <div
                key={category.id}
                onClick={() => navigate(`/categories/${category.id}`)}
                className="category-card group cursor-pointer relative h-[300px] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-500"
              >
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={categoryImages[idx % categoryImages.length]}
                    alt={category.name}
                    className="cat-img w-full h-full object-cover"
                  />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(107,142,122,0.75) 0%, transparent 60%)",
                  }}
                />

                <div className="absolute top-5 right-5">
                  <div
                    className="glass-card w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "white",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <h3
                    className="text-white mb-2"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.8rem",
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    {category.name}
                  </h3>
                  <p className="text-white/75 text-sm line-clamp-2 mb-4">
                    {category.description}
                  </p>
                  <span
                    className="inline-flex items-center gap-2 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                    }}
                  >
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
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span
                className="block mb-3"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.3em",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#6B8E7A",
                }}
              >
                Short Films
              </span>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  fontWeight: 700,
                  color: "#1a2e25",
                  fontStyle: "italic",
                }}
              >
                Latest Natural Rituals
              </h2>
            </div>
            <button
              onClick={() => navigate("/reels")}
              className="hidden md:flex items-center gap-2 text-sm font-bold text-[#6B8E7A] border-b-2 border-[#6B8E7A]/30 pb-1 hover:border-[#6B8E7A] transition-colors"
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

          <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar">
            {railReels.map((reel, index) => (
              <div
                key={reel.id || index}
                className="video-card relative flex-none w-[200px] md:w-[230px] aspect-[9/16] rounded-3xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-shadow duration-500"
                onClick={() => navigate(`/reels/${reel.id}`)}
                onMouseEnter={() => videoRefs.current[index]?.play()}
                onMouseLeave={() => {
                  const v = videoRefs.current[index];
                  if (v) {
                    v.pause();
                    v.currentTime = 0;
                  }
                }}
              >
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={reel.src}
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                  <div
                    className="relative w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: "2px solid rgba(255,255,255,0.4)",
                        animation:
                          "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
                      }}
                    />
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

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: "#6B8E7A" }}
                    >
                      A
                    </div>
                    <span
                      className="text-white/80"
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                      }}
                    >
                      AURA & EARTH
                    </span>
                  </div>
                  <p
                    className="text-white leading-tight"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "0.95rem",
                      fontStyle: "italic",
                    }}
                  >
                    {reel.title || `Natural Ritual #${index + 1}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#1a2e25] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div id="habits-text" data-animate className={isVisible["habits-text"] ? "animate-fadeUp" : "opacity-0"}>
              <span className="text-[#A8C5AB] text-[10px] font-bold tracking-[0.4em] uppercase block mb-6">Trending Wisdom</span>
              <h2 
                className="text-white mb-8"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.5rem, 5vw, 3.8rem)", fontWeight: 700, lineHeight: 1.1 }}
              >
                12 Daily Habits for a <br />
                <span className="italic text-[#A8C5AB]">Radiant Glow</span>
              </h2>
              <p className="text-white/45 text-lg leading-relaxed mb-12 max-w-md" style={{ fontFamily: "'Newsreader', serif" }}>
                Discover the simple, intentional shifts that transform your skincare from a routine into a sacred healing ritual.
              </p>
              <div className="flex flex-col gap-6">
                <button 
                  onClick={() => navigate('/journal')}
                  className="w-fit px-10 py-4 rounded-2xl bg-[#A8C5AB] text-[#1a2e25] font-black text-[10px] tracking-widest uppercase hover:scale-105 transition-transform"
                >
                  Read Full Guide
                </button>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {[Img1, Img2, Img3].map((img, i) => (
                      <img key={i} src={img} className="w-10 h-10 rounded-full border-2 border-[#1a2e25] object-cover" alt="User" />
                    ))}
                  </div>
                  <p className="text-white/40 text-xs font-medium">Joined by <span className="text-white">80K+</span> practitioners</p>
                </div>
              </div>
            </div>

            <div className="relative h-[480px] w-full flex items-center justify-center">
              <div className="relative w-full h-full max-w-sm">
                {SKINCARE_HABITS.map((habit, idx) => (
                  <div 
                    key={idx}
                    className={`absolute inset-0 transition-all duration-1000 ease-in-out flex items-center justify-center ${
                      idx === activeHabit 
                        ? "opacity-100 translate-y-0 scale-100 z-10" 
                        : "opacity-0 translate-y-12 scale-95 z-0"
                    }`}
                  >
                    <div className="w-full p-10 rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
                      <div className="text-5xl mb-8 flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 border border-white/20">
                        {habit.icon}
                      </div>
                      <span className="text-[10px] font-black tracking-widest uppercase text-neutral-400">Habit {idx + 1} of 12</span>
                      <h3 
                        className="text-white text-3xl font-bold mb-4 leading-tight"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {habit.title}
                      </h3>
                      <p className="text-white/50 text-base leading-relaxed">
                        {habit.desc}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Carousel Controls */}
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                  {SKINCARE_HABITS.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setActiveHabit(i)}
                      className={`transition-all duration-500 rounded-full ${
                        i === activeHabit ? "h-8 w-1.5 bg-[#A8C5AB]" : "h-1.5 w-1.5 bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          DAILY RITUALS JOURNAL
      ════════════════════════════════════════ */}
      <section className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span
              className="block mb-3"
              style={{
                fontSize: "10px",
                letterSpacing: "0.3em",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#6B8E7A",
              }}
            >
              The Skincare Journal
            </span>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                fontWeight: 700,
                color: "#1a2e25",
              }}
            >
              Rituals for Every Moment
            </h2>
            <p className="text-neutral-500 mt-4 max-w-md mx-auto leading-relaxed">
              Morning, night, or your weekly reset — pick the ritual that fits your vibe.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-7">
            {JOURNALS.map((j) => (
              <div
                key={j.id}
                onClick={() => navigate(`/journal/${j.id}`)}
                className="category-card group cursor-pointer relative h-[440px] rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-500"
              >
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={resolveAsset(j.heroImage)}
                    alt={j.title}
                    className="cat-img w-full h-full object-cover"
                  />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(to top, ${j.theme.primary}cc 0%, transparent 65%)`,
                  }}
                />

                <div className="absolute top-5 left-5">
                  <span
                    className="inline-block px-4 py-1.5 rounded-full text-white font-bold"
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      backgroundColor: j.theme.primary,
                    }}
                  >
                    {j.emoji} {j.tag}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3
                    className="text-white mb-2"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.9rem",
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    {j.title}
                  </h3>
                  <p className="text-white/75 text-sm leading-relaxed line-clamp-2 mb-5">
                    {j.subtitle}
                  </p>
                  <span
                    className="inline-flex items-center gap-2 text-white font-bold"
                    style={{ fontSize: "11px", letterSpacing: "0.1em" }}
                  >
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
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURED ARTICLES
      ════════════════════════════════════════ */}
      <section className="py-28" style={{ background: "#f7f3ec" }}>
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-20">
            <span
              className="block mb-3"
              style={{
                fontSize: "10px",
                letterSpacing: "0.3em",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#6B8E7A",
              }}
            >
              Journal
            </span>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                fontWeight: 700,
                color: "#1a2e25",
              }}
            >
              Featured Guides
            </h2>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="h-px w-12 bg-neutral-300" />
              <span className="text-neutral-400 text-xs font-semibold uppercase tracking-widest">
                Curated for you
              </span>
              <div className="h-px w-12 bg-neutral-300" />
            </div>
          </div>

          {/* Featured first article — large */}
          {displayPosts.length > 0 && (
            <div
              onClick={() => navigate(`/article/${displayPosts[0].id || displayPosts[0]._id}`)}
              className="article-card group cursor-pointer mb-12 relative overflow-hidden rounded-[2rem] shadow-xl hover:shadow-2xl transition-shadow duration-500"
              style={{ height: "480px" }}
            >
              <div className="absolute inset-0 overflow-hidden">
                <PostCover
                  src={getPostCover(displayPosts[0]) || `https://picsum.photos/seed/${displayPosts[0].id || displayPosts[0]._id}/1200/800`}
                  alt={displayPosts[0].title}
                  className="art-img w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
              <div className="relative h-full flex flex-col justify-end p-10 md:p-14 max-w-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <span
                    className="px-4 py-1.5 rounded-full text-white font-bold"
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      background: "#6B8E7A",
                    }}
                  >
                    {getCategoryName(displayPosts[0]) || "Featured"}
                  </span>
                  <span
                    className="text-white/60 font-bold"
                    style={{ fontSize: "10px", letterSpacing: "0.15em" }}
                  >
                    {displayPosts[0].readTime || "5 min read"}
                  </span>
                </div>
                <h3
                  className="text-white mb-4 group-hover:text-[#A8C5AB] transition-colors duration-300"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(1.8rem, 3.5vw, 2.75rem)",
                    fontWeight: 700,
                    lineHeight: 1.15,
                  }}
                >
                  {displayPosts[0].title}
                </h3>
                <p className="text-white/70 leading-relaxed mb-6 line-clamp-2 max-w-lg">
                  {displayPosts[0]?.content || displayPosts[0]?.subtitle || displayPosts[0]?.description || ""}
                </p>
                {displayPosts[0]?.author && (
                  <div className="flex items-center gap-3">
                    <img
                      src={displayPosts[0]?.author?.avatar || displayPosts[0]?.author?.profilePicture || ""}
                      className="w-9 h-9 rounded-full border-2 border-white/30"
                      alt={displayPosts[0]?.author?.name || displayPosts[0]?.author?.FirstName || "Author"}
                    />
                    <div>
                      <p className="text-white font-bold text-sm">
                        {displayPosts[0]?.author?.name || (displayPosts[0]?.author?.FirstName ? `${displayPosts[0].author.FirstName} ${displayPosts[0].author.LastName || ""}` : "Aura & Earth")}
                      </p>
                      <p className="text-white/50 text-xs">
                        {displayPosts[0]?.author?.role || "Expert Contributor"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grid of remaining articles */}
          <div className="grid md:grid-cols-3 gap-7">
            {displayPosts.slice(1, 4).map((article) => (
              <div
                key={article.id || article._id}
                onClick={() => navigate(`/article/${article.id || article._id}`)}
                className="article-card group cursor-pointer bg-white rounded-[1.75rem] shadow-md hover:shadow-xl transition-all duration-500 overflow-hidden"
              >
                <div className="overflow-hidden h-[220px]">
                  <PostCover
                    src={getPostCover(article) || `https://picsum.photos/seed/${article.id || article._id}/800/600`}
                    alt={article.title}
                    className="art-img w-full h-full object-cover"
                  />
                </div>
                <div className="p-7">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="px-3 py-1 rounded-full font-bold"
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        background: "rgba(107,142,122,0.12)",
                        color: "#6B8E7A",
                      }}
                    >
                      {getCategoryName(article) || "Ritual"}
                    </span>
                    <span
                      className="text-neutral-400 font-bold"
                      style={{ fontSize: "9px", letterSpacing: "0.12em" }}
                    >
                      {article.readTime || "5 min read"}
                    </span>
                  </div>
                  <h3
                    className="group-hover:text-[#6B8E7A] transition-colors duration-300 mb-3 leading-snug"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.3rem",
                      fontWeight: 700,
                      color: "#1a2e25",
                    }}
                  >
                    {article.title}
                  </h3>
                  <p className="text-neutral-500 text-sm leading-relaxed line-clamp-2">
                    {article?.content || article?.subtitle || article?.description || ""}
                  </p>
                  <div className="mt-6 flex items-center gap-2 font-bold text-[#6B8E7A] text-xs group-hover:gap-3 transition-all">
                    Read Article
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
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate("/explore")}
              className="btn-primary text-white px-10 py-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg"
            >
              View All Articles
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          QUOTE BANNER
      ════════════════════════════════════════ */}
      <section
        className="py-28 px-6 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #2d4a3e 0%, #1e3329 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #A8C5AB, transparent)",
            transform: "translate(-30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #A8C5AB, transparent)",
            transform: "translate(30%, 30%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto">
          <div className="quote-mark mb-0 leading-none select-none">"</div>
          <blockquote
            className="text-white/90 -mt-6"
            style={{
              fontFamily: "'Newsreader', serif",
              fontSize: "clamp(1.6rem, 4vw, 2.5rem)",
              fontStyle: "italic",
              lineHeight: 1.4,
            }}
          >
            Your skin is a living mirror of your internal garden. Tend to it
            with gentleness and nature's quiet whispers.
          </blockquote>
          <div className="mt-10 flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(168,197,171,0.2)",
                border: "1px solid rgba(168,197,171,0.3)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A8C5AB"
                strokeWidth="1.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span
              className="text-white/40 font-bold uppercase"
              style={{ fontSize: "11px", letterSpacing: "0.3em" }}
            >
              Aura &amp; Earth — Est. 2024
            </span>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FAQ SECTION
      ════════════════════════════════════════ */}
      <section className="py-28" style={{ background: "#f7f3ec" }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <span
              className="block mb-3"
              style={{
                fontSize: "10px",
                letterSpacing: "0.3em",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#6B8E7A",
              }}
            >
              Support
            </span>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 700,
                color: "#1a2e25",
              }}
            >
              Common Questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className="group overflow-hidden rounded-2xl border transition-all duration-300"
                style={{
                  background:
                    openFAQ === index ? "white" : "rgba(255,255,255,0.7)",
                  borderColor:
                    openFAQ === index
                      ? "rgba(107,142,122,0.4)"
                      : "rgba(0,0,0,0.07)",
                  boxShadow:
                    openFAQ === index
                      ? "0 8px 32px rgba(107,142,122,0.12)"
                      : "none",
                }}
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full text-left flex justify-between items-center p-7 gap-4"
                >
                  <span
                    className="font-bold"
                    style={{
                      fontSize: "1.05rem",
                      color: openFAQ === index ? "#1a2e25" : "#3a3a3a",
                    }}
                  >
                    {faq.q}
                  </span>
                  <div
                    className="flex-none w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background:
                        openFAQ === index ? "#6B8E7A" : "rgba(107,142,122,0.1)",
                      transform:
                        openFAQ === index ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={openFAQ === index ? "white" : "#6B8E7A"}
                      strokeWidth="2.5"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                </button>

                <div
                  className="faq-answer"
                  style={{
                    maxHeight: openFAQ === index ? "300px" : "0",
                    opacity: openFAQ === index ? 1 : 0,
                  }}
                >
                  <p className="px-7 pb-7 text-neutral-600 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA NEWSLETTER BANNER
      ════════════════════════════════════════ */}
      <section className="relative py-28 px-6 overflow-hidden bg-white">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25px 25px, #6B8E7A 2px, transparent 0), radial-gradient(circle at 75px 75px, #6B8E7A 2px, transparent 0)",
            backgroundSize: "100px 100px",
          }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8"
            style={{ background: "rgba(107,142,122,0.1)", color: "#6B8E7A" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span
              className="font-bold"
              style={{ fontSize: "11px", letterSpacing: "0.15em" }}
            >
              WEEKLY RITUAL DIGEST
            </span>
          </div>
          <h2
            className="mb-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700,
              color: "#1a2e25",
            }}
          >
            Join the Ritual Community
          </h2>
          <p className="text-neutral-500 mb-10 leading-relaxed">
            Get weekly natural skincare rituals, ingredient deep-dives, and
            expert wisdom delivered straight to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-6 py-4 rounded-2xl border border-neutral-200 bg-neutral-50 text-sm outline-none focus:border-[#6B8E7A] focus:bg-white transition-all"
            />
            <button className="btn-primary text-white px-7 py-4 rounded-2xl font-bold text-sm whitespace-nowrap shadow-lg">
              Subscribe Free
            </button>
          </div>
          <p className="text-neutral-400 text-xs mt-4">
            No spam. Unsubscribe anytime. 🌿
          </p>
        </div>
      </section>
    </main>
  );
};

export default Home;
