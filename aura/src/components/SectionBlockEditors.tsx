/* ============================================================
   SectionBlockEditors — admin editing UI for the recipe /
   reference section types (ingredients, instructions, reel).

   Split out of ArticleEditor.tsx, which is already ~2400 lines.
   The simple body-only blocks (benefits, tip, warning, notes,
   faq, source) reuse the editor's own RichTextEditor and stay
   inline there; only the structured ones live here.
   ============================================================ */

import React, { useEffect, useMemo, useState } from "react";
import { Plus, X, GripVertical, Play } from "lucide-react";
import API from "../services/api";
import "./SectionBlockEditors.css";

export interface SectionItem {
  name?: string;
  amount?: string;
  note?: string;
}

/* ─── Ingredients: repeatable name / amount rows ───────────── */

export const IngredientsEditor: React.FC<{
  items: SectionItem[];
  onChange: (items: SectionItem[]) => void;
}> = ({ items, onChange }) => {
  const rows = items.length ? items : [{ name: "", amount: "" }];

  const setRow = (idx: number, patch: Partial<SectionItem>) =>
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRow = () => onChange([...rows, { name: "", amount: "" }]);
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="sbe">
      <div className="sbe-row sbe-row-head">
        <span className="sbe-col-name">Ingredient</span>
        <span className="sbe-col-amount">Amount</span>
        <span className="sbe-col-action" />
      </div>

      {rows.map((row, i) => (
        <div className="sbe-row" key={i}>
          <input
            className="sbe-input sbe-col-name"
            value={row.name || ""}
            placeholder="e.g. Rose water"
            onChange={(e) => setRow(i, { name: e.target.value })}
            aria-label={`Ingredient ${i + 1} name`}
          />
          <input
            className="sbe-input sbe-col-amount"
            value={row.amount || ""}
            placeholder="2 tbsp"
            onChange={(e) => setRow(i, { amount: e.target.value })}
            aria-label={`Ingredient ${i + 1} amount`}
          />
          <button
            type="button"
            className="sbe-icon-btn sbe-col-action"
            onClick={() => removeRow(i)}
            disabled={rows.length === 1}
            aria-label={`Remove ingredient ${i + 1}`}
            title="Remove"
          >
            <X size={15} />
          </button>
        </div>
      ))}

      <button type="button" className="sbe-add" onClick={addRow}>
        <Plus size={15} /> Add ingredient
      </button>
    </div>
  );
};

/* ─── Instructions: ordered step list ──────────────────────── */

export const InstructionsEditor: React.FC<{
  steps: string[];
  onChange: (steps: string[]) => void;
}> = ({ steps, onChange }) => {
  const rows = steps.length ? steps : [""];
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const setStep = (idx: number, value: string) =>
    onChange(rows.map((s, i) => (i === idx ? value : s)));

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="sbe">
      {rows.map((step, i) => (
        <div
          className="sbe-step"
          key={i}
          draggable
          onDragStart={() => setDragFrom(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragFrom !== null) move(dragFrom, i);
            setDragFrom(null);
          }}
        >
          <span className="sbe-grip" aria-hidden>
            <GripVertical size={14} />
          </span>
          <span className="sbe-step-num">{i + 1}</span>
          <textarea
            className="sbe-input sbe-textarea"
            value={step}
            rows={2}
            placeholder={`Step ${i + 1}…`}
            onChange={(e) => setStep(i, e.target.value)}
            aria-label={`Step ${i + 1}`}
          />
          {/* Keyboard-accessible reordering — drag alone would strand
              keyboard-only admins. */}
          <div className="sbe-step-moves">
            <button
              type="button"
              className="sbe-icon-btn"
              onClick={() => move(i, i - 1)}
              disabled={i === 0}
              aria-label={`Move step ${i + 1} up`}
            >
              ↑
            </button>
            <button
              type="button"
              className="sbe-icon-btn"
              onClick={() => move(i, i + 1)}
              disabled={i === rows.length - 1}
              aria-label={`Move step ${i + 1} down`}
            >
              ↓
            </button>
            <button
              type="button"
              className="sbe-icon-btn"
              onClick={() => onChange(rows.filter((_, x) => x !== i))}
              disabled={rows.length === 1}
              aria-label={`Remove step ${i + 1}`}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="sbe-add"
        onClick={() => onChange([...rows, ""])}
      >
        <Plus size={15} /> Add step
      </button>
    </div>
  );
};

/* ─── Reel picker: choose an existing reel post ────────────── */

interface ReelOption {
  id: string;
  title: string;
  src?: string;
}

export const ReelPicker: React.FC<{
  reelId?: string;
  caption?: string;
  onChange: (patch: { reelId?: string; caption?: string }) => void;
}> = ({ reelId, caption, onChange }) => {
  const [reels, setReels] = useState<ReelOption[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    API.get("/posts/reels?limit=100")
      .then((res) => {
        if (cancelled) return;
        const raw = res.data?.docs || res.data?.data || res.data || [];
        setReels(
          (Array.isArray(raw) ? raw : []).map((r: any) => ({
            id: r._id || r.id,
            title: r.title || "Untitled reel",
            /* The video lives in a `video` section, not on the post. */
            src:
              r.sections?.find(
                (s: any) => s.type === "video" || s.type === "reel",
              )?.videoUrl || r.thumbnailUrl,
          })),
        );
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => reels.find((r) => r.id === reelId),
    [reels, reelId],
  );

  if (status === "loading") return <p className="sbe-hint">Loading reels…</p>;
  if (status === "error")
    return (
      <p className="sbe-hint sbe-hint-error">
        Couldn’t load reels. Check the backend is running.
      </p>
    );
  if (!reels.length)
    return (
      <p className="sbe-hint">
        No reels published yet. Create a post with type <code>reel</code> first.
      </p>
    );

  return (
    <div className="sbe">
      <label className="sbe-label" htmlFor="sbe-reel-select">
        Which reel?
      </label>
      <select
        id="sbe-reel-select"
        className="sbe-input"
        value={reelId || ""}
        onChange={(e) => onChange({ reelId: e.target.value || undefined })}
      >
        <option value="">— Select a reel —</option>
        {reels.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </select>

      {selected?.src && (
        <div className="sbe-reel-preview">
          <video src={selected.src} muted playsInline preload="metadata" />
          <span className="sbe-reel-play" aria-hidden>
            <Play size={16} fill="currentColor" />
          </span>
        </div>
      )}

      <label className="sbe-label" htmlFor="sbe-reel-caption">
        Caption <span className="sbe-optional">(optional)</span>
      </label>
      <input
        id="sbe-reel-caption"
        className="sbe-input"
        value={caption || ""}
        placeholder="Watch how it comes together"
        onChange={(e) => onChange({ caption: e.target.value })}
      />
    </div>
  );
};
