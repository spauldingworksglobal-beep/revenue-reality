import type { OutsideFundingRetained, ScenarioLifeAssumption } from "@revenue-reality/domain";
import { validateFundingModeExclusivity } from "@revenue-reality/validation";
import { type Dec, add, multiply, parseMoney, parsePercent, subtract } from "./money";

export interface FundingResolution {
  totalPersonalEconomicRequirement: Dec; // lifeRequirement + securityRequirement — the ONLY figure consumed onward
  businessFundedRequirement: Dec; // totalPersonalEconomicRequirement − outsideFundingRetained, ONE calculation
}

/**
 * The retained-amount half of the one funding-responsibility calculation —
 * usable on its own at Life Reality intake time (Milestone 2), before a
 * Scenario/ScenarioLifeAssumption exists at all.
 */
export function resolveOutsideFundingRetainedAmount(
  totalPersonalEconomicRequirement: Dec,
  retained: OutsideFundingRetained,
): Dec {
  validateFundingModeExclusivity(retained);
  return retained.mode === "AMOUNT"
    ? parseMoney(retained.amount!)
    : multiply(totalPersonalEconomicRequirement, parsePercent(retained.percentOfTotal!));
}

/** businessFundedRequirement = totalPersonalEconomicRequirement − outsideFundingRetained. */
export function resolveBusinessFundedAmount(totalPersonalEconomicRequirement: Dec, retained: OutsideFundingRetained): Dec {
  return subtract(totalPersonalEconomicRequirement, resolveOutsideFundingRetainedAmount(totalPersonalEconomicRequirement, retained));
}

/**
 * The one funding-responsibility calculation, shared by NOW/NEXT/ULTIMATELY.
 * Never independently stored/overridable elsewhere — this is the only place
 * it's computed, so it can't drift.
 */
export function resolveBusinessFundedRequirement(life: ScenarioLifeAssumption): FundingResolution {
  const totalPersonalEconomicRequirement = add(parseMoney(life.lifeRequirement), parseMoney(life.securityRequirement));
  const businessFundedRequirement = resolveBusinessFundedAmount(totalPersonalEconomicRequirement, life.outsideFundingRetained);
  return { totalPersonalEconomicRequirement, businessFundedRequirement };
}
