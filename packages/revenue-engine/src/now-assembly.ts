import type {
  CapitalRequirementItem,
  CogsInput,
  ConfidenceValue,
  ID,
  ISODate,
  LifeCategory,
  Money,
  OperatingCost,
  Owner,
  OwnerCashReceived,
  OwnerEconomics,
  OwnerInput,
  Percent,
  RevenueStream,
  ScenarioDistributionPolicy,
  ScenarioEngineInput,
  ScenarioRevenueStream,
  SecurityItem,
  VariableCostItem,
} from "@revenue-reality/domain";
import { resolveOwnershipSplitStatus, validateMixWeightsSum100 } from "@revenue-reality/validation";
import type { BusinessFundedConfirmation } from "./funding";
import { deriveOutsideFundingRetained } from "./funding";
import { computeLifeRequirement, computeSecurityRequirement, computeTotalPersonalEconomicRequirement } from "./life-reality";
import { formatMoney, formatPercent } from "./money";
import { computeEqualMixWeights, resolveStreamEconomics } from "./stream-economics";

/** Structurally identical to now-store.tsx's NowStreamInput — kept independent so this package never depends on apps/web. */
export interface NowStreamAssemblyInput {
  streamId: ID;
  price: ConfidenceValue<Money> | null;
  volume: ConfidenceValue<number> | null;
  mixWeightOverride: Percent | null;
  cogs: CogsInput | null;
  otherVariableCosts: VariableCostItem[];
}

/** Structurally identical to now-store.tsx's NowOwnerInput. */
export interface NowOwnerAssemblyInput {
  ownerId: ID;
  hoursWeek: ConfidenceValue<number>;
  personalCashInvestment: Money;
  personallyPaidCosts: Money;
  functionConfidence: "KNOWN" | "ROLE_CHANGING" | "NOT_SURE";
  broadFunctions: string[];
  cashReceived: OwnerCashReceived | null;
}

export interface BuildNowScenarioInputParams {
  scenarioId: ID;
  owners: Owner[];
  activeStreams: RevenueStream[];
  streamInputs: NowStreamAssemblyInput[];
  operatingCosts: OperatingCost[];
  ownerInputs: NowOwnerAssemblyInput[];
  /** Time Reality's current business hours — authoritative for the primary respondent; see buildNowScenarioInput. */
  currentBusinessHoursWeek: ConfidenceValue<number>;
  currentAvailableHoursWeek: ConfidenceValue<number>;
  otherTimeClaims: { label: string; hoursWeek?: number }[];
  distributionPolicy: ScenarioDistributionPolicy | null;
  distributionPercents: Record<ID, Percent>;
  capitalItems: CapitalRequirementItem[];
  currentCategories: LifeCategory[];
  currentSecurity: SecurityItem[];
  currentFundingConfirmation: BusinessFundedConfirmation | null;
  restructureDate: ISODate | null;
  actualRevenue: ConfidenceValue<Money> | null;
}

export type NowScenarioMissingReason =
  | "ACTUAL_REVENUE"
  | "CURRENT_FUNDING_CONFIRMATION"
  | "NO_USABLE_REVENUE_STREAM";

export type NowScenarioAssemblyResult =
  | {
      status: "READY";
      input: ScenarioEngineInput;
      /** True when one or more owners' ownershipPercent was unknown/invalid and an equal split was substituted as a placeholder. */
      ownershipSplitFallbackApplied: boolean;
      /** True when one or more included streams' sales-mix share was unknown (or didn't sum to 100%) and an equal split was substituted. */
      mixWeightFallbackApplied: boolean;
      /** Active streams excluded from the calculation because price and/or Cost of Delivery haven't been entered yet. */
      excludedStreamIds: ID[];
    }
  | { status: "INCOMPLETE"; missing: NowScenarioMissingReason[] };

