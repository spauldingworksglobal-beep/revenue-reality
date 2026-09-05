import type {
  ID,
  ISODate,
  OwnerEconomicsResult,
  OwnerSupportSignal,
  PrimaryOwnerBenefitVsRequirement,
  ScenarioEngineInput,
  ScenarioResult,
} from "@revenue-reality/domain";
import {
  validateDistributionPercentagesSum100,
  validateMixWeightsSum100,
  validateOwnershipPercentagesSum100,
} from "@revenue-reality/validation";
import { collectInputConfidenceFlags } from "./collect-confidence";
import { assembleConfidenceFlags } from "./confidence";
import { sumRequiredRetainedBusinessCapital } from "./capital";
import { sumKnownDelegationCost } from "./delegation";
import {
  computeContributionEconomics,
  computeDistributableEconomicSurplus,
  computeOperatingEconomicSurplus,
  computeOwnerProfitDistribution,
  computeTotalOwnerEconomicBenefit,
  solveRequiredRevenueFromOwnerTarget,
} from "./distribution";
import { resolveBusinessFundedRequirement } from "./funding";
import { type Dec, ZERO, add, divide, formatMoney, formatPercent, parseMoney, subtract } from "./money";
import { sumKnownOperatingCost } from "./operating-cost";
import { resolveOwnerCashComponents, resolveDistributionPercent } from "./owner-economics";
import { computeBreakEvenFloor, computeRequiredVolume } from "./revenue";
import { computeCapacitySignal, computeOwnerSupportSignal, computeTimeSignal } from "./signals";
import { computeWeightedContributionMargin, resolveStreamEconomics } from "./stream-economics";

export const FORMULA_VERSION = "2026.1.0";

export interface RunScenarioMeta {
  revisionId: ID;
  computedAt?: ISODate;
}

/**
 * Pure — same input + meta always produces the same result. No I/O. No
 * branching on scenarioType beyond selecting which revenue figure (actual
 * vs. solved) drives the forward pass.
 */
