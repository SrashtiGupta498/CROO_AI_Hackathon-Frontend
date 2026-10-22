import React from "react";
import { useDaily } from "../../hooks/useDailyData";
import { PALETTE, MOODS } from "./shared";

const Notes: React.FC = () => {
  const { day, setNotes } = useDaily();
  return (
    <section className="daily-layout-card rounded-[26px] p-6 md:p-8 bg-white shadow-card-sm">
      <h3 className="font-serif text-2xl font-bold mb-5 text-ink">Daily Notes</h3>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest" style={{ color: PALETTE.custom.ink }}>Mood Today</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {MOODS.map((m) => (
              <button key={m} onClick={() => setNotes({ mood: m })}
                className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition-transform ${day.notes.mood === m ? "scale-[1.12]" : ""}`}
                style={{ backgroundColor: day.notes.mood === m ? PALETTE.custom.chip : PALETTE.custom.soft }}>{m}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: PALETTE.custom.ink }}>Skin</label>
            <input value={day.notes.skin} placeholder="Glowy, dry…" onChange={(e) => setNotes({ skin: e.target.value })}
              className="mt-2 w-full px-3 py-2 rounded-xl text-sm outline-none bg-paper-2 text-ink" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: PALETTE.custom.ink }}>Hair</label>
            <input value={day.notes.hair} placeholder="Soft, frizzy…" onChange={(e) => setNotes({ hair: e.target.value })}
              className="mt-2 w-full px-3 py-2 rounded-xl text-sm outline-none bg-paper-2 text-ink" />
          </div>
        </div>
      </div>
      <textarea value={day.notes.text} rows={8} placeholder="Dear journal…" onChange={(e) => setNotes({ text: e.target.value })}
        className="font-serif italic mt-5 w-full px-4 py-3 rounded-2xl text-lg outline-none resize-none leading-relaxed bg-paper text-ink"
        style={{ border: `1px solid ${PALETTE.custom.chip}` }} />
      <p className="text-[11px] mt-2 flex items-center gap-1 text-muted">
        <span className="material-icons-round text-sm">cloud_done</span> Auto-saved to this day
      </p>
    </section>
  );
};

export default Notes;
