import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { formatDate } from "../utils/datetime";
import { RootState } from "../store/store";
import {
  analyzeWithAdvice,
  SelfieAnalysis,
  SkinAdvice,
  GeminiRemedyGroup,
} from "../services/skinAnalysis";
import { logRemedyUse } from "../services/remedyUsage";
import { CHAT_ENABLED } from "../services/config";
import { buildSkinContext } from "../services/skinContext";
import {
  buildRecommendations,
  buildAcnePlan,
  RecommendationGroup,
} from "../services/recommendations";
import { CONCERN_LABELS, DOSHA_INFO, Dosha } from "../data/remedies";
import ConcernFeedback from "../components/ConcernFeedback";
import {
  SkinScoreGauge,
  FaceConcernMap,
  SkinTypeSpread,
  computeSkinScore,
} from "../components/SkinResultVisuals";
import {
  INTAKE_QUESTIONS,
  SkinIntake,
  intakeLabel,
  hasActivesSensitivity,
} from "../data/skinIntake";
import { useParallax } from "../hooks/useParallax";
import "./SkinAnalysis.css";

const MAX_PHOTOS = 3;

/* ------------------------------------------------------------------ */
/* Immersive "analyzing" overlay (Stitch design)                       */
/* ------------------------------------------------------------------ */

const ANALYZE_STEPS = [
  { icon: "grain", label: "Detecting tone" },
  { icon: "blur_on", label: "Mapping texture" },
  { icon: "insights", label: "Isolating concerns" },
  { icon: "auto_awesome", label: "Crafting ritual" },
];

const ANALYZE_QUOTES = [
  "True beauty is a reflection of your unique inner balance.",
  "Great skin is a ritual, not a race.",
  "Reading the quiet story your skin is telling…",
];

