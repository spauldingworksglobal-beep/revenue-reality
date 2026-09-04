/**
 * Shared primitives. Money and Percent are decimal strings at rest — never a
 * native JS number/float. All arithmetic on them happens in
 * @revenue-reality/revenue-engine via decimal.js.
 */

export type ID = string; // uuid v4
export type Money = string; // decimal string, e.g. "1622.00"
export type Percent = string; // decimal ratio 0–1, e.g. "0.4636" — never a bare "46.36"
export type ISODate = string;

export type Cadence = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "ONE_TIME";

export type ConfidenceLevel = "EXACT" | "STRONG_ESTIMATE" | "ROUGH_ESTIMATE" | "INCOMPLETE";

export interface ConfidenceValue<T> {
  value: T;
  confidence: ConfidenceLevel;
  note?: string;
}

/** Alternate entry modes — never combined for the same figure. */
export type FundingInputMode = "AMOUNT" | "PERCENT_OF_TOTAL";

export type ChangeType = "KEEP" | "REDUCE" | "INCREASE" | "ADD" | "REMOVE";
export type ScenarioType = "NOW" | "NEXT" | "ULTIMATELY";

/** Reused by both ScenarioLifeAssumption and ScenarioTimeAssumption. */
export type LifeSource = "CURRENT" | "NEXT" | "INTENDED";

export type CogsMethod = "PER_UNIT" | "PER_BATCH" | "COMPONENT_BUILDUP" | "ESTIMATE";

export type BusinessModelType =
  | "PRODUCT"
  | "SERVICE"
  | "RETAIL_HOSPITALITY"
  | "SUBSCRIPTION"
  | "PROJECT_CONTRACT"
  | "MIXED";

export type BusinessStage = "ESTABLISHED" | "NEW" | "SEASONAL" | "RESTARTED" | "RESTRUCTURED";

export type OwnershipIntent =
  | "MOSTLY_ME"
  | "SMALL_TEAM"
  | "COMPANY_I_LEAD"
  | "RUNS_WITHOUT_ME"
  | "ASSET"
  | "UNSURE";

export type DemandState = "COMFORTABLE" | "PROBABLE" | "DIFFICULT" | "CANNOT" | "UNSURE";

export type DelegationType =
  | "EMPLOYEE"
  | "CONTRACTOR"
  | "FRACTIONAL"
  | "AUTOMATE"
  | "OUTSOURCE"
  | "ELIMINATE"
  | "UNSURE";
