import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import API from "../services/api";
import {
  DayState, Section, Notes, loadDay, loadSet, dateKey, uid,
  STORAGE, STREAK_STORE, HABIT_STORE, defaultSections, emptyNotes,
} from "../pages/daily/shared";

/* ============================================================================
   Single source of truth for the Beauty Journal, shared across all sub-pages
   via context so a check on "Today" instantly updates "Progress", etc.
   Everything persists to localStorage keyed by date.
   ============================================================================ */

interface DailyCtx {
  today: Date;
  tKey: string;
  day: DayState;
  setNotes: (patch: Partial<Notes>) => void;
  completedDays: Set<string>;
  habits: Record<string, boolean>;
  toggleHabit: (key: string) => void;
  total: number; done: number; pct: number; streak: number;
  confetti: boolean;
  toggleTask: (sec: string, id: string) => void;
  addTask: (sec: string, label: string) => void;
  editTask: (sec: string, id: string, label: string) => void;
  deleteTask: (sec: string, id: string) => void;
  deleteSection: (sec: string) => void;
  addSection: () => void;
  renameSection: (sec: string, title: string) => void;
  reorderTask: (sec: string, from: number, to: number) => void;
  copyYesterday: () => void;
  resetDay: () => void;
}

const Ctx = createContext<DailyCtx | null>(null);
export const useDaily = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDaily must be used inside <DailyProvider>");
  return v;
};

