import type { LifeCategoryKind, SecurityItemKind } from "@revenue-reality/domain";

/**
 * Guided category prompts (Method v1.4 §02 / Build Spec §04, Life 1 & 3).
 * These are UI framing only — the domain's LifeCategoryKind/SecurityItemKind
 * enums are the actual source of truth. "OTHER" is always available for
 * anything real that doesn't fit a preset.
 */
export const LIFE_CATEGORY_PRESETS: { kind: LifeCategoryKind; label: string }[] = [
  { kind: "HOUSING", label: "Housing" },
  { kind: "FOOD", label: "Food" },
  { kind: "TRANSPORTATION", label: "Transportation" },
  { kind: "HEALTHCARE", label: "Healthcare" },
  { kind: "DEPENDENTS", label: "Dependents" },
  { kind: "DEBT_PAYMENT", label: "Debt payments (required minimums)" },
  { kind: "COMMUNICATIONS", label: "Communications" },
  { kind: "PERSONAL_CARE", label: "Personal care" },
  { kind: "FAMILY_SUPPORT", label: "Family support" },
];

export const SECURITY_ITEM_PRESETS: { kind: SecurityItemKind; label: string }[] = [
  { kind: "EMERGENCY_SAVINGS", label: "Emergency savings" },
  { kind: "RETIREMENT", label: "Retirement" },
  { kind: "INVESTING", label: "Investing" },
  { kind: "DEBT_REDUCTION", label: "Debt reduction (accelerated, beyond required payments)" },
  { kind: "INSURANCE_BENEFITS", label: "Insurance / benefits" },
  { kind: "EDUCATION_HOME_MAJOR_GOAL", label: "Education, home, or major goal" },
  { kind: "TRAVEL", label: "Travel" },
  { kind: "GIVING_FAMILY_SUPPORT", label: "Giving / family support" },
];

export const INTENDED_LIFE_OUTCOME_OPTIONS = [
  "Stability",
  "Flexibility",
  "Family time",
  "Health",
  "Travel",
  "Caregiving",
  "Creative freedom",
] as const;

/**
 * "Categorical language may help frame the question, but the saved/
 * calculated value must resolve to an explicit owner-confirmed amount or
 * percentage" — these labels never write a value on their own. They only
 * pre-fill a suggested starting point in the amount/percent input, which the
 * owner must still confirm (or overwrite) before it can be saved.
 */
export const FUNDING_SHARE_PRESETS: { label: string; suggestedPercent: string }[] = [
  { label: "Supplement", suggestedPercent: "25" },
  { label: "Significant", suggestedPercent: "50" },
  { label: "Primary", suggestedPercent: "75" },
  { label: "All", suggestedPercent: "100" },
];

/** Quick-add suggestions for competing time claims — context only, never quantified by requirement. */
export const TIME_CLAIM_PRESETS = [
  "Another job",
  "Caregiving",
  "Children / family responsibilities",
  "Health",
  "School",
  "Commuting",
  "Household responsibilities",
] as const;

export const DESIRED_WORK_TYPE_OPTIONS = [
  "Create / deliver the work",
  "Sell",
  "Lead",
  "Manage the team",
  "Strategy",
  "Relationships",
] as const;

/** Qualitative only — no cost modeling here. What eventually shouldn't depend on the owner. */
export const WORK_TO_DELEGATE_OPTIONS = [
  "Day-to-day delivery / production",
  "Selling",
  "Bookkeeping / admin",
  "Customer support",
  "Marketing",
  "Operations",
] as const;

/** What the business must leave room for — Build Spec Time-6. */
export const LIFE_PRIORITY_OPTIONS = [
  "Sleep / health",
  "Family",
  "Another career",
  "Relationships",
  "Flexibility",
  "Creative work",
  "Community",
  "Travel",
] as const;
