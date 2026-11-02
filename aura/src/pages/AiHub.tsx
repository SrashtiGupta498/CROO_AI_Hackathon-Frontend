import React from "react";
import { Link } from "react-router-dom";
import "./AiHub.css";

/**
 * `/ai` — the fork.
 *
 * This route used to open the chat directly, with a small "analyze my skin"
 * card buried inside the message list. People read the two as one feature and
 * couldn't tell which screen they were on. So `/ai` now asks the question
 * outright and hands each answer its own colour: the scan is green end-to-end,
 * the chat is coral end-to-end.
 */

const SCAN_POINTS = [
  { icon: "photo_camera", label: "Selfie or upload — up to 3 photos" },
  { icon: "insights", label: "Skin type, tone, redness & concerns" },
  { icon: "spa", label: "A ritual built from what we find" },
];

const CHAT_POINTS = [
  { icon: "forum", label: "Ask about any ingredient or concern" },
  { icon: "menu_book", label: "Routines, layering, what to avoid" },
  { icon: "bolt", label: "Answers in seconds — no photo needed" },
];

const AiHub: React.FC = () => (
  <div className="hub w-full px-5 sm:px-8 py-10 sm:py-14">
    <div className="max-w-5xl mx-auto">
      {/* Intro */}
      <div className="text-center mb-9 sm:mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-mocha/5 text-mocha/60 mb-5">
          <span className="text-xs">✦</span>
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
            Aura AI
          </span>
          <span className="text-xs">✦</span>
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl leading-[1.1] text-mocha mb-3">
          How would you like
          <br className="hidden sm:block" /> to start?
        </h1>
        <p className="text-mocha/55 font-newsreader italic text-lg max-w-md mx-auto">
          Two different tools. Pick the one that fits the moment — you can
          always switch.
        </p>
      </div>

      {/* The two choices */}
      <div className="relative">
        <div className="hub-split">
          {/* ── GREEN: the scan ── */}
          <Link to="/ai/analysis" className="hub-card hub-card--scan">
            <span className="hub-tile mb-6">
              <span className="material-icons-round text-3xl">
                face_retouching_natural
              </span>
            </span>

            <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/55 mb-2">
              Analyze
            </span>
            <span className="font-serif text-3xl sm:text-4xl leading-[1.1] mb-3">
              Scan my skin
            </span>
            <span className="text-white/75 font-newsreader italic text-base leading-relaxed mb-6 max-w-xs">
              Take or upload a photo and get a reading — then a routine built
              around what it actually finds.
            </span>

            <span className="flex flex-col gap-2.5 mb-8">
              {SCAN_POINTS.map((p) => (
                <span key={p.label} className="hub-point">
                  <span className="material-icons-round text-base text-[var(--hub-scan-glow)]">
                    {p.icon}
                  </span>
                  {p.label}
                </span>
              ))}
            </span>

            <span className="hub-go mt-auto">
              Start the scan
              <span className="material-icons-round text-base">
                arrow_forward
              </span>
            </span>
          </Link>

          {/* ── CORAL: the chat ── */}
          <Link to="/ai/chat" className="hub-card hub-card--chat">
            <span className="hub-tile mb-6">
              <span className="material-icons-round text-3xl">
                auto_awesome
              </span>
            </span>

            <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/55 mb-2">
              Ask
            </span>
            <span className="font-serif text-3xl sm:text-4xl leading-[1.1] mb-3">
              Chat with the assistant
            </span>
            <span className="text-white/75 font-newsreader italic text-base leading-relaxed mb-6 max-w-xs">
              A botanical guide on call — ingredients, routines and honest
              answers, no photo required.
            </span>

            <span className="flex flex-col gap-2.5 mb-8">
              {CHAT_POINTS.map((p) => (
                <span key={p.label} className="hub-point">
                  <span className="material-icons-round text-base text-[var(--hub-chat-glow)]">
                    {p.icon}
                  </span>
                  {p.label}
                </span>
              ))}
            </span>

            <span className="hub-go mt-auto">
              Open the chat
              <span className="material-icons-round text-base">
                arrow_forward
              </span>
            </span>
          </Link>
        </div>

        <span className="hub-or">or</span>
      </div>

      {/* Past reports */}
      <div className="mt-8 text-center">
        <Link
          to="/my-reports"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-line text-mocha/70 text-sm font-semibold shadow-card-sm hover:text-mocha transition-colors"
        >
          <span className="material-icons-round text-lg text-mocha/40">
            history
          </span>
          View my past skin reports
        </Link>
      </div>

      <p className="text-[10px] text-center mt-10 opacity-40 uppercase tracking-widest px-8">
        Cosmetic guidance only — not a medical diagnosis. See a dermatologist
        for skin concerns.
      </p>
    </div>
  </div>
);

export default AiHub;
