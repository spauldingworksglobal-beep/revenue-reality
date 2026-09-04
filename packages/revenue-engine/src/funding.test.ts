import { describe, expect, it } from "vitest";
import type { ScenarioLifeAssumption } from "@revenue-reality/domain";
import { resolveBusinessFundedRequirement } from "./funding.js";
import { formatMoney } from "./money.js";

function lifeAssumption(overrides: Partial<ScenarioLifeAssumption> = {}): ScenarioLifeAssumption {
  return {
    scenarioId: "s1",
    source: "CURRENT",
    lifeRequirement: "3000.00",
    securityRequirement: "200.00",
    outsideFundingRetained: { mode: "AMOUNT", amount: "0.00", confidence: "EXACT" },
    selectedLifeChanges: [],
    ...overrides,
  };
}

describe("resolveBusinessFundedRequirement", () => {
  it("totalPersonalEconomicRequirement is life + security", () => {
    const { totalPersonalEconomicRequirement } = resolveBusinessFundedRequirement(lifeAssumption());
    expect(formatMoney(totalPersonalEconomicRequirement)).toBe("3200.00");
  });

  it("AMOUNT mode subtracts the retained figure directly", () => {
    const life = lifeAssumption({ outsideFundingRetained: { mode: "AMOUNT", amount: "1200.00", confidence: "EXACT" } });
    const { businessFundedRequirement } = resolveBusinessFundedRequirement(life);
    expect(formatMoney(businessFundedRequirement)).toBe("2000.00");
  });

  it("PERCENT_OF_TOTAL mode produces the identical result to an equivalent AMOUNT — one calculation, two entry modes", () => {
    // 1200 / 3200 = 0.375 retained as a percent of total
    const byAmount = resolveBusinessFundedRequirement(
      lifeAssumption({ outsideFundingRetained: { mode: "AMOUNT", amount: "1200.00", confidence: "EXACT" } }),
    );
    const byPercent = resolveBusinessFundedRequirement(
      lifeAssumption({ outsideFundingRetained: { mode: "PERCENT_OF_TOTAL", percentOfTotal: "0.375", confidence: "EXACT" } }),
    );
    expect(formatMoney(byPercent.businessFundedRequirement)).toBe(formatMoney(byAmount.businessFundedRequirement));
  });

  it("rejects both amount and percentOfTotal set on the same figure", () => {
    const life = lifeAssumption({
      outsideFundingRetained: { mode: "AMOUNT", amount: "1200.00", percentOfTotal: "0.2", confidence: "EXACT" },
    });
    expect(() => resolveBusinessFundedRequirement(life)).toThrow();
  });
});
