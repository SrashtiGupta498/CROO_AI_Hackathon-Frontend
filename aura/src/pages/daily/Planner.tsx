import React from "react";
import { useDaily } from "../../hooks/useDailyData";
import { PALETTE, PLANNER } from "./shared";

const Planner: React.FC = () => {
  const { today, pct } = useDaily();
  const todayIdx = (today.getDay() + 6) % 7;
  return (
    <section>
      <h3 className="font-serif text-2xl font-bold mb-5 text-center text-ink">
        Weekly Ritual Planner
      </h3>
      <div className="space-y-3">
        {PLANNER.map((p, i) => {
          const c = PALETTE[p.color];
          const isToday = i === todayIdx;
          return (
            <div
              key={p.day}
              className="daily-layout-card flex items-center gap-4 rounded-3xl px-5 py-4"
              style={{
                animationDelay: `${i * 40}ms`,
                backgroundColor: c.soft,
                boxShadow: isToday
                  ? `0 0 0 2px ${c.ink}`
                  : `0 6px 20px ${c.glow}`,
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none"
                style={{ backgroundColor: c.chip, color: c.ink }}
              >
                <span className="material-icons-round">{p.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: c.ink }}
                >
                  {p.day}
                  {isToday ? " · Today" : ""}
                </p>
                <p className="font-serif text-lg font-bold truncate text-ink">
                  {p.theme}
                </p>
              </div>
              {isToday && (
                <span
                  className="text-xs font-bold px-3 py-1.5 rounded-full text-white flex-none"
                  style={{ backgroundColor: c.ink }}
                >
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Planner;
