import type { Business, BusinessModelType, BusinessStage, OwnershipIntent, LifeCategoryKind, SecurityItemKind } from "@revenue-reality/domain";

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

/**
 * Business Profile presets. Plain-language prompt first; the professional
 * term is taught alongside it, never required to answer, never hidden.
 */
export const BUSINESS_MODEL_OPTIONS: { value: BusinessModelType; label: string; hint: string }[] = [
  { value: "PRODUCT", label: "I make or source physical products", hint: "Revenue Reality calls this a Product model." },
  { value: "SERVICE", label: "I do work or provide a service for people", hint: "Revenue Reality calls this a Service model." },
  { value: "RETAIL_HOSPITALITY", label: "I run a storefront, restaurant, or similar space", hint: "Revenue Reality calls this Retail / Hospitality." },
  { value: "SUBSCRIPTION", label: "People pay me on an ongoing, recurring basis", hint: "Revenue Reality calls this a Subscription model." },
  { value: "PROJECT_CONTRACT", label: "I take on discrete projects or contracts", hint: "Revenue Reality calls this Project / Contract." },
  { value: "MIXED", label: "It's a mix of more than one of these", hint: "Revenue Reality calls this a Mixed model." },
];

export const BUSINESS_STAGE_OPTIONS: { value: BusinessStage; label: string }[] = [
  { value: "ESTABLISHED", label: "Established — running steadily" },
  { value: "NEW", label: "New — just getting started" },
  { value: "SEASONAL", label: "Seasonal" },
  { value: "RESTARTED", label: "Restarted after a pause" },
  { value: "RESTRUCTURED", label: "Recently restructured or materially changed" },
];

export const FUNDING_JOB_OPTIONS: { value: Business["fundingJob"]; label: string }[] = [
  { value: "SUPPLEMENT", label: "Supplement other income" },
  { value: "REPLACE", label: "Replace another income source" },
  { value: "PRIMARY", label: "Become my primary income" },
  { value: "BUILD_WEALTH", label: "Build wealth" },
  { value: "ASSET", label: "Become / operate as an asset" },
  { value: "OTHER", label: "Other" },
];

export const OWNERSHIP_INTENT_OPTIONS: { value: OwnershipIntent; label: string }[] = [
  { value: "MOSTLY_ME", label: "Mostly me" },
  { value: "SMALL_TEAM", label: "A small team" },
  { value: "COMPANY_I_LEAD", label: "A company I lead" },
  { value: "RUNS_WITHOUT_ME", label: "Runs without me" },
  { value: "ASSET", label: "An asset" },
  { value: "UNSURE", label: "Unsure yet" },
];
