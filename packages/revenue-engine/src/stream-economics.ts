import Decimal from "decimal.js";
import type { ID, Percent, ScenarioRevenueStream } from "@revenue-reality/domain";
import { resolveCogsPerUnit, resolveOtherVariableCostPerUnit } from "./cogs";
import { ONE, type Dec, add, dec, divide, multiply, parseMoney, parsePercent, subtract } from "./money";

export interface StreamEconomics {
  streamId: ID;
  price: Dec;
  mixWeight: Dec; // 0–1 ratio
  cogsPerUnit: Dec;
  otherVariableCostPerUnit: Dec;
  grossProfitPerUnit: Dec; // price − COGS only
  grossMargin: Dec; // grossProfitPerUnit / price
  contributionPerUnit: Dec; // price − COGS − other variable
  contributionMargin: Dec; // contributionPerUnit / price
}

export function computeGrossProfitPerUnit(price: Dec, cogsPerUnit: Dec): Dec {
  return subtract(price, cogsPerUnit);
}

export function computeGrossMargin(grossProfitPerUnit: Dec, price: Dec): Dec {
  return divide(grossProfitPerUnit, price);
}

export function computeContributionPerUnit(price: Dec, cogsPerUnit: Dec, otherVariableCostPerUnit: Dec): Dec {
  return subtract(subtract(price, cogsPerUnit), otherVariableCostPerUnit);
}

export function computeContributionMargin(contributionPerUnit: Dec, price: Dec): Dec {
  return divide(contributionPerUnit, price);
}

/** Resolves COGS + other variable costs and derives both margins independently — the Revision 2 fix. */
export function resolveStreamEconomics(stream: ScenarioRevenueStream): StreamEconomics {
  const price = parseMoney(stream.priceOrAvgValue.value);
  const cogsPerUnit = resolveCogsPerUnit(stream.cogs);
  const otherVariableCostPerUnit = resolveOtherVariableCostPerUnit(stream.otherVariableCosts, price);
  const grossProfitPerUnit = computeGrossProfitPerUnit(price, cogsPerUnit);
  const grossMargin = computeGrossMargin(grossProfitPerUnit, price);
  const contributionPerUnit = computeContributionPerUnit(price, cogsPerUnit, otherVariableCostPerUnit);
  const contributionMargin = computeContributionMargin(contributionPerUnit, price);

  return {
    streamId: stream.streamId,
    price,
    mixWeight: parsePercent(stream.mixWeight),
    cogsPerUnit,
    otherVariableCostPerUnit,
    grossProfitPerUnit,
    grossMargin,
    contributionPerUnit,
    contributionMargin,
  };
}

/** Σ(revenue_share × stream_margin) across a scenario's active streams. */
export function computeWeightedContributionMargin(streams: StreamEconomics[]): Dec {
  return add(...streams.map((s) => multiply(s.mixWeight, s.contributionMargin)));
}

/**
 * An incomplete sales mix (the owner doesn't know the real split between
 * streams) never blocks the calculation — it defaults to an equal split,
 * clearly a placeholder (callers should tag it INCOMPLETE), rather than
 * refusing to run. Sums to EXACTLY "1" at 8-decimal precision — the last
 * share absorbs the remainder — so validateMixWeightsSum100 always passes
 * on the result, never a near-miss from repeating decimals (e.g. thirds).
 */
export function computeEqualMixWeights(count: number): Percent[] {
  if (count <= 0) return [];
  if (count === 1) return ["1"];
  const share = divide(ONE, dec(count)).toDecimalPlaces(8, Decimal.ROUND_DOWN);
  const shares = new Array(count - 1).fill(share) as Dec[];
  const last = subtract(ONE, add(...shares));
  return [...shares, last].map((d) => d.toFixed(8));
}
