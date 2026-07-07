/* ============================================================================
   Shared types, palette, constants and storage helpers for the Beauty Journal.
   Used by the DailyLayout provider and every sub-page (Today, Journal, Habits,
   Planner, Progress).
   ============================================================================ */

export const PALETTE = {
  morning: { soft: "#FBEAEE", ink: "#C05A78", chip: "#F6D4DE", glow: "rgba(192,90,120,0.18)" },
  night: { soft: "#ECE6F7", ink: "#7C6AAE", chip: "#DCD2F0", glow: "rgba(124,106,174,0.18)" },
  hair: { soft: "#FCEADD", ink: "#C57A45", chip: "#F6D6BF", glow: "rgba(197,122,69,0.18)" },
  body: { soft: "#E6F0E6", ink: "#5C8A5E", chip: "#D2E6D2", glow: "rgba(92,138,94,0.18)" },
  wellness: { soft: "#FBF2D9", ink: "#B59331", chip: "#F4E6B8", glow: "rgba(181,147,49,0.18)" },
  custom: { soft: "#F9E8EA", ink: "#C05A78", chip: "#F0D2D8", glow: "rgba(192,90,120,0.18)" },
} as const;

export type ColorKey = keyof typeof PALETTE;

export interface Task { id: string; label: string; done: boolean }
export interface Section { id: string; title: string; icon: string; color: ColorKey; tasks: Task[] }
export interface Notes { mood: string; skin: string; hair: string; text: string }
export interface DayState { sections: Section[]; notes: Notes }

export const uid = () => Math.random().toString(36).slice(2, 9);
export const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const STORAGE = (key: string) => `beautyJournal:day:${key}`;
export const STREAK_STORE = "beautyJournal:completedDays";
export const HABIT_STORE = "beautyJournal:habits";

export const MOODS = ["😊", "🥰", "😌", "😴", "😬", "🥲", "🔥"];
export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const PLANNER = [
  { day: "Monday", theme: "Hydration Day", icon: "water_drop", color: "morning" as ColorKey },
  { day: "Tuesday", theme: "Glow Day", icon: "auto_awesome", color: "wellness" as ColorKey },
  { day: "Wednesday", theme: "Repair Day", icon: "healing", color: "night" as ColorKey },
  { day: "Thursday", theme: "Nourish Day", icon: "restaurant", color: "hair" as ColorKey },
  { day: "Friday", theme: "Brightening Day", icon: "wb_twilight", color: "custom" as ColorKey },
  { day: "Saturday", theme: "Self Care Day", icon: "favorite", color: "body" as ColorKey },
  { day: "Sunday", theme: "Relax Day", icon: "bedtime", color: "night" as ColorKey },
];

export const HABITS = [
  { key: "water", label: "Water", icon: "water_drop" },
  { key: "sleep", label: "Sleep", icon: "bedtime" },
  { key: "spf", label: "SPF", icon: "wb_sunny" },
  { key: "steps", label: "Steps", icon: "directions_walk" },
];

export const defaultSections = (): Section[] => [
  { id: uid(), title: "Morning Routine", icon: "wb_sunny", color: "morning",
    tasks: ["Drink Water", "Cleanser", "Toner", "Serum", "Moisturizer", "Sunscreen"].map((label) => ({ id: uid(), label, done: false })) },
  { id: uid(), title: "Night Routine", icon: "nightlight", color: "night",
    tasks: ["Double Cleanse", "Toner", "Treatment", "Moisturizer", "Lip Mask"].map((label) => ({ id: uid(), label, done: false })) },
  { id: uid(), title: "Hair Care", icon: "air", color: "hair",
    tasks: ["Hair Oil", "Scalp Massage", "Hair Serum", "Hair Mask"].map((label) => ({ id: uid(), label, done: false })) },
  { id: uid(), title: "Body Care", icon: "spa", color: "body",
    tasks: ["Shower", "Body Lotion", "Foot Cream", "Body Oil"].map((label) => ({ id: uid(), label, done: false })) },
  { id: uid(), title: "Wellness", icon: "self_improvement", color: "wellness",
    tasks: ["Drink 8 Glasses Water", "Walk 10k Steps", "Meditation", "Vitamins"].map((label) => ({ id: uid(), label, done: false })) },
];

export const emptyNotes = (): Notes => ({ mood: "", skin: "", hair: "", text: "" });

export const loadDay = (key: string): DayState => {
  try {
    const raw = localStorage.getItem(STORAGE(key));
    if (raw) {
      const parsed = JSON.parse(raw) as DayState;
      if (parsed?.sections) return { sections: parsed.sections, notes: { ...emptyNotes(), ...parsed.notes } };
    }
  } catch { /* ignore */ }
  return { sections: defaultSections(), notes: emptyNotes() };
};

export const loadSet = (store: string): Set<string> => {
  try {
    const raw = localStorage.getItem(store);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
};
