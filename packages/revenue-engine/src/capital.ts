import type { CapitalRequirementItem } from "@revenue-reality/domain";
import { normalizeCadence } from "./cadence.js";
import { type Dec, add, parseMoney } from "./money.js";

export interface RetainedCapitalResult {
  recurring: Dec;
  oneTime: Dec;
  total: Dec;
}

/**
 * Recurring retention (ongoing reserve target, steady reinvestment) stays
 * distinguishable from one-time cash events (equipment purchase, initial
 * inventory build) all the way through — never blended into one figure
 * before it reaches the output.
 */
export function sumRequiredRetainedBusinessCapital(items: CapitalRequirementItem[]): RetainedCapitalResult {
  const recurringAmounts: Dec[] = [];
  const oneTimeAmounts: Dec[] = [];

  for (const item of items) {
    if (item.nature === "ONE_TIME") {
      oneTimeAmounts.push(parseMoney(item.amount));
    } else {
      const { monthly } = normalizeCadence(parseMoney(item.amount), item.cadence);
      recurringAmounts.push(monthly);
    }
  }

  const recurring = add(...recurringAmounts);
  const oneTime = add(...oneTimeAmounts);
  return { recurring, oneTime, total: add(recurring, oneTime) };
}
