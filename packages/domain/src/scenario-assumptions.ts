import type {
  ConfidenceLevel,
  ConfidenceValue,
  FundingInputMode,
  ID,
  LifeSource,
  Money,
  Percent,
} from "./primitives.js";

export interface OutsideFundingRetained {
  mode: FundingInputMode;
  amount?: Money; // required iff mode === "AMOUNT"
  percentOfTotal?: Percent; // required iff mode === "PERCENT_OF_TOTAL" — never set alongside amount
  confidence: ConfidenceLevel;
}

/**
 * Funding responsibility is ONE calculation, not two stacked adjustments.
 * totalPersonalEconomicRequirement and businessFundedRequirement are both
 * derived (see @revenue-reality/revenue-engine `resolveBusinessFundedRequirement`)
 * — never independently stored/overridable, so the calculation can't drift.
 */
export interface ScenarioLifeAssumption {
  scenarioId: ID;
  source: LifeSource;
  lifeRequirement: Money; // Σ life_category amounts for this horizon (security excluded)
  securityRequirement: Money; // Σ security_item amounts for this horizon (life excluded)
  outsideFundingRetained: OutsideFundingRetained;
  selectedLifeChanges: string[]; // NEXT only
}

/** Mirrors ScenarioLifeAssumption. NOW=CURRENT actuals, NEXT=selected intermediate target, ULTIMATELY=INTENDED anchors. */
export interface ScenarioTimeAssumption {
  scenarioId: ID;
  source: LifeSource;
  availableHoursWeek: ConfidenceValue<number>;
  businessHoursWeek: ConfidenceValue<number>;
  otherTimeClaims: { label: string; hoursWeek?: number }[];
  lifePriorityReservations: string[];
}
