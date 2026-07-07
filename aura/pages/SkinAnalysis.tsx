import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  analyzeWithAdvice,
  SelfieAnalysis,
  SkinAdvice,
  CapOrderRef,
} from '../services/skinAnalysis';
import { buildRecommendations } from '../services/recommendations';
import { CONCERN_LABELS } from '../data/remedies';

const TYPE_ICONS: Record<string, string> = {
  dry: 'grain',
  oily: 'water_drop',
  normal: 'sentiment_satisfied',
  combination: 'contrast',
};

const TONE_LABELS: Record<string, string> = {
  very_light: 'Very Light',
  light: 'Light',
  intermediate: 'Intermediate',
  tan: 'Tan',
  brown: 'Brown',
  dark: 'Deep',
};

const ISSUE_HINTS: Record<string, string> = {
  'no face detected': 'Make sure your face is fully in frame.',
  'face too small': 'Move closer to the camera.',
  'image too blurry': 'Hold steady and retake in good light.',
  'too dark': 'Find brighter, even lighting.',
  'too bright': 'Avoid direct light on your face.',
};

const ScoreBar: React.FC<{ label: string; value: number; icon: string }> = ({
  label,
  value,
  icon,
}) => (
  <div className="flex items-center gap-3">
    <span className="material-icons-round text-primary text-xl w-7 text-center">{icon}</span>
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-mocha/70 uppercase tracking-wider">{label}</span>
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

const SEVERITY_STYLE: Record<string, string> = {
  mild: 'bg-amber-100 text-amber-700',
  moderate: 'bg-orange-100 text-orange-700',
  significant: 'bg-red-100 text-red-700',
};

const CONCERN_ICONS: Record<string, string> = {
  acne: 'coronavirus',
  blackheads: 'blur_on',
  dark_spots: 'brightness_4',
  pigmentation: 'gradient',
  pores: 'grain',
  redness: 'local_fire_department',
  wrinkles: 'waves',
  dark_circles: 'visibility',
};

/**
 * Persist the analysis locally so the rest of the app (and the next visit) can
 * use it. The SkinType / top SkinConcern profile sync is done server-side by the
 * backend proxy (/v1/skin/analyze) when the request carries a JWT.
 */
function persistAnalysis(analysis: SelfieAnalysis) {
  try {
    localStorage.setItem(
      'lastSkinAnalysis',
      JSON.stringify({ at: new Date().toISOString(), analysis })
    );
  } catch {
    /* storage full/blocked — non-fatal */
  }
}

const AdviceCard: React.FC<{ title: string; icon: string; text: string }> = ({
  title,
  icon,
  text,
}) => (
  <div className="bg-cream border border-primary/5 rounded-2xl p-5 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      <span className="material-icons-round text-primary">{icon}</span>
      <h3 className="font-bold text-mocha">{title}</h3>
    </div>
    <p className="text-sm leading-relaxed text-mocha/80 whitespace-pre-line">{text}</p>
  </div>
);

const SkinAnalysis: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SelfieAnalysis | null>(null);
  const [advice, setAdvice] = useState<SkinAdvice | null>(null);
  // On-chain settlement ref for this scan (present only when the backend has CAP on).
  const [capRef, setCapRef] = useState<CapOrderRef | null>(null);

  const pickFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setAdvice(null);
    setError(null);
    setPreview(URL.createObjectURL(f));
  };

  const runAnalysis = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAdvice(null);
    setCapRef(null);
    try {
      // The backend proxy handles the fallbacks: it returns { analysis, advice }
      // normally, or a bare analysis if the photo is quality-rejected or the ML
      // server has no Gemini key configured.
      const res = await analyzeWithAdvice(file);
      // `cap` (on-chain order ref) sits at the top level of either response shape.
      setCapRef((res as { cap?: CapOrderRef }).cap ?? null);
      if ('advice' in res) {
        setResult(res.analysis);
        setAdvice(res.advice);
        persistAnalysis(res.analysis);
      } else {
        setResult(res);
        if (res.status === 'ok') persistAnalysis(res);
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.detail ||
          'Could not reach the analysis service. Please try again in a moment.'
      );
    } finally {
      setLoading(false);
    }
  };

  const skinType = result?.skin_type;
  const metrics = result?.metrics;
  const rejected = result?.status === 'rejected';
  const concerns = result?.concerns;
  const detectedConcerns =
    concerns?.status === 'ok' ? concerns.detected ?? [] : [];
  const recommendations = useMemo(
    () => buildRecommendations(result),
    [result]
  );

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background-light relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background-light/80 backdrop-blur-md border-b border-primary/10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/ai" className="p-2 -ml-2 text-primary">
            <span className="material-icons-round">arrow_back_ios_new</span>
          </Link>
          <h1 className="text-sm font-bold tracking-widest uppercase text-mocha/60">
            Skin Analysis
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="flex-1 px-6 pt-24 pb-32 no-scrollbar">
        {/* Hero */}
        {!result && (
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <span className="material-icons-round text-4xl text-primary">face_retouching_natural</span>
            </div>
            <h2 className="text-3xl font-bold mb-3 tracking-tight">Know Your Skin</h2>
            <p className="text-mocha/60 leading-relaxed max-w-xs mx-auto font-newsreader italic text-lg">
              A clear selfie in natural light is all we need to read your skin type, tone and glow.
            </p>
          </div>
        )}

        {/* Upload / preview */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <div
          onClick={() => fileRef.current?.click()}
          className="relative mx-auto w-56 h-72 rounded-3xl overflow-hidden border-2 border-dashed border-primary/30 bg-cream flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
        >
          {preview ? (
            <img src={preview} alt="Your selfie" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center px-6">
              <span className="material-icons-round text-5xl text-primary/50">add_a_photo</span>
              <p className="text-xs text-mocha/50 mt-3 uppercase tracking-widest font-semibold">
                Tap to take or upload a selfie
              </p>
            </div>
          )}
          {preview && (
            <div className="absolute bottom-2 right-2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow">
              <span className="material-icons-round text-primary text-xl">edit</span>
            </div>
          )}
        </div>

        {/* Analyze button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={runAnalysis}
            disabled={!file || loading}
            className="px-8 py-3.5 bg-primary text-white rounded-2xl font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-icons-round animate-spin text-xl">progress_activity</span>
                Reading your skin…
              </>
            ) : (
              <>
                <span className="material-icons-round text-xl">auto_awesome</span>
                Analyze my skin
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm flex gap-2">
            <span className="material-icons-round text-red-400">error_outline</span>
            <span>{error}</span>
          </div>
        )}

        {/* Quality rejection */}
        {rejected && (
          <div className="mt-8 bg-cream border border-primary/10 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-icons-round text-amber-500">photo_camera</span>
              <h3 className="font-bold text-mocha">Let's retake that one</h3>
            </div>
            <ul className="space-y-2">
              {result?.quality.issues.map((issue) => (
                <li key={issue} className="text-sm text-mocha/70 flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <span className="capitalize font-medium">{issue}</span>
                    {ISSUE_HINTS[issue] ? ` — ${ISSUE_HINTS[issue]}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Results */}
        {result && !rejected && skinType && (
          <div className="mt-10 space-y-5">
            {/* On-chain settlement badge — shown only when the scan opened a CAP order */}
            {capRef && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5">
                <span className="material-icons-round text-base text-primary">verified</span>
                <p className="text-xs text-mocha/70">
                  Settled on Base via CROO ·{' '}
                  <span className="font-mono text-mocha/50">
                    {capRef.negotiationId.slice(0, 10)}…
                  </span>
                </p>
              </div>
            )}
            {/* Skin type */}
            <div className="bg-cream border border-primary/5 rounded-2xl p-6 shadow-sm text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                <span className="material-icons-round text-3xl text-primary">
                  {TYPE_ICONS[skinType.skin_type] || 'spa'}
                </span>
              </div>
              <p className="text-xs uppercase tracking-widest text-mocha/50 font-semibold mb-1">
                Your skin type
              </p>
              <h2 className="text-3xl font-bold capitalize mb-1">{skinType.skin_type}</h2>
              <p className="text-sm text-mocha/50 mb-5">
                {Math.round(skinType.confidence * 100)}% confidence
              </p>
              <div className="space-y-2.5 text-left">
                {Object.entries(skinType.probs).map(([label, p]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs capitalize w-24 text-mocha/60 font-medium">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-primary/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${p * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-mocha/40 w-8 text-right">
                      {Math.round(p * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Measurements */}
            {metrics?.ok && (
              <div className="bg-cream border border-primary/5 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-mocha mb-4 flex items-center gap-2">
                  <span className="material-icons-round text-primary">tune</span>
                  Measured from your photo
                </h3>
                {metrics.tone && (
                  <div className="flex items-center gap-4 mb-5">
                    <div
                      className="w-12 h-12 rounded-full border-4 border-white shadow-md shrink-0"
                      style={{ backgroundColor: metrics.tone.avg_hex }}
                    />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-mocha/50 font-semibold">
                        Skin tone
                      </p>
                      <p className="font-bold text-mocha">
                        {TONE_LABELS[metrics.tone.category] || metrics.tone.category}
                        <span className="font-normal text-mocha/40 text-xs ml-2">
                          ITA {metrics.tone.ita_deg}°
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {metrics.redness && (
                    <ScoreBar label="Redness" value={metrics.redness.score_0_100} icon="local_fire_department" />
                  )}
                  {metrics.brightness && (
                    <ScoreBar label="Brightness" value={metrics.brightness.score_0_100} icon="light_mode" />
                  )}
                </div>
              </div>
            )}

            {/* Concerns detected by the concern model */}
            {concerns?.status === 'ok' && (
              <div className="bg-cream border border-primary/5 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-mocha mb-1 flex items-center gap-2">
                  <span className="material-icons-round text-primary">search</span>
                  Skin concerns
                </h3>
                <p className="text-[11px] text-mocha/40 mb-4">
                  {concerns.patches_analyzed
                    ? `From ${concerns.patches_analyzed} skin zones in your photo`
                    : 'From your photo'}
                </p>
                {detectedConcerns.length === 0 ? (
                  <div className="flex items-center gap-3 text-sm text-mocha/70">
                    <span className="material-icons-round text-green-500">verified</span>
                    No significant concerns detected — keep up your ritual!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {detectedConcerns.map((c) => (
                      <div key={c.concern}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-2 text-sm font-semibold text-mocha">
                            <span className="material-icons-round text-primary text-lg">
                              {CONCERN_ICONS[c.concern] || 'spa'}
                            </span>
                            {CONCERN_LABELS[c.concern] || c.concern}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              SEVERITY_STYLE[c.severity] || 'bg-primary/10 text-primary'
                            }`}
                          >
                            {c.severity}
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
                            {c.regions.map((r) => r.replace(/_/g, ' ')).join(' · ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Result-driven recommendations: home remedies + organic products */}
            {recommendations.length > 0 && (
              <div className="space-y-4">
                <div className="text-center pt-2">
                  <h3 className="text-xl font-bold text-mocha">Recommended for you</h3>
                  <p className="text-xs text-mocha/50 mt-1">
                    Home remedies & organic care, matched to your results
                  </p>
                </div>
                {recommendations.map((group) => (
                  <div
                    key={group.key}
                    className="bg-cream border border-primary/5 rounded-2xl p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-mocha">{group.title}</h4>
                      {group.severity && (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                            SEVERITY_STYLE[group.severity] || ''
                          }`}
                        >
                          {group.severity}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-mocha/45 mb-4">{group.reason}</p>

                    <p className="text-[10px] font-bold uppercase tracking-widest text-mocha/50 mb-2 flex items-center gap-1.5">
                      <span className="material-icons-round text-primary text-sm">cottage</span>
                      Home remedies
                    </p>
                    <ul className="space-y-3 mb-4">
                      {group.remedies.map((r) => (
                        <li key={r.name} className="text-sm">
                          <span className="font-semibold text-mocha">{r.name}</span>
                          {r.frequency && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full">
                              {r.frequency}
                            </span>
                          )}
                          <p className="text-mocha/60 leading-relaxed mt-0.5">{r.how}</p>
                        </li>
                      ))}
                    </ul>

                    {group.products.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-mocha/50 mb-2 flex items-center gap-1.5">
                          <span className="material-icons-round text-primary text-sm">eco</span>
                          Organic picks
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.products.map((p) => (
                            <Link
                              key={p.name}
                              to={`/ingredients?q=${encodeURIComponent(p.query || p.name)}`}
                              title={p.why}
                              className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold active:scale-95 transition-transform flex items-center gap-1"
                            >
                              <span className="material-icons-round text-sm">spa</span>
                              {p.name}
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Advice */}
            {advice && (
              <>
                <AdviceCard title="What this means" icon="psychology" text={advice.explain} />
                <AdviceCard title="Your routine" icon="self_improvement" text={advice.routine} />
                <AdviceCard title="What to look for" icon="eco" text={advice.product} />
              </>
            )}

            {/* Chat handoff */}
            <Link
              to="/ai"
              className="block text-center bg-primary/10 text-primary rounded-2xl p-4 font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              Questions about your results? Ask the botanical assistant →
            </Link>
          </div>
        )}

        <p className="text-[10px] text-center mt-10 opacity-40 uppercase tracking-widest px-8">
          Cosmetic guidance only — not a medical diagnosis. See a dermatologist for skin concerns.
        </p>
      </main>
    </div>
  );
};

export default SkinAnalysis;