export const DailyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [today] = useState(() => new Date());
  const tKey = dateKey(today);

  const [day, setDay] = useState<DayState>(() => loadDay(tKey));
  const [completedDays, setCompletedDays] = useState<Set<string>>(() => loadSet(STREAK_STORE));
  const [habits, setHabits] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(HABIT_STORE) || "{}"); } catch { return {}; }
  });
  const [confetti, setConfetti] = useState(false);
  const prevComplete = useRef(false);

  // ── Backend sync ───────────────────────────────────────────────────────────
  // localStorage stays as an instant offline cache; when logged in we also
  // load/save through the per-user Daily API (GET /daily range, PUT /daily/:date).
  const currentUser = useSelector((s: RootState) => s.user.currentUser);
  const userId = currentUser?.id || currentUser?._id;

  const dayRef = useRef(day);
  const habitsRef = useRef(habits);
  const hydratedRef = useRef(false);                 // gate saves until first load done
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => { dayRef.current = day; }, [day]);
  useEffect(() => { habitsRef.current = habits; }, [habits]);

  // window we pull on mount: ~5 weeks back covers the habit grid + a real streak
  const rangeFrom = useMemo(() => {
    const d = new Date(today); d.setDate(d.getDate() - 34); return dateKey(d);
  }, [today]);

  const mapEntryToDay = (e: any): DayState => ({
    sections: (e.routines || []).map((s: any) => ({
      id: uid(),
      title: s.title || "Untitled",
      icon: s.icon || "auto_awesome",
      color: (s.color || "custom") as Section["color"],
      tasks: (s.tasks || []).map((t: any) => ({ id: t.id || uid(), label: t.label || "", done: !!t.done })),
    })),
    notes: { ...emptyNotes(), ...(e.notes || {}) },
  });

  const pickHabits = (map: Record<string, boolean>, dk: string) => {
    const out: Record<string, boolean> = {};
    const prefix = `${dk}:`;
    for (const k in map) if (k.startsWith(prefix)) out[k] = map[k];
    return out;
  };

  const persist = async (dk: string) => {
    if (!userId) return;
    const payload: any = { habits: pickHabits(habitsRef.current, dk) };
    if (dk === tKey) {
      payload.routines = dayRef.current.sections.map((s) => ({
        title: s.title, icon: s.icon, color: s.color,
        tasks: s.tasks.map((t) => ({ id: t.id, label: t.label, done: t.done })),
      }));
      payload.notes = dayRef.current.notes;
    }
    try { await API.put(`/daily/${dk}`, payload); } catch { /* offline → localStorage keeps it */ }
  };

  const scheduleSave = (dk: string) => {
    if (!userId || !hydratedRef.current) return;
    clearTimeout(saveTimers.current[dk]);
    saveTimers.current[dk] = setTimeout(() => persist(dk), 800);
  };

  // Hydrate from the API once we know the user.
  useEffect(() => {
    if (!userId) { hydratedRef.current = true; return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get(`/daily?from=${rangeFrom}&to=${tKey}`);
        const list: any[] = res.data?.data ?? res.data ?? [];
        if (cancelled) return;
        const todayEntry = list.find((e) => e.date === tKey);
        if (todayEntry) setDay(mapEntryToDay(todayEntry));
        setCompletedDays(new Set(list.filter((e) => e.completed).map((e) => e.date)));
        const merged = Object.assign({}, ...list.map((e) => e.habits || {}));
        setHabits((prev) => ({ ...prev, ...merged }));
      } catch { /* not logged in / offline → localStorage fallback */ }
      finally { hydratedRef.current = true; }
    })();
    return () => { cancelled = true; };
  }, [userId, rangeFrom, tKey]);

  const { total, done, pct } = useMemo(() => {
    const all = day.sections.flatMap((s) => s.tasks);
    const d = all.filter((t) => t.done).length;
    return { total: all.length, done: d, pct: all.length ? Math.round((d / all.length) * 100) : 0 };
  }, [day]);

  useEffect(() => { localStorage.setItem(STORAGE(tKey), JSON.stringify(day)); scheduleSave(tKey); }, [day, tKey]);
  useEffect(() => { localStorage.setItem(HABIT_STORE, JSON.stringify(habits)); }, [habits]);

  useEffect(() => {
    const complete = total > 0 && done === total;
    setCompletedDays((prev) => {
      const next = new Set(prev);
      if (complete) next.add(tKey); else next.delete(tKey);
      localStorage.setItem(STREAK_STORE, JSON.stringify([...next]));
      return next;
    });
    if (complete && !prevComplete.current) {
      setConfetti(true);
      const id = setTimeout(() => setConfetti(false), 2600);
      prevComplete.current = true;
      return () => clearTimeout(id);
    }
    if (!complete) prevComplete.current = false;
  }, [done, total, tKey]);

  const streak = useMemo(() => {
    let count = 0;
    const cur = new Date(today);
    if (!completedDays.has(dateKey(cur))) cur.setDate(cur.getDate() - 1);
    while (completedDays.has(dateKey(cur))) { count++; cur.setDate(cur.getDate() - 1); }
    return count;
  }, [completedDays, today]);

  const mutate = (fn: (s: Section[]) => Section[]) => setDay((d) => ({ ...d, sections: fn(d.sections) }));

  const value: DailyCtx = {
    today, tKey, day, completedDays, habits, total, done, pct, streak, confetti,
    setNotes: (patch) => setDay((d) => ({ ...d, notes: { ...d.notes, ...patch } })),
    toggleHabit: (key) => { setHabits((p) => ({ ...p, [key]: !p[key] })); scheduleSave(key.split(":")[0]); },
    toggleTask: (sec, id) => mutate((secs) => secs.map((s) => s.id === sec
      ? { ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t) } : s)),
    addTask: (sec, label) => { if (label.trim()) mutate((secs) => secs.map((s) => s.id === sec
      ? { ...s, tasks: [...s.tasks, { id: uid(), label: label.trim(), done: false }] } : s)); },
    editTask: (sec, id, label) => { if (label.trim()) mutate((secs) => secs.map((s) => s.id === sec
      ? { ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, label: label.trim() } : t) } : s)); },
    deleteTask: (sec, id) => mutate((secs) => secs.map((s) => s.id === sec
      ? { ...s, tasks: s.tasks.filter((t) => t.id !== id) } : s)),
    deleteSection: (sec) => mutate((secs) => secs.filter((s) => s.id !== sec)),
    addSection: () => mutate((secs) => [...secs, { id: uid(), title: "New Ritual", icon: "auto_awesome", color: "custom", tasks: [] }]),
    renameSection: (sec, title) => mutate((secs) => secs.map((s) => s.id === sec ? { ...s, title: title.trim() || "Untitled" } : s)),
    reorderTask: (sec, from, to) => { if (from === to) return; mutate((secs) => secs.map((s) => {
      if (s.id !== sec) return s;
      const tasks = [...s.tasks];
      const [m] = tasks.splice(from, 1);
      tasks.splice(to, 0, m);
      return { ...s, tasks };
    })); },
    copyYesterday: () => {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      const prev = loadDay(dateKey(y));
      setDay((d) => ({ ...d, sections: prev.sections.map((s) => ({ ...s, id: uid(), tasks: s.tasks.map((t) => ({ ...t, id: uid(), done: false })) })) }));
    },
    resetDay: () => setDay({ sections: defaultSections(), notes: emptyNotes() }),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
