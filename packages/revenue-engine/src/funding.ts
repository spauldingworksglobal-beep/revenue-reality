import type { OutsideFundingRetained, ScenarioLifeAssumption } from "@revenue-reality/domain";
import { validateFundingModeExclusivity } from "@revenue-reality/validation";
import { ONE, type Dec, add, formatMoney, formatPercent, multiply, parseMoney, parsePercent, subtract } from "./money";

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

/**
 * The owner-facing shape of the Life-8 funding-responsibility question:
 * "what portion of your personal economic requirement should the business
 * carry?" — never "what do you retain from outside." Structurally
 * identical to OutsideFundingRetained (mode + amount|percent + confidence)
 * because it's the same one calculation viewed from the business's side
 * instead of the outside-funding side — amount/percent remain alternate
 * modes, never combined, enforced by the same validator.
 */
export type BusinessFundedConfirmation = OutsideFundingRetained;

/** The confirmed business-funded amount is the owner-facing concept — read it directly, never re-derive it from a possibly-changed total in AMOUNT mode. */
export function resolveConfirmedBusinessFundedAmount(
  totalPersonalEconomicRequirement: Dec,
  confirmation: BusinessFundedConfirmation,
): Dec {
  validateFundingModeExclusivity(confirmation);
  return confirmation.mode === "AMOUNT"
    ? parseMoney(confirmation.amount!)
    : multiply(totalPersonalEconomicRequirement, parsePercent(confirmation.percentOfTotal!));
}

/**
 * The engine derives outsideFundingRetained as the complement of the
 * confirmed business-funded amount — outsideFundingRetained = total −
 * businessFundedRequirement — never the other way around. This is the only
 * place that derivation happens.
 */
export function deriveOutsideFundingRetained(
  totalPersonalEconomicRequirement: Dec,
  confirmation: BusinessFundedConfirmation,
): OutsideFundingRetained {
  validateFundingModeExclusivity(confirmation);
  if (confirmation.mode === "AMOUNT") {
    const businessAmount = parseMoney(confirmation.amount!);
    return {
      mode: "AMOUNT",
      amount: formatMoney(subtract(totalPersonalEconomicRequirement, businessAmount)),
      confidence: confirmation.confidence,
    };
  }
  const businessPercent = parsePercent(confirmation.percentOfTotal!);
  return {
    mode: "PERCENT_OF_TOTAL",
    percentOfTotal: formatPercent(subtract(ONE, businessPercent)),
    confidence: confirmation.confidence,
  };
}
