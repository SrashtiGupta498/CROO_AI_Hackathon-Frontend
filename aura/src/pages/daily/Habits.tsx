import React from "react";
import { useDaily } from "../../hooks/useDailyData";
import { PALETTE, WEEK_DAYS, HABITS, dateKey } from "./shared";

const Habits: React.FC = () => {
  const { today, tKey, habits, toggleHabit } = useDaily();
  const c = PALETTE.body;
  return (
    <section
      className="daily-layout-card rounded-[26px] p-6 md:p-8"
      style={{ backgroundColor: c.soft, boxShadow: `0 8px 30px ${c.glow}` }}
    >
      <h3
        className="font-serif text-2xl font-bold mb-2"
        style={{ color: c.ink }}
      >
        Weekly Habit Tracker
      </h3>
      <p className="text-sm mb-5 text-muted">
        Tap a cell to mark a habit done. Today is outlined.
      </p>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[420px] border-separate border-spacing-x-0 border-spacing-y-1.5">
          <thead>
            <tr>
              <th></th>
              {WEEK_DAYS.map((d) => (
                <th
                  key={d}
                  className="text-[11px] font-bold uppercase"
                  style={{ color: c.ink }}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HABITS.map((h) => (
              <tr key={h.key}>
                <td className="pr-3">
                  <span
                    className="flex items-center gap-1.5 text-sm font-bold whitespace-nowrap"
                    style={{ color: c.ink }}
                  >
                    <span className="material-icons-round text-base">
                      {h.icon}
                    </span>
                    {h.label}
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
                      {/* An unchecked cell used to be a chip-coloured dash on
                          white — 1.38:1, effectively invisible, so an empty
                          week read as a blank table rather than as "nothing
                          logged". Unchecked now sits on `soft` with an `ink`
                          dash; the filled state stays ink-on-white. */}
                      <button
                        onClick={() => toggleHabit(cellKey)}
                        className="w-8 h-8 rounded-xl inline-flex items-center justify-center mx-auto"
                        aria-pressed={on}
                        aria-label={`${h.label} on ${WEEK_DAYS[di]}${isToday ? " (today)" : ""}`}
                        style={{
                          backgroundColor: on ? c.ink : c.soft,
                          color: on ? "#fff" : c.ink,
                          outline: isToday ? `2px solid ${c.ink}` : "none",
                        }}
                      >
                        <span
                          className="material-icons-round text-base"
                          aria-hidden="true"
                        >
                          {on ? "check" : "remove"}
                        </span>
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
