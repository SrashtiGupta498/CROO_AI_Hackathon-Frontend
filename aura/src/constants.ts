import { Article, Ingredient } from "./types";
import {
  vid1,
  vid2,
  vid3,
  vid4,
  vid5,
  reelPoster1,
  reelPoster2,
  reelPoster3,
  reelPoster4,
  reelPoster5,
} from "./assets/index";

export type Reel = {
  id: string;
  src: string;
  /** Still frame shown before playback. Its presence is what lets a card use
   *  `preload="none"` — without one the card would paint empty. */
  poster: string;
  title: string;
  caption: string;
  author: string;
  handle: string;
  tags: string[];
  likes: string;
};

/* Short-form reels — shared by the Home "Short Films" rail and the /reels page. */
export const REELS: Reel[] = [
  {
    id: "r1",
    src: vid1,
    poster: reelPoster1,
    title: "Morning Glow Ritual",
    caption: "The 60-second botanical routine that wakes your skin up ✨",
    author: "Aura & Earth",
    handle: "@auraearth",
    tags: ["glow", "morning", "clean girl"],
    likes: "12.4K",
  },
  {
    id: "r2",
    src: vid2,
    poster: reelPoster2,
    title: "Aloe From Scratch",
    caption: "Cutting fresh aloe straight from the leaf 🌿 nature's serum",
    author: "Aura & Earth",
    handle: "@auraearth",
    tags: ["aloe", "diy", "soothe"],
    likes: "9.1K",
  },
  {
    id: "r3",
    src: vid3,
    poster: reelPoster3,
    title: "Lavender Wind-Down",
    caption: "Mist, breathe, repeat 💤 your nightly reset in one reel",
    author: "Aura & Earth",
    handle: "@auraearth",
    tags: ["lavender", "night", "calm"],
    likes: "7.8K",
  },
  {
    id: "r4",
    src: vid4,
    poster: reelPoster4,
    title: "Oil Cleansing 101",
    caption: "Melt the day away — the gentle double-cleanse method 🫧",
    author: "Aura & Earth",
    handle: "@auraearth",
    tags: ["cleanse", "oil", "routine"],
    likes: "15.2K",
  },
  {
    id: "r5",
    src: vid5,
    poster: reelPoster5,
    title: "Honey Glow Mask",
    caption: "Raw honey + a little patience = that lit-from-within look 🍯",
    author: "Aura & Earth",
    handle: "@auraearth",
    tags: ["honey", "mask", "glow"],
    likes: "10.6K",
  },
];

export const ARTICLES: Article[] = [
  {
    id: "1",
    title: "The 5-Step Morning Glow Routine",
    category: "Popular",
    readTime: "6 min read",
    imageUrl: "https://picsum.photos/seed/skincare1/400/400",
    content:
      "How to prep your canvas using only three organic ingredients found in your kitchen...",
    author: {
      name: "Dr. Elena Rose",
      role: "Dermatologist & Organic Enthusiast",
      avatar: "https://picsum.photos/seed/author1/100/100",
    },
  },
  {
    id: "2",
    title: "The Healing Power of Aloe Vera",
    category: "Natural Skincare",
    readTime: "2 min read",
    imageUrl: "https://picsum.photos/seed/aloe/400/600",
    content:
      "For centuries, Aloe Vera has been hailed as a miracle plant. Its succulent leaves hold a clear, nutrient-rich gel...",
  },
  {
    id: "3",
    title: "DIY Lavender Pillow Mist",
    category: "DIY Recipes",
    readTime: "8 min read",
    imageUrl: "https://picsum.photos/seed/lavender/400/400",
    content:
      "Craft a calming atmosphere before bed with this simple non-toxic spray recipe...",
  },
];

export const INGREDIENTS: Ingredient[] = [
  {
    id: "1",
    name: "Rosehip Oil",
    scientificName: "Rosa Canina Fruit Oil",
    benefits: ["Anti-Aging", "Deep Hydration", "Scar Healing"],
    imageUrl: "https://picsum.photos/seed/rosehip/400/500",
    description:
      "Harvested from the seeds of rose bushes, Rosehip oil is uniquely rich in essential fatty acids and Vitamin A.",
    usage: [
      "Apply 2-3 drops onto damp skin.",
      "Massage until absorbed.",
      "Follow with moisturizer.",
    ],
  },
  {
    id: "2",
    name: "Green Tea",
    scientificName: "Camellia Sinensis",
    benefits: ["Soothing", "Antioxidant"],
    imageUrl: "https://picsum.photos/seed/greentea/400/500",
    description:
      "Rich in polyphenols, green tea helps soothe skin and protect against environmental damage.",
    usage: ["Steep and cool for a toner.", "Add powder to masks."],
  },
];

// export const CATEGORIES = [
//   { name: 'Skincare', icon: 'spa' },
//   { name: 'Home Remedies', icon: 'auto_awesome' },
//   { name: 'Wellness', icon: 'self_improvement' },
//   { name: 'Organic Living', icon: 'eco' }
// ];
