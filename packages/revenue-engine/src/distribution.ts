import { type Dec, ZERO, add, divide, max, multiply, subtract } from "./money.js";

export function computeContributionEconomics(revenue: Dec, weightedContributionMargin: Dec): Dec {
  return multiply(revenue, weightedContributionMargin);
}

/**
 * contribution − known opex − Σ owner labor comp (labor is a real waterfall
 * stage; ownership return is not — see distributableEconomicSurplus below).
 */
export function computeOperatingEconomicSurplus(
  contributionEconomics: Dec,
  knownOperatingCostMonthly: Dec,
  ownerCashOutflows: Dec[],
): Dec {
  return subtract(subtract(contributionEconomics, knownOperatingCostMonthly), add(...ownerCashOutflows));
}

/**
 * Retained capital is subtracted here, before this value exists as a
 * concept — it is never sourced any other way, so it can't be treated as
 * though it were available for distribution.
 */
export function computeDistributableEconomicSurplus(operatingEconomicSurplus: Dec, retainedCapitalTotal: Dec): Dec {
  return subtract(operatingEconomicSurplus, retainedCapitalTotal);
}

/** Forward: distributableSurplus × distributionPercent, for a percent-based rule. */
export function computeOwnerProfitDistribution(distributableEconomicSurplus: Dec, distributionPercent: Dec): Dec {
  return multiply(distributableEconomicSurplus, distributionPercent);
}

export function computeTotalOwnerEconomicBenefit(laborCompensation: Dec, profitDistribution: Dec): Dec {
  return add(laborCompensation, profitDistribution);
}

/** Backward: X ÷ Y — an owner needing X of profit distribution, entitled to Y%, implies this much distributable surplus. */
export function solveRequiredDistributableSurplus(requiredOwnerProfitDistribution: Dec, distributionPercent: Dec): Dec {
  return divide(requiredOwnerProfitDistribution, distributionPercent);
}

export interface BackwardSolveInput {
  businessFundedRequirement: Dec;
  primaryOwnerTargetLaborCompensation: Dec;
  primaryOwnerDistributionPercent: Dec | null; // null ⇒ cannot backward-solve via percentage
  /** Required only when primaryOwnerDistributionPercent is null (DISCRETIONARY/OTHER) — a directly-entered target. */
  manualRequiredDistributableSurplus: Dec | null;
  knownOperatingCostMonthly: Dec;
  allOwnersLaborCompensation: Dec[]; // includes the primary owner's own labor comp
  requiredRetainedCapitalTotal: Dec;
  weightedContributionMargin: Dec;
}

export type BackwardSolveResult =
  | {
      status: "SOLVED";
      requiredRevenue: Dec;
      requiredEconomicContribution: Dec;
      requiredOwnerProfitDistribution: Dec;
      requiredDistributableSurplus: Dec;
    }
  | { status: "INSUFFICIENT_DATA"; reason: string };

/**
 * requiredOwnerProfitDistribution = max(0, businessFundedRequirement − targetLaborCompensation)
 * requiredDistributableSurplus    = requiredOwnerProfitDistribution ÷ distributionPercent      (X ÷ Y)
 * requiredOperatingSurplus        = requiredDistributableSurplus + requiredRetainedCapital       (added BACK — never treated as distributed)
 * requiredEconomicContribution    = requiredOperatingSurplus + knownOpex + Σ all owners' laborComp
 * requiredRevenue                 = requiredEconomicContribution ÷ weightedContributionMargin
 */
export function solveRequiredRevenueFromOwnerTarget(input: BackwardSolveInput): BackwardSolveResult {
  const requiredOwnerProfitDistribution = max(
    ZERO,
    subtract(input.businessFundedRequirement, input.primaryOwnerTargetLaborCompensation),
  );

  let requiredDistributableSurplus: Dec;
  if (input.primaryOwnerDistributionPercent !== null) {
    if (input.primaryOwnerDistributionPercent.isZero()) {
      return {
        status: "INSUFFICIENT_DATA",
        reason: "primary owner's distribution percent is 0% — cannot solve backward from a required distribution",
      };
    }
    requiredDistributableSurplus = solveRequiredDistributableSurplus(
      requiredOwnerProfitDistribution,
      input.primaryOwnerDistributionPercent,
    );
  } else if (input.manualRequiredDistributableSurplus !== null) {
    requiredDistributableSurplus = input.manualRequiredDistributableSurplus;
  } else {
    return {
      status: "INSUFFICIENT_DATA",
      reason:
        "distribution rule has no resolvable percentage (DISCRETIONARY/OTHER) and no manually-entered target distributable surplus was provided",
    };
  }

  const requiredOperatingSurplus = add(requiredDistributableSurplus, input.requiredRetainedCapitalTotal);
  const requiredEconomicContribution = add(
    requiredOperatingSurplus,
    input.knownOperatingCostMonthly,
    ...input.allOwnersLaborCompensation,
  );
  const requiredRevenue = divide(requiredEconomicContribution, input.weightedContributionMargin);

  return {
    status: "SOLVED",
    requiredRevenue,
    requiredEconomicContribution,
    requiredOwnerProfitDistribution,
    requiredDistributableSurplus,
  };
}
