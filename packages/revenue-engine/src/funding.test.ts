import { describe, expect, it } from "vitest";
import type { ScenarioLifeAssumption } from "@revenue-reality/domain";
import {
  type BusinessFundedConfirmation,
  deriveOutsideFundingRetained,
  resolveBusinessFundedRequirement,
  resolveConfirmedBusinessFundedAmount,
} from "./funding";
import { dec, formatMoney, formatPercent } from "./money";

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

describe("Life-8 funding responsibility — owner confirms the business's share directly", () => {
  const total = dec("2150.00");

  it("AMOUNT mode: the confirmed business-funded amount is read directly, not re-derived", () => {
    const confirmation: BusinessFundedConfirmation = { mode: "AMOUNT", amount: "1612.50", confidence: "STRONG_ESTIMATE" };
    expect(formatMoney(resolveConfirmedBusinessFundedAmount(total, confirmation))).toBe("1612.50");
  });

  it("PERCENT_OF_TOTAL mode: the confirmed business-funded amount scales with the total (a percent commitment, by definition, flexes)", () => {
    const confirmation: BusinessFundedConfirmation = { mode: "PERCENT_OF_TOTAL", percentOfTotal: "0.75", confidence: "STRONG_ESTIMATE" };
    expect(formatMoney(resolveConfirmedBusinessFundedAmount(total, confirmation))).toBe("1612.50");
  });

  it("deriveOutsideFundingRetained (AMOUNT mode): outsideFundingRetained = total − businessFundedRequirement", () => {
    const confirmation: BusinessFundedConfirmation = { mode: "AMOUNT", amount: "1612.50", confidence: "STRONG_ESTIMATE" };
    const retained = deriveOutsideFundingRetained(total, confirmation);
    expect(retained.mode).toBe("AMOUNT");
    expect(retained.amount).toBe("537.50");
  });

  it("deriveOutsideFundingRetained (PERCENT_OF_TOTAL mode): outside percent = 1 − business percent", () => {
    const confirmation: BusinessFundedConfirmation = { mode: "PERCENT_OF_TOTAL", percentOfTotal: "0.75", confidence: "STRONG_ESTIMATE" };
    const retained = deriveOutsideFundingRetained(total, confirmation);
    expect(retained.mode).toBe("PERCENT_OF_TOTAL");
    expect(retained.percentOfTotal).toBe("0.25");
  });

  it("round-trip: deriving outsideFundingRetained and resolving it back produces the exact confirmed business-funded amount — the one calculation holds in both modes", () => {
    for (const confirmation of [
      { mode: "AMOUNT", amount: "1612.50", confidence: "STRONG_ESTIMATE" },
      { mode: "PERCENT_OF_TOTAL", percentOfTotal: "0.75", confidence: "STRONG_ESTIMATE" },
    ] satisfies BusinessFundedConfirmation[]) {
      const retained = deriveOutsideFundingRetained(total, confirmation);
      const life = lifeAssumption({ outsideFundingRetained: retained });
      const { businessFundedRequirement } = resolveBusinessFundedRequirement({ ...life, lifeRequirement: "2150.00", securityRequirement: "0.00" });
      expect(formatMoney(businessFundedRequirement)).toBe(formatMoney(resolveConfirmedBusinessFundedAmount(total, confirmation)));
    }
  });

  it("rejects amount and percentOfTotal combined on the business-facing confirmation too — never cumulative", () => {
    const confirmation = { mode: "AMOUNT", amount: "1612.50", percentOfTotal: "0.75", confidence: "STRONG_ESTIMATE" } as BusinessFundedConfirmation;
    expect(() => resolveConfirmedBusinessFundedAmount(total, confirmation)).toThrow();
    expect(() => deriveOutsideFundingRetained(total, confirmation)).toThrow();
  });
});
