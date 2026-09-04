import type { ScenarioLifeAssumption } from "@revenue-reality/domain";
import { validateFundingModeExclusivity } from "@revenue-reality/validation";
import { type Dec, add, multiply, parseMoney, parsePercent, subtract } from "./money.js";

export interface FundingResolution {
  totalPersonalEconomicRequirement: Dec; // lifeRequirement + securityRequirement — the ONLY figure consumed onward
  businessFundedRequirement: Dec; // totalPersonalEconomicRequirement − outsideFundingRetained, ONE calculation
}

/**
 * The one funding-responsibility calculation, shared by NOW/NEXT/ULTIMATELY.
 * Never independently stored/overridable elsewhere — this is the only place
 * it's computed, so it can't drift.
 */
export function resolveBusinessFundedRequirement(life: ScenarioLifeAssumption): FundingResolution {
  validateFundingModeExclusivity(life.outsideFundingRetained);

  const totalPersonalEconomicRequirement = add(parseMoney(life.lifeRequirement), parseMoney(life.securityRequirement));

  const retained =
    life.outsideFundingRetained.mode === "AMOUNT"
      ? parseMoney(life.outsideFundingRetained.amount!)
      : multiply(totalPersonalEconomicRequirement, parsePercent(life.outsideFundingRetained.percentOfTotal!));

  const businessFundedRequirement = subtract(totalPersonalEconomicRequirement, retained);

  return { totalPersonalEconomicRequirement, businessFundedRequirement };
}