export function runScenario(input: ScenarioEngineInput, meta: RunScenarioMeta): ScenarioResult {
  validateMixWeightsSum100(input.streams);
  validateOwnershipPercentagesSum100(input.ownerEconomics, input.distributionPolicy);
  validateDistributionPercentagesSum100(input.ownerEconomics, input.distributionPolicy);

  const primaryOwners = input.ownerEconomics.filter((o) => o.isPrimaryRespondent);
  if (primaryOwners.length !== 1) {
    throw new RangeError(
      `exactly one owner must be marked isPrimaryRespondent — found ${primaryOwners.length}`,
    );
  }
  const primaryOwner = primaryOwners[0]!;

  // --- stream economics ---
  const streamEconomics = input.streams.map(resolveStreamEconomics);
  const weightedContributionMargin = computeWeightedContributionMargin(streamEconomics);

  // --- operating cost / retained capital ---
  const knownOpex = sumKnownOperatingCost(input.operatingCosts);
  const retainedCapital = sumRequiredRetainedBusinessCapital(input.capitalItems);

  // --- delegation: a known replacement cost is a real recurring cost of the
  // model (NEXT/ULTIMATELY) and is treated exactly like known operating cost
  // everywhere that figure drives the waterfall. An item with no known cost
  // contributes nothing (never a guessed market rate) — see delegation.ts.
  const knownDelegation = sumKnownDelegationCost(input.delegationItems);
  const knownRecurringCost = add(knownOpex.monthly, knownDelegation.monthly);

  // --- funding responsibility (the one calculation, §01/§04 of the architecture doc) ---
  const funding = resolveBusinessFundedRequirement(input.lifeAssumption);

  // --- owner cash components ---
  const cashByOwner = new Map(input.ownerEconomics.map((o) => [o.ownerId, resolveOwnerCashComponents(o)]));
  const ownerCashOutflows = input.ownerEconomics.map((o) => {
    const c = cashByOwner.get(o.ownerId)!;
    return add(c.laborCompensation, c.unclassifiedTotal ?? ZERO);
  });
  // Backward-solve's Σ labor comp term deliberately excludes unclassifiedTotal — see
  // resolveOwnerCashComponents: an unclassified owner's split is unknown, so holding
  // "$0 known labor" fixed is the conservative choice rather than guessing a split.
  const allOwnersLaborComp = input.ownerEconomics.map((o) => cashByOwner.get(o.ownerId)!.laborCompensation);

  const confidenceFlags = collectInputConfidenceFlags(input);
  if (knownDelegation.isPartial) {
    confidenceFlags.push({ field: "delegationItems", confidence: "INCOMPLETE" });
  }

  // --- backward solve: only possible once funding responsibility is confirmed ---
  // businessFundedRequirement === null means the owner has never answered "how much
  // of your personal economic requirement is this business responsible for" — a
  // specific policy fact, never defaulted. Required Revenue is life-linked by
  // definition, so it stays unavailable (not a fabricated $0-retained guess) until
  // that's answered. Every other output below is entirely unaffected.
  const primaryCash = cashByOwner.get(primaryOwner.ownerId)!;
  const primaryDistPercent = resolveDistributionPercent(primaryOwner, input.ownerEconomics, input.distributionPolicy);

  let requiredRevenue: Dec | null = null;
  let requiredEconomicContribution: Dec | null = null;

  if (funding.businessFundedRequirement !== null) {
    const backward = solveRequiredRevenueFromOwnerTarget({
      businessFundedRequirement: funding.businessFundedRequirement,
      primaryOwnerTargetLaborCompensation: primaryCash.laborCompensation,
      primaryOwnerDistributionPercent: primaryDistPercent,
      manualRequiredDistributableSurplus: null,
      knownOperatingCostMonthly: knownRecurringCost,
      allOwnersLaborCompensation: allOwnersLaborComp,
      requiredRetainedCapitalTotal: retainedCapital.total,
      weightedContributionMargin,
    });

    if (backward.status === "SOLVED") {
      requiredRevenue = backward.requiredRevenue;
      requiredEconomicContribution = backward.requiredEconomicContribution;
    } else {
      // Graceful degradation (never block): a floor covering only known costs,
      // labor, and retention — explicitly NOT the owner's profit distribution
      // need, since that couldn't be resolved. Flagged INCOMPLETE, not hidden.
      requiredEconomicContribution = add(knownRecurringCost, retainedCapital.total, ...allOwnersLaborComp);
      requiredRevenue = divide(requiredEconomicContribution, weightedContributionMargin);
      confidenceFlags.push({ field: "primaryOwnerEconomics.profitDistribution", confidence: "INCOMPLETE" });
    }
  }

  // --- forward pass: actual revenue for NOW, solved revenue for NEXT/ULTIMATELY ---
  // For NOW there is always an actual revenue to run forward with. For NEXT/
  // ULTIMATELY, forwardRevenue is the solved Required Revenue — which can be
  // null when funding responsibility is unconfirmed (see above). That is NOT
  // a reason to fail the whole calculation: everything already computed
  // above (margins, known costs, retained capital, capacity/time signals)
  // stays available. Only what genuinely depends on a revenue figure —
  // the distribution waterfall below — becomes unavailable, not fabricated.
  let forwardRevenue: Dec | null;
  if (input.scenarioType === "NOW") {
    if (input.actualRevenue === null) {
      throw new RangeError("NOW scenarios require actualRevenue");
    }
    forwardRevenue = parseMoney(input.actualRevenue);
  } else {
    forwardRevenue = requiredRevenue;
  }

  let operatingEconomicSurplus: Dec | null = null;
  let distributableEconomicSurplus: Dec | null = null;
  let ownerEconomicsResults: OwnerEconomicsResult[] | null = null;

  if (forwardRevenue !== null) {
    const contributionEconomics = computeContributionEconomics(forwardRevenue, weightedContributionMargin);
    operatingEconomicSurplus = computeOperatingEconomicSurplus(contributionEconomics, knownRecurringCost, ownerCashOutflows);
    distributableEconomicSurplus = computeDistributableEconomicSurplus(operatingEconomicSurplus, retainedCapital.total);
    const resolvedDistributableEconomicSurplus = distributableEconomicSurplus;

    ownerEconomicsResults = input.ownerEconomics.map((owner) => {
      const cash = cashByOwner.get(owner.ownerId)!;

      if (cash.unclassifiedTotal !== null) {
        return {
          ownerId: owner.ownerId,
          laborCompensation: formatMoney(cash.unclassifiedTotal),
          profitDistribution: formatMoney(ZERO),
          totalOwnerEconomicBenefit: formatMoney(cash.unclassifiedTotal),
        };
      }

      if (cash.measuredProfitDistribution !== null) {
        const total = computeTotalOwnerEconomicBenefit(cash.laborCompensation, cash.measuredProfitDistribution);
        return {
          ownerId: owner.ownerId,
          laborCompensation: formatMoney(cash.laborCompensation),
          profitDistribution: formatMoney(cash.measuredProfitDistribution),
          totalOwnerEconomicBenefit: formatMoney(total),
        };
      }

      const distPercent = resolveDistributionPercent(owner, input.ownerEconomics, input.distributionPolicy);
      let profitDistribution: Dec;
      if (distPercent !== null) {
        profitDistribution = computeOwnerProfitDistribution(resolvedDistributableEconomicSurplus, distPercent);
      } else if (owner.targetProfitDistribution) {
        profitDistribution = parseMoney(owner.targetProfitDistribution.value);
      } else {
        profitDistribution = ZERO;
        confidenceFlags.push({ field: `ownerEconomics.${owner.ownerId}.profitDistribution`, confidence: "INCOMPLETE" });
      }

      const total = computeTotalOwnerEconomicBenefit(cash.laborCompensation, profitDistribution);
      return {
        ownerId: owner.ownerId,
        laborCompensation: formatMoney(cash.laborCompensation),
        profitDistribution: formatMoney(profitDistribution),
        totalOwnerEconomicBenefit: formatMoney(total),
      };
    });
  }

  let primaryOwnerBenefitVsRequirement: PrimaryOwnerBenefitVsRequirement | null = null;
  let ownerSupportSignal: OwnerSupportSignal = "INSUFFICIENT_DATA";
  if (ownerEconomicsResults !== null && funding.businessFundedRequirement !== null) {
    const primaryResult = ownerEconomicsResults.find((r) => r.ownerId === primaryOwner.ownerId)!;
    const primaryTotalBenefit = parseMoney(primaryResult.totalOwnerEconomicBenefit);
    const gap = subtract(primaryTotalBenefit, funding.businessFundedRequirement);
    primaryOwnerBenefitVsRequirement = {
      businessFundedPersonalEconomicRequirement: formatMoney(funding.businessFundedRequirement),
      totalOwnerEconomicBenefit: formatMoney(primaryTotalBenefit),
      gap: formatMoney(gap),
    };
    ownerSupportSignal = computeOwnerSupportSignal(primaryTotalBenefit, funding.businessFundedRequirement);
  }

  const requiredVolumeByStream = requiredRevenue === null ? null : computeRequiredVolume(requiredRevenue, streamEconomics);
  const breakEven = computeBreakEvenFloor(knownRecurringCost, weightedContributionMargin, streamEconomics);

  const capacitySignal = computeCapacitySignal(input.capacity);
  const timeSignal = computeTimeSignal(input.timeAssumption);

  return {
    scenarioRevisionId: meta.revisionId,
    formulaVersion: FORMULA_VERSION,
    computedAt: meta.computedAt ?? new Date().toISOString(),

    actualRevenue: input.scenarioType === "NOW" ? input.actualRevenue : null,
    requiredEconomicContribution: requiredEconomicContribution === null ? null : formatMoney(requiredEconomicContribution),
    weightedContributionMargin: formatPercent(weightedContributionMargin),
    requiredRevenue: requiredRevenue === null ? null : formatMoney(requiredRevenue),
    requiredVolumeByStream: requiredVolumeByStream === null ? null : requiredVolumeByStream.map((v) => ({ streamId: v.streamId, volume: v.volume })),
    breakEvenFloor: {
      revenue: formatMoney(breakEven.revenue),
      volumeByStream: breakEven.volumeByStream.map((v) => ({ streamId: v.streamId, volume: v.volume })),
      basis: "KNOWN_OPEX_ONLY",
    },
    perStreamEconomics: streamEconomics.map((s) => ({
      streamId: s.streamId,
      grossMargin: formatPercent(s.grossMargin),
      contributionMargin: formatPercent(s.contributionMargin),
    })),

    operatingEconomicSurplus: operatingEconomicSurplus === null ? null : formatMoney(operatingEconomicSurplus),
    requiredRetainedBusinessCapital: {
      recurring: formatMoney(retainedCapital.recurring),
      oneTime: formatMoney(retainedCapital.oneTime),
      total: formatMoney(retainedCapital.total),
    },
    distributableEconomicSurplus: distributableEconomicSurplus === null ? null : formatMoney(distributableEconomicSurplus),
    ownerEconomicsResults,
    primaryOwnerBenefitVsRequirement,

    ownerSupportSignal,
    capacitySignal,
    timeSignal,
    confidenceFlags: assembleConfidenceFlags(confidenceFlags),
  };
}
