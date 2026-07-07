/**
 * Recommendation content: home remedies + organic products, keyed by the
 * parameters the aura-ml analysis returns (skin type, detected concerns,
 * measured redness/brightness).
 *
 * ✏️ EDIT THIS FILE to change what gets recommended — no logic lives here.
 * The mapping is consumed by services/recommendations.ts, which picks and
 * ranks entries based on each user's actual analysis result.
 *
 * `query` on a product is what the Ingredient Library is searched for when
 * the user taps the product chip (falls back to the product name).
 */

export interface Remedy {
  name: string;
  how: string;
  frequency?: string;
}

export interface ProductRec {
  name: string;
  why: string;
  query?: string;
}

export interface RecommendationEntry {
  title: string;
  remedies: Remedy[];
  products: ProductRec[];
}

/* ------------------------------------------------------------------ */
/* Base ritual per skin type (always shown, lowest priority)           */
/* ------------------------------------------------------------------ */

export const SKIN_TYPE_RECS: Record<string, RecommendationEntry> = {
  dry: {
    title: "For your dry skin",
    remedies: [
      {
        name: "Honey & milk cream mask",
        how: "Mix 1 tbsp raw honey with 1 tsp fresh milk cream (malai), leave on 15 min, rinse lukewarm.",
        frequency: "2–3× a week",
      },
      {
        name: "Oatmeal & yogurt mask",
        how: "Blend 2 tbsp ground oats with 1 tbsp plain yogurt; apply 10–15 min to calm and hydrate.",
        frequency: "Weekly",
      },
      {
        name: "Overnight oil seal",
        how: "Press 2–3 drops of a nourishing oil onto damp skin after your evening rinse to lock moisture in.",
        frequency: "Nightly",
      },
    ],
    products: [
      { name: "Sweet Almond Oil", why: "Light, vitamin E–rich daily moisturizer for flaky skin" },
      { name: "Avocado Oil", why: "Deeply nourishing for very dry patches" },
      { name: "Aloe Vera", why: "Water-binding hydration under any oil" },
      { name: "Shea Butter", why: "Occlusive balm for rough, tight areas" },
    ],
  },
  oily: {
    title: "For your oily skin",
    remedies: [
      {
        name: "Multani mitti & rosewater pack",
        how: "Mix fuller's earth with rosewater into a paste; apply 10 min, rinse before it fully cracks.",
        frequency: "1–2× a week",
      },
      {
        name: "Green tea ice cube rub",
        how: "Freeze brewed green tea; glide a cube over the T-zone to tighten and cut shine.",
        frequency: "Daily, mornings",
      },
      {
        name: "Gram flour (besan) cleanse",
        how: "1 tbsp besan + a pinch of turmeric + water — massage on, rinse off as a soap-free cleanser.",
        frequency: "Daily",
      },
    ],
    products: [
      { name: "Jojoba Oil", why: "Mimics sebum and signals skin to produce less oil" },
      { name: "Grapeseed Oil", why: "Feather-light, non-comedogenic moisture" },
      { name: "Witch Hazel", why: "Natural astringent toner for shine control" },
      { name: "Tea Tree Oil", why: "Diluted, keeps oily skin breakout-free", query: "tea tree" },
    ],
  },
  combination: {
    title: "For your combination skin",
    remedies: [
      {
        name: "Multi-mask ritual",
        how: "Clay pack on the oily T-zone, honey on the drier cheeks — 10–15 min, rinse together.",
        frequency: "Weekly",
      },
      {
        name: "Rosewater balance toner",
        how: "Mist or pat pure rosewater over the whole face after cleansing to rebalance both zones.",
        frequency: "Daily",
      },
      {
        name: "Cucumber soothe",
        how: "Grate half a cucumber, press the pulp over the face for 10 min to hydrate without oil.",
        frequency: "2–3× a week",
      },
    ],
    products: [
      { name: "Jojoba Oil", why: "Balances the T-zone while moisturizing cheeks" },
      { name: "Hemp Seed Oil", why: "Zero-comedogenic omega boost for both zones" },
      { name: "Aloe Vera", why: "Light hydration that suits every zone" },
    ],
  },
  normal: {
    title: "For your normal skin",
    remedies: [
      {
        name: "Raw honey cleanse",
        how: "Massage a thin layer of raw honey onto damp skin, rinse lukewarm — gentle daily cleansing.",
        frequency: "Daily",
      },
      {
        name: "Turmeric & yogurt glow mask",
        how: "A pinch of turmeric in 1 tbsp yogurt, 10 min, rinse — keeps the natural glow topped up.",
        frequency: "Weekly",
      },
    ],
    products: [
      { name: "Jojoba Oil", why: "Maintenance moisture that never overloads" },
      { name: "Rosehip Oil", why: "Gentle nightly regeneration and glow" },
      { name: "Aloe Vera", why: "Daily lightweight hydration" },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Concern-specific care (ranked by detected severity)                 */
/* ------------------------------------------------------------------ */

export const CONCERN_RECS: Record<string, RecommendationEntry> = {
  acne: {
    title: "Calm active breakouts",
    remedies: [
      {
        name: "Neem paste spot treatment",
        how: "Grind fresh neem leaves (or neem powder + water) and dot on blemishes for 20 min, then rinse.",
        frequency: "Daily on spots",
      },
      {
        name: "Raw honey overnight dot",
        how: "Dab raw or manuka honey on the spot at bedtime; its natural antibacterials work overnight.",
        frequency: "Nightly on spots",
      },
      {
        name: "Steam + weekly clay mask",
        how: "5 min facial steam to open pores, then a thin bentonite clay mask to draw out congestion.",
        frequency: "Weekly",
      },
    ],
    products: [
      { name: "Tea Tree Oil", why: "Classic antibacterial — always dilute in a carrier oil", query: "tea tree" },
      { name: "Neem Oil", why: "Traditional blemish-fighting botanical", query: "neem" },
      { name: "Manuka Honey", why: "High-UMF honey for spot care", query: "manuka" },
      { name: "Witch Hazel", why: "Gentle toner to keep pores clear" },
    ],
  },
  blackheads: {
    title: "Clear blackheads gently",
    remedies: [
      {
        name: "Honey & cinnamon nose strip",
        how: "Mix 1 tsp honey with a pinch of cinnamon, press over the nose 10 min, massage off gently.",
        frequency: "1–2× a week",
      },
      {
        name: "Oatmeal polish",
        how: "Finely ground oats + water as a soft scrub — circular motions on congested zones only.",
        frequency: "2× a week",
      },
      {
        name: "Jojoba dissolve massage",
        how: "Massage jojoba oil over blackhead-prone areas 2–3 min; it softens the oxidized sebum plug.",
        frequency: "Nightly",
      },
    ],
    products: [
      { name: "Jojoba Oil", why: "Dissolves the hardened sebum inside pores" },
      { name: "Bentonite Clay", why: "Weekly deep-pore vacuum", query: "clay" },
      { name: "Grapeseed Oil", why: "Light cleansing oil that won't re-clog" },
    ],
  },
  dark_spots: {
    title: "Fade dark spots",
    remedies: [
      {
        name: "Aloe vera night gel",
        how: "Apply fresh aloe gel directly on spots at bedtime; aloin gently lightens over weeks.",
        frequency: "Nightly",
      },
      {
        name: "Potato juice dab",
        how: "Press fresh potato juice on spots 15 min, rinse. Patch-test first and use sunscreen by day.",
        frequency: "Alternate days",
      },
      {
        name: "Green tea compress",
        how: "Chill steeped green tea bags and press over spots — antioxidants slow new pigment.",
        frequency: "Daily",
      },
    ],
    products: [
      { name: "Rosehip Oil", why: "Natural vitamin A + C for spot renewal" },
      { name: "Licorice Extract", why: "Botanical brightener for stubborn marks", query: "licorice" },
      { name: "Sea Buckthorn Oil", why: "Regenerating omega-7 glow oil", query: "sea buckthorn" },
    ],
  },
  pigmentation: {
    title: "Even out pigmentation",
    remedies: [
      {
        name: "Turmeric & yogurt brightening mask",
        how: "Pinch of turmeric + 1 tbsp yogurt over affected areas, 10–15 min. Curcumin calms melanin activity.",
        frequency: "3× a week",
      },
      {
        name: "Aloe vera massage",
        how: "Massage fresh aloe into pigmented patches morning and night.",
        frequency: "Twice daily",
      },
      {
        name: "Sun-shield habit",
        how: "Pigmentation rebounds with UV — a mineral sunscreen or shade habit protects every remedy above.",
        frequency: "Every morning",
      },
    ],
    products: [
      { name: "Rosehip Oil", why: "Trans-retinoic acid, nature's tone-evener" },
      { name: "Sea Buckthorn Oil", why: "Repairing carotenoids for even tone", query: "sea buckthorn" },
      { name: "Licorice Extract", why: "Traditional melanin-calming root", query: "licorice" },
    ],
  },
  pores: {
    title: "Refine visible pores",
    remedies: [
      {
        name: "Ice cube tighten",
        how: "Glide an ice cube (or frozen rosewater) over clean skin 1–2 min to visibly tighten pores.",
        frequency: "Daily",
      },
      {
        name: "Weekly clay mask",
        how: "Thin layer of bentonite or multani mitti on the T-zone, rinse before fully dry.",
        frequency: "Weekly",
      },
      {
        name: "Rosewater + witch hazel toner",
        how: "Equal parts, patted on after cleansing to keep pores clear and tight.",
        frequency: "Twice daily",
      },
    ],
    products: [
      { name: "Witch Hazel", why: "Nature's pore-tightening astringent" },
      { name: "Bentonite Clay", why: "Draws out what stretches pores", query: "clay" },
      { name: "Jojoba Oil", why: "Keeps sebum thin so pores stay small" },
    ],
  },
  redness: {
    title: "Soothe redness & irritation",
    remedies: [
      {
        name: "Cold chamomile compress",
        how: "Steep chamomile tea, chill, soak a soft cloth and rest it on red areas for 10 min.",
        frequency: "Daily",
      },
      {
        name: "Colloidal oat mask",
        how: "Blend oats to powder, mix with cool water, apply 15 min — oat beta-glucans calm the skin barrier.",
        frequency: "2–3× a week",
      },
      {
        name: "Cucumber & aloe cool-down",
        how: "Blend cucumber with 1 tbsp aloe gel; chill and apply as a rescue mask after sun or flare-ups.",
        frequency: "As needed",
      },
    ],
    products: [
      { name: "Aloe Vera", why: "First-line botanical anti-inflammatory" },
      { name: "Calendula Oil", why: "Gentle flower infusion for reactive skin", query: "calendula" },
      { name: "Chamomile", why: "Azulene-rich calm in a cup or a compress", query: "chamomile" },
    ],
  },
  wrinkles: {
    title: "Soften fine lines",
    remedies: [
      {
        name: "Rosehip facial massage",
        how: "Massage 3–4 drops of rosehip oil upward along the lines for 5 min each night.",
        frequency: "Nightly",
      },
      {
        name: "Banana & honey plumping mask",
        how: "Mash ¼ ripe banana with 1 tsp honey, 15 min — natural humectants plump fine lines.",
        frequency: "2× a week",
      },
      {
        name: "Gua sha / spoon lift",
        how: "With an oiled face, sweep a cool gua sha stone (or spoon back) outward and upward.",
        frequency: "3× a week",
      },
    ],
    products: [
      { name: "Rosehip Oil", why: "Natural retinol-alternative for renewal" },
      { name: "Argan Oil", why: "Vitamin E elasticity support", query: "argan" },
      { name: "Pomegranate Seed Oil", why: "Collagen-protecting antioxidants", query: "pomegranate" },
    ],
  },
  dark_circles: {
    title: "Brighten under-eyes",
    remedies: [
      {
        name: "Chilled green tea bags",
        how: "Rest cold, used green tea bags on closed eyes for 10 min — caffeine constricts the vessels that shadow.",
        frequency: "Daily",
      },
      {
        name: "Cold cucumber slices",
        how: "Straight from the fridge, 10 minutes; hydrates and de-puffs the under-eye.",
        frequency: "Daily",
      },
      {
        name: "Almond oil bedtime tap",
        how: "Tap (never rub) 1 drop of sweet almond oil under each eye before sleep.",
        frequency: "Nightly",
      },
      {
        name: "Sleep & water audit",
        how: "Most under-eye shadowing tracks sleep debt and dehydration — 7–8 h and steady water first.",
        frequency: "Ongoing",
      },
    ],
    products: [
      { name: "Sweet Almond Oil", why: "The classic gentle under-eye oil", query: "almond" },
      { name: "Rosehip Oil", why: "Thickens and brightens thin under-eye skin" },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Metric-triggered care (from measured scores, not the concern model) */
/* ------------------------------------------------------------------ */

/** Shown when measured brightness (L*) score is low — dull, tired-looking skin. */
export const DULL_SKIN_REC: RecommendationEntry = {
  title: "Bring back the glow",
  remedies: [
    {
      name: "Papaya pulp mask",
      how: "Mash ripe papaya over the face for 15 min — natural papain enzymes lift dull surface cells.",
      frequency: "2× a week",
    },
    {
      name: "Turmeric & honey glow mask",
      how: "Pinch of turmeric + 1 tbsp raw honey, 10 min, rinse — instant warmth and radiance.",
      frequency: "Weekly",
    },
    {
      name: "2-minute face massage",
      how: "Upward oil massage every night boosts circulation, the cheapest brightener there is.",
      frequency: "Nightly",
    },
  ],
  products: [
    { name: "Rosehip Oil", why: "Vitamin C–rich radiance oil" },
    { name: "Sea Buckthorn Oil", why: "Carotenoid glow booster", query: "sea buckthorn" },
    { name: "Amla", why: "The vitamin-C richest botanical", query: "amla" },
  ],
};

/** Measured redness score at/above this → show the redness care entry. */
export const REDNESS_SCORE_TRIGGER = 55;
/** Measured brightness score below this → show the dull-skin entry. */
export const BRIGHTNESS_SCORE_TRIGGER = 40;

/** Pretty display names for concern keys coming from the API. */
export const CONCERN_LABELS: Record<string, string> = {
  acne: "Acne",
  blackheads: "Blackheads",
  dark_spots: "Dark Spots",
  pigmentation: "Pigmentation",
  pores: "Enlarged Pores",
  redness: "Redness",
  wrinkles: "Fine Lines",
  dark_circles: "Dark Circles",
};