function buildScenarioRevenueStream(
  scenarioId: ID,
  input: NowStreamAssemblyInput,
  mixWeight: Percent,
): ScenarioRevenueStream | null {
  if (input.price === null || input.cogs === null) return null;
  try {
    const resolved = resolveStreamEconomics({
      scenarioId,
      streamId: input.streamId,
      priceOrAvgValue: input.price,
      volume: input.volume,
      mixWeight,
      cogs: input.cogs,
      cogsPerUnit: "0.00",
      otherVariableCosts: input.otherVariableCosts,
      otherVariableCostPerUnit: "0.00",
      grossProfitPerUnit: "0.00",
      grossMargin: "0",
      contributionPerUnit: "0.00",
      contributionMargin: "0",
    });
    return {
      scenarioId,
      streamId: input.streamId,
      priceOrAvgValue: input.price,
      volume: input.volume,
      mixWeight,
      cogs: input.cogs,
      cogsPerUnit: formatMoney(resolved.cogsPerUnit),
      otherVariableCosts: input.otherVariableCosts,
      otherVariableCostPerUnit: formatMoney(resolved.otherVariableCostPerUnit),
      grossProfitPerUnit: formatMoney(resolved.grossProfitPerUnit),
      grossMargin: formatPercent(resolved.grossMargin),
      contributionPerUnit: formatMoney(resolved.contributionPerUnit),
      contributionMargin: formatPercent(resolved.contributionMargin),
    };
  } catch {
    return null;
  }
}

/**
 * Assembles a NOW ScenarioEngineInput from Life/Time/Business/Now ephemeral
 * store state. Pure and side-effect free — the only place this orchestration
 * happens, so the UI never re-derives the waterfall itself.
 *
 * Never fabricates a specific dollar figure. Two placeholders are the
 * exception, and both are structural (distributing a known total across
 * unknown shares), matching the precedent already set for incomplete sales
 * mix in stream-economics.ts: an unresolved ownership split or sales mix
 * falls back to an equal share rather than blocking, and the caller is told
 * so it can surface the assumption. A missing actual revenue figure or an
 * unanswered current-funding question is NOT given a placeholder — those are
 * specific policy/measurement facts, not shares of a known total — so the
 * scenario is reported INCOMPLETE instead of guessing one.
 */
