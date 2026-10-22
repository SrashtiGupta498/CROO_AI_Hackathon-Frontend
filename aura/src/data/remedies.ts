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

/**
 * The three Ayurvedic doshas. AURA leads with dosha-aware guidance:
 *   pitta → heat: acne, redness, inflammation
 *   vata  → dryness, fine lines, dullness
 *   kapha → heaviness: oiliness, congestion, blackheads, large pores
 */
export type Dosha = "vata" | "pitta" | "kapha";

/**
 * A "clinical active" remedy (the quiet "🧪 Clinical actives" tier). AURA is
 * Ayurveda-first, so this tier is DEMOTED: it only surfaces for moderate+
 * concerns, and every active leads with its botanical source. Anything that
 * really needs a professional is flagged `otc: false` and framed as a referral.
 */
export interface ChemRemedy {
  name: string; // "Salicylic Acid 2% (BHA)"
  ingredient: string; // canonical active, used for Ingredient Library search
  natural_source?: string; // "from willow bark" — keeps this tier on-brand
  strength?: string; // "2%"
  how: string; // usage guidance
  caution?: string; // shown as an amber safety note
  otc?: boolean; // true = drugstore, false = ask a dermatologist (referral tier)
}

export interface ProductRec {
  name: string;
  why: string;
  query?: string;
}

export interface RecommendationEntry {
  title: string;
  /** Ayurvedic dosha this concern maps to, for on-brand framing. */
  dosha?: Dosha;
  remedies: Remedy[]; // 🌿 Ayurvedic ritual (hero tier)
  chemical?: ChemRemedy[]; // 🧪 clinical actives (gated by severity)
  products: ProductRec[]; // 🪷 organic picks
  /** When detected as `significant`, unlocks the targeted product plan block. */
  escalate?: boolean;
}

/** Human-readable dosha label + the imbalance it signals. */
export const DOSHA_INFO: Record<Dosha, { label: string; signals: string }> = {
  vata: { label: "Vata", signals: "dryness, fine lines, dullness" },
  pitta: { label: "Pitta", signals: "heat, redness, active breakouts" },
  kapha: { label: "Kapha", signals: "oiliness, congestion, large pores" },
};

/* ------------------------------------------------------------------ */
/* Base ritual per skin type (always shown, lowest priority)           */
/* ------------------------------------------------------------------ */

