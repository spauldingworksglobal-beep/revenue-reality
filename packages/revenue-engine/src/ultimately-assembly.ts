import type {
  CapitalRequirementItem,
  Capacity,
  ConfidenceValue,
  DeferredNeed,
  DelegationItem,
  ID,
  ISODate,
  LifeCategory,
  Money,
  OperatingCost,
  Owner,
  OwnerEconomics,
  OwnerInput,
  Percent,
  RevenueStream,
  ScenarioDistributionPolicy,
  ScenarioEngineInput,
  ScenarioResult,
  SecurityItem,
} from "@revenue-reality/domain";
import { assembleConfidenceFlags } from "./confidence";
import type { BusinessFundedConfirmation } from "./funding";
import { deriveOutsideFundingRetained } from "./funding";
import { computeLifeRequirement, computeSecurityRequirement, computeTotalPersonalEconomicRequirement, resolveDeferredNeedsContribution } from "./life-reality";
import { add, formatMoney } from "./money";
import { resolveScenarioStreams, type ScenarioStreamAssemblyInput } from "./scenario-stream-assembly";

/** Structurally identical to ultimately-store.tsx's UltimatelyStreamInput. */
export type UltimatelyStreamAssemblyInput = ScenarioStreamAssemblyInput;

/** Structurally identical to ultimately-store.tsx's UltimatelyOwnerInput — targets, never measured cash (ULTIMATELY hasn't happened yet). */
export interface UltimatelyOwnerAssemblyInput {
  ownerId: ID;
  hoursWeek: ConfidenceValue<number>;
  personalCashInvestment: Money;
  personallyPaidCosts: Money;
  functionConfidence: "KNOWN" | "ROLE_CHANGING" | "NOT_SURE";
  broadFunctions: string[];
  targetLaborCompensation: ConfidenceValue<Money> | null;
  targetProfitDistribution: ConfidenceValue<Money> | null;
}

export interface BuildUltimatelyScenarioInputParams {
  scenarioId: ID;
  owners: Owner[];
  activeStreams: RevenueStream[];
  streamInputs: UltimatelyStreamAssemblyInput[];
  operatingCosts: OperatingCost[];
  ownerInputs: UltimatelyOwnerAssemblyInput[];
  /**
   * The owner's already-defined Intended Time Reality (Milestone 3) —
   * ULTIMATELY never re-asks these, it designs the business around them.
   * ultimateBusinessHoursWeek is the primary respondent's fixed hours;
   * every other owner's hours come from their own ownerInputs entry.
   */
  ultimateBusinessHoursWeek: ConfidenceValue<number>;
  intendedAvailableHoursWeek: ConfidenceValue<number>;
  otherTimeClaims: { label: string; hoursWeek?: number }[];
  lifePriorityReservations: string[];
  distributionPolicy: ScenarioDistributionPolicy | null;
  distributionPercents: Record<ID, Percent>;
  capitalItems: CapitalRequirementItem[];
  delegationItems: DelegationItem[];
  /**
   * The owner's already-defined Intended Life Reality (Milestone 2) —
   * ULTIMATELY loads this directly under the INTENDED horizon rather than
   * asking the owner to rebuild it or pick an intermediate point the way
   * NEXT does. Already a frozen snapshot by the time this is called — see
   * ultimately-store.tsx's initializeFromNextOrNow.
   */
  intendedLifeCategories: LifeCategory[];
  intendedSecurity: SecurityItem[];
  /** Included in the Intended personal economic requirement exactly as compareLifeRequirements does for the INTENDED horizon. */
  deferredNeeds: DeferredNeed[];
  /**
   * null when the owner has never confirmed how much of their Intended
   * personal economic requirement the business is responsible for. Mirrors
   * NEXT's nextFundingConfirmation exactly: this does not block the
   * ULTIMATELY result — it flows straight through to
   * ScenarioLifeAssumption.outsideFundingRetained as null, and the engine
   * leaves Required Revenue and the owner-benefit comparison unavailable
   * while every revenue-independent output remains fully calculable.
   */
  ultimatelyFundingConfirmation: BusinessFundedConfirmation | null;
  restructureDate: ISODate | null;
  capacity: Capacity | null;
}

export type UltimatelyScenarioMissingReason = "NO_USABLE_REVENUE_STREAM";

export type UltimatelyScenarioAssemblyResult =
  | {
      status: "READY";
      input: ScenarioEngineInput;
      /** Owners whose ownership share is unconfirmed — passed through as null, never assumed/equal-split. */
      unknownOwnershipOwnerIds: ID[];
      /** True when an equal-weight sales-mix modeling ASSUMPTION was substituted — see withUltimatelyResultCaveats. */
      mixWeightFallbackApplied: boolean;
      /** Active streams excluded because price and/or Cost of Delivery haven't been entered for ULTIMATELY yet. */
      excludedStreamIds: ID[];
    }
  | { status: "INCOMPLETE"; missing: UltimatelyScenarioMissingReason[] };

/**
 * Assembles an ULTIMATELY ScenarioEngineInput from an already-resolved
 * ULTIMATELY snapshot (see ultimately-store.tsx: business-model fields are
 * copied from NEXT — or NOW if no NEXT exists — exactly once; Life/Time
 * anchors are copied from the owner's already-defined Intended Life/Time
 * Reality, never re-asked). Feeds the exact same runScenario as NOW/NEXT;
 * ULTIMATELY never gets its own calculator or its own financial formulas.
 *
 * Mirrors buildNextScenarioInput's graceful-degradation rules exactly:
 * unconfirmed funding responsibility does not block the result; unknown
 * ownership, an unresolved sales mix, and unknown delegation replacement
 * costs are never fabricated.
 */
