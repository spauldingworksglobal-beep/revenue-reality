import { describe, expect, it } from "vitest";
import type { OperatingCost } from "@revenue-reality/domain";
import { sumKnownOperatingCost } from "./operating-cost";
import { formatMoney } from "./money";

function cost(overrides: Partial<OperatingCost>): OperatingCost {
  return {
    id: "c1",
    scenarioId: "s1",
    category: "software",
    amount: "0.00",
    cadence: "MONTHLY",
    knownOrEstimated: "KNOWN",
    confidence: "EXACT",
    isPartialList: false,
    ...overrides,
  };
}

describe("sumKnownOperatingCost", () => {
  it("HCF: $583 + $106 + $450 + $483 = $1,622 known monthly operating cost", () => {
    const costs = [
      cost({ category: "software", amount: "583.00" }),
      cost({ category: "insurance", amount: "106.00" }),
      cost({ category: "storage", amount: "450.00" }),
      cost({ category: "phones", amount: "483.00" }),
    ];
    const result = sumKnownOperatingCost(costs);
    expect(formatMoney(result.monthly)).toBe("1622.00");
    expect(result.isPartial).toBe(false);
  });

  it("flags isPartial when any cost is marked as part of an incomplete list", () => {
    const costs = [cost({ amount: "100.00" }), cost({ amount: "50.00", isPartialList: true })];
    expect(sumKnownOperatingCost(costs).isPartial).toBe(true);
  });

  it("excludes ONE_TIME costs from the monthly recurring figure", () => {
    const costs = [cost({ amount: "100.00", cadence: "MONTHLY" }), cost({ amount: "5000.00", cadence: "ONE_TIME" })];
    const result = sumKnownOperatingCost(costs);
    expect(formatMoney(result.monthly)).toBe("100.00");
    expect(formatMoney(result.oneTimeTotal)).toBe("5000.00");
  });

  it("normalizes weekly and annual cadences to a monthly figure", () => {
    const costs = [cost({ amount: "100.00", cadence: "WEEKLY" }), cost({ amount: "1200.00", cadence: "ANNUALLY" })];
    const result = sumKnownOperatingCost(costs);
    // 100 * 52/12 = 433.333...; 1200/12 = 100; total = 533.333...
    expect(formatMoney(result.monthly)).toBe("533.33");
  });
});