export const SKIN_TYPE_RECS: Record<string, RecommendationEntry> = {
  dry: {
    title: "For your dry skin",
    dosha: "vata",
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
    dosha: "kapha",
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
    dosha: "pitta",
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
    chemical: [
      { name: "Bakuchiol 1%", ingredient: "bakuchiol", natural_source: "from Ayurvedic babchi seed", strength: "1%",
        how: "PM serum; the plant-based retinol alternative — smooths and clears without the sting.",
        caution: "Gentle enough for most; still wear SPF by day.", otc: true },
      { name: "Salicylic Acid 2% (BHA)", ingredient: "salicylic acid", natural_source: "from willow bark", strength: "2%",
        how: "PM cleanser or leave-on serum; start 3×/week and build up.",
        caution: "Follow with SPF next morning — increases sun sensitivity.", otc: true },
      { name: "Azelaic Acid 10%", ingredient: "azelaic acid", natural_source: "from grains (wheat, barley)", strength: "10%",
        how: "PM serum; clears bumps and fades post-acne marks together.",
        caution: "Mild tingling on first use is normal.", otc: true },
      { name: "Niacinamide 5%", ingredient: "niacinamide", natural_source: "vitamin B3", strength: "5%",
        how: "AM + PM serum; calms redness and regulates oil.",
        caution: "Well tolerated by nearly all skin types.", otc: true },
      { name: "Benzoyl Peroxide / Adapalene", ingredient: "benzoyl peroxide", strength: "2.5–0.1%",
        how: "For persistent or cystic acne a dermatologist may prescribe these.",
        caution: "Stronger clinical options — best introduced under professional guidance.", otc: false },
    ],
    escalate: true,
    products: [
      { name: "Tea Tree Oil", why: "Classic antibacterial — always dilute in a carrier oil", query: "tea tree" },
      { name: "Neem Oil", why: "Traditional blemish-fighting botanical", query: "neem" },
      { name: "Manuka Honey", why: "High-UMF honey for spot care", query: "manuka" },
      { name: "Witch Hazel", why: "Gentle toner to keep pores clear" },
    ],
  },
  blackheads: {
    title: "Clear blackheads gently",
    dosha: "kapha",
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
    chemical: [
      { name: "Salicylic Acid 2% (BHA)", ingredient: "salicylic acid", natural_source: "from willow bark", strength: "2%",
        how: "PM on the nose/T-zone; dissolves the plug inside the pore.",
        caution: "Follow with SPF next day.", otc: true },
      { name: "Glycolic Acid 7% (AHA)", ingredient: "glycolic acid", natural_source: "from sugarcane", strength: "7%",
        how: "Leave-on toner 2×/week to lift surface build-up.",
        caution: "Don't layer with BHA the same night when starting out.", otc: true },
      { name: "Bakuchiol 1%", ingredient: "bakuchiol", natural_source: "from Ayurvedic babchi seed", strength: "1%",
        how: "PM; gently normalizes pore turnover — a plant retinol alternative.",
        caution: "Introduce slowly; SPF by day.", otc: true },
    ],
    products: [
      { name: "Jojoba Oil", why: "Dissolves the hardened sebum inside pores" },
      { name: "Bentonite Clay", why: "Weekly deep-pore vacuum", query: "clay" },
      { name: "Grapeseed Oil", why: "Light cleansing oil that won't re-clog" },
    ],
  },
  dark_spots: {
    title: "Fade dark spots",
    dosha: "pitta",
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
    chemical: [
      { name: "Vitamin C 10% (L-ascorbic)", ingredient: "vitamin c", natural_source: "from citrus / amla", strength: "10%",
        how: "AM serum; brightens and shields spots from re-darkening.",
        caution: "Layer under SPF for best effect.", otc: true },
      { name: "Azelaic Acid 10%", ingredient: "azelaic acid", natural_source: "from grains", strength: "10%",
        how: "PM; evens tone and fades post-inflammatory marks.",
        caution: "Mild tingling at first is normal.", otc: true },
      { name: "Alpha Arbutin 2%", ingredient: "alpha arbutin", natural_source: "from bearberry leaf", strength: "2%",
        how: "AM + PM; a gentle, targeted brightener for stubborn spots.",
        caution: "Consistency over weeks is key.", otc: true },
    ],
    products: [
      { name: "Rosehip Oil", why: "Natural vitamin A + C for spot renewal" },
      { name: "Licorice Extract", why: "Botanical brightener for stubborn marks", query: "licorice" },
      { name: "Sea Buckthorn Oil", why: "Regenerating omega-7 glow oil", query: "sea buckthorn" },
    ],
  },
  pigmentation: {
    title: "Even out pigmentation",
    dosha: "pitta",
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
    chemical: [
      { name: "Alpha Arbutin 2%", ingredient: "alpha arbutin", natural_source: "from bearberry leaf", strength: "2%",
        how: "AM + PM serum; calms overactive melanin across patches.",
        caution: "Pair with daily SPF or pigment rebounds.", otc: true },
      { name: "Niacinamide 5%", ingredient: "niacinamide", natural_source: "vitamin B3", strength: "5%",
        how: "AM + PM; blocks pigment transfer to the surface.",
        caution: "Very well tolerated.", otc: true },
      { name: "Tranexamic Acid 3%", ingredient: "tranexamic acid", strength: "3%",
        how: "For melasma-type pigmentation a dermatologist may recommend it.",
        caution: "Best used under professional guidance for melasma.", otc: false },
    ],
    products: [
      { name: "Rosehip Oil", why: "Trans-retinoic acid, nature's tone-evener" },
      { name: "Sea Buckthorn Oil", why: "Repairing carotenoids for even tone", query: "sea buckthorn" },
      { name: "Licorice Extract", why: "Traditional melanin-calming root", query: "licorice" },
    ],
  },
  pores: {
    title: "Refine visible pores",
    dosha: "kapha",
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
    chemical: [
      { name: "Salicylic Acid 2% (BHA)", ingredient: "salicylic acid", natural_source: "from willow bark", strength: "2%",
        how: "PM on the T-zone; keeps pores clear so they read smaller.",
        caution: "Follow with SPF next day.", otc: true },
      { name: "Niacinamide 5%", ingredient: "niacinamide", natural_source: "vitamin B3", strength: "5%",
        how: "AM + PM; regulates oil and tightens the look of pores over time.",
        caution: "Very well tolerated.", otc: true },
    ],
    products: [
      { name: "Witch Hazel", why: "Nature's pore-tightening astringent" },
      { name: "Bentonite Clay", why: "Draws out what stretches pores", query: "clay" },
      { name: "Jojoba Oil", why: "Keeps sebum thin so pores stay small" },
    ],
  },
  redness: {
    title: "Soothe redness & irritation",
    dosha: "pitta",
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
    chemical: [
      { name: "Niacinamide 5%", ingredient: "niacinamide", natural_source: "vitamin B3", strength: "5%",
        how: "AM + PM; strengthens the barrier so skin flushes less.",
        caution: "Gentle and well tolerated by reactive skin.", otc: true },
      { name: "Azelaic Acid 10%", ingredient: "azelaic acid", natural_source: "from grains", strength: "10%",
        how: "PM; calms persistent redness and rosacea-type bumps.",
        caution: "Introduce slowly if skin is very reactive.", otc: true },
    ],
    products: [
      { name: "Aloe Vera", why: "First-line botanical anti-inflammatory" },
      { name: "Calendula Oil", why: "Gentle flower infusion for reactive skin", query: "calendula" },
      { name: "Chamomile", why: "Azulene-rich calm in a cup or a compress", query: "chamomile" },
    ],
  },
  wrinkles: {
    title: "Soften fine lines",
    dosha: "vata",
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
    chemical: [
      { name: "Bakuchiol 1%", ingredient: "bakuchiol", natural_source: "from Ayurvedic babchi seed", strength: "1%",
        how: "PM serum; plumps fine lines like retinol, without the irritation.",
        caution: "Pregnancy-friendly plant alternative; still wear SPF.", otc: true },
      { name: "Retinol 0.3%", ingredient: "retinol", natural_source: "vitamin A", strength: "0.3%",
        how: "PM, 2×/week building to nightly; the gold-standard line-smoother.",
        caution: "Avoid in pregnancy; introduce slowly, always SPF by day.", otc: true },
      { name: "Peptide serum", ingredient: "peptides", strength: "—",
        how: "AM + PM; signals collagen support with zero irritation.",
        caution: "Layers well with everything.", otc: true },
    ],
    products: [
      { name: "Rosehip Oil", why: "Natural retinol-alternative for renewal" },
      { name: "Argan Oil", why: "Vitamin E elasticity support", query: "argan" },
      { name: "Pomegranate Seed Oil", why: "Collagen-protecting antioxidants", query: "pomegranate" },
    ],
  },
  dark_circles: {
    title: "Brighten under-eyes",
    dosha: "vata",
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
    chemical: [
      { name: "Caffeine eye serum 5%", ingredient: "caffeine", natural_source: "from green coffee bean", strength: "5%",
        how: "AM; de-puffs and constricts the vessels that cast shadow.",
        caution: "Pat gently — never rub the eye area.", otc: true },
      { name: "Vitamin C 5% (eye)", ingredient: "vitamin c", natural_source: "from citrus / amla", strength: "5%",
        how: "AM; brightens pigment-type under-eye darkness.",
        caution: "Use an eye-safe low strength.", otc: true },
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
  dosha: "vata",
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
  chemical: [
    { name: "Vitamin C 10% (L-ascorbic)", ingredient: "vitamin c", natural_source: "from citrus / amla", strength: "10%",
      how: "AM serum; instant antioxidant radiance and tone-evening.",
      caution: "Layer under SPF.", otc: true },
    { name: "Glycolic Acid 7% (AHA)", ingredient: "glycolic acid", natural_source: "from sugarcane", strength: "7%",
      how: "PM 2×/week; sweeps away dull surface cells for glow.",
      caution: "Increases sun sensitivity — SPF essential.", otc: true },
  ],
  products: [
    { name: "Rosehip Oil", why: "Vitamin C–rich radiance oil" },
    { name: "Sea Buckthorn Oil", why: "Carotenoid glow booster", query: "sea buckthorn" },
    { name: "Amla", why: "The vitamin-C richest botanical", query: "amla" },
  ],
};

// Both thresholds below were measured against 44 real selfies on 2026-08-11.
// Round numbers mislead badly here, so these are set from the observed
// distribution, not picked by eye:
//   redness    p10 35.6 · p25 48.5 · p50 55.0 · p75 64.9 · p85 71.7 · p90 79.1
//   brightness p5  46.7 · p10 49.9 · p25 50.8 · p50 55.1 · p75 60.3 · p90 64.9
//
// The old values were both wrong in opposite directions: redness sat at 55,
// which is EXACTLY the median, so half of all users were shown redness care;
// brightness sat at 40, below the observed minimum of 42.8, so the dull-skin
// entry could never fire at all.
//
// ⚠️ Neither a_star nor L_star is lighting-normalized (see the honest-signal
// policy in docs/AURA_COACH_SYSTEM_DESIGN.md) — a warm bulb reads as redness,
// a dim room reads as dullness. They are kept only as outlier triggers, where
// a hit is more likely to be real skin than a capture artifact, and the copy
// phrases them as an observation rather than a finding. The real fix is
// capture standardization, not a different number.
// Sample caveat: 44 images from a single source, so these are a first
// calibration — re-derive once a real-selfie test set exists.

/** Measured redness score at/above this → show the redness care entry. ~p85. */
export const REDNESS_SCORE_TRIGGER = 72;
/** Measured brightness score below this → show the dull-skin entry. ~p10. */
export const BRIGHTNESS_SCORE_TRIGGER = 50;

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
