import React from "react";
import { useDaily } from "../../hooks/useDailyData";
import { PALETTE } from "./shared";
import "./Progress.css";

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
          <div key={s.label} className="daily-layout-card rounded-3xl p-5" style={{ animationDelay: `${i * 50}ms`, backgroundColor: s.c.soft, boxShadow: `0 8px 24px ${s.c.glow}` }}>
            <span className="material-icons-round" style={{ color: s.c.ink }}>{s.icon}</span>
            <p className="font-serif text-3xl font-bold mt-2 text-ink">{s.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: s.c.ink }}>{s.label}</p>
            <p className="text-[10px] text-muted">{s.suffix}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <section className="daily-layout-card daily-progress-achievements rounded-[26px] p-6 md:p-8">
        <h3 className="font-serif text-2xl font-bold mb-5 text-ink">Achievements</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {badges.map((b) => (
            <div key={b.id} className={`rounded-3xl p-5 text-center transition-all bg-white ${b.unlocked ? "" : "opacity-50 grayscale"}`}>
              <div className="text-4xl mb-2">{b.emoji}</div>
              <p className="text-sm font-bold text-ink">{b.label}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: b.unlocked ? PALETTE.custom.ink : "var(--ae-muted)" }}>{b.unlocked ? "Unlocked" : "Locked"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Progress;
