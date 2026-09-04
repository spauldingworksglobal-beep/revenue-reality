import type { Cadence, ChangeType, ConfidenceValue, ID, Money } from "./primitives.js";

/**
 * Disjoint by construction. DEBT_PAYMENT (life category) is required minimum
 * debt service; DEBT_REDUCTION (security item) is discretionary accelerated
 * payoff, a wealth-building goal. Nothing an owner enters can land in both
 * buckets, so lifeRequirement + securityRequirement is always a safe sum.
 */
export type LifeCategoryKind =
  | "HOUSING"
  | "FOOD"
  | "TRANSPORTATION"
  | "HEALTHCARE"
  | "DEPENDENTS"
  | "DEBT_PAYMENT"
  | "COMMUNICATIONS"
  | "PERSONAL_CARE"
  | "FAMILY_SUPPORT"
  | "OTHER";

export type SecurityItemKind =
  | "EMERGENCY_SAVINGS"
  | "RETIREMENT"
  | "INVESTING"
  | "DEBT_REDUCTION"
  | "INSURANCE_BENEFITS"
  | "EDUCATION_HOME_MAJOR_GOAL"
  | "TRAVEL"
  | "GIVING_FAMILY_SUPPORT"
  | "OTHER";

export interface LifeCategory {
  id: ID;
  lifeProfileId: ID;
  kind: LifeCategoryKind;
  label: string;
  currentAmount: ConfidenceValue<Money> | null;
  intendedAmount: ConfidenceValue<Money> | null;
  cadence: Cadence;
  changeType: ChangeType;
}

export interface SecurityItem {
  id: ID;
  lifeProfileId: ID;
  kind: SecurityItemKind;
  label: string;
  currentAmount: ConfidenceValue<Money> | null;
  intendedAmount: ConfidenceValue<Money> | null;
  cadence: Cadence;
}

export interface DeferredNeed {
  id: ID;
  lifeProfileId: ID;
  description: string;
  estimatedAmount: ConfidenceValue<Money> | null;
  includeInIntended: boolean; // owner's explicit choice, never implied
}

/** Informational only — the figure the engine consumes lives on ScenarioLifeAssumption. */
export interface FundingSource {
  id: ID;
  lifeProfileId: ID;
  horizon: "CURRENT" | "INTENDED";
  sourceType: "BUSINESS" | "JOB" | "SPOUSE_PARTNER" | "FREELANCE" | "PASSIVE" | "OTHER";
  amount: ConfidenceValue<Money> | null;
}

export interface LifeProfile {
  id: ID;
  sessionId: ID;
  currentCategories: LifeCategory[];
  intendedCategories: LifeCategory[];
  currentSecurity: SecurityItem[];
  intendedSecurity: SecurityItem[];
  deferredNeeds: DeferredNeed[];
  currentFundingSources: FundingSource[];
  intendedFundingSources: FundingSource[];
  intendedLifeOutcomes: string[];
}

export interface TimeProfile {
  id: ID;
  sessionId: ID;
  currentAvailableHoursWeek: ConfidenceValue<number>;
  currentBusinessHoursWeek: ConfidenceValue<number>;
  intendedAvailableHoursWeek: ConfidenceValue<number>;
  ultimateBusinessHoursWeek: ConfidenceValue<number>;
  desiredWorkTypes: string[];
  otherTimeClaims: { label: string; hoursWeek?: number }[];
  lifePriorityReservations: string[];
}
