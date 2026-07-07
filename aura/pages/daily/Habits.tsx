import React from "react";
import { useDaily } from "./useDailyData";
import { PALETTE, WEEK_DAYS, HABITS, dateKey } from "./shared";

const Habits: React.FC = () => {
  const { today, tKey, habits, toggleHabit } = useDaily();
  const c = PALETTE.body;
  return (
    <section className="br-card rounded-[26px] p-6 md:p-8" style={{ backgroundColor: c.soft, boxShadow: `0 8px 30px ${c.glow}` }}>
      <h3 className="serif text-2xl font-bold mb-2" style={{ color: c.ink }}>Weekly Habit Tracker</h3>
      <p className="text-sm mb-5" style={{ color: "#7a8a7a" }}>Tap a cell to mark a habit done. Today is outlined.</p>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[420px] border-separate" style={{ borderSpacing: "0 6px" }}>
          <thead>
            <tr>
              <th></th>
              {WEEK_DAYS.map((d) => <th key={d} className="text-[11px] font-bold uppercase" style={{ color: c.ink }}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {HABITS.map((h) => (
              <tr key={h.key}>
                <td className="pr-3">
                  <span className="flex items-center gap-1.5 text-sm font-bold whitespace-nowrap" style={{ color: c.ink }}>
                    <span className="material-icons-round text-base">{h.icon}</span>{h.label}
                  </span>
                </td>
                {WEEK_DAYS.map((_, di) => {
                  const monday = new Date(today);
                  const dow = (monday.getDay() + 6) % 7;
                  monday.setDate(monday.getDate() - dow + di);
                  const cellKey = `${dateKey(monday)}:${h.key}`;
                  const on = !!habits[cellKey];
                  const isToday = dateKey(monday) === tKey;
                  return (
                    <td key={di} className="text-center">
                      <button onClick={() => toggleHabit(cellKey)} className="w-8 h-8 rounded-xl inline-flex items-center justify-center mx-auto"
                        style={{ backgroundColor: on ? c.ink : "#ffffff", color: on ? "#fff" : c.chip, outline: isToday ? `2px solid ${c.ink}` : "none" }}>
                        <span className="material-icons-round text-base">{on ? "check" : "remove"}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Habits;
