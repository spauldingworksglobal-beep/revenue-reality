import { describe, expect, it } from "vitest";
import type { Owner, OwnerEconomics, ScenarioDistributionPolicy } from "@revenue-reality/domain";
import { resolveDistributionPercent, resolveOwnerCashComponents } from "./owner-economics";
import { formatMoney, formatPercent } from "./money";

function owner(overrides: Partial<OwnerEconomics>): OwnerEconomics {
  return {
    scenarioId: "s1",
    ownerId: "o1",
    ownershipPercent: "0.5",
    distributionPercent: null,
    isPrimaryRespondent: false,
    ...overrides,
  };
}

describe("resolveDistributionPercent", () => {
  it("SAME_AS_OWNERSHIP mirrors ownershipPercent exactly, ignoring any stray distributionPercent", () => {
    const owners = [owner({ ownerId: "a", ownershipPercent: "0.7" }), owner({ ownerId: "b", ownershipPercent: "0.3" })];
    const policy: ScenarioDistributionPolicy = { scenarioId: "s1", rule: "SAME_AS_OWNERSHIP" };
    const a = owners[0]!;
    const withStrayCustom = { ...a, distributionPercent: "0.99" }; // must be ignored under this rule
    expect(formatPercent(resolveDistributionPercent(withStrayCustom, owners, policy)!)).toBe("0.7");
  });

  it("EQUAL_SPLIT ignores ownership entirely", () => {
    const owners = [owner({ ownerId: "a", ownershipPercent: "0.7" }), owner({ ownerId: "b", ownershipPercent: "0.3" }), owner({ ownerId: "c", ownershipPercent: "0" })];
    const policy: ScenarioDistributionPolicy = { scenarioId: "s1", rule: "EQUAL_SPLIT" };
    expect(formatPercent(resolveDistributionPercent(owners[0]!, owners, policy)!)).toBe("0.333333");
  });

  it("CUSTOM_PERCENTAGE reads the owner's own distributionPercent", () => {
    const a = owner({ ownerId: "a", distributionPercent: "0.65" });
    const policy: ScenarioDistributionPolicy = { scenarioId: "s1", rule: "CUSTOM_PERCENTAGE" };
    expect(formatPercent(resolveDistributionPercent(a, [a], policy)!)).toBe("0.65");
  });

  it("DISCRETIONARY and OTHER have no resolvable percentage", () => {
    const a = owner({ ownerId: "a" });
    expect(resolveDistributionPercent(a, [a], { scenarioId: "s1", rule: "DISCRETIONARY" })).toBeNull();
    expect(resolveDistributionPercent(a, [a], { scenarioId: "s1", rule: "OTHER" })).toBeNull();
  });
});

describe("Business Profile ownership never infers scenario-level distribution", () => {
  it("Owner.ownershipPercent (business profile) has no bearing on OwnerEconomics.distributionPercent (scenario-level) — CUSTOM_PERCENTAGE still requires it independently", () => {
    // A business-profile Owner record with a known, confirmed 50% legal ownership share.
    const businessProfileOwner: Owner = {
      id: "o1",
      businessId: "b1",
      label: "Jess",
      isPrimaryRespondent: true,
      ownershipPercent: { value: "0.5", confidence: "EXACT" },
    };

    // Building this owner's scenario-level economics from scratch: even carrying the
    // SAME ownership assumption forward, distributionPercent is independently null
    // until the owner confirms a distribution rule — nothing derives it automatically.
    const scenarioOwner = owner({
      ownerId: businessProfileOwner.id,
      ownershipPercent: businessProfileOwner.ownershipPercent.value,
      distributionPercent: null,
    });
    const policy: ScenarioDistributionPolicy = { scenarioId: "s1", rule: "CUSTOM_PERCENTAGE" };

    expect(resolveDistributionPercent(scenarioOwner, [scenarioOwner], policy)).toBeNull();
  });
});

describe("resolveOwnerCashComponents", () => {
  it("UNCLASSIFIED_TOTAL: labor comp is zero, the total is held separately", () => {
    const a = owner({ cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "400.00", confidence: "INCOMPLETE" } } });
    const c = resolveOwnerCashComponents(a);
    expect(formatMoney(c.laborCompensation)).toBe("0.00");
    expect(c.measuredProfitDistribution).toBeNull();
    expect(formatMoney(c.unclassifiedTotal!)).toBe("400.00");
  });

  it("CLASSIFIED: splits labor comp and profit distribution", () => {
    const a = owner({
      cashReceived: {
        mode: "CLASSIFIED",
        laborCompensation: { value: "2000.00", confidence: "EXACT" },
        profitDistribution: { value: "500.00", confidence: "EXACT" },
      },
    });
    const c = resolveOwnerCashComponents(a);
    expect(formatMoney(c.laborCompensation)).toBe("2000.00");
    expect(formatMoney(c.measuredProfitDistribution!)).toBe("500.00");
    expect(c.unclassifiedTotal).toBeNull();
  });

  it("NEXT/ULTIMATELY target: reads targetLaborCompensation, leaves measured fields null", () => {
    const a = owner({ targetLaborCompensation: { value: "3000.00", confidence: "STRONG_ESTIMATE" } });
    const c = resolveOwnerCashComponents(a);
    expect(formatMoney(c.laborCompensation)).toBe("3000.00");
    expect(c.measuredProfitDistribution).toBeNull();
    expect(c.unclassifiedTotal).toBeNull();
  });
});