export function buildNowScenarioInput(params: BuildNowScenarioInputParams): NowScenarioAssemblyResult {
  const missing: NowScenarioMissingReason[] = [];
  if (params.actualRevenue === null) missing.push("ACTUAL_REVENUE");
  if (params.currentFundingConfirmation === null) missing.push("CURRENT_FUNDING_CONFIRMATION");

  const streamInputById = new Map(params.streamInputs.map((s) => [s.streamId, s]));
  const usableStreamInputs = params.activeStreams
    .map((s) => streamInputById.get(s.id))
    .filter((s): s is NowStreamAssemblyInput => s !== undefined && s.price !== null && s.cogs !== null);
  const excludedStreamIds = params.activeStreams.map((s) => s.id).filter((id) => !usableStreamInputs.some((s) => s.streamId === id));

  if (usableStreamInputs.length === 0) missing.push("NO_USABLE_REVENUE_STREAM");

  if (missing.length > 0) return { status: "INCOMPLETE", missing };

  // --- sales mix: use entered shares only if every usable stream has one AND they validate to exactly 100% ---
  let mixWeights: Percent[];
  let mixWeightFallbackApplied = false;
  if (usableStreamInputs.length === 1) {
    mixWeights = ["1"];
  } else if (usableStreamInputs.every((s) => s.mixWeightOverride !== null)) {
    const candidateWeights = usableStreamInputs.map((s) => s.mixWeightOverride!);
    try {
      validateMixWeightsSum100(
        usableStreamInputs.map((s, i) => ({ mixWeight: candidateWeights[i]! }) as ScenarioRevenueStream),
      );
      mixWeights = candidateWeights;
    } catch {
      mixWeights = computeEqualMixWeights(usableStreamInputs.length);
      mixWeightFallbackApplied = true;
    }
  } else {
    mixWeights = computeEqualMixWeights(usableStreamInputs.length);
    mixWeightFallbackApplied = true;
  }

  const streams: ScenarioRevenueStream[] = [];
  usableStreamInputs.forEach((streamInput, i) => {
    const built = buildScenarioRevenueStream(params.scenarioId, streamInput, mixWeights[i]!);
    if (built) streams.push(built);
  });
  if (streams.length === 0) return { status: "INCOMPLETE", missing: ["NO_USABLE_REVENUE_STREAM"] };

  // --- ownership split: use the real split only when it's complete and valid ---
  const ownershipStatus = resolveOwnershipSplitStatus(params.owners);
  let ownershipSplitFallbackApplied = false;
  let ownershipPercents: Percent[];
  if (ownershipStatus === "COMPLETE_VALID") {
    ownershipPercents = params.owners.map((o) => o.ownershipPercent!.value);
  } else {
    ownershipPercents = computeEqualMixWeights(params.owners.length);
    ownershipSplitFallbackApplied = true;
  }

  const distributionPolicy: ScenarioDistributionPolicy = params.distributionPolicy ?? {
    scenarioId: params.scenarioId,
    rule: "DISCRETIONARY",
  };

  const ownerInputById = new Map(params.ownerInputs.map((o) => [o.ownerId, o]));

  const ownerInputs: OwnerInput[] = params.owners.map((owner) => {
    const stored = ownerInputById.get(owner.id);
    const hoursWeek = owner.isPrimaryRespondent ? params.currentBusinessHoursWeek : (stored?.hoursWeek ?? { value: 0, confidence: "INCOMPLETE" });
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

  const ownerEconomics: OwnerEconomics[] = params.owners.map((owner, i) => {
    const stored = ownerInputById.get(owner.id);
    const distributionPercent =
      distributionPolicy.rule === "CUSTOM_PERCENTAGE" ? (params.distributionPercents[owner.id] ?? null) : null;
    return {
      scenarioId: params.scenarioId,
      ownerId: owner.id,
      ownershipPercent: ownershipPercents[i]!,
      distributionPercent,
      isPrimaryRespondent: owner.isPrimaryRespondent,
      cashReceived: stored?.cashReceived ?? undefined,
    };
  });

  const lifeReq = computeLifeRequirement(params.currentCategories, "CURRENT");
  const securityReq = computeSecurityRequirement(params.currentSecurity, "CURRENT");
  const totalPersonalEconomicRequirement = computeTotalPersonalEconomicRequirement(lifeReq.monthly, securityReq.monthly);
  const outsideFundingRetained = deriveOutsideFundingRetained(totalPersonalEconomicRequirement, params.currentFundingConfirmation!);

  const input: ScenarioEngineInput = {
    scenarioType: "NOW",
    lifeAssumption: {
      scenarioId: params.scenarioId,
      source: "CURRENT",
      lifeRequirement: formatMoney(lifeReq.monthly),
      securityRequirement: formatMoney(securityReq.monthly),
      outsideFundingRetained,
      selectedLifeChanges: [],
    },
    timeAssumption: {
      scenarioId: params.scenarioId,
      source: "CURRENT",
      availableHoursWeek: params.currentAvailableHoursWeek,
      businessHoursWeek: params.currentBusinessHoursWeek,
      otherTimeClaims: params.otherTimeClaims,
      lifePriorityReservations: [],
    },
    streams,
    operatingCosts: params.operatingCosts,
    ownerInputs,
    distributionPolicy,
    ownerEconomics,
    delegationItems: [],
    capitalItems: params.capitalItems,
    capacity: { scenarioId: params.scenarioId, demandState: "UNSURE", constraints: [] },
    restructureDate: params.restructureDate,
    actualRevenue: params.actualRevenue!.value,
  };

  return { status: "READY", input, ownershipSplitFallbackApplied, mixWeightFallbackApplied, excludedStreamIds };
}
