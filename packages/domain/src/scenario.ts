import type { ID, ISODate, Money, ScenarioType } from "./primitives.js";
import type { ScenarioLifeAssumption, ScenarioTimeAssumption } from "./scenario-assumptions.js";
import type {
  Capacity,
  CapitalRequirementItem,
  OperatingCost,
  ScenarioRevenueStream,
} from "./scenario-economics.js";
import type {
  DelegationItem,
  OwnerEconomics,
  OwnerInput,
  ScenarioDistributionPolicy,
} from "./ownership.js";

/** Persisted shape — one row per NOW / NEXT / ULTIMATELY, shared structure. */
export interface Scenario {
  id: ID;
  businessId: ID;
  scenarioType: ScenarioType;
  label: string;
  notes?: string;
  lifeAssumption: ScenarioLifeAssumption;
  timeAssumption: ScenarioTimeAssumption;
  streams: ScenarioRevenueStream[];
  operatingCosts: OperatingCost[];
  ownerInputs: OwnerInput[];
  distributionPolicy: ScenarioDistributionPolicy;
  ownerEconomics: OwnerEconomics[];
  delegationItems: DelegationItem[]; // ULTIMATELY only — see ULT-3
  capitalItems: CapitalRequirementItem[];
  capacity: Capacity;
}

/**
 * What the engine actually consumes. Fully resolved — no lookups, no I/O.
 * scenarioType never changes engine behavior; it only travels through for
 * the result's provenance and for NOW's actualRevenue passthrough.
 */
export interface ScenarioEngineInput {
  scenarioType: ScenarioType;
  lifeAssumption: ScenarioLifeAssumption;
  timeAssumption: ScenarioTimeAssumption;
  streams: ScenarioRevenueStream[];
  operatingCosts: OperatingCost[];
  ownerInputs: OwnerInput[];
  distributionPolicy: ScenarioDistributionPolicy;
  ownerEconomics: OwnerEconomics[];
  delegationItems: DelegationItem[];
  capitalItems: CapitalRequirementItem[];
  capacity: Capacity;
  restructureDate: ISODate | null;
  actualRevenue: Money | null; // NOW only — measured, passed through untouched to the result
}
