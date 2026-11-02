import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ARTICLES } from "../constants";
import { JOURNALS, getJournal, resolveAsset, Journal } from "../data/journals";
import "./JournalPage.css";

const JournalPage: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const data: Journal = getJournal(slug);
  const t = data.theme;
  const isDark = t.mode === "dark";

  // Reset interaction state when switching journals.
  useEffect(() => {
    setOpenFaq(0);
    videoRefs.current = [];
  }, [data.id]);

  const switchJournal = (id: string) => navigate(`/journal/${id}`);

  return (
    <main
      style={{
        backgroundColor: t.bg,
        color: t.body,
      }}
      className="font-sans min-h-screen overflow-x-hidden transition-colors duration-500"
    >
      {/* ===== Journal Book — theme selector tabs ===== */}
      <div className="max-w-7xl mx-auto px-6 pt-10">
        <div className="text-center mb-6">
          <span
            className="text-[10px] font-bold tracking-[0.3em] uppercase block mb-2"
            style={{ color: t.primary }}
          >
            The Skincare Journal
          </span>
          <h2
            style={{ color: t.heading }}
            className="font-serif font-bold text-2xl md:text-3xl"
          >
            Pick your ritual
          </h2>
        </div>
        <div
          className="flex flex-wrap justify-center gap-2 p-2 rounded-2xl mx-auto w-fit"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
          }}
        >
          {JOURNALS.map((j) => {
            const active = j.id === data.id;
            return (
              <button
                key={j.id}
                onClick={() => switchJournal(j.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${active ? "text-white" : "bg-transparent"}`}
                style={
                  active
                    ? { backgroundColor: j.theme.primary }
                    : { color: t.muted }
                }
              >
                <span className="mr-1.5">{j.emoji}</span>
                {j.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Hero ===== */}
      <section className="relative h-[60vh] md:h-[68vh] w-full overflow-hidden mt-8">
        <img
          key={data.heroImage}
          src={resolveAsset(data.heroImage)}
          alt={data.title}
          className="journal-hero-zoom w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${t.bg} 0%, ${
              isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.2)"
            } 45%, transparent 100%)`,
          }}
        />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-14 w-full">
            <div className="max-w-3xl journal-fade-up" key={data.id}>
              <span
                className="inline-block px-4 py-1.5 rounded-full text-white text-[10px] font-bold tracking-[0.2em] uppercase mb-5"
                style={{ backgroundColor: t.primary }}
              >
                {data.emoji} {data.tag}
              </span>
              <h1
                className="mb-4 font-serif font-bold text-[clamp(2.3rem,6vw,4.3rem)] leading-[1.1]"
                style={{ color: isDark ? "#fff" : t.heading }}
              >
                {data.title}
              </h1>
              <p
                className="text-lg md:text-xl font-medium max-w-2xl"
                style={{
                  color: isDark ? "rgba(255,255,255,0.85)" : `${t.heading}`,
                }}
              >
                {data.subtitle}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        {/* Intro / GenZ description */}
        <p
          className="max-w-3xl mx-auto text-center text-lg md:text-xl leading-relaxed mb-20"
          style={{ color: t.body }}
        >
          {data.description}
        </p>

        {/* Benefits */}
        <div className="mb-24">
          <div className="text-center mb-14">
            <span
              className="text-[10px] font-bold tracking-[0.3em] uppercase block mb-3"
              style={{ color: t.primary }}
            >
              Why it works
            </span>
            <h2
              className="font-serif font-bold text-[clamp(2rem,5vw,3rem)]"
              style={{ color: t.heading }}
            >
              5 Key Benefits
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.benefits.map((b, idx) => (
              <div
                key={idx}
                className="p-8 rounded-3xl shadow-sm hover:shadow-md transition-all"
                style={{
                  backgroundColor: t.surface,
                  border: `1px solid ${t.border}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold mb-6"
                  style={{ backgroundColor: t.primarySoft, color: t.primary }}
                >
                  {idx + 1}
                </div>
                <h4
                  className="text-lg font-bold mb-3"
                  style={{ color: t.heading }}
                >
                  {b.title}
                </h4>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: t.muted }}
                >
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left: Steps */}
          <div className="lg:col-span-7">
            <div className="mb-10">
              <h2
                className="mb-5 font-serif font-bold text-[2.4rem]"
                style={{ color: t.heading }}
              >
                The Routine
              </h2>
              <p className="leading-relaxed" style={{ color: t.body }}>
                Follow the steps in order — it's quick once you get the flow
                down.
              </p>
            </div>
            <div className="space-y-6">
              {data.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="group flex gap-6 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300"
                  style={{
                    backgroundColor: t.surface,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div className="flex-none">
                    <span
                      className="font-serif italic text-4xl opacity-35"
                      style={{ color: t.primary }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="pt-2">
                    <p
                      className="text-lg font-semibold leading-snug"
                      style={{ color: t.heading }}
                    >
                      {step}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Shorts + Pro Tip */}
          <div className="lg:col-span-5 space-y-12">
            <div>
              <h3
                className="mb-8 font-serif font-bold text-[1.8rem]"
                style={{ color: t.heading }}
              >
                Ritual Shorts
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {data.shortVideos.map((video, idx) => (
                  <div
                    key={`${data.id}-${idx}`}
                    className={`journal-video-card relative rounded-2xl overflow-hidden shadow-lg group cursor-pointer ${idx === 0 ? "col-span-2 aspect-video" : "aspect-[9/16]"}`}
                    onMouseEnter={() => videoRefs.current[idx]?.play()}
                    onMouseLeave={() => {
                      const v = videoRefs.current[idx];
                      if (v) {
                        v.pause();
                        v.currentTime = 0;
                      }
                    }}
                  >
                    <video
                      // Braces, not a bare arrow: React 19 types a ref callback
                      // as returning void-or-cleanup, and `(x = y)` returns the
                      // assigned element — which React would call as a cleanup.
                      ref={(el) => {
                        videoRefs.current[idx] = el;
                      }}
                      src={resolveAsset(video.video)}
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {video.title}
                      </p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="white"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Good-to-know info cards */}
            <div className="space-y-4">
              {data.info.map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl"
                  style={{
                    backgroundColor: t.primarySoft,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <h4
                    className="text-base font-bold mb-2"
                    style={{ color: t.heading }}
                  >
                    {item.heading}
                  </h4>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: t.body }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Pro Tip */}
            <div
              className="p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group"
              style={{ backgroundColor: t.primary }}
            >
              <div className="relative z-10">
                <h4 className="font-serif text-xl font-bold mb-4">Pro Tip</h4>
                <p className="text-white/85 leading-relaxed italic">
                  "{data.proTip}"
                </p>
              </div>
              <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-20" style={{ backgroundColor: t.surface }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <span
              className="text-[10px] font-bold tracking-[0.3em] uppercase block mb-3"
              style={{ color: t.primary }}
            >
              No dumb questions
            </span>
            <h2
              className="font-serif font-bold text-[clamp(2rem,4vw,2.8rem)]"
              style={{ color: t.heading }}
            >
              FAQs
            </h2>
          </div>
          <div className="space-y-3">
            {data.faqs.map((faq, idx) => {
              const open = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: t.bg,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
                  >
                    <span
                      className="font-bold text-base md:text-lg"
                      style={{ color: t.heading }}
                    >
                      {faq.q}
                    </span>
                    <span
                      className="flex-none w-7 h-7 rounded-full flex items-center justify-center text-lg font-bold transition-transform duration-300"
                      style={{
                        backgroundColor: t.primarySoft,
                        color: t.primary,
                        transform: open ? "rotate(45deg)" : "none",
                      }}
                    >
                      +
                    </span>
                  </button>
                  <div
                    className="journal-faq-body px-6"
                    style={{ maxHeight: open ? 240 : 0, opacity: open ? 1 : 0 }}
                  >
                    <p
                      className="pb-5 leading-relaxed"
                      style={{ color: t.body }}
                    >
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Related Articles ===== */}
      <section className="py-24" style={{ backgroundColor: t.bg }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-16">
            <div>
              <span
                className="text-[10px] font-bold tracking-[0.3em] uppercase block mb-4"
                style={{ color: t.primary }}
              >
                Deep Dive
              </span>
              <h2
                className="font-serif font-bold text-[clamp(2rem,4vw,3rem)]"
                style={{ color: t.heading }}
              >
                Related Knowledge
              </h2>
            </div>
            <button
              onClick={() => navigate("/explore")}
              className="text-sm font-bold pb-1 border-b-2 transition-all"
              style={{ color: t.primary, borderColor: t.primarySoft }}
            >
              View Full Library
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {ARTICLES.slice(0, 3).map((article) => (
              <div
                key={article.id}
                onClick={() => navigate(`/article/${article.id}`)}
                className="group cursor-pointer"
              >
                <div className="aspect-[4/3] rounded-3xl overflow-hidden mb-6 relative shadow-md">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4">
                    <span
                      className="px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest text-white"
                      style={{ backgroundColor: t.primary }}
                    >
                      {article.category}
                    </span>
                  </div>
                </div>
                <h3
                  className="text-xl font-bold mb-2 leading-snug transition-colors"
                  style={{ color: t.heading }}
                >
                  {article.title}
                </h3>
                <p className="text-sm line-clamp-2" style={{ color: t.muted }}>
                  {article.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default JournalPage;
