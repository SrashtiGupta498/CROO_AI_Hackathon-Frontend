import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { DailyProvider, useDaily } from "../../hooks/useDailyData";
import { formatDate } from "../../utils/datetime";
import { PALETTE } from "./shared";
import "./DailyLayout.css";

const TABS = [
  { to: "/daily", end: true, label: "Today", icon: "checklist" },
  { to: "/daily/notes", end: false, label: "Journal", icon: "edit_note" },
  { to: "/daily/habits", end: false, label: "Habits", icon: "grid_view" },
  {
    to: "/daily/planner",
    end: false,
    label: "Planner",
    icon: "calendar_month",
  },
  {
    to: "/daily/progress",
    end: false,
    label: "Progress",
    icon: "emoji_events",
  },
];

const Shell: React.FC = () => {
  const { today, streak, confetti } = useDaily();
  const dateLabel = formatDate(today, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen pb-32 bg-paper text-ink">
      {confetti && (
        <div aria-hidden className="pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => {
            /* One piece per category, so the celebration is made of the same
               six colours the journal itself uses. */
            const colors = Object.values(PALETTE).map((c) => c.chip);
            return (
              <span
                key={i}
                className="daily-layout-confetti-piece"
                style={{
                  left: `${(i * 2.5) % 100}%`,
                  background: colors[i % colors.length],
                  animationDelay: `${(i % 10) * 0.12}s`,
                }}
              />
            );
          })}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-5 md:px-8">
        {/* Header */}
        <header className="pt-10 md:pt-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6 daily-layout-card">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase mb-2 text-muted">
              {dateLabel}
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight text-ink">
              Today's Beauty Journal
            </h1>
            <p className="font-serif italic text-lg mt-2 text-muted">
              Small routines create beautiful results
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold bg-turmeric/20 text-ink">
              <span className="text-lg">🔥</span> {streak} day
              {streak === 1 ? "" : "s"}
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
              style={{
                background: `linear-gradient(135deg, var(--color-sage), ${PALETTE.night.ink})`,
              }}
            >
              ♡
            </div>
          </div>
        </header>

        {/* Sticky sub-tabs */}
        <nav className="sticky top-2 z-30 mt-6 mb-8">
          <div className="flex gap-1 p-1.5 rounded-2xl overflow-x-auto no-scrollbar bg-white shadow-card-sm">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${isActive ? "text-white" : "text-muted"}`
                }
                style={({ isActive }) =>
                  isActive
                    ? { backgroundColor: "var(--color-sage)" }
                    : undefined
                }
              >
                <span className="material-icons-round text-base">{t.icon}</span>
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <Outlet />
      </div>
    </main>
  );
};

const DailyLayout: React.FC = () => (
  <DailyProvider>
    <Shell />
  </DailyProvider>
);

export default DailyLayout;
