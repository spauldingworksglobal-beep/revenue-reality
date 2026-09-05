import type {
  CapitalRequirementItem,
  Capacity,
  ConfidenceValue,
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
import { computeLifeRequirement, computeSecurityRequirement, computeTotalPersonalEconomicRequirement } from "./life-reality";
import { formatMoney } from "./money";
import { resolveScenarioStreams, type ScenarioStreamAssemblyInput } from "./scenario-stream-assembly";

/** Structurally identical to next-store.tsx's NextStreamInput. */
export type NextStreamAssemblyInput = ScenarioStreamAssemblyInput;

/** Structurally identical to next-store.tsx's NextOwnerInput — targets, never measured cash (NEXT hasn't happened yet). */
export interface NextOwnerAssemblyInput {
  ownerId: ID;
  hoursWeek: ConfidenceValue<number>;
  personalCashInvestment: Money;
  personallyPaidCosts: Money;
  functionConfidence: "KNOWN" | "ROLE_CHANGING" | "NOT_SURE";
  broadFunctions: string[];
  targetLaborCompensation: ConfidenceValue<Money> | null;
  targetProfitDistribution: ConfidenceValue<Money> | null;
}

export interface BuildNextScenarioInputParams {
  scenarioId: ID;
  owners: Owner[];
  activeStreams: RevenueStream[];
  streamInputs: NextStreamAssemblyInput[];
  operatingCosts: OperatingCost[];
  ownerInputs: NextOwnerAssemblyInput[];
  /** NEXT's own intermediate business hours for the primary respondent — authoritative, distinct from CURRENT and INTENDED. */
  nextBusinessHoursWeek: ConfidenceValue<number>;
  nextAvailableHoursWeek: ConfidenceValue<number>;
  otherTimeClaims: { label: string; hoursWeek?: number }[];
  lifePriorityReservations: string[];
  distributionPolicy: ScenarioDistributionPolicy | null;
  distributionPercents: Record<ID, Percent>;
  capitalItems: CapitalRequirementItem[];
  delegationItems: DelegationItem[];
  /** Already resolved by resolveNextLifeCategories/resolveNextSecurityItems (see life-reality.ts) — this function only sums what's given. */
  nextLifeCategories: LifeCategory[];
  nextSecurity: SecurityItem[];
  /**
   * null when the owner has never confirmed how much of NEXT's personal
   * economic requirement the business is responsible for. This does not
   * block the NEXT result — it flows straight through to
   * ScenarioLifeAssumption.outsideFundingRetained as null, and the engine
   * (scenario.ts) leaves Required Revenue and the owner-benefit comparison
   * unavailable as a result, while every revenue-independent output
   * (margins, known costs, retained capital, break-even, capacity, time)
   * remains fully calculable — see runScenario's graceful degradation.
   */
  nextFundingConfirmation: BusinessFundedConfirmation | null;
  restructureDate: ISODate | null;
  capacity: Capacity | null;
}

export type NextScenarioMissingReason = "NO_USABLE_REVENUE_STREAM";

export type NextScenarioAssemblyResult =
  | {
      status: "READY";
      input: ScenarioEngineInput;
      /** Owners whose ownership share is unconfirmed — passed through as null, never assumed/equal-split. */
      unknownOwnershipOwnerIds: ID[];
      /** True when an equal-weight sales-mix modeling ASSUMPTION was substituted — see withNextResultCaveats. */
      mixWeightFallbackApplied: boolean;
      /** Active streams excluded because price and/or Cost of Delivery haven't been entered for NEXT yet. */
      excludedStreamIds: ID[];
    }
  | { status: "INCOMPLETE"; missing: NextScenarioMissingReason[] };

/**
 * Assembles a NEXT ScenarioEngineInput from an already-resolved NEXT
 * snapshot (see next-store.tsx: the snapshot is copied from NOW once, then
 * edited independently — this function never reaches back into NOW's own
 * live state). Feeds the exact same runScenario as NOW; NEXT never gets a
 * second calculator.
 *
 * An unconfirmed funding responsibility does NOT block the NEXT result —
 * only Required Revenue and the outputs that depend on it (see runScenario:
 * it now degrades gracefully instead of throwing). Stream economics,
 * margins, known operating/growth costs, retained capital, break-even,
 * capacity, and time signals all remain calculable and are shown. Unknown
 * ownership, an unresolved sales mix, and unknown delegation replacement
 * costs are never fabricated — see the equivalent comment on
 * buildNowScenarioInput; the same rules apply here unchanged.
 */
export function buildNextScenarioInput(params: BuildNextScenarioInputParams): NextScenarioAssemblyResult {
  const missing: NextScenarioMissingReason[] = [];

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
    const hoursWeek = owner.isPrimaryRespondent ? params.nextBusinessHoursWeek : (stored?.hoursWeek ?? { value: 0, confidence: "INCOMPLETE" });
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

  const lifeReq = computeLifeRequirement(params.nextLifeCategories, "NEXT");
  const securityReq = computeSecurityRequirement(params.nextSecurity, "NEXT");
  const totalPersonalEconomicRequirement = computeTotalPersonalEconomicRequirement(lifeReq.monthly, securityReq.monthly);
  const outsideFundingRetained =
    params.nextFundingConfirmation === null
      ? null
      : deriveOutsideFundingRetained(totalPersonalEconomicRequirement, params.nextFundingConfirmation);

  const input: ScenarioEngineInput = {
    scenarioType: "NEXT",
    lifeAssumption: {
      scenarioId: params.scenarioId,
      source: "NEXT",
      lifeRequirement: formatMoney(lifeReq.monthly),
      securityRequirement: formatMoney(securityReq.monthly),
      outsideFundingRetained,
      selectedLifeChanges: [],
    },
    timeAssumption: {
      scenarioId: params.scenarioId,
      source: "NEXT",
      availableHoursWeek: params.nextAvailableHoursWeek,
      businessHoursWeek: params.nextBusinessHoursWeek,
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

/** Mirrors withNowResultCaveats — surfaces the sales-mix modeling assumption in confidenceFlags. */
export function withNextResultCaveats(
  result: ScenarioResult,
  assembly: Extract<NextScenarioAssemblyResult, { status: "READY" }>,
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
