import React from "react";
import { useDaily } from "./useDailyData";
import { PALETTE, MOODS } from "./shared";

const Notes: React.FC = () => {
  const { day, setNotes } = useDaily();
  return (
    <section className="br-card rounded-[26px] p-6 md:p-8" style={{ backgroundColor: "#fff", boxShadow: "0 8px 30px rgba(192,90,120,0.08)" }}>
      <h3 className="serif text-2xl font-bold mb-5" style={{ color: "#4a3340" }}>Daily Notes</h3>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest" style={{ color: PALETTE.custom.ink }}>Mood Today</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {MOODS.map((m) => (
              <button key={m} onClick={() => setNotes({ mood: m })}
                className="w-10 h-10 rounded-full text-xl flex items-center justify-center transition-transform"
                style={{ backgroundColor: day.notes.mood === m ? PALETTE.custom.chip : "#FBEAEE", transform: day.notes.mood === m ? "scale(1.12)" : "none" }}>{m}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: PALETTE.custom.ink }}>Skin</label>
            <input value={day.notes.skin} placeholder="Glowy, dry…" onChange={(e) => setNotes({ skin: e.target.value })}
              className="mt-2 w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ backgroundColor: "#FBEAEE", color: "#5b4650" }} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: PALETTE.custom.ink }}>Hair</label>
            <input value={day.notes.hair} placeholder="Soft, frizzy…" onChange={(e) => setNotes({ hair: e.target.value })}
              className="mt-2 w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ backgroundColor: "#FBEAEE", color: "#5b4650" }} />
          </div>
        </div>
      </div>
      <textarea value={day.notes.text} rows={8} placeholder="Dear journal…" onChange={(e) => setNotes({ text: e.target.value })}
        className="script mt-5 w-full px-4 py-3 rounded-2xl text-lg outline-none resize-none leading-relaxed"
        style={{ backgroundColor: "#FFF9F7", color: "#5b4650", border: `1px solid ${PALETTE.custom.chip}` }} />
      <p className="text-[11px] mt-2 flex items-center gap-1" style={{ color: "#a594a0" }}>
        <span className="material-icons-round text-sm">cloud_done</span> Auto-saved to this day
      </p>
    </section>
  );
};

export default Notes;
