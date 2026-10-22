import React, { useRef, useState } from "react";
import { useDaily } from "../../hooks/useDailyData";
import { PALETTE } from "./shared";
import "./Today.css";

const Today: React.FC = () => {
  const {
    day, total, done, pct, streak,
    toggleTask, addTask, editTask, deleteTask, deleteSection, addSection, renameSection,
    reorderTask, copyYesterday, resetDay,
  } = useDaily();

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const dragItem = useRef<{ sec: string; idx: number } | null>(null);
  const ring = 2 * Math.PI * 52;

  return (
    <>
      {/* Daily progress card */}
      <section className="daily-layout-card daily-today-progress-card rounded-[28px] p-6 md:p-8 flex flex-col sm:flex-row items-center gap-7">
        <div className="relative flex-none">
          <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r="52" fill="none" stroke="#ffffff" strokeWidth="12" opacity="0.6" />
            <circle cx="64" cy="64" r="52" fill="none" stroke={PALETTE.custom.ink} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={ring} strokeDashoffset={ring - (pct / 100) * ring}
              className="daily-today-ring" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-serif text-3xl font-bold text-ink">{pct}%</span>
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: PALETTE.custom.ink }}>done</span>
          </div>
        </div>
        <div className="flex-1 w-full text-center sm:text-left">
          <h2 className="font-serif text-2xl font-bold mb-1 text-ink">
            {pct === 100 ? "You glowed today ✨" : pct >= 50 ? "Keep glowing 💗" : "Let's begin your ritual"}
          </h2>
          <p className="text-sm mb-4 text-muted">{done} / {total} tasks completed · {streak} day streak</p>
          <div className="h-3 rounded-full overflow-hidden bg-white">
            <div className="h-full rounded-full daily-today-bar" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${PALETTE.custom.ink}, ${PALETTE.night.ink})` }} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
            <button onClick={copyYesterday} className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-white" style={{ color: PALETTE.custom.ink }}>
              <span className="material-icons-round text-sm">content_copy</span> Copy yesterday
            </button>
            <button onClick={resetDay} className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-white text-muted">
              <span className="material-icons-round text-sm">refresh</span> Reset day
            </button>
          </div>
        </div>
      </section>

      {/* Routine sections */}
      <div className="mt-8 grid md:grid-cols-2 gap-5">
        {day.sections.map((sec, sIdx) => {
          const c = PALETTE[sec.color];
          const secDone = sec.tasks.filter((t) => t.done).length;
          return (
            <section key={sec.id} className="daily-layout-card rounded-[26px] p-6"
              style={{ animationDelay: `${sIdx * 60}ms`, backgroundColor: c.soft, boxShadow: `0 8px 30px ${c.glow}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-none" style={{ backgroundColor: c.chip, color: c.ink }}>
                    <span className="material-icons-round text-xl">{sec.icon}</span>
                  </div>
                  <input value={sec.title} onChange={(e) => renameSection(sec.id, e.target.value)}
                    className="font-serif text-xl font-bold bg-transparent outline-none w-full truncate" style={{ color: c.ink }} />
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: c.chip, color: c.ink }}>{secDone}/{sec.tasks.length}</span>
                  <button onClick={() => deleteSection(sec.id)} title="Delete ritual" className="w-7 h-7 rounded-full flex items-center justify-center opacity-50 hover:opacity-100" style={{ color: c.ink }}>
                    <span className="material-icons-round text-base">delete_outline</span>
                  </button>
                </div>
              </div>

              <ul className="space-y-2">
                {sec.tasks.map((t, idx) => (
                  <li key={t.id} draggable
                    onDragStart={() => (dragItem.current = { sec: sec.id, idx })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { const f = dragItem.current; dragItem.current = null; if (f && f.sec === sec.id) reorderTask(sec.id, f.idx, idx); }}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${t.done ? "bg-white" : "bg-[rgba(255,255,255,0.55)]"}`}
                    style={{ boxShadow: t.done ? `0 0 0 2px ${c.chip}` : "none" }}>
                    <span className="material-icons-round text-base cursor-grab opacity-0 group-hover:opacity-40 flex-none" style={{ color: c.ink }}>drag_indicator</span>
                    <button onClick={() => toggleTask(sec.id, t.id)} className={`flex-none w-6 h-6 rounded-full flex items-center justify-center ${t.done ? "text-white" : "text-transparent"}`}
                      style={t.done ? { backgroundColor: c.ink } : { border: `2px solid ${c.chip}` }}>
                      <span className={`material-icons-round text-sm ${t.done ? "daily-layout-heart" : ""}`}>favorite</span>
                    </button>
                    {editing === t.id ? (
                      <input autoFocus value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => { editTask(sec.id, t.id, draft); setEditing(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { editTask(sec.id, t.id, draft); setEditing(null); } }}
                        className="flex-1 bg-transparent outline-none text-sm font-medium border-b text-ink" style={{ borderColor: c.chip }} />
                    ) : (
                      <span className={`flex-1 text-sm font-medium ${t.done ? "line-through text-muted" : "text-ink"}`}>{t.label}</span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-none">
                      <button onClick={() => { setEditing(t.id); setDraft(t.label); }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ color: c.ink }}>
                        <span className="material-icons-round text-sm">edit</span>
                      </button>
                      <button onClick={() => deleteTask(sec.id, t.id)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ color: c.ink }}>
                        <span className="material-icons-round text-sm">close</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {adding === sec.id ? (
                <div className="mt-3 flex items-center gap-2">
                  <input autoFocus value={draft} placeholder="New task…"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { addTask(sec.id, draft); setDraft(""); } if (e.key === "Escape") setAdding(null); }}
                    className="flex-1 text-sm px-3 py-2 rounded-xl outline-none bg-white text-ink" />
                  <button onClick={() => { addTask(sec.id, draft); setDraft(""); }} className="px-3 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: c.ink }}>Add</button>
                  <button onClick={() => { setAdding(null); setDraft(""); }} className="px-3 py-2 rounded-xl text-sm font-bold" style={{ color: c.ink }}>Done</button>
                </div>
              ) : (
                <button onClick={() => { setAdding(sec.id); setDraft(""); }} className="mt-3 flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl w-full justify-center bg-[rgba(255,255,255,0.6)]" style={{ color: c.ink }}>
                  <span className="material-icons-round text-base">add</span> Add Task
                </button>
              )}
            </section>
          );
        })}

        <button onClick={addSection} className="daily-layout-card rounded-[26px] p-6 flex flex-col items-center justify-center gap-2 min-h-[120px] border-2 border-dashed"
          style={{ borderColor: PALETTE.custom.chip, color: PALETTE.custom.ink, backgroundColor: PALETTE.custom.soft }}>
          <span className="material-icons-round text-3xl">add_circle_outline</span>
          <span className="font-bold">Create Custom Ritual</span>
        </button>
      </div>
    </>
  );
};

export default Today;
