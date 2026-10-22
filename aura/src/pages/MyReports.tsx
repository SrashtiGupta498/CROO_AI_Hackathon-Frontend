import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { formatDateTime } from "../utils/datetime";
import { RootState } from "../store/store";
import {
  fetchMyReports,
  downloadUserReportsPdf,
  SkinReport,
} from "../services/skinReports";
import {
  fetchMyRemedyUsage,
  MyRemedyUsage,
} from "../services/remedyUsage";
import { CONCERN_LABELS } from "../data/remedies";
import { describeError } from "../services/errorMessage";

const TYPE_ICONS: Record<string, string> = {
  dry: "grain",
  oily: "water_drop",
  normal: "sentiment_satisfied",
  combination: "contrast",
};

const fmtDateTime = (iso?: string) => formatDateTime(iso);

/** A signed-in user's own AI skin-analysis history, newest first. */
const MyReports = () => {
  const { currentUser } = useSelector((state: RootState) => state.user);
  const userId = currentUser?.id || currentUser?._id;

  const [reports, setReports] = useState<SkinReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [usage, setUsage] = useState<MyRemedyUsage | null>(null);

  // Personal remedy-usage rollup (best-effort — optional panel).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchMyRemedyUsage();
        if (alive) setUsage(data);
      } catch {
        /* optional; ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMyReports(1, 50);
        if (!alive) return;
        setReports(data.items || []);
        setTotal(data.total || 0);
      } catch (e: any) {
        if (!alive) return;
        setError(
          describeError(
            e,
            "Couldn't load your reports. Please sign in and try again.",
          ),
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Prefer the id from the reports themselves; fall back to the session id.
  const pdfUserId = useMemo(
    () => reports[0]?.userId || userId,
    [reports, userId]
  );

  const onDownload = async () => {
    if (!pdfUserId) return;
    setDownloading(true);
    try {
      await downloadUserReportsPdf(String(pdfUserId));
    } catch (e: any) {
      setError(describeError(e, "Couldn't download your PDF."));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-background-light relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background-light/80 backdrop-blur-md border-b border-primary/10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/profile" className="p-2 -ml-2 text-primary">
            <span className="material-icons-round">arrow_back_ios_new</span>
          </Link>
          <h1 className="text-sm font-bold tracking-widest uppercase text-mocha/60">
            My Reports
          </h1>
          <button
            onClick={onDownload}
            disabled={downloading || reports.length === 0}
            className="p-2 -mr-2 text-primary disabled:opacity-30"
            title="Download all my reports as PDF"
          >
            <span
              className={`material-icons-round ${
                downloading ? "animate-spin" : ""
              }`}
            >
              {downloading ? "progress_activity" : "download"}
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 pt-24 pb-32 no-scrollbar">
        {loading ? (
          <div className="text-center py-20 text-mocha/50">
            <span className="material-icons-round animate-spin text-3xl">
              progress_activity
            </span>
            <p className="mt-2">Loading your reports…</p>
          </div>
        ) : error ? (
          <div className="mt-6 bg-[#b4413c]/8 border border-[#b4413c]/20 text-[#8f322e] rounded-2xl p-4 text-sm flex gap-2">
            <span className="material-icons-round text-[#b4413c]">
              error_outline
            </span>
            <span>{error}</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-5">
              <span className="material-icons-round text-4xl text-primary">
                history
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-2">No reports yet</h2>
            <p className="text-mocha/60 mb-6">
              Run a skin analysis and it'll be saved here.
            </p>
            <Link
              to="/ai/analysis"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-semibold shadow-lg active:scale-95 transition-transform"
            >
              <span className="material-icons-round">auto_awesome</span>
              Analyze my skin
            </Link>
          </div>
        ) : (
          <>
            {/* Remedies you've used */}
            {usage && usage.remedies.length > 0 && (
              <div className="mb-6 bg-cream border border-primary/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-mocha flex items-center gap-2">
                    <span className="material-icons-round text-primary">spa</span>
                    Remedies you've used
                  </h3>
                  <span className="text-[11px] text-mocha/40 font-semibold">
                    {usage.total} total
                  </span>
                </div>
                <div className="space-y-2">
                  {usage.remedies.slice(0, 8).map((r) => (
                    <div
                      key={r.remedyName}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-sm text-mocha/80 truncate">
                        {r.remedyName}
                        {r.target && (
                          <span className="text-[11px] text-mocha/40 ml-2 capitalize">
                            · {r.target}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        ×{r.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-xs uppercase tracking-widest text-mocha/40 font-semibold mb-5">
              {total} {total === 1 ? "report" : "reports"}
            </p>
            <div className="space-y-4">
              {reports.map((r) => {
                const detected = r.analysis?.concerns?.detected ?? [];
                return (
                  <div
                    key={r._id}
                    className="bg-cream border border-primary/5 rounded-2xl p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary/10">
                          <span className="material-icons-round text-2xl text-primary">
                            {TYPE_ICONS[r.skinType || ""] || "spa"}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-mocha capitalize">
                            {r.skinType || "Analysis"}
                          </p>
                          <p className="text-[11px] text-mocha/40">
                            {fmtDateTime(r.createdAt)}
                          </p>
                        </div>
                      </div>
                      {r.topConcern && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {CONCERN_LABELS[r.topConcern] || r.topConcern}
                        </span>
                      )}
                    </div>

                    {detected.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {detected.map((c) => (
                          <span
                            key={c.concern}
                            className="text-[11px] font-semibold text-mocha/70 bg-primary/5 px-2 py-0.5 rounded-full"
                          >
                            {CONCERN_LABELS[c.concern] || c.concern}
                            {c.severity ? ` · ${c.severity}` : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    {r.advice?.explain && (
                      <p className="text-sm text-mocha/70 leading-relaxed mt-3 line-clamp-3">
                        {r.advice.explain}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={onDownload}
              disabled={downloading}
              className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-40"
            >
              <span
                className={`material-icons-round ${
                  downloading ? "animate-spin" : ""
                }`}
              >
                {downloading ? "progress_activity" : "picture_as_pdf"}
              </span>
              {downloading ? "Preparing…" : "Download all as PDF"}
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default MyReports;
