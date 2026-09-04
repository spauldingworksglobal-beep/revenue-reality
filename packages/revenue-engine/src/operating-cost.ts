import type { OperatingCost } from "@revenue-reality/domain";
import { normalizeCadence } from "./cadence.js";
import { type Dec, add, parseMoney } from "./money.js";

export interface KnownOperatingCostResult {
  monthly: Dec; // recurring only — ONE_TIME costs are excluded, see cadence.ts
  oneTimeTotal: Dec;
  isPartial: boolean; // true if any cost is flagged as part of an incomplete list
}

export function sumKnownOperatingCost(costs: OperatingCost[]): KnownOperatingCostResult {
  const monthlyAmounts: Dec[] = [];
  const oneTimeAmounts: Dec[] = [];

  for (const cost of costs) {
    const { monthly } = normalizeCadence(parseMoney(cost.amount), cost.cadence);
    if (cost.cadence === "ONE_TIME") {
      oneTimeAmounts.push(parseMoney(cost.amount));
    } else {
      monthlyAmounts.push(monthly);
    }
  }

  return {
    monthly: add(...monthlyAmounts),
    oneTimeTotal: add(...oneTimeAmounts),
    isPartial: costs.some((c) => c.isPartialList),
  };
}
