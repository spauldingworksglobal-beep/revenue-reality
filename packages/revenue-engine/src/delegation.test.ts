import { describe, expect, it } from "vitest";
import type { DelegationItem } from "@revenue-reality/domain";
import { sumKnownDelegationCost } from "./delegation";
import { formatMoney } from "./money";

function item(overrides: Partial<DelegationItem>): DelegationItem {
  return {
    id: "d1",
    scenarioId: "next",
    functionLabel: "Bookkeeping",
    delegationType: "CONTRACTOR",
    replacementCost: { value: "300.00", confidence: "STRONG_ESTIMATE" },
    cadence: "MONTHLY",
    ...overrides,
  };
}

describe("sumKnownDelegationCost", () => {
  it("sums known replacement costs, normalized to monthly", () => {
    const items = [
      item({ id: "a", replacementCost: { value: "300.00", confidence: "STRONG_ESTIMATE" } }),
      item({ id: "b", replacementCost: { value: "1200.00", confidence: "ROUGH_ESTIMATE" }, cadence: "ANNUALLY" }),
    ];
    const result = sumKnownDelegationCost(items);
    expect(formatMoney(result.monthly)).toBe("400.00"); // 300 + (1200/12)
    expect(result.isPartial).toBe(false);
  });

  it("an item with no known replacement cost contributes nothing but marks the result partial — never a guessed market rate", () => {
    const items = [item({ replacementCost: null })];
    const result = sumKnownDelegationCost(items);
    expect(formatMoney(result.monthly)).toBe("0.00");
    expect(result.isPartial).toBe(true);
  });

  it("mixes known and unknown items — known cost still counts, unknown still flags partial", () => {
    const items = [item({ id: "a", replacementCost: { value: "500.00", confidence: "EXACT" } }), item({ id: "b", replacementCost: null })];
    const result = sumKnownDelegationCost(items);
    expect(formatMoney(result.monthly)).toBe("500.00");
    expect(result.isPartial).toBe(true);
  });

  it("empty list is inert — zero cost, not partial", () => {
    const result = sumKnownDelegationCost([]);
    expect(formatMoney(result.monthly)).toBe("0.00");
    expect(result.isPartial).toBe(false);
  });
});
