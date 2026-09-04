import type {
  Cadence,
  CogsMethod,
  ConfidenceLevel,
  ConfidenceValue,
  DemandState,
  ID,
  Money,
  Percent,
} from "./primitives";

export interface CogsInput {
  method: CogsMethod;
  perUnit?: ConfidenceValue<Money>;
  batch?: { batchCost: Money; sellableUnits: number };
  components?: { label: string; amount: Money }[];
  estimateNote?: string;
}

/** e.g. payment processing fee, shipping, sales commission — NOT COGS. */
export interface VariableCostItem {
  id: ID;
  label: string;
  amountPerUnit?: ConfidenceValue<Money>;
  percentOfPrice?: ConfidenceValue<Percent>; // alternate mode — never both set
}

export interface ScenarioRevenueStream {
  scenarioId: ID;
  streamId: ID;
  priceOrAvgValue: ConfidenceValue<Money>;
  volume: ConfidenceValue<number> | null;
  mixWeight: Percent;
  cogs: CogsInput;
  cogsPerUnit: Money; // resolved, engine-cached
  otherVariableCosts: VariableCostItem[];
  otherVariableCostPerUnit: Money; // resolved sum, engine-cached
  grossProfitPerUnit: Money; // price − cogsPerUnit
  grossMargin: Percent; // grossProfitPerUnit / price
  contributionPerUnit: Money; // price − cogsPerUnit − otherVariableCostPerUnit
  contributionMargin: Percent; // contributionPerUnit / price
}

export interface OperatingCost {
  id: ID;
  scenarioId: ID;
  category: string;
  amount: Money;
  cadence: Cadence;
  knownOrEstimated: "KNOWN" | "ESTIMATED";
  confidence: ConfidenceLevel;
  isPartialList: boolean;
}

export type CapitalRequirementCategory =
  | "RESERVE"
  | "WORKING_CAPITAL"
  | "INVENTORY_DEPOSIT"
  | "EQUIPMENT"
  | "REINVESTMENT"
  | "DEBT_REDUCTION"
  | "OTHER";

export type CapitalNature = "ONE_TIME" | "RECURRING";

export interface CapitalRequirementItem {
  id: ID;
  scenarioId: ID;
  category: CapitalRequirementCategory;
  amount: Money;
  nature: CapitalNature;
  cadence: Cadence; // ONE_TIME items use cadence "ONE_TIME"
  confidence: ConfidenceLevel;
}

export interface Capacity {
  scenarioId: ID;
  demandState: DemandState;
  maxVolume?: number;
  constraints: string[];
}
