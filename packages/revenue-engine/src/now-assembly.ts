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
  ScenarioResult,
  ScenarioRevenueStream,
  SecurityItem,
  VariableCostItem,
} from "@revenue-reality/domain";
import { validateMixWeightsSum100 } from "@revenue-reality/validation";
import { assembleConfidenceFlags } from "./confidence";
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
  /**
   * null when the owner has never confirmed how much of their personal
   * economic requirement the business is responsible for. This no longer
   * blocks the whole scenario — it flows straight through to
   * ScenarioLifeAssumption.outsideFundingRetained as null, and the engine
   * (packages/revenue-engine/src/scenario.ts) leaves Required Revenue and
   * the owner-benefit-vs-requirement comparison unavailable as a result.
   */
  currentFundingConfirmation: BusinessFundedConfirmation | null;
  restructureDate: ISODate | null;
  actualRevenue: ConfidenceValue<Money> | null;
}

export type NowScenarioMissingReason = "ACTUAL_REVENUE" | "NO_USABLE_REVENUE_STREAM";

export type NowScenarioAssemblyResult =
  | {
      status: "READY";
      input: ScenarioEngineInput;
      /** Owners whose ownership share is unconfirmed — passed through as null, never assumed/equal-split. Empty when every owner's ownership is known. */
      unknownOwnershipOwnerIds: ID[];
      /** True when one or more included streams' sales-mix share was unknown (or didn't sum to 100%) and an equal-weight modeling ASSUMPTION was substituted — see withNowResultCaveats. */
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
 * Never fabricates a specific dollar figure or a confirmed split:
 *  - Unknown ownership is passed through as null and stays null — no
 *    equal-split placeholder. It only blocks the one calculation that
 *    actually reads it (a SAME_AS_OWNERSHIP distribution rule); every other
 *    output computes normally (see packages/validation's
 *    validateOwnershipPercentagesSum100, now conditional on the rule).
 *  - An unresolved sales mix across multiple streams gets a temporary
 *    equal-weight MODELING ASSUMPTION (never a claimed fact) — surfaced via
 *    mixWeightFallbackApplied and pushed into the result's confidenceFlags
 *    by withNowResultCaveats below. It is never written back into the
 *    owner's own stream inputs, so it can never masquerade as something the
 *    owner actually entered.
 *  - A missing actual revenue figure, or no stream with both a price and a
 *    Cost of Delivery, are genuine hard requirements — the scenario is
 *    reported INCOMPLETE rather than guessing either.
 *  - An unconfirmed funding-responsibility answer is NOT a hard requirement
 *    (it doesn't block margins, break-even, or owner cash) — it flows
 *    through as null and only the life-linked outputs it drives become
 *    unavailable, at the engine level (see scenario.ts).
 */
export function buildNowScenarioInput(params: BuildNowScenarioInputParams): NowScenarioAssemblyResult {
  const missing: NowScenarioMissingReason[] = [];
  if (params.actualRevenue === null) missing.push("ACTUAL_REVENUE");

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

  // --- ownership: pass through exactly what's known. Unknown stays unknown — never assumed. ---
  const unknownOwnershipOwnerIds = params.owners.filter((o) => o.ownershipPercent === null).map((o) => o.id);

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
      cashReceived: stored?.cashReceived ?? undefined,
    };
  });

  const lifeReq = computeLifeRequirement(params.currentCategories, "CURRENT");
  const securityReq = computeSecurityRequirement(params.currentSecurity, "CURRENT");
  const totalPersonalEconomicRequirement = computeTotalPersonalEconomicRequirement(lifeReq.monthly, securityReq.monthly);
  const outsideFundingRetained =
    params.currentFundingConfirmation === null
      ? null
      : deriveOutsideFundingRetained(totalPersonalEconomicRequirement, params.currentFundingConfirmation);

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

  return { status: "READY", input, unknownOwnershipOwnerIds, mixWeightFallbackApplied, excludedStreamIds };
}

/**
 * Post-processes a ScenarioResult with the caveats buildNowScenarioInput's
 * READY variant already knows about — currently just the sales-mix
 * modeling assumption, surfaced as an explicit confidence flag so it can
 * never be mistaken for a known fact. Does not touch runScenario itself:
 * this is orchestration, not a new calculation.
 */
export function withNowResultCaveats(
  result: ScenarioResult,
  assembly: Extract<NowScenarioAssemblyResult, { status: "READY" }>,
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
