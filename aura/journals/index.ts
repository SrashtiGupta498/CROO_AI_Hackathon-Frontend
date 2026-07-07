import {
  Img1,
  Img2,
  Img3,
  Img4,
  Img5,
  Img6,
  Img7,
  Img8,
  Img9,
  Img10,
  Img11,
  Img12,
  vid1,
  vid2,
  vid3,
  vid4,
  vid5,
} from "../assets/index";

import morningRoutine from "./morning-routine.json";
import nightCare from "./night-care.json";
import weeklyRitual from "./weekly-ritual.json";

// Map the string keys used inside the JSON files to the real bundled assets.
const ASSET_MAP: Record<string, string> = {
  Img1, Img2, Img3, Img4, Img5, Img6, Img7, Img8, Img9, Img10, Img11, Img12,
  vid1, vid2, vid3, vid4, vid5,
};

export const resolveAsset = (key: string): string => ASSET_MAP[key] ?? key;

export interface JournalTheme {
  name: string;
  mode: "light" | "dark";
  primary: string;
  primarySoft: string;
  bg: string;
  surface: string;
  heading: string;
  body: string;
  muted: string;
  border: string;
}

export interface JournalBenefit {
  title: string;
  desc: string;
}

export interface JournalVideo {
  video: string;
  title: string;
}

export interface JournalInfo {
  heading: string;
  body: string;
}

export interface JournalFaq {
  q: string;
  a: string;
}

export interface Journal {
  id: string;
  label: string;
  emoji: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  theme: JournalTheme;
  heroImage: string;
  benefits: JournalBenefit[];
  steps: string[];
  shortVideos: JournalVideo[];
  info: JournalInfo[];
  faqs: JournalFaq[];
  proTip: string;
}

export const JOURNALS: Journal[] = [
  morningRoutine as Journal,
  nightCare as Journal,
  weeklyRitual as Journal,
];

export const getJournal = (slug?: string): Journal =>
  JOURNALS.find((j) => j.id === slug) ?? JOURNALS[0];
