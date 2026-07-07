import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { DailyProvider, useDaily } from "./useDailyData";
import { PALETTE } from "./shared";

const TABS = [
  { to: "/daily", end: true, label: "Today", icon: "checklist" },
  { to: "/daily/notes", end: false, label: "Journal", icon: "edit_note" },
  { to: "/daily/habits", end: false, label: "Habits", icon: "grid_view" },
  { to: "/daily/planner", end: false, label: "Planner", icon: "calendar_month" },
  { to: "/daily/progress", end: false, label: "Progress", icon: "emoji_events" },
];

const Shell: React.FC = () => {
  const { today, streak, confetti } = useDaily();
  const dateLabel = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <main className="min-h-screen pb-32" style={{ backgroundColor: "#FFF9F7", color: "#5b4650" }}>
      <style>{`
        @keyframes pop { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes floatUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes confettiFall { 0%{transform:translateY(-10vh) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(540deg);opacity:0} }
        .br-card { animation: floatUp .5s cubic-bezier(.22,1,.36,1) both; }
        .br-heart { animation: pop .35s cubic-bezier(.22,1,.36,1); }
        .script { font-family: 'Playfair Display', serif; font-style: italic; }
        .serif { font-family: 'Playfair Display', serif; }
        .confetti-piece { position: fixed; top: 0; width: 10px; height: 14px; border-radius: 3px; animation: confettiFall 2.6s linear forwards; z-index: 60; }
      `}</style>

      {confetti && (
        <div aria-hidden className="pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => {
            const colors = ["#F6D4DE", "#DCD2F0", "#F4E6B8", "#D2E6D2", "#F6D6BF", "#C05A78"];
            return <span key={i} className="confetti-piece" style={{
              left: `${(i * 2.5) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 10) * 0.12}s`,
            }} />;
          })}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-5 md:px-8">
        {/* Header */}
        <header className="pt-10 md:pt-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6 br-card">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase mb-2" style={{ color: PALETTE.custom.ink }}>{dateLabel}</p>
            <h1 className="serif text-4xl md:text-5xl font-bold leading-tight" style={{ color: "#4a3340" }}>Today's Beauty Journal</h1>
            <p className="script text-lg mt-2" style={{ color: PALETTE.custom.ink }}>Small routines create beautiful results</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold" style={{ backgroundColor: PALETTE.hair.soft, color: PALETTE.hair.ink }}>
              <span className="text-lg">🔥</span> {streak} day{streak === 1 ? "" : "s"}
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
              style={{ background: `linear-gradient(135deg, ${PALETTE.custom.ink}, ${PALETTE.night.ink})` }}>♡</div>
          </div>
        </header>

        {/* Sticky sub-tabs */}
        <nav className="sticky top-2 z-30 mt-6 mb-8">
          <div className="flex gap-1 p-1.5 rounded-2xl overflow-x-auto no-scrollbar"
            style={{ backgroundColor: "#fff", boxShadow: "0 6px 24px rgba(192,90,120,0.10)" }}>
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all"
                style={({ isActive }) => isActive
                  ? { backgroundColor: PALETTE.custom.ink, color: "#fff" }
                  : { color: "#a08a96" }}>
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
  <DailyProvider><Shell /></DailyProvider>
);

export default DailyLayout;
