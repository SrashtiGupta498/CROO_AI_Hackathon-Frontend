import React from "react";
import { useDaily } from "./useDailyData";
import { PALETTE } from "./shared";

const Progress: React.FC = () => {
  const { day, pct, streak, completedDays, habits, tKey } = useDaily();

  const badges = [
    { id: "streak7", label: "7 Day Streak", emoji: "🌸", unlocked: streak >= 7 },
    { id: "glow", label: "Glow Queen", emoji: "✨", unlocked: pct === 100 },
    { id: "hydration", label: "Hydration Hero", emoji: "💧", unlocked: !!habits[`${tKey}:water`] },
    { id: "night", label: "Night Master", emoji: "🌙", unlocked: day.sections.find((s) => s.color === "night")?.tasks.every((t) => t.done) ?? false },
  ];

  const stats = [
    { label: "Current Streak", value: `${streak}`, suffix: "days", icon: "local_fire_department", c: PALETTE.hair },
    { label: "Today", value: `${pct}`, suffix: "%", icon: "donut_large", c: PALETTE.morning },
    { label: "Days Completed", value: `${completedDays.size}`, suffix: "total", icon: "event_available", c: PALETTE.body },
    { label: "Badges", value: `${badges.filter((b) => b.unlocked).length}/${badges.length}`, suffix: "earned", icon: "emoji_events", c: PALETTE.wellness },
  ];

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={s.label} className="br-card rounded-3xl p-5" style={{ animationDelay: `${i * 50}ms`, backgroundColor: s.c.soft, boxShadow: `0 8px 24px ${s.c.glow}` }}>
            <span className="material-icons-round" style={{ color: s.c.ink }}>{s.icon}</span>
            <p className="serif text-3xl font-bold mt-2" style={{ color: "#4a3340" }}>{s.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: s.c.ink }}>{s.label}</p>
            <p className="text-[10px]" style={{ color: "#a594a0" }}>{s.suffix}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <section className="br-card rounded-[26px] p-6 md:p-8" style={{ background: "linear-gradient(135deg,#ECE6F7 0%,#FBEAEE 100%)", boxShadow: "0 8px 30px rgba(124,106,174,0.12)" }}>
        <h3 className="serif text-2xl font-bold mb-5" style={{ color: "#4a3340" }}>Achievements</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {badges.map((b) => (
            <div key={b.id} className="rounded-3xl p-5 text-center transition-all" style={{ backgroundColor: "#fff", opacity: b.unlocked ? 1 : 0.5, filter: b.unlocked ? "none" : "grayscale(1)" }}>
              <div className="text-4xl mb-2">{b.emoji}</div>
              <p className="text-sm font-bold" style={{ color: "#4a3340" }}>{b.label}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: b.unlocked ? PALETTE.custom.ink : "#b0a0aa" }}>{b.unlocked ? "Unlocked" : "Locked"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Progress;
