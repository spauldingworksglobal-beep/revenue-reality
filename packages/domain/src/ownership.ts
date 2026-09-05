import type { Cadence, ConfidenceValue, DelegationType, ID, Money, Percent } from "./primitives";

export type DistributionRule =
  | "SAME_AS_OWNERSHIP"
  | "EQUAL_SPLIT"
  | "CUSTOM_PERCENTAGE"
  | "DISCRETIONARY"
  | "OTHER";

export interface ScenarioDistributionPolicy {
  scenarioId: ID;
  rule: DistributionRule;
  notes?: string;
}

/**
 * NOW only — owners often can't cleanly separate salary/draw/distribution
 * (Build Spec §20 HCF fixture: "Owner role breakdown: Unknown / restructuring").
 * Both modes are valid saved states.
 */
export interface OwnerCashReceived {
  mode: "UNCLASSIFIED_TOTAL" | "CLASSIFIED";
  unclassifiedTotal?: ConfidenceValue<Money>; // mode = UNCLASSIFIED_TOTAL
  laborCompensation?: ConfidenceValue<Money>; // mode = CLASSIFIED
  profitDistribution?: ConfidenceValue<Money>; // mode = CLASSIFIED
}

export interface OwnerEconomics {
  scenarioId: ID;
  ownerId: ID;
  /**
   * null when this owner's ownership share has never been confirmed — genuinely
   * unknown, never assumed/equal-split. Only consumed by the SAME_AS_OWNERSHIP
   * distribution rule; every other rule ignores it entirely, so unknown ownership
   * never blocks a NOW calculation unless "Same as ownership" is actually chosen.
   * When non-null, Σ across a scenario's owners must equal 1 (100%) — validated.
   */
  ownershipPercent: Percent | null;
  distributionPercent: Percent | null; // entered only for CUSTOM_PERCENTAGE; engine derives it otherwise; null for DISCRETIONARY/OTHER
  isPrimaryRespondent: boolean; // whose businessFundedRequirement drives backward-solving

  // NOW
  cashReceived?: OwnerCashReceived;

  // NEXT / ULTIMATELY
  targetLaborCompensation?: ConfidenceValue<Money>;
  targetProfitDistribution?: ConfidenceValue<Money>; // entered directly, OR engine-backward-solved for the primary respondent
  profitDistributionSource?: "ENTERED" | "BACKWARD_SOLVED";
}

export interface OwnerInput {
  scenarioId: ID;
  ownerId: ID;
  hoursWeek: ConfidenceValue<number>;
  personalCashInvestment: Money;
  personallyPaidCosts: Money;
  broadFunctions?: string[];
  functionConfidence: "KNOWN" | "ROLE_CHANGING" | "NOT_SURE";
  // Labor compensation lives on OwnerEconomics, not here — one owner-pay figure
  // living in two places is exactly the labor-vs-ownership-return conflation
  // Ownership Economics + Distribution Waterfall exists to fix.
}

/** "What work should no longer depend on you?" (NEXT and ULTIMATELY) — user-entered cost or explicitly incomplete, never a looked-up market rate. */
export interface DelegationItem {
  id: ID;
  scenarioId: ID;
  functionLabel: string;
  delegationType: DelegationType;
  replacementCost: ConfidenceValue<Money> | null; // null = confidence INCOMPLETE, still a valid saved state
  cadence: Cadence;
}
