import type { ID, ScenarioRevenueStream } from "@revenue-reality/domain";
import { resolveCogsPerUnit, resolveOtherVariableCostPerUnit } from "./cogs.js";
import { type Dec, add, divide, multiply, parseMoney, parsePercent, subtract } from "./money.js";

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