const AnalyzingOverlay: React.FC<{ photo?: string }> = ({ photo }) => {
  const [pct, setPct] = useState(8);
  const [quote, setQuote] = useState(0);

  useEffect(() => {
    // Ease toward ~95% while the real request runs; the overlay unmounts the
    // moment analysis finishes (loading → false), so it never blocks the result.
    const t = setInterval(() => {
      setPct((p) => (p >= 95 ? 95 : p + Math.max(0.4, (95 - p) * 0.04)));
    }, 120);
    const q = setInterval(
      () => setQuote((i) => (i + 1) % ANALYZE_QUOTES.length),
      3200,
    );
    return () => {
      clearInterval(t);
      clearInterval(q);
    };
  }, []);

  const step = pct < 30 ? 0 : pct < 55 ? 1 : pct < 80 ? 2 : 3;
  const R = 44;
  const C = 2 * Math.PI * R;
  const offset = C - (pct / 100) * C;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Dark, blurred backdrop derived from the user's own photo */}
      <div className="absolute inset-0 -z-10 bg-ink-soft">
        {photo && (
          <img
            src={photo}
            alt=""
            className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        {/* Centerpiece: photo + rotating aura rings + progress ring */}
        <div className="relative w-64 h-64 mb-16 sa-fade-up">
          <div className="absolute inset-0 -m-6">
            <div className="absolute inset-0 border border-sage-light/40 rounded-full sa-ring-rotate" />
            <div className="absolute inset-4 border border-[#fbd9c1]/30 rounded-full sa-ring-rotate--rev" />
          </div>
          <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white/15 shadow-2xl bg-black">
            {photo && (
              <img
                src={photo}
                alt="Analyzing"
                className="w-full h-full object-cover opacity-85"
              />
            )}
            <div className="sa-scanline" style={{ top: 0 }} />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent mix-blend-overlay" />
          </div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 sa-glow-pulse">
            <svg className="w-24 h-24 -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={R}
                fill="transparent"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="3"
              />
              <circle
                cx="48"
                cy="48"
                r={R}
                fill="transparent"
                stroke="#DCE5DD"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-serif text-white">
                {Math.round(pct)}%
              </span>
              <span className="text-[8px] uppercase tracking-[0.2em] text-sage-light">
                Analysis
              </span>
            </div>
          </div>
        </div>

        <h2 className="font-serif text-3xl text-white tracking-wide text-center mb-8 sa-fade-up sa-delay-1">
          Harmonizing your data
        </h2>

        <div className="flex flex-col items-center gap-3 sa-fade-up sa-delay-2">
          {ANALYZE_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div
                key={s.label}
                className={`flex items-center gap-3 py-1 transition-all duration-500 ${
                  active
                    ? "text-white scale-105"
                    : done
                      ? "text-sage-light"
                      : "text-white/30"
                }`}
              >
                <span
                  className={`material-icons-round text-lg ${active ? "animate-spin" : ""}`}
                >
                  {done ? "check_circle" : active ? "sync" : s.icon}
                </span>
                <span className="text-xs uppercase tracking-[0.2em] font-semibold">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 px-7 py-5 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 text-white/70 italic font-newsreader text-center leading-relaxed sa-fade-up sa-delay-3">
          “{ANALYZE_QUOTES[quote]}”
        </div>
      </div>
    </div>
  );
};

const TYPE_ICONS: Record<string, string> = {
  dry: "grain",
  oily: "water_drop",
  normal: "sentiment_satisfied",
  combination: "contrast",
};

const TONE_LABELS: Record<string, string> = {
  very_light: "Very Light",
  light: "Light",
  intermediate: "Intermediate",
  tan: "Tan",
  brown: "Brown",
  dark: "Deep",
};

const ISSUE_HINTS: Record<string, string> = {
  "no face detected": "Make sure your face is fully in frame.",
  "eyes not visible": "Look at the camera with eyes open; tilt glasses to avoid glare.",
  "face too small": "Move closer to the camera.",
  "image too blurry": "Hold steady and retake in good light.",
  "too dark": "Find brighter, even lighting.",
  "over-exposed": "Avoid direct light on your face.",
};

// ml-service appends measurements, e.g. "face too small (150px < 200)", so
// match on the prefix rather than the whole string.
const issueHint = (issue: string): string | undefined =>
  Object.entries(ISSUE_HINTS).find(([k]) => issue.startsWith(k))?.[1];

const SEVERITY_STYLE: Record<string, string> = {
  mild: "bg-turmeric/15 text-ink",
  moderate: "bg-[var(--ae-warning)]/20 text-ink",
  significant: "bg-[#b4413c]/10 text-[#8f322e]",
};

const CONCERN_ICONS: Record<string, string> = {
  acne: "coronavirus",
  blackheads: "blur_on",
  dark_spots: "brightness_4",
  pigmentation: "gradient",
  pores: "grain",
  redness: "local_fire_department",
  wrinkles: "waves",
  dark_circles: "visibility",
};

const DOSHA_STYLE: Record<Dosha, string> = {
  vata: "bg-sage-light text-sage",
  pitta: "bg-clay/15 text-clay",
  kapha: "bg-turmeric/15 text-ink",
};

interface Photo {
  file: File;
  url: string;
}

const ScoreBar: React.FC<{ label: string; value: number; icon: string }> = ({
  label,
  value,
  icon,
}) => (
  <div className="flex items-center gap-3">
    <span className="material-icons-round text-primary text-xl w-7 text-center">
      {icon}
    </span>
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-mocha/70 uppercase tracking-wider">
          {label}
        </span>
        <span className="font-bold text-mocha">{Math.round(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  </div>
);

const AdviceCard: React.FC<{ title: string; icon: string; text: string }> = ({
  title,
  icon,
  text,
}) => (
  <div className="glass-card rounded-[1.5rem] p-5">
    <div className="flex items-center gap-2 mb-3">
      <span className="material-icons-round text-primary">{icon}</span>
      <h3 className="font-bold text-mocha">{title}</h3>
    </div>
    <p className="text-sm leading-relaxed text-mocha/80 whitespace-pre-line">
      {text}
    </p>
  </div>
);

/** Persist the analysis + intake locally for the rest of the app / next visit. */
function persistAnalysis(analysis: SelfieAnalysis, intake: SkinIntake) {
  try {
    localStorage.setItem(
      "lastSkinAnalysis",
      JSON.stringify({ at: new Date().toISOString(), analysis, intake }),
    );
  } catch {
    /* storage full/blocked — non-fatal */
  }
}

/* ------------------------------------------------------------------ */
/* Intake questionnaire                                                */
/* ------------------------------------------------------------------ */

const IntakeForm: React.FC<{
  intake: SkinIntake;
  onChange: (next: SkinIntake) => void;
}> = ({ intake, onChange }) => {
  const toggle = (id: string, value: string, multi?: boolean) => {
    if (multi) {
      const cur = Array.isArray(intake[id as keyof SkinIntake])
        ? (intake[id as keyof SkinIntake] as string[])
        : [];
      const next = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      onChange({ ...intake, [id]: next });
    } else {
      onChange({ ...intake, [id]: value });
    }
  };

  const isOn = (id: string, value: string) => {
    const cur = intake[id as keyof SkinIntake];
    return Array.isArray(cur) ? cur.includes(value) : cur === value;
  };

  return (
    <div className="space-y-3">
      {INTAKE_QUESTIONS.map((q) => (
        <div key={q.id} className="sa-action rounded-3xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-icons-round text-[var(--sa-green)] text-lg">
              {q.icon}
            </span>
            <span className="text-sm font-semibold text-mocha">{q.label}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(q.id, o.value, q.multi)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                  isOn(q.id, o.value) ? "sa-pill-on" : "sa-pill-off"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Per-concern remedy tabs (Ayurvedic / Clinical actives / Organic)    */
/* ------------------------------------------------------------------ */

const RemedyGroupCard: React.FC<{
  group: RecommendationGroup;
  sensitiveToActives: boolean;
}> = ({ group, sensitiveToActives }) => {
  const hasActives = group.chemical.length > 0;
  type Tab = "ayurvedic" | "clinical" | "organic";
  const [tab, setTab] = useState<Tab>("ayurvedic");

  const dosha = group.dosha ? DOSHA_INFO[group.dosha] : null;

  const TabBtn: React.FC<{ id: Tab; icon: string; label: string }> = ({
    id,
    icon,
    label,
  }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all ${
        tab === id ? "bg-primary text-white shadow" : "text-mocha/50"
      }`}
    >
      <span className="material-icons-round text-sm">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="glass-card rounded-[1.5rem] p-5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-bold text-mocha">{group.title}</h4>
        <div className="flex gap-1.5 shrink-0">
          {group.dosha && dosha && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${DOSHA_STYLE[group.dosha]}`}
              title={dosha.signals}
            >
              {dosha.label}
            </span>
          )}
          {group.severity && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                SEVERITY_STYLE[group.severity] || ""
              }`}
            >
              {group.severity}
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] text-mocha/45 mb-4">{group.reason}</p>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-primary/5 rounded-2xl p-1 mb-4">
        <TabBtn id="ayurvedic" icon="spa" label="Ayurvedic" />
        {hasActives && <TabBtn id="clinical" icon="science" label="Clinical" />}
        <TabBtn id="organic" icon="eco" label="Organic" />
      </div>

      {/* Ayurvedic ritual */}
      {tab === "ayurvedic" && (
        <ul className="space-y-3">
          {group.remedies.map((r) => (
            <li key={r.name} className="text-sm">
              <span className="font-semibold text-mocha">{r.name}</span>
              {r.frequency && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full">
                  {r.frequency}
                </span>
              )}
              <p className="text-mocha/60 leading-relaxed mt-0.5">{r.how}</p>
              <UsedButton
                remedyName={r.name}
                target={group.title}
                source="static"
              />
            </li>
          ))}
        </ul>
      )}

      {/* Clinical actives (only rendered when present = moderate+ severity) */}
      {tab === "clinical" && hasActives && (
        <div>
          <p className="text-[11px] text-mocha/45 mb-3 italic">
            When nature needs backup — evidence-based actives, each with its
            botanical source.
          </p>
          {sensitiveToActives && (
            <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 text-[11px] flex gap-2">
              <span className="material-icons-round text-amber-400 text-base">
                warning_amber
              </span>
              <span>
                You flagged sensitivity to acids/retinoids — patch-test and
                introduce these slowly.
              </span>
            </div>
          )}
          <ul className="space-y-3">
            {group.chemical.map((c) => (
              <li key={c.name} className="text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-mocha">{c.name}</span>
                  {c.otc === false ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                      Ask a pro
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                      OTC
                    </span>
                  )}
                </div>
                {c.natural_source && (
                  <p className="text-[10px] text-primary/70 font-medium mt-0.5 flex items-center gap-1">
                    <span className="material-icons-round text-[12px]">
                      local_florist
                    </span>
                    {c.natural_source}
                  </p>
                )}
                <p className="text-mocha/60 leading-relaxed mt-0.5">{c.how}</p>
                {c.caution && (
                  <p className="text-[11px] text-amber-700/90 mt-1 flex gap-1">
                    <span className="material-icons-round text-[13px]">
                      info
                    </span>
                    {c.caution}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Organic picks */}
      {tab === "organic" && (
        <div className="flex flex-wrap gap-2">
          {group.products.length === 0 ? (
            <p className="text-sm text-mocha/50">
              No organic picks for this one.
            </p>
          ) : (
            group.products.map((p) => (
              <Link
                key={p.name}
                to={`/ingredients?q=${encodeURIComponent(p.query || p.name)}`}
                title={p.why}
                className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold active:scale-95 transition-transform flex items-center gap-1"
              >
                <span className="material-icons-round text-sm">spa</span>
                {p.name}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/** Is there a signed-in user? (Usage tracking needs a token.) */
function isSignedIn(): boolean {
  try {
    return !!JSON.parse(localStorage.getItem("currentUser") || "null")
      ?.AccessToken;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* "I used this" — logs a remedy use so users/admins can track usage    */
/* ------------------------------------------------------------------ */

const UsedButton: React.FC<{
  remedyName: string;
  target?: string;
  source: "gemini" | "static";
}> = ({ remedyName, target, source }) => {
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!isSignedIn()) return null; // logging needs a token; hide for guests

  const onClick = async () => {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await logRemedyUse({ remedyName, target, source });
      setCount((c) => c + 1);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const done = count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      title={done ? "Log another use" : "Mark this remedy as used"}
      className={`mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50 ${
        failed
          ? "bg-red-100 text-red-600"
          : done
            ? "bg-emerald-100 text-emerald-700"
            : "bg-primary/10 text-primary"
      }`}
    >
      <span className="material-icons-round text-sm">
        {saving
          ? "progress_activity"
          : failed
            ? "error_outline"
            : done
              ? "check_circle"
              : "add_task"}
      </span>
      {failed
        ? "Try again"
        : done
          ? `Used${count > 1 ? ` ×${count}` : ""}`
          : "I used this"}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Gemini home remedies — found from the ML numbers (skin type + scores) */
/* ------------------------------------------------------------------ */

const GeminiRemedies: React.FC<{
  groups: GeminiRemedyGroup[];
  summary?: string;
  seeDermatologist?: boolean;
}> = ({ groups, summary, seeDermatologist }) => (
  <div className="space-y-4">
    <div className="text-center pt-2">
      <h3 className="text-xl font-bold text-mocha flex items-center justify-center gap-2">
        <span className="material-icons-round text-primary">auto_awesome</span>
        Home remedies for you
      </h3>
      <p className="text-xs text-mocha/50 mt-1">
        Found by AI from your skin numbers
      </p>
    </div>

    {summary && (
      <p className="text-sm text-center text-mocha/70 italic px-4">{summary}</p>
    )}

    {groups.map((group, gi) => (
      <div
        key={`${group.target}-${gi}`}
        className="glass-card rounded-[1.5rem] p-5"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-bold text-mocha capitalize">{group.target}</h4>
          <div className="flex gap-1.5 shrink-0 items-center">
            {typeof group.score === "number" && (
              <span className="text-[10px] font-bold text-mocha/50">
                {Math.round(group.score)}/100
              </span>
            )}
            {group.severity && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  SEVERITY_STYLE[group.severity] || ""
                }`}
              >
                {group.severity}
              </span>
            )}
          </div>
        </div>
        {group.based_on && (
          <p className="text-[11px] text-mocha/45 mb-4">{group.based_on}</p>
        )}
        <ul className="space-y-3">
          {group.remedies.map((r, ri) => (
            <li key={`${r.name}-${ri}`} className="text-sm">
              <span className="font-semibold text-mocha">{r.name}</span>
              {r.frequency && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full">
                  {r.frequency}
                </span>
              )}
              <p className="text-mocha/60 leading-relaxed mt-0.5">{r.how}</p>
              <UsedButton
                remedyName={r.name}
                target={group.target}
                source="gemini"
              />
            </li>
          ))}
        </ul>
      </div>
    ))}

    {seeDermatologist && (
      <div className="flex gap-2 text-[12px] text-rose-700 bg-rose-100/70 rounded-xl p-3">
        <span className="material-icons-round text-rose-500 text-base">
          health_and_safety
        </span>
        <span>
          One of your concerns is significant — pairing these remedies with a
          dermatologist's advice will get you the best results.
        </span>
      </div>
    )}
  </div>
);

