import type { ConfidenceLevel, ID, ISODate, Money, Percent } from "./primitives";

export type OwnerSupportSignal =
  | "BUSINESS_SUPPORTS_OWNER"
  | "OWNER_SUPPORTS_BUSINESS"
  | "BOTH"
  | "INSUFFICIENT_DATA";

export type CapacitySignal = "DEMAND_CONSTRAINED" | "CAPACITY_CONSTRAINED" | "BOTH" | "NEITHER" | "INSUFFICIENT_DATA";

export type TimeSignal = "FITS" | "EXCEEDS_AVAILABLE" | "INSUFFICIENT_DATA";

export interface StreamEconomicsResult {
  streamId: ID;
  grossMargin: Percent;
  contributionMargin: Percent;
}

export interface OwnerEconomicsResult {
  ownerId: ID;
  laborCompensation: Money;
  profitDistribution: Money;
  totalOwnerEconomicBenefit: Money; // laborCompensation + profitDistribution
}

export interface RetainedCapitalResult {
  recurring: Money;
  oneTime: Money;
  total: Money;
}

export interface PrimaryOwnerBenefitVsRequirement {
  businessFundedPersonalEconomicRequirement: Money;
  totalOwnerEconomicBenefit: Money;
  gap: Money; // benefit − requirement; negative = shortfall
}

export interface ConfidenceFlag {
  field: string;
  confidence: ConfidenceLevel;
}

/** Engine output — immutable per scenario revision. See scenario_revision / scenario_result in the schema. */
export interface ScenarioResult {
  scenarioRevisionId: ID;
  formulaVersion: string;
  computedAt: ISODate;

  actualRevenue: Money | null; // NOW only — measured; null for NEXT/ULTIMATELY
  /**
   * null when the owner's funding-responsibility question (ScenarioLifeAssumption.
   * outsideFundingRetained) has never been confirmed — a specific policy fact, never
   * defaulted/assumed. Every other field below is unaffected and still computes.
   */
  requiredEconomicContribution: Money | null;
  weightedContributionMargin: Percent;
  requiredRevenue: Money | null;
  requiredVolumeByStream: { streamId: ID; volume: number }[] | null;
  breakEvenFloor: {
    revenue: Money;
    volumeByStream: { streamId: ID; volume: number }[];
    basis: "KNOWN_OPEX_ONLY";
  } | null;
  perStreamEconomics: StreamEconomicsResult[];

  // Distribution waterfall
  operatingEconomicSurplus: Money; // contribution economics − known opex − Σ owner labor compensation
  requiredRetainedBusinessCapital: RetainedCapitalResult;
  distributableEconomicSurplus: Money; // operatingEconomicSurplus − retained capital total — never sourced elsewhere
  ownerEconomicsResults: OwnerEconomicsResult[];
  /** null when funding responsibility is unconfirmed — there is no requirement figure to compare against. */
  primaryOwnerBenefitVsRequirement: PrimaryOwnerBenefitVsRequirement | null;

  ownerSupportSignal: OwnerSupportSignal; // derived from primaryOwnerBenefitVsRequirement, not revenue
  capacitySignal: CapacitySignal;
  timeSignal: TimeSignal;
  confidenceFlags: ConfidenceFlag[];
}