export function buildUltimatelyScenarioInput(params: BuildUltimatelyScenarioInputParams): UltimatelyScenarioAssemblyResult {
  const missing: UltimatelyScenarioMissingReason[] = [];

  const streamInputById = new Map(params.streamInputs.map((s) => [s.streamId, s]));
  const streamAssembly = resolveScenarioStreams(params.scenarioId, params.activeStreams.map((s) => s.id), streamInputById);

  if (streamAssembly.streams.length === 0) missing.push("NO_USABLE_REVENUE_STREAM");
  if (missing.length > 0) return { status: "INCOMPLETE", missing };

  const unknownOwnershipOwnerIds = params.owners.filter((o) => o.ownershipPercent === null).map((o) => o.id);

  const distributionPolicy: ScenarioDistributionPolicy = params.distributionPolicy ?? {
    scenarioId: params.scenarioId,
    rule: "DISCRETIONARY",
  };

  const ownerInputById = new Map(params.ownerInputs.map((o) => [o.ownerId, o]));

  const ownerInputs: OwnerInput[] = params.owners.map((owner) => {
    const stored = ownerInputById.get(owner.id);
    const hoursWeek = owner.isPrimaryRespondent ? params.ultimateBusinessHoursWeek : (stored?.hoursWeek ?? { value: 0, confidence: "INCOMPLETE" });
    return {
      scenarioId: params.scenarioId,
      ownerId: owner.id,
      hoursWeek,
      personalCashInvestment: stored?.personalCashInvestment ?? "0.00",
      personallyPaidCosts: stored?.personallyPaidCosts ?? "0.00",
      broadFunctions: stored?.broadFunctions ?? [],
      functionConfidence: stored?.functionConfidence ?? "NOT_SURE",
    };
  });

  const ownerEconomics: OwnerEconomics[] = params.owners.map((owner) => {
    const stored = ownerInputById.get(owner.id);
    const distributionPercent =
      distributionPolicy.rule === "CUSTOM_PERCENTAGE" ? (params.distributionPercents[owner.id] ?? null) : null;
    return {
      scenarioId: params.scenarioId,
      ownerId: owner.id,
      ownershipPercent: owner.ownershipPercent?.value ?? null,
      distributionPercent,
      isPrimaryRespondent: owner.isPrimaryRespondent,
      targetLaborCompensation: stored?.targetLaborCompensation ?? undefined,
      targetProfitDistribution: stored?.targetProfitDistribution ?? undefined,
    };
  });

  // INTENDED horizon, directly — no intermediate selection step the way
  // NEXT has, since ULTIMATELY simply IS the already-defined Intended Life.
  // Deferred needs the owner chose to include count toward the total here,
  // exactly as compareLifeRequirements does for the INTENDED horizon.
  const lifeReq = computeLifeRequirement(params.intendedLifeCategories, "INTENDED");
  const securityReq = computeSecurityRequirement(params.intendedSecurity, "INTENDED");
  const deferred = resolveDeferredNeedsContribution(params.deferredNeeds);
  const livingRequirement = add(lifeReq.monthly, deferred.includedMonthly);
  const totalPersonalEconomicRequirement = computeTotalPersonalEconomicRequirement(livingRequirement, securityReq.monthly);
  const outsideFundingRetained =
    params.ultimatelyFundingConfirmation === null
      ? null
      : deriveOutsideFundingRetained(totalPersonalEconomicRequirement, params.ultimatelyFundingConfirmation);

  const input: ScenarioEngineInput = {
    scenarioType: "ULTIMATELY",
    lifeAssumption: {
      scenarioId: params.scenarioId,
      source: "INTENDED",
      lifeRequirement: formatMoney(livingRequirement),
      securityRequirement: formatMoney(securityReq.monthly),
      outsideFundingRetained,
      selectedLifeChanges: [],
    },
    timeAssumption: {
      scenarioId: params.scenarioId,
      source: "INTENDED",
      availableHoursWeek: params.intendedAvailableHoursWeek,
      businessHoursWeek: params.ultimateBusinessHoursWeek,
      otherTimeClaims: params.otherTimeClaims,
      lifePriorityReservations: params.lifePriorityReservations,
    },
    streams: streamAssembly.streams,
    operatingCosts: params.operatingCosts,
    ownerInputs,
    distributionPolicy,
    ownerEconomics,
    delegationItems: params.delegationItems,
    capitalItems: params.capitalItems,
    capacity: params.capacity ?? { scenarioId: params.scenarioId, demandState: "UNSURE", constraints: [] },
    restructureDate: params.restructureDate,
    actualRevenue: null,
  };

  return {
    status: "READY",
    input,
    unknownOwnershipOwnerIds,
    mixWeightFallbackApplied: streamAssembly.mixWeightFallbackApplied,
    excludedStreamIds: streamAssembly.excludedStreamIds,
  };
}

/** Mirrors withNextResultCaveats — surfaces the sales-mix modeling assumption in confidenceFlags. */
export function withUltimatelyResultCaveats(
  result: ScenarioResult,
  assembly: Extract<UltimatelyScenarioAssemblyResult, { status: "READY" }>,
): ScenarioResult {
  if (!assembly.mixWeightFallbackApplied) return result;
  return {
    ...result,
    confidenceFlags: assembleConfidenceFlags([
      ...result.confidenceFlags,
      { field: "salesMix", confidence: "ROUGH_ESTIMATE" },
    ]),
  };
}