const SkinAnalysis: React.FC = () => {
  const currentUser = useSelector(
    (state: RootState) => state.user?.currentUser,
  );
  const reportUserName = [currentUser?.FirstName, currentUser?.LastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [intake, setIntake] = useState<SkinIntake>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SelfieAnalysis | null>(null);
  // Set only for signed-in scans — the backend stores a report just for those,
  // and feedback is addressed by that report's id.
  const [reportId, setReportId] = useState<string | null>(null);
  const [advice, setAdvice] = useState<SkinAdvice | null>(null);

  // Camera capture (live selfie).
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Parallax effect for background orbs only
  const orbsRef = useParallax(0.4);

  const addFiles = (files: File[]) => {
    const room = MAX_PHOTOS - photos.length;
    const next = files
      .slice(0, room)
      .map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    if (next.length) {
      setPhotos((p) => [...p, ...next]);
      setResult(null);
      setReportId(null);
      setAdvice(null);
      setError(null);
    }
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    addFiles(Array.from(files));
  };

  /**
   * Full reset for "Retake".
   *
   * Clearing only result+advice left the previous selfies mounted, so a retake
   * re-analysed the OLD photos unless the user manually removed each one.
   * Revoking the object URLs also stops the blobs leaking — nothing else holds
   * a reference once the thumbnails unmount.
   */
  const resetScan = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setResult(null);
    setReportId(null);
    setAdvice(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = ""; // re-picking the same file must refire onChange
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const openCamera = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    setCameraError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraError(
        "Camera access was blocked. Allow the camera in your browser, or upload a photo instead.",
      );
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        addFiles([file]);
        closeCamera();
      },
      "image/jpeg",
      0.92,
    );
  };

  // Stop the camera if the component unmounts while it's open.
  useEffect(() => stopCamera, []);

  const removePhoto = (idx: number) => {
    setPhotos((p) => {
      URL.revokeObjectURL(p[idx]?.url);
      return p.filter((_, i) => i !== idx);
    });
    setResult(null);
    setReportId(null);
    setAdvice(null);
  };

  const runAnalysis = async () => {
    if (!photos.length || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setReportId(null);
    setAdvice(null);
    try {
      // The front (first) photo drives the ML analysis; the rest live on the
      // report card as context. The backend returns { analysis, advice } or a
      // bare analysis (quality-rejected / no Gemini key).
      const res = await analyzeWithAdvice(photos[0].file);
      // `report_id` rides on the envelope, not inside `analysis`.
      setReportId(res.report_id ?? null);
      if ("advice" in res) {
        setResult(res.analysis);
        setAdvice(res.advice);
        persistAnalysis(res.analysis, intake);
      } else {
        setResult(res);
        if (res.status === "ok") persistAnalysis(res, intake);
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.detail ||
          "Could not reach the analysis service. Please try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  const skinType = result?.skin_type;
  const metrics = result?.metrics;
  const rejected = result?.status === "rejected";
  const concerns = result?.concerns;
  const detectedConcerns =
    concerns?.status === "ok" ? (concerns.detected ?? []) : [];
  const recommendations = useMemo(() => buildRecommendations(result), [result]);
  const acnePlan = useMemo(() => buildAcnePlan(result), [result]);
  const sensitiveToActives = hasActivesSensitivity(intake);
  const skinContext = useMemo(
    () => buildSkinContext(skinType, intake),
    [skinType, intake],
  );

  const intakeChips = useMemo(() => {
    const chips: string[] = [];
    for (const q of INTAKE_QUESTIONS) {
      const v = intake[q.id];
      if (!v) continue;
      (Array.isArray(v) ? v : [v]).forEach((val) =>
        chips.push(intakeLabel(val)),
      );
    }
    return chips;
  }, [intake]);

  /**
   * Plain-text digest of the report, handed to the chat via router state.
   *
   * Previously "Ask the botanical assistant" was a bare <Link to="/ai/chat">, so the
   * assistant opened knowing nothing about the scan the user had just run and
   * they had to retype their own results. Text (not the raw analysis object)
   * because it doubles as the model's grounding context.
   */
  const chatReport = useMemo(() => {
    if (!result || rejected || !skinType) return null;
    const lines = [
      // No confidence percentage: this is measurement-derived, not a model
      // prediction. Quote the measurement instead.
      skinType.note
        ? `Skin reads: ${skinType.skin_type} — ${skinType.note}`
        : `Skin reads: ${skinType.skin_type}`,
    ];
    if (metrics?.tone)
      lines.push(
        `Tone: ${TONE_LABELS[metrics.tone.category] || metrics.tone.category}`,
      );
    if (metrics?.redness)
      lines.push(`Redness: ${Math.round(metrics.redness.score_0_100)}/100`);
    if (metrics?.brightness)
      lines.push(
        `Brightness: ${Math.round(metrics.brightness.score_0_100)}/100`,
      );
    if (detectedConcerns.length)
      lines.push(
        `Concerns: ${detectedConcerns
          .map(
            (c) => `${CONCERN_LABELS[c.concern] || c.concern} (${c.severity})`,
          )
          .join(", ")}`,
      );
    if (intakeChips.length) lines.push(`Profile: ${intakeChips.join(", ")}`);
    if (recommendations.length)
      lines.push(
        `Suggested focus: ${recommendations.map((g) => g.title).join(", ")}`,
      );
    return { summary: lines.join("\n"), date: new Date().toISOString() };
  }, [
    result,
    rejected,
    skinType,
    metrics,
    detectedConcerns,
    intakeChips,
    recommendations,
  ]);

  const printReport = () => {
    if (!result || rejected) return;
    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) return;
    const rows = recommendations
      .map(
        (g) => `
        <div class="grp">
          <h3>${g.title} ${g.severity ? `<span class="sev">${g.severity}</span>` : ""}</h3>
          <p class="reason">${g.reason}</p>
          <p class="tier">🌿 Ayurvedic</p>
          <ul>${g.remedies.map((r) => `<li><b>${r.name}</b>${r.frequency ? ` (${r.frequency})` : ""} — ${r.how}</li>`).join("")}</ul>
          ${
            g.chemical.length
              ? `<p class="tier">🧪 Clinical actives</p><ul>${g.chemical
                  .map(
                    (c) =>
                      `<li><b>${c.name}</b>${c.natural_source ? ` — ${c.natural_source}` : ""}: ${c.how}${c.caution ? ` <i>(${c.caution})</i>` : ""}</li>`,
                  )
                  .join("")}</ul>`
              : ""
          }
          ${g.products.length ? `<p class="tier">🪷 Organic picks</p><p>${g.products.map((p) => p.name).join(" · ")}</p>` : ""}
        </div>`,
      )
      .join("");
    win.document.write(`
      <html><head><title>AURA Skin Report</title>
      <style>
        body{font-family:Georgia,serif;color:#3a2e26;max-width:640px;margin:32px auto;padding:0 20px;line-height:1.5}
        h1{font-size:26px;margin:0 0 4px}
        .muted{color:#9a8b7d;font-size:13px;margin:0 0 20px}
        .card{background:#faf6f0;border:1px solid #ece2d6;border-radius:14px;padding:16px 18px;margin-bottom:16px}
        .grid{display:flex;gap:24px;flex-wrap:wrap}
        .grp h3{font-size:16px;margin:16px 0 2px}
        .sev{font-size:11px;background:#f3e5d6;padding:2px 8px;border-radius:20px;text-transform:uppercase;color:#a6714a}
        .reason{color:#9a8b7d;font-size:12px;margin:0 0 6px}
        .tier{font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin:10px 0 2px;color:#6d5a48}
        ul{margin:4px 0;padding-left:18px;font-size:13px}
        li{margin-bottom:4px}
        .foot{font-size:11px;color:#b3a596;text-align:center;margin-top:24px}
        .back-btn{display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:#6d5a48;font-family:inherit;font-size:13px;font-weight:bold;cursor:pointer;padding:6px 0;margin-bottom:12px}
        .back-btn:hover{color:#3a2e26}
        @media print{.back-btn{display:none}}
      </style></head><body>
        <button class="back-btn" onclick="window.close()">&larr; Back</button>
        <h1>Your AURA Skin Report</h1>
        <p class="muted">${reportUserName ? `Prepared for ${reportUserName} · ` : ""}${formatDate(new Date())} ${intakeChips.length ? "· " + intakeChips.join(" · ") : ""}</p>
        <div class="card">
          <div class="grid">
            <div><b>Skin reads:</b> ${skinType?.skin_type ?? "—"}${skinType?.overall_shine ? ` (shine ${skinType.overall_shine})` : ""}</div>
            ${metrics?.tone ? `<div><b>Tone:</b> ${TONE_LABELS[metrics.tone.category] || metrics.tone.category}</div>` : ""}
            ${metrics?.redness ? `<div><b>Redness:</b> ${Math.round(metrics.redness.score_0_100)}/100</div>` : ""}
            ${metrics?.brightness ? `<div><b>Brightness:</b> ${Math.round(metrics.brightness.score_0_100)}/100</div>` : ""}
          </div>
          ${detectedConcerns.length ? `<p style="margin:12px 0 0"><b>Concerns:</b> ${detectedConcerns.map((c) => `${CONCERN_LABELS[c.concern] || c.concern} (${c.severity})`).join(", ")}</p>` : ""}
        </div>
        ${rows}
        <p class="foot">Cosmetic guidance only — not a medical diagnosis. See a dermatologist for skin concerns.</p>
        <script>window.onload=function(){window.print()}</script>
      </body></html>`);
    win.document.close();
  };

  const canAnalyze = photos.length > 0 && !loading;

  return (
    <div className="sa-page min-h-screen flex flex-col relative">
      {/* Ambient aura orbs — parallax on scroll */}
      <div ref={orbsRef} className="sa-parallax-container">
        <div className="sa-orb sa-orb--1" />
        <div className="sa-orb sa-orb--2" />
      </div>

      {/* Immersive analyzing overlay */}
      {loading && <AnalyzingOverlay photo={photos[0]?.url} />}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-cream/40 backdrop-blur-2xl border-b border-primary/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* /ai redirects back here while the chat is off, so "back" goes home. */}
          <Link
            to={CHAT_ENABLED ? "/ai" : "/"}
            className="p-2 -ml-2 text-primary hover:opacity-80 transition-opacity"
          >
            <span className="material-icons-round">arrow_back_ios_new</span>
          </Link>
          {/* Names the screen, not the product — "Aura AI" was the same label
              the chat used, which is exactly what people got lost in. */}
          <h1 className="flex items-center gap-2 font-serif text-lg tracking-[0.2em] uppercase text-[var(--sa-green)]">
            <span className="material-icons-round text-xl">
              face_retouching_natural
            </span>
            Skin Scan
          </h1>
          {CHAT_ENABLED ? (
            <Link
              to="/ai/chat"
              title="Switch to the chat"
              aria-label="Switch to the chat"
              className="p-2 -mr-2 text-mocha/40 hover:text-mocha/70 transition-colors"
            >
              <span className="material-icons-round">forum</span>
            </Link>
          ) : (
            // Keeps the title centred under justify-between.
            <span className="w-10" aria-hidden="true" />
          )}
        </div>
      </header>

      {/* ============================================================
          CAPTURE — split screen: left tells the story, right does the work
          ============================================================ */}
      {!result && (
        <main className="sa-split relative z-10 flex-1 pt-16">
          {/* ── LEFT: vibrant story panel ── */}
          {/* On a phone this stacks ABOVE the upload, so it stays a hero, not a
              landing page — the numbered steps are desktop-only, since the right
              panel already numbers 01/02 inline. */}
          <section className="sa-panel-left relative flex flex-col justify-center px-7 py-10 sm:px-12 lg:px-14 lg:py-20 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto no-scrollbar">
            <div className="max-w-md w-full mx-auto lg:mx-0 sa-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full sa-chip-dark mb-7">
                <span className="text-xs">✦</span>
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
                  AI Skin Analysis
                </span>
              </div>

              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-4 lg:mb-5">
                Let’s look at
                <br />
                <span className="italic text-[var(--sa-lime)]">your skin</span>
              </h2>

              <p className="text-white/75 leading-relaxed font-newsreader italic text-lg max-w-sm">
                Not a quick scan — a reading. Add up to {MAX_PHOTOS} clear
                photos in natural light and answer a few questions, and we’ll
                build the ritual around what we actually find.
              </p>

              {/* Three-step promise */}
              <ol className="mt-9 space-y-3 hidden lg:block">
                {[
                  {
                    n: "01",
                    label: "Add your photos",
                    sub: "Camera or library — up to 3",
                  },
                  {
                    n: "02",
                    label: "Answer a few questions",
                    sub: "Optional, but sharpens the result",
                  },
                  {
                    n: "03",
                    label: "Get your ritual",
                    sub: "Ayurvedic first, actives only where they help",
                  },
                ].map((s) => (
                  <li
                    key={s.n}
                    className="flex items-center gap-4 px-4 py-3 rounded-2xl sa-chip-dark"
                  >
                    <span className="font-serif text-lg text-[var(--sa-lime)] w-7 shrink-0">
                      {s.n}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        {s.label}
                      </span>
                      <span className="block text-[11px] text-white/60">
                        {s.sub}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              {/* Quality guide */}
              <div className="mt-7 lg:mt-9">
                <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/50 mb-3">
                  For the best read
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: "face_retouching_off", label: "Clean skin" },
                    { icon: "filter_drama", label: "Natural light" },
                    { icon: "center_focus_strong", label: "Frontal view" },
                  ].map((g) => (
                    <span
                      key={g.label}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full sa-chip-dark text-[11px] font-semibold"
                    >
                      <span className="material-icons-round text-base text-[var(--sa-lime)]">
                        {g.icon}
                      </span>
                      {g.label}
                    </span>
                  ))}
                </div>
              </div>

              <span className="mt-8 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full sa-chip-dark">
                <span className="material-icons-round text-[13px] text-[var(--sa-lime)]">
                  lock
                </span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/80">
                  Private &amp; secure
                </span>
              </span>
            </div>
          </section>

          {/* ── RIGHT: the working surface ── */}
          <section className="sa-panel-right px-6 py-10 pb-32 sm:px-10 lg:px-12 lg:py-16">
            <div className="max-w-md w-full mx-auto lg:mx-0">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                multiple
                className="hidden"
                onChange={(e) => addPhotos(e.target.files)}
              />
              {/* Empty state — large organic hero drop-zone */}
              {/* ── Step 1: photos ── */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-serif text-2xl text-[var(--sa-green)]">
                  01
                </span>
                <div>
                  <h3 className="font-serif text-xl text-mocha leading-none">
                    Your photos
                  </h3>
                  <p className="text-[11px] text-mocha/45 mt-1">
                    {photos.length}/{MAX_PHOTOS} added · the first one drives
                    the analysis
                  </p>
                </div>
              </div>

              {photos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="sa-dropzone sa-action group relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden flex flex-col items-center justify-center gap-4 active:scale-[0.99] sa-fade-up"
                >
                  {/* vibrant wash */}
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--sa-mint)]/10 via-transparent to-[var(--sa-coral)]/10" />
                  {/* pulsing scan guide */}
                  <span className="pointer-events-none absolute w-[46%] h-[72%] border-[1.5px] border-[var(--sa-mint)]/60 rounded-[45%_45%_45%_45%/55%_55%_55%_55%] sa-scan-guide" />
                  <span className="sa-tile-mint relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                    <span className="material-icons-round text-4xl">
                      add_a_photo
                    </span>
                  </span>
                  <span className="relative text-center px-8">
                    <span className="block font-serif text-xl text-mocha mb-1">
                      Add your photo
                    </span>
                    <span className="block text-xs text-mocha/50 uppercase tracking-[0.2em]">
                      Tap to capture or upload
                    </span>
                  </span>
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((p, i) => (
                    <div
                      key={p.url}
                      className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/50 shadow-sm"
                    >
                      <img
                        src={p.url}
                        alt={`Photo ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {i === 0 && (
                        <span className="sa-tile-mint absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide text-white px-2 py-0.5 rounded-full">
                          Front
                        </span>
                      )}
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow"
                      >
                        <span className="material-icons-round text-[var(--sa-clay-deep)] text-base">
                          close
                        </span>
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="aspect-[3/4] rounded-3xl border-2 border-dashed border-[var(--sa-green)]/35 bg-[var(--sa-green)]/5 flex flex-col items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <span className="material-icons-round text-3xl text-[var(--sa-green)]">
                        add_a_photo
                      </span>
                      <p className="text-[10px] text-mocha/50 mt-1 uppercase tracking-widest font-semibold text-center px-1">
                        Add more
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Capture options: vibrant action cards */}
              {photos.length < MAX_PHOTOS && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={openCamera}
                    className="sa-action rounded-3xl p-5 flex flex-col items-center gap-3 active:scale-95 group"
                  >
                    <span className="sa-tile-mint w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                      <span className="material-icons-round text-3xl">
                        photo_camera
                      </span>
                    </span>
                    <span className="text-center">
                      <span className="block font-serif text-lg text-mocha">
                        Take a selfie
                      </span>
                      <span className="block text-[11px] text-mocha/50">
                        Instant capture
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="sa-action rounded-3xl p-5 flex flex-col items-center gap-3 active:scale-95 group"
                  >
                    <span className="sa-tile-coral w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                      <span className="material-icons-round text-3xl">
                        image
                      </span>
                    </span>
                    <span className="text-center">
                      <span className="block font-serif text-lg text-mocha">
                        Upload photo
                      </span>
                      <span className="block text-[11px] text-mocha/50">
                        From your library
                      </span>
                    </span>
                  </button>
                </div>
              )}

              {/* ── Step 2: intake ── */}
              <div className="flex items-baseline gap-3 mt-10 mb-4">
                <span className="font-serif text-2xl text-[var(--sa-clay-deep)]">
                  02
                </span>
                <div>
                  <h3 className="font-serif text-xl text-mocha leading-none">
                    A few questions
                  </h3>
                  <p className="text-[11px] text-mocha/45 mt-1">
                    Optional — skip straight to the scan if you’d rather
                  </p>
                </div>
              </div>

              <IntakeForm intake={intake} onChange={setIntake} />

              {/* Error */}
              {error && (
                <div className="mt-6 bg-[#b4413c]/8 border border-[#b4413c]/20 text-[#8f322e] rounded-2xl p-4 text-sm flex gap-2">
                  <span className="material-icons-round text-red-400">
                    error_outline
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* ── Step 3: analyze ── */}
              <button
                onClick={runAnalysis}
                disabled={!canAnalyze}
                className="sa-cta mt-8 w-full py-4 text-white rounded-full font-semibold uppercase tracking-widest text-sm active:scale-[0.98] disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-icons-round animate-spin text-xl">
                      progress_activity
                    </span>
                    Reading your skin…
                  </>
                ) : (
                  <>
                    <span className="material-icons-round text-xl">
                      auto_awesome
                    </span>
                    Start analysis
                  </>
                )}
              </button>
              {!photos.length && (
                <p className="mt-3 text-center text-[11px] text-mocha/40">
                  Add at least one photo to begin
                </p>
              )}

              <p className="text-[10px] text-center mt-10 opacity-40 uppercase tracking-widest">
                Cosmetic guidance only — not a medical diagnosis. See a
                dermatologist for skin concerns.
              </p>
            </div>
          </section>
        </main>
      )}

      {/* ============================================================
          RESULT / REJECTION — single reading column
          ============================================================ */}
      {result && (
        <main className="relative z-10 flex-1 w-full max-w-md mx-auto px-6 pt-24 pb-40 no-scrollbar">
          {/* Quality rejection */}
          {rejected && (
            <div className="mt-8 bg-cream border border-primary/10 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-icons-round text-amber-500">
                  photo_camera
                </span>
                <h3 className="font-bold text-mocha">Let's retake that one</h3>
              </div>
              <ul className="space-y-2">
                {result?.quality.issues.map((issue) => (
                  <li key={issue} className="text-sm text-mocha/70 flex gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <span className="capitalize font-medium">{issue}</span>
                      {issueHint(issue) ? ` — ${issueHint(issue)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={resetScan}
                className="mt-4 text-primary font-semibold text-sm"
              >
                ← Try another photo
              </button>
            </div>
          )}

          {/* Results */}
          {result && !rejected && skinType && (
            <div className="space-y-5">
              {/* Report card header with photos + download */}
              <div className="glass-card rounded-[1.75rem] p-6 sa-fade-up">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-mocha/50 font-semibold">
                      Your Skin Report
                    </p>
                    <p className="text-[11px] text-mocha/40">
                      {reportUserName ? `${reportUserName} · ` : ""}
                      {formatDate(new Date())}
                    </p>
                  </div>
                  <button
                    onClick={printReport}
                    className="flex items-center gap-1 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-bold active:scale-95 transition-transform"
                  >
                    <span className="material-icons-round text-base">
                      download
                    </span>
                    Save / Print
                  </button>
                </div>

                <div className="text-center mb-2">
                  <h2 className="font-serif text-3xl text-primary leading-tight">
                    Your analysis is ready
                  </h2>
                </div>

                {photos.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {photos.map((p, i) => (
                      <img
                        key={p.url}
                        src={p.url}
                        alt={`Photo ${i + 1}`}
                        className="w-16 h-20 object-cover rounded-xl border border-primary/10"
                      />
                    ))}
                  </div>
                )}

                {intakeChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {intakeChips.map((c) => (
                      <span
                        key={c}
                        className="text-[10px] font-semibold text-mocha/60 bg-primary/5 px-2 py-0.5 rounded-full"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Headline: one overall number, then the type */}
                <div className="text-center py-2">
                  <SkinScoreGauge
                    score={computeSkinScore(detectedConcerns)}
                    caption={
                      detectedConcerns.length
                        ? `Based on ${detectedConcerns.length} concern${
                            detectedConcerns.length === 1 ? "" : "s"
                          } found in your photo`
                        : "No concerns flagged in your photo"
                    }
                  />

                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2 mt-6">
                    <span className="material-icons-round text-3xl text-primary">
                      {TYPE_ICONS[skinType.skin_type] || "spa"}
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold capitalize">
                    {skinType.skin_type}
                  </h2>
                  {typeof skinType.shine_percentile === "number" && (
                    <span className="inline-block mt-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                      Shine: {skinType.shine_percentile}th percentile
                    </span>
                  )}
                  {skinType.note && (
                    <p className="text-sm text-mocha/50 mt-1">
                      {skinType.note}
                    </p>
                  )}
                  {skinContext && (
                    <p className="text-xs text-mocha/40 italic mt-2 px-4">
                      Based on your answers: {skinContext}
                    </p>
                  )}
                </div>

                {/* How close the other skin types were */}
                {skinType.probs && Object.keys(skinType.probs).length > 1 && (
                  <div className="mt-4">
                    <SkinTypeSpread skinType={skinType} />
                  </div>
                )}

                {/* Where on the face each concern was found */}
                {detectedConcerns.length > 0 && (
                  <div className="mt-8">
                    <p className="text-xs uppercase tracking-widest text-mocha/50 font-semibold mb-3">
                      Where we found it
                    </p>
                    <FaceConcernMap concerns={detectedConcerns} />
                  </div>
                )}

                {/* Metrics */}
                {metrics?.ok && (
                  <div className="mt-4 space-y-4">
                    {metrics.tone && (
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-full border-4 border-white shadow-md shrink-0"
                          style={{ backgroundColor: metrics.tone.avg_hex }}
                        />
                        <div>
                          <p className="text-xs uppercase tracking-widest text-mocha/50 font-semibold">
                            Skin tone
                          </p>
                          <p className="font-bold text-mocha">
                            {TONE_LABELS[metrics.tone.category] ||
                              metrics.tone.category}
                            <span className="font-normal text-mocha/40 text-xs ml-2">
                              ITA {metrics.tone.ita_deg}°
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                    {metrics.redness && (
                      <ScoreBar
                        label="Redness"
                        value={metrics.redness.score_0_100}
                        icon="local_fire_department"
                      />
                    )}
                    {metrics.brightness && (
                      <ScoreBar
                        label="Brightness"
                        value={metrics.brightness.score_0_100}
                        icon="light_mode"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Concerns detected */}
              {concerns?.status === "ok" && (
                <div className="glass-card rounded-[1.75rem] p-6 sa-fade-up">
                  <h3 className="font-serif text-xl text-mocha mb-1 flex items-center gap-2">
                    <span className="material-icons-round text-primary">
                      search
                    </span>
                    Skin concerns
                  </h3>
                  <p className="text-[11px] text-mocha/40 mb-4">
                    {concerns.patches_analyzed
                      ? `From ${concerns.patches_analyzed} skin zones in your photo`
                      : "From your photo"}
                  </p>
                  {detectedConcerns.length === 0 ? (
                    <div className="flex items-center gap-3 text-sm text-mocha/70">
                      <span className="material-icons-round text-sage">
                        verified
                      </span>
                      No significant concerns detected — keep up your ritual!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {detectedConcerns.map((c) => (
                        <div key={c.concern}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="flex items-center gap-2 text-sm font-semibold text-mocha">
                              <span className="material-icons-round text-primary text-lg">
                                {CONCERN_ICONS[c.concern] || "spa"}
                              </span>
                              {CONCERN_LABELS[c.concern] || c.concern}
                            </span>
                            <span className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-bold text-mocha/50">
                                {Math.round(c.score_0_100)}/100
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  SEVERITY_STYLE[c.severity] ||
                                  "bg-primary/10 text-primary"
                                }`}
                              >
                                {c.severity}
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/70 transition-all duration-700"
                              style={{
                                width: `${Math.min(100, Math.max(4, c.score_0_100))}%`,
                              }}
                            />
                          </div>
                          {c.regions && c.regions.length > 0 && (
                            <p className="text-[10px] text-mocha/40 mt-1 capitalize">
                              {c.regions
                                .map((r) => r.replace(/_/g, " "))
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* What this scan does and doesn't look at. Without this, an
                    empty concern list reads as "nothing is wrong with my skin"
                    — but the model only knows seven cosmetic classes, so a mole
                    or a rash would come back just as silent. */}
                  <div className="mt-5 pt-4 border-t border-primary/10 flex gap-2.5">
                    <span className="material-icons-round text-base text-primary/50 shrink-0">
                      info
                    </span>
                    <p className="text-[11px] leading-relaxed text-mocha/50">
                      This scan looks for seven cosmetic concerns — acne,
                      blackheads, dark spots, pigmentation, pores, redness and
                      fine lines. It does{" "}
                      <span className="font-semibold text-mocha/70">not</span>{" "}
                      check for moles, rashes, or any medical skin condition.
                      Please see a dermatologist for those, or for anything that
                      is changing, painful or not settling.
                    </p>
                  </div>
                </div>
              )}

              {/* Did we get this right? — the only real-selfie labels we get.
                Signed-out scans aren't stored, so there's nothing to attach a
                verdict to and the prompt stays hidden. */}
              {reportId && detectedConcerns.length > 0 && (
                <ConcernFeedback
                  reportId={reportId}
                  concerns={detectedConcerns}
                />
              )}

              {/* Gemini home remedies — derived from the ML numbers */}
              {advice?.remedies?.groups &&
                advice.remedies.groups.length > 0 && (
                  <GeminiRemedies
                    groups={advice.remedies.groups}
                    summary={advice.remedies.summary}
                    seeDermatologist={advice.remedies.see_dermatologist}
                  />
                )}

              {/* Targeted Acne Plan — escalation block (acne moderate/significant) */}
              {acnePlan && (
                <div className="bg-gradient-to-b from-rose-50 to-cream border border-rose-200/60 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-icons-round text-rose-500">
                      medication
                    </span>
                    <h3 className="font-bold text-mocha">
                      Your Targeted Acne Plan
                    </h3>
                  </div>
                  <p className="text-[11px] text-mocha/50 mb-4">
                    {acnePlan.severity === "significant"
                      ? "Significant"
                      : "Moderate"}{" "}
                    acne — a simple day &amp; night routine to clear it.
                  </p>

                  <ol className="space-y-3 mb-4">
                    {acnePlan.steps.map((s, i) => (
                      <li key={s.step} className="flex gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-mocha">
                            {s.step}
                          </p>
                          <p className="text-sm text-primary font-medium">
                            {s.pick}
                          </p>
                          <p className="text-[11px] text-mocha/55">{s.note}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {acnePlan.actives.length > 0 && (
                    <div className="bg-white/60 rounded-xl p-3 mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-mocha/50 mb-2">
                        Actives that work for acne
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {acnePlan.actives.map((a) => (
                          <Link
                            key={a.name}
                            to={`/ingredients?q=${encodeURIComponent(a.ingredient)}`}
                            className="px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold active:scale-95 transition-transform"
                            title={a.how}
                          >
                            {a.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {acnePlan.seeDermatologist && (
                    <div className="flex gap-2 text-[12px] text-rose-700 bg-rose-100/70 rounded-xl p-3">
                      <span className="material-icons-round text-rose-500 text-base">
                        health_and_safety
                      </span>
                      <span>
                        Deep, painful or widespread breakouts respond best to a
                        dermatologist's care — worth booking a visit alongside
                        this routine.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendation groups with 3-tab remedies.
                Shown as the fallback when Gemini didn't return home remedies
                (e.g. the ML server has no Gemini key) so users always see picks. */}
              {!(
                advice?.remedies?.groups && advice.remedies.groups.length > 0
              ) &&
                recommendations.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-center pt-2">
                      <h3 className="text-xl font-bold text-mocha">
                        Recommended for you
                      </h3>
                      <p className="text-xs text-mocha/50 mt-1">
                        Ayurvedic rituals first — clinical actives only where
                        they help
                      </p>
                    </div>
                    {recommendations.map((group) => (
                      <RemedyGroupCard
                        key={group.key}
                        group={group}
                        sensitiveToActives={sensitiveToActives}
                      />
                    ))}
                  </div>
                )}

              {/* Advice */}
              {advice && (
                <>
                  <AdviceCard
                    title="What this means"
                    icon="psychology"
                    text={advice.explain}
                  />
                  <AdviceCard
                    title="Your routine"
                    icon="self_improvement"
                    text={advice.routine}
                  />
                  <AdviceCard
                    title="What to look for"
                    icon="eco"
                    text={advice.product}
                  />
                </>
              )}

              {/* Chat handoff (primary re-scan lives in the floating bar below) */}
              {CHAT_ENABLED && (
                <Link
                  to="/ai/chat"
                  state={{ report: chatReport }}
                  className="glass-card block text-center text-primary rounded-full p-4 font-semibold text-sm active:scale-[0.98] transition-transform"
                >
                  Questions about your results? Ask the botanical assistant →
                </Link>
              )}
            </div>
          )}

          <p className="text-[10px] text-center mt-10 opacity-40 uppercase tracking-widest px-8">
            Cosmetic guidance only — not a medical diagnosis. See a
            dermatologist for skin concerns.
          </p>
        </main>
      )}

      {/* Floating action bar — results only */}
      {result && !rejected && skinType && (
        // Sits above the mobile tab bar (Navigation is `lg:hidden`, so the
        // clearance is dropped on desktop) and clears the iOS home indicator
        // via the safe-area inset rather than a guessed padding value.
        <div
          className="fixed bottom-0 inset-x-0 z-40 bg-cream/60 backdrop-blur-2xl border-t border-white/40
                     px-4 sm:px-6 pt-3 sm:pt-4 mb-24 lg:mb-0"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto w-full max-w-md flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={printReport}
              className="glass-card flex-1 py-3 sm:py-3.5 text-primary rounded-full font-semibold uppercase tracking-widest text-[11px] sm:text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <span className="material-icons-round text-lg">download</span>
              Save / Print
            </button>
            {CHAT_ENABLED && (
              <Link
                to="/ai/chat"
                state={{ report: chatReport }}
                className="flex-1 py-3 sm:py-3.5 glass-card text-primary rounded-full font-semibold uppercase tracking-widest text-[11px] sm:text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <span className="material-icons-round text-lg">forum</span>
                Ask AI
              </Link>
            )}
            <button
              onClick={resetScan}
              className="flex-1 py-3 sm:py-3.5 bg-primary text-white rounded-full font-semibold uppercase tracking-widest text-[11px] sm:text-xs shadow-xl shadow-primary/25 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <span className="material-icons-round text-lg">refresh</span>
              Retake
            </button>
          </div>
        </div>
      )}

      {/* Live camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-black border border-white/10">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }} // mirror preview like a selfie
              />
              {/* Face guide */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-60 border-2 border-white/40 rounded-[50%]" />
              </div>
            </div>

            {cameraError ? (
              <div className="mt-4 bg-white/10 text-white/90 rounded-2xl p-4 text-sm text-center">
                {cameraError}
              </div>
            ) : (
              <p className="mt-4 text-center text-white/70 text-xs uppercase tracking-widest">
                Center your face · good, even light
              </p>
            )}

            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={closeCamera}
                className="px-5 py-3 rounded-2xl bg-white/10 text-white font-semibold active:scale-95 transition-transform"
              >
                Cancel
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-primary text-white font-bold shadow-lg active:scale-95 transition-transform"
                >
                  <span className="material-icons-round">camera</span>
                  Capture
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkinAnalysis;
