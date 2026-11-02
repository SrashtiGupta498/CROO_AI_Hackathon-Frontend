import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GeminiService } from "../services/geminiService";
import "./SkincareAI.css";

type Msg = { role: "user" | "bot"; text: string; report?: boolean };

const GREETING =
  "Hello! I'm your Aura & Earth botanical assistant. How can I help you with your natural skincare journey today?";

// How many recent turns to send as context. Enough for a real thread, bounded
// so a long session doesn't grow the request (and the bill) without limit.
const MAX_TURNS = 16;

/** One-tap openers, so the empty state isn't a blank box asking for effort. */
const QUICK_PROMPTS = [
  { icon: "water_drop", label: "What helps dry, flaky skin?" },
  { icon: "brightness_4", label: "How do I fade dark spots naturally?" },
  { icon: "nightlight", label: "Build me a simple night routine" },
  { icon: "eco", label: "Is neem good for acne?" },
];

const SkincareAI: React.FC = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // A finished scan arrives as router state from SkinAnalysis, so the chat
  // opens already knowing the results instead of asking the user to retype them.
  const report =
    (location.state as { report?: { summary: string; date: string } } | null)
      ?.report ?? null;

  const [messages, setMessages] = useState<Msg[]>(() =>
    report
      ? [
          { role: "bot", text: GREETING },
          { role: "bot", text: report.summary, report: true },
          {
            role: "bot",
            text: "I've got your scan in front of me. Ask me anything about it — why a concern showed up, how to layer the routine, or what to avoid.",
          },
        ]
      : [{ role: "bot", text: GREETING }],
  );

  const gemini = useMemo(() => new GeminiService(), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Drop the report out of history once consumed, so a browser refresh or a
  // back-then-forward doesn't silently re-inject a stale scan.
  useEffect(() => {
    if (report) navigate(".", { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Takes the text explicitly rather than reading `input`, so the quick-prompt
   * chips can fire a question without a round-trip through the input state.
   */
  const send = async (raw: string) => {
    const userMsg = raw.trim();
    if (!userMsg || loading) return;

    setInput("");
    const next: Msg[] = [...messages, { role: "user", text: userMsg }];
    setMessages(next);
    setLoading(true);

    // Send the transcript, not just this message, so follow-ups like "how
    // often?" resolve. The report card is dropped — it rides in the system
    // instruction instead, where it stays in scope for every turn.
    // Only the recent tail is sent; the whole history would grow without bound.
    const turns = next.filter((m) => !m.report).slice(-MAX_TURNS);
    const reply = await gemini.getChatReply(turns, report?.summary);

    setMessages((prev) => [
      ...prev,
      {
        role: "bot",
        text:
          reply ||
          "I'm having trouble reaching my botanical database right now. Please try again in a moment.",
      },
    ]);
    setLoading(false);
  };

  const handleSend = () => send(input);

  // Once the thread is going, the identity panel stops earning its space on a
  // phone — it stays only on desktop, where it has its own column.
  const started = messages.length > 1;

  return (
    // Fills the height App.tsx hands this route (`flex-1 min-h-0`) rather than
    // claiming 100dvh — claiming the full viewport underneath a site header
    // made the document taller than the screen and gave the page a second
    // scrollbar competing with the message list.
    <div className="ai-page w-full flex-1 min-h-0 flex flex-col lg:flex-row">
      {/* ============================================================
          LEFT — who you're talking to, and the two ways in
          ============================================================ */}
      {/* On a phone this is a short banner, not a column — the full version
          (cross-links, openers) would leave the message list ~50px tall, so
          everything below the headline is desktop-only and the phone gets the
          same affordances in the header and inside the thread. */}
      <aside
        className={`ai-panel-left shrink-0 lg:w-[40%] lg:max-w-lg lg:h-full lg:overflow-y-auto no-scrollbar
                    px-6 py-5 sm:px-8 lg:px-10 lg:py-12 ${started ? "hidden lg:block" : "block"}`}
      >
        <div className="max-w-md mx-auto lg:mx-0 ai-fade-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 lg:px-4 lg:py-1.5 rounded-full ai-chip mb-3 lg:mb-7">
            <span className="text-xs">✦</span>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
              Botanical Assistant
            </span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl lg:text-5xl leading-[1.08] mb-0 lg:mb-4">
            Ask anything{" "}
            <span className="italic text-[var(--ai-gold)]">
              about your skin
            </span>
          </h2>

          <p className="hidden lg:block text-white/75 leading-relaxed font-newsreader italic text-lg max-w-sm mb-8">
            Pure, organic, evidence-aware guidance — ingredients, routines and
            what to actually avoid. Or let the scan read your skin first, and
            the answers get personal.
          </p>

          {/* Primary entry: the scan */}
          <Link
            to="/ai/analysis"
            className="ai-entry hidden lg:flex items-center gap-4 rounded-3xl p-4 lg:p-5 active:scale-[0.98]"
          >
            <span className="ai-tile-scan w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md">
              <span className="material-icons-round text-2xl lg:text-3xl">
                face_retouching_natural
              </span>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-serif text-lg leading-tight">
                {report ? "Run a new scan" : "Analyze my skin"}
              </span>
              <span className="block text-[11px] opacity-60 mt-0.5">
                Selfie → skin type, tone &amp; a personalized ritual
              </span>
            </span>
            <span className="material-icons-round opacity-40">
              chevron_right
            </span>
          </Link>

          {/* Secondary entry: past reports */}
          <Link
            to="/my-reports"
            className="ai-chip mt-3 hidden lg:flex items-center gap-3 rounded-2xl px-4 py-3 active:scale-[0.98]"
          >
            <span className="material-icons-round text-[var(--ai-gold)] text-xl">
              history
            </span>
            <span className="flex-1 text-sm font-semibold">
              My past reports
            </span>
            <span className="material-icons-round text-white/40 text-lg">
              chevron_right
            </span>
          </Link>

          {/* Openers — horizontal scroll on phones, stacked on desktop */}
          {!started && (
            <div className="mt-7 lg:mt-9 hidden lg:block">
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/50 mb-3">
                Start with
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0 lg:flex-col lg:overflow-visible">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => send(q.label)}
                    disabled={loading}
                    className="ai-chip shrink-0 lg:shrink flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-left text-[13px] font-medium disabled:opacity-50"
                  >
                    <span className="material-icons-round text-base text-[var(--ai-gold)]">
                      {q.icon}
                    </span>
                    <span className="whitespace-nowrap lg:whitespace-normal">
                      {q.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ============================================================
          RIGHT — the conversation
          ============================================================ */}
      <div className="ai-panel-right flex-1 min-h-0 flex flex-col">
        {/* Header. The bars are `sticky`/in-column, not `fixed` to the viewport:
            fixed elements centre on the window while the column centres on its
            own width, so the two drifted apart at every breakpoint. */}
        <header className="shrink-0 bg-white/70 backdrop-blur-xl border-b border-line">
          <div className="mx-auto w-full max-w-2xl px-4 h-16 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="p-2 -ml-2 text-[var(--ai-warm)] rounded-full hover:bg-[var(--ai-warm)]/10"
            >
              <span className="material-icons-round">arrow_back_ios_new</span>
            </button>
            {/* Names the screen, not the product. The scan header says
                "Skin Scan" in green; this one says "Botanical Chat" in coral. */}
            <h1 className="flex items-center gap-2 font-serif text-lg tracking-[0.2em] uppercase text-[var(--ai-warm)]">
              <span className="material-icons-round text-xl">auto_awesome</span>
              Chat
            </h1>
            <Link
              to="/ai/analysis"
              title="Switch to the skin scan"
              aria-label="Switch to the skin scan"
              className="p-2 -mr-2 text-mocha/40 rounded-full hover:text-mocha/70 transition-colors"
            >
              <span className="material-icons-round">
                face_retouching_natural
              </span>
            </Link>
          </div>
        </header>

        {/* Messages — the only scrolling region in this column */}
        <main
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 no-scrollbar"
        >
          <div className="mx-auto w-full max-w-2xl space-y-5">
            {messages.map((m, i) =>
              m.report ? (
                // The scan reads as a document, not a chat bubble.
                <div
                  key={i}
                  className="rounded-3xl border border-[var(--ai-scan)]/30 bg-[var(--ai-warm)]/10 p-4 shadow-sm"
                >
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--ai-warm)] mb-2">
                    <span className="material-icons-round text-sm">
                      description
                    </span>
                    Your skin report
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-mocha">
                    {m.text}
                  </pre>
                </div>
              ) : (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-3xl ${
                      m.role === "user"
                        ? "ai-bubble-user rounded-br-md"
                        : "ai-bubble-bot rounded-bl-md text-mocha"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {m.text}
                    </p>
                  </div>
                </div>
              ),
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="ai-bubble-bot p-4 rounded-3xl rounded-bl-md flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-[var(--ai-warm)] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-[var(--ai-warm)] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-[var(--ai-warm)] rounded-full animate-bounce" />
                </div>
              </div>
            )}

            {/* Desktop keeps the openers in the left column; on a phone the
                panel is gone once the thread starts, so they surface here. */}
            {!started && !loading && (
              <div className="lg:hidden flex flex-wrap gap-2 pt-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => send(q.label)}
                    className="ai-suggest rounded-full px-3.5 py-2 text-xs font-semibold"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Composer — clears the mobile tab bar and the iOS home indicator.
            Navigation is `lg:hidden`, so the clearance goes away on desktop
            instead of leaving the bar floating in dead space. */}
        <div
          className="shrink-0 bg-white/70 backdrop-blur-xl border-t border-line px-4 sm:px-5 pt-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto w-full max-w-2xl">
            <div className="relative flex items-center bg-white border border-line rounded-2xl p-1.5 shadow-lg">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={loading}
                className="flex-grow bg-transparent border-none focus:ring-0 focus:outline-none text-mocha placeholder-mocha/40 py-3 font-medium text-sm px-3 disabled:opacity-60"
                placeholder={
                  report ? "Ask about your results..." : "Ask your concern..."
                }
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="ai-send w-11 h-11 shrink-0 text-white rounded-xl flex items-center justify-center active:scale-95 disabled:active:scale-100"
              >
                <span className="material-icons-round">send</span>
              </button>
            </div>
            <p className="text-[10px] text-center mt-2.5 opacity-40 uppercase tracking-widest px-8">
              Results focus on natural ingredients. Consult a professional for
              medical conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkincareAI;
