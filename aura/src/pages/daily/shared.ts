/* ============================================================================
   Shared types, palette, constants and storage helpers for the Beauty Journal.
   Used by the DailyLayout provider and every sub-page (Today, Journal, Habits,
   Planner, Progress).
   ============================================================================ */

/* Category colours for the journal.
 *
 * The six categories genuinely need to be told apart at a glance, so this stays
 * a six-way scale rather than collapsing to one brand colour — but the hues are
 * drawn from the brand family (forest, olive, clay, champagne, honey, warm
 * neutral) instead of the pink/lilac set that used to live here and matched
 * nothing else on the site.
 *
 * `ink` carries text on FOUR different surfaces — `soft`, `chip`, white, and
 * the page's ivory — as well as sitting behind white text. `chip` is the
 * darkest of those and so the binding constraint; checking only against `soft`
 * or white will let a failing value through. Every `ink` below clears 4.5:1 on
 * all four. The previous palette failed AA on all six categories in both
 * directions (worst: wellness at 2.62:1).
 *
 * `glow` is `ink` at 18% — keep it in sync when changing `ink`.
 */
export const PALETTE = {
  morning: {
    soft: "#F7EFE0",
    ink: "#7C5B30",
    chip: "#EADCC2",
    glow: "rgba(124,91,48,0.18)",
  },
  night: {
    soft: "#E5EDE9",
    ink: "#33534B",
    chip: "#CBDCD4",
    glow: "rgba(51,83,75,0.18)",
  },
  hair: {
    soft: "#F7E9E2",
    ink: "#8A4D37",
    chip: "#EBD2C6",
    glow: "rgba(138,77,55,0.18)",
  },
  body: {
    soft: "#E9EEE6",
    ink: "#52654F",
    chip: "#D3DFD0",
    glow: "rgba(82,101,79,0.18)",
  },
  wellness: {
    soft: "#F4EEDD",
    ink: "#6F5D31",
    chip: "#E4D9BC",
    glow: "rgba(111,93,49,0.18)",
  },
  custom: {
    soft: "#EFEDE7",
    ink: "#5A544C",
    chip: "#DCD8CF",
    glow: "rgba(90,84,76,0.18)",
  },
} as const;

export type ColorKey = keyof typeof PALETTE;

export interface Task {
  id: string;
  label: string;
  done: boolean;
}
export interface Section {
  id: string;
  title: string;
  icon: string;
  color: ColorKey;
  tasks: Task[];
}
export interface Notes {
  mood: string;
  skin: string;
  hair: string;
  text: string;
}
export interface DayState {
  sections: Section[];
  notes: Notes;
}

export const uid = () => Math.random().toString(36).slice(2, 9);
export const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const STORAGE = (key: string) => `beautyJournal:day:${key}`;
export const STREAK_STORE = "beautyJournal:completedDays";
export const HABIT_STORE = "beautyJournal:habits";

export const MOODS = ["😊", "🥰", "😌", "😴", "😬", "🥲", "🔥"];
export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const PLANNER = [
  {
    day: "Monday",
    theme: "Hydration Day",
    icon: "water_drop",
    color: "morning" as ColorKey,
  },
  {
    day: "Tuesday",
    theme: "Glow Day",
    icon: "auto_awesome",
    color: "wellness" as ColorKey,
  },
  {
    day: "Wednesday",
    theme: "Repair Day",
    icon: "healing",
    color: "night" as ColorKey,
  },
  {
    day: "Thursday",
    theme: "Nourish Day",
    icon: "restaurant",
    color: "hair" as ColorKey,
  },
  {
    day: "Friday",
    theme: "Brightening Day",
    icon: "wb_twilight",
    color: "custom" as ColorKey,
  },
  {
    day: "Saturday",
    theme: "Self Care Day",
    icon: "favorite",
    color: "body" as ColorKey,
  },
  {
    day: "Sunday",
    theme: "Relax Day",
    icon: "bedtime",
    color: "night" as ColorKey,
  },
];

export const HABITS = [
  { key: "water", label: "Water", icon: "water_drop" },
  { key: "sleep", label: "Sleep", icon: "bedtime" },
  { key: "spf", label: "SPF", icon: "wb_sunny" },
  { key: "steps", label: "Steps", icon: "directions_walk" },
];

export const defaultSections = (): Section[] => [
  {
    id: uid(),
    title: "Morning Routine",
    icon: "wb_sunny",
    color: "morning",
    tasks: [
      "Drink Water",
      "Cleanser",
      "Toner",
      "Serum",
      "Moisturizer",
      "Sunscreen",
    ].map((label) => ({ id: uid(), label, done: false })),
  },
  {
    id: uid(),
    title: "Night Routine",
    icon: "nightlight",
    color: "night",
    tasks: [
      "Double Cleanse",
      "Toner",
      "Treatment",
      "Moisturizer",
      "Lip Mask",
    ].map((label) => ({ id: uid(), label, done: false })),
  },
  {
    id: uid(),
    title: "Hair Care",
    icon: "air",
    color: "hair",
    tasks: ["Hair Oil", "Scalp Massage", "Hair Serum", "Hair Mask"].map(
      (label) => ({ id: uid(), label, done: false }),
    ),
  },
  {
    id: uid(),
    title: "Body Care",
    icon: "spa",
    color: "body",
    tasks: ["Shower", "Body Lotion", "Foot Cream", "Body Oil"].map((label) => ({
      id: uid(),
      label,
      done: false,
    })),
  },
  {
    id: uid(),
    title: "Wellness",
    icon: "self_improvement",
    color: "wellness",
    tasks: [
      "Drink 8 Glasses Water",
      "Walk 10k Steps",
      "Meditation",
      "Vitamins",
    ].map((label) => ({ id: uid(), label, done: false })),
  },
];

export const emptyNotes = (): Notes => ({
  mood: "",
  skin: "",
  hair: "",
  text: "",
});

export const loadDay = (key: string): DayState => {
  try {
    const raw = localStorage.getItem(STORAGE(key));
    if (raw) {
      const parsed = JSON.parse(raw) as DayState;
      if (parsed?.sections)
        return {
          sections: parsed.sections,
          notes: { ...emptyNotes(), ...parsed.notes },
        };
    }
  } catch {
    /* ignore */
  }
  return { sections: defaultSections(), notes: emptyNotes() };
};

export const loadSet = (store: string): Set<string> => {
  try {
    const raw = localStorage.getItem(store);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return new Set();
};
