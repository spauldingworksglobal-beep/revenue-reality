import type { DistributionRule, OwnerEconomics, ScenarioDistributionPolicy } from "@revenue-reality/domain";
import { type Dec, ZERO, dec, divide, parseMoney } from "./money";

export interface OwnerCashComponents {
  /** Feeds the waterfall's "Σ owner labor comp" deduction directly. */
  laborCompensation: Dec;
  /** NOW, classified only — the measured actual. Null when not classified/not NOW. */
  measuredProfitDistribution: Dec | null;
  /**
   * NOW, unclassified only. This cash genuinely left the business for the
   * owner but its labor/distribution split is unknown — it is folded into
   * the Operating Economic Surplus deduction alongside labor compensation
   * (real cash out, undifferentiated) and reported back as laborCompensation
   * in the result with a confidenceFlag, rather than fabricating a split.
   */
  unclassifiedTotal: Dec | null;
}

export function resolveOwnerCashComponents(owner: OwnerEconomics): OwnerCashComponents {
  if (owner.cashReceived) {
    if (owner.cashReceived.mode === "CLASSIFIED") {
      return {
        laborCompensation: owner.cashReceived.laborCompensation ? parseMoney(owner.cashReceived.laborCompensation.value) : ZERO,
        measuredProfitDistribution: owner.cashReceived.profitDistribution
          ? parseMoney(owner.cashReceived.profitDistribution.value)
          : ZERO,
        unclassifiedTotal: null,
      };
    }
    return {
      laborCompensation: ZERO,
      measuredProfitDistribution: null,
      unclassifiedTotal: owner.cashReceived.unclassifiedTotal ? parseMoney(owner.cashReceived.unclassifiedTotal.value) : ZERO,
    };
  }

  // NEXT / ULTIMATELY target
  return {
    laborCompensation: owner.targetLaborCompensation ? parseMoney(owner.targetLaborCompensation.value) : ZERO,
    measuredProfitDistribution: null,
    unclassifiedTotal: null,
  };
}

/**
 * Engine-derived — never independently stored, so it can't drift from the
 * policy. SAME_AS_OWNERSHIP/EQUAL_SPLIT ignore any stray distributionPercent
 * on the row; only CUSTOM_PERCENTAGE reads it (validated to sum 100%
 * upstream, in @revenue-reality/validation).
 */
export function resolveDistributionPercent(
  owner: OwnerEconomics,
  allOwners: OwnerEconomics[],
  policy: ScenarioDistributionPolicy,
): Dec | null {
  const rule: DistributionRule = policy.rule;
  switch (rule) {
    case "SAME_AS_OWNERSHIP":
      return dec(owner.ownershipPercent);
    case "EQUAL_SPLIT":
      return divide(dec(1), dec(allOwners.length));
    case "CUSTOM_PERCENTAGE":
      return owner.distributionPercent === null ? null : dec(owner.distributionPercent);
    case "DISCRETIONARY":
    case "OTHER":
      return null;
  }
}
