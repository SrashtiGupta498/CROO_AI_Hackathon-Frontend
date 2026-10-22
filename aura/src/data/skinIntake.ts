/**
 * The 4-question intake mini-form shown before analysis. Answers are captured
 * client-side, stored with the analysis, and surfaced on the Report card so the
 * guidance feels personal. Editing this file changes the form — no logic here.
 */

export type IntakeQuestionId = "age" | "products" | "allergies" | "goal";

export interface IntakeOption {
  value: string;
  label: string;
}

export interface IntakeQuestion {
  id: IntakeQuestionId;
  label: string;
  icon: string; // material-icons-round name
  multi?: boolean; // allow multiple selections
  options: IntakeOption[];
}

/** A completed intake — value(s) per question. Strings for single, arrays for multi. */
export type SkinIntake = Partial<Record<IntakeQuestionId, string | string[]>>;

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "age",
    label: "Your age range",
    icon: "cake",
    options: [
      { value: "under_18", label: "Under 18" },
      { value: "18_24", label: "18–24" },
      { value: "25_34", label: "25–34" },
      { value: "35_44", label: "35–44" },
      { value: "45_plus", label: "45+" },
    ],
  },
  {
    id: "products",
    label: "What do you use now?",
    icon: "spa",
    options: [
      { value: "nothing", label: "Nothing regular" },
      { value: "natural_only", label: "Natural / home remedies" },
      { value: "basic", label: "Cleanser + moisturizer" },
      { value: "actives", label: "Actives (acids, retinol)" },
    ],
  },
  {
    id: "allergies",
    label: "Any known sensitivities?",
    icon: "warning_amber",
    multi: true,
    options: [
      { value: "none", label: "None" },
      { value: "fragrance", label: "Fragrance" },
      { value: "nuts", label: "Nut oils" },
      { value: "essential_oils", label: "Essential oils" },
      { value: "acids", label: "Acids / retinoids" },
    ],
  },
  {
    id: "goal",
    label: "Your main goal",
    icon: "flag",
    options: [
      { value: "clear_acne", label: "Clear acne" },
      { value: "even_tone", label: "Even tone / spots" },
      { value: "glow", label: "Glow / radiance" },
      { value: "anti_age", label: "Fine lines" },
      { value: "calm", label: "Calm sensitivity" },
    ],
  },
];

const OPTION_LABEL: Record<string, string> = INTAKE_QUESTIONS.flatMap(
  (q) => q.options
).reduce((acc, o) => ({ ...acc, [o.value]: o.label }), {});

/** Pretty label for a stored intake value. */
export function intakeLabel(value: string): string {
  return OPTION_LABEL[value] ?? value;
}

/** True if the user flagged a sensitivity that clashes with a clinical active. */
export function hasActivesSensitivity(intake: SkinIntake | null): boolean {
  const a = intake?.allergies;
  const arr = Array.isArray(a) ? a : a ? [a] : [];
  return arr.includes("acids");
}
