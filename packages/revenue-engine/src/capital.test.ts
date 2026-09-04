import { describe, expect, it } from "vitest";
import type { CapitalRequirementItem } from "@revenue-reality/domain";
import { sumRequiredRetainedBusinessCapital } from "./capital.js";
import { formatMoney } from "./money.js";

function item(overrides: Partial<CapitalRequirementItem>): CapitalRequirementItem {
  return {
    id: "i1",
    scenarioId: "s1",
    category: "RESERVE",
    amount: "0.00",
    nature: "RECURRING",
    cadence: "MONTHLY",
    confidence: "EXACT",
    ...overrides,
  };
}

describe("sumRequiredRetainedBusinessCapital", () => {
  it("keeps recurring and one-time figures separate, never blended before output", () => {
    const items = [
      item({ category: "RESERVE", amount: "500.00", nature: "RECURRING", cadence: "MONTHLY" }),
      item({ category: "EQUIPMENT", amount: "3000.00", nature: "ONE_TIME", cadence: "ONE_TIME" }),
    ];
    const result = sumRequiredRetainedBusinessCapital(items);
    expect(formatMoney(result.recurring)).toBe("500.00");
    expect(formatMoney(result.oneTime)).toBe("3000.00");
    expect(formatMoney(result.total)).toBe("3500.00");
  });

  it("normalizes a RECURRING item's cadence before summing", () => {
    const items = [item({ category: "REINVESTMENT", amount: "1200.00", nature: "RECURRING", cadence: "ANNUALLY" })];
    const result = sumRequiredRetainedBusinessCapital(items);
    expect(formatMoney(result.recurring)).toBe("100.00");
  });

  it("returns zero for an empty scenario", () => {
    const result = sumRequiredRetainedBusinessCapital([]);
    expect(formatMoney(result.total)).toBe("0.00");
  });
});
