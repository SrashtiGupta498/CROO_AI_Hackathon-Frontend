import { useState } from "react";

import { CONCERN_LABELS } from "../data/remedies";
import {
  submitReportFeedback,
  type ConcernVerdict,
} from "../services/skinFeedback";

/**
 * "Did we get this right?" — one verdict per concern the scan reported.
 *
 * This is the only place AURA learns anything from a real selfie. The models
 * were trained on stock/derm photos, so the open question is how often a
 * reported concern isn't actually on the user's face. Every 'no' here is one
 * measured false alarm; nothing else in the app can produce that number.
 *
 * No photo is involved — only the verdicts are sent.
 */

const VERDICTS: { value: ConcernVerdict; label: string; icon: string }[] = [
  { value: "yes", label: "Yes", icon: "thumb_up" },
  { value: "no", label: "No", icon: "thumb_down" },
  { value: "unsure", label: "Can't tell", icon: "help_outline" },
];

interface Props {
  /** Backend report id. The caller only renders this when it exists. */
  reportId: string;
  /** The concerns the scan actually reported, in display order. */
  concerns: { concern: string }[];
}

export default function ConcernFeedback({ reportId, concerns }: Props) {
  const [verdicts, setVerdicts] = useState<Record<string, ConcernVerdict>>({});
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answered = Object.keys(verdicts).length;

  const submit = async () => {
    if (!answered || saving) return;
    setSaving(true);
    setError(null);
    try {
      await submitReportFeedback(reportId, {
        concerns: Object.entries(verdicts).map(([concern, verdict]) => ({
          concern,
          verdict,
        })),
        note: note.trim() || undefined,
      });
      setDone(true);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          "Could not save your feedback. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="glass-card rounded-[1.75rem] p-6 sa-fade-up">
        <div className="flex items-center gap-3">
          <span className="material-icons-round text-sage">verified</span>
          <div>
            <p className="text-sm font-semibold text-mocha">
              Thank you — this genuinely helps.
            </p>
            <p className="text-[11px] text-mocha/50 mt-0.5">
              Your answers tell us where the scan is wrong so we can fix it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-[1.75rem] p-6 sa-fade-up">
      <h3 className="font-serif text-xl text-mocha mb-1 flex items-center gap-2">
        <span className="material-icons-round text-primary">rate_review</span>
        Did we get this right?
      </h3>
      <p className="text-[11px] text-mocha/40 mb-4">
        Looking in a mirror, can you actually see each of these? Honest answers
        help more than kind ones — and your photo is never stored.
      </p>

      <div className="space-y-3">
        {concerns.map((c) => (
          <div
            key={c.concern}
            className="flex items-center justify-between gap-3 flex-wrap"
          >
            <span className="text-sm font-semibold text-mocha">
              {CONCERN_LABELS[c.concern] || c.concern}
            </span>
            <div className="flex gap-1.5 shrink-0">
              {VERDICTS.map((v) => {
                const active = verdicts[c.concern] === v.value;
                return (
                  <button
                    key={v.value}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${CONCERN_LABELS[c.concern] || c.concern}: ${v.label}`}
                    onClick={() =>
                      setVerdicts((prev) => ({ ...prev, [c.concern]: v.value }))
                    }
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-primary text-white border-primary"
                        : "bg-transparent text-mocha/60 border-primary/20 hover:border-primary/50"
                    }`}
                  >
                    <span className="material-icons-round text-[14px]">
                      {v.icon}
                    </span>
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* A concern we never reported is a different kind of error than a false
          alarm — the backend counts it separately, so it's worth asking for. */}
      <div className="mt-4 pt-4 border-t border-primary/10">
        {showNote ? (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Anything the scan missed completely?"
            className="w-full text-sm text-mocha bg-transparent border border-primary/20 rounded-xl p-3 placeholder:text-mocha/30 focus:outline-none focus:border-primary/50"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            + Did we miss something?
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-500 mt-3" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!answered || saving}
        className="mt-4 w-full rounded-full bg-primary text-white text-sm font-semibold py-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {saving
          ? "Sending…"
          : answered
            ? `Send feedback (${answered}/${concerns.length})`
            : "Rate at least one to send"}
      </button>
    </div>
  );
}
