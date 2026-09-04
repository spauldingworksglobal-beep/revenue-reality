import { describe, expect, it } from "vitest";
import type { DeferredNeed, LifeCategory, SecurityItem } from "@revenue-reality/domain";
import {
  buildIntendedLifeCategories,
  buildIntendedSecurityItems,
  compareLifeRequirements,
  computeLifeRequirement,
  computeSecurityRequirement,
  computeTotalPersonalEconomicRequirement,
  resolveDeferredNeedsContribution,
} from "./life-reality";
import { formatMoney } from "./money";

function category(overrides: Partial<LifeCategory>): LifeCategory {
  return {
    id: "c1",
    lifeProfileId: "lp1",
    kind: "HOUSING",
    label: "Rent",
    currentAmount: { value: "1800.00", confidence: "EXACT" },
    intendedAmount: null,
    cadence: "MONTHLY",
    changeType: "KEEP",
    ...overrides,
  };
}

function security(overrides: Partial<SecurityItem>): SecurityItem {
  return {
    id: "s1",
    lifeProfileId: "lp1",
    kind: "EMERGENCY_SAVINGS",
    label: "Emergency fund",
    currentAmount: { value: "200.00", confidence: "STRONG_ESTIMATE" },
    intendedAmount: null,
    cadence: "MONTHLY",
    ...overrides,
  };
}

function deferredNeed(overrides: Partial<DeferredNeed>): DeferredNeed {
  return {
    id: "d1",
    lifeProfileId: "lp1",
    description: "Dental work postponed",
    estimatedAmount: { value: "150.00", confidence: "ROUGH_ESTIMATE" },
    includeInIntended: false,
    ...overrides,
  };
}

describe("computeLifeRequirement", () => {
  it("sums entered current amounts, normalized to monthly", () => {
    const categories = [
      category({ id: "a", kind: "HOUSING", currentAmount: { value: "1800.00", confidence: "EXACT" } }),
      category({ id: "b", kind: "FOOD", currentAmount: { value: "600.00", confidence: "STRONG_ESTIMATE" } }),
    ];
    const result = computeLifeRequirement(categories, "CURRENT");
    expect(formatMoney(result.monthly)).toBe("2400.00");
    expect(result.isPartial).toBe(false);
  });

  it("never converts a missing amount to zero silently — it's excluded from the sum AND surfaced as missing", () => {
    const categories = [
      category({ id: "a", kind: "HOUSING", label: "Rent", currentAmount: { value: "1800.00", confidence: "EXACT" } }),
      category({ id: "b", kind: "HEALTHCARE", label: "Health insurance", currentAmount: null }),
    ];
    const result = computeLifeRequirement(categories, "CURRENT");
    expect(formatMoney(result.monthly)).toBe("1800.00");
    expect(result.isPartial).toBe(true);
    expect(result.missing).toEqual([{ kind: "HEALTHCARE", label: "Health insurance" }]);
  });

  it("reads the intended amount for the INTENDED horizon", () => {
    const categories = [category({ currentAmount: { value: "1800.00", confidence: "EXACT" }, intendedAmount: { value: "1500.00", confidence: "STRONG_ESTIMATE" } })];
    expect(formatMoney(computeLifeRequirement(categories, "INTENDED").monthly)).toBe("1500.00");
  });

  it("normalizes an annual/irregular obligation to its monthly share", () => {
    const categories = [category({ currentAmount: { value: "1200.00", confidence: "EXACT" }, cadence: "ANNUALLY" })];
    expect(formatMoney(computeLifeRequirement(categories, "CURRENT").monthly)).toBe("100.00");
  });
});

describe("computeSecurityRequirement", () => {
  it("sums current security amounts, tracking gaps rather than zeroing them", () => {
    const items = [security({ id: "a" }), security({ id: "b", kind: "RETIREMENT", currentAmount: null })];
    const result = computeSecurityRequirement(items, "CURRENT");
    expect(formatMoney(result.monthly)).toBe("200.00");
    expect(result.isPartial).toBe(true);
  });
});

describe("computeTotalPersonalEconomicRequirement", () => {
  it("is living + security, disjoint sums", () => {
    const life = computeLifeRequirement([category({})], "CURRENT").monthly;
    const sec = computeSecurityRequirement([security({})], "CURRENT").monthly;
    expect(formatMoney(computeTotalPersonalEconomicRequirement(life, sec))).toBe("2000.00");
  });
});

describe("resolveDeferredNeedsContribution", () => {
  it("excludes a need by default — owner must actively opt in", () => {
    const result = resolveDeferredNeedsContribution([deferredNeed({})]);
    expect(formatMoney(result.includedMonthly)).toBe("0.00");
    expect(result.excluded).toEqual([{ description: "Dental work postponed", amount: "150.00" }]);
    expect(result.included).toEqual([]);
  });

  it("includes a need's estimate once explicitly opted in", () => {
    const result = resolveDeferredNeedsContribution([deferredNeed({ includeInIntended: true })]);
    expect(formatMoney(result.includedMonthly)).toBe("150.00");
    expect(result.included).toEqual([{ description: "Dental work postponed", amount: "150.00" }]);
  });

  it("an included need with no estimate yet contributes $0 but stays visible as a known gap", () => {
    const result = resolveDeferredNeedsContribution([deferredNeed({ includeInIntended: true, estimatedAmount: null })]);
    expect(formatMoney(result.includedMonthly)).toBe("0.00");
    expect(result.included).toEqual([{ description: "Dental work postponed", amount: null }]);
  });
});

describe("buildIntendedLifeCategories", () => {
  const current = [
    category({ id: "housing", kind: "HOUSING", currentAmount: { value: "1800.00", confidence: "EXACT" } }),
    category({ id: "food", kind: "FOOD", currentAmount: { value: "600.00", confidence: "EXACT" } }),
    category({ id: "transport", kind: "TRANSPORTATION", currentAmount: { value: "300.00", confidence: "EXACT" } }),
  ];

  it("carries over an unmentioned category as an implicit KEEP — never forces a full rebuild", () => {
    const intended = buildIntendedLifeCategories("lp1", current, []);
    expect(intended).toHaveLength(3);
    for (const entry of intended) {
      expect(entry.changeType).toBe("KEEP");
      expect(entry.intendedAmount?.value).toBe(entry.currentAmount?.value);
    }
  });

  it("REDUCE / INCREASE apply the owner's new amount", () => {
    const intended = buildIntendedLifeCategories("lp1", current, [
      { currentCategoryId: "housing", changeType: "REDUCE", newAmount: { value: "1500.00", confidence: "STRONG_ESTIMATE" } },
      { currentCategoryId: "food", changeType: "INCREASE", newAmount: { value: "700.00", confidence: "ROUGH_ESTIMATE" } },
    ]);
    const housing = intended.find((c) => c.id === "housing")!;
    const food = intended.find((c) => c.id === "food")!;
    expect(housing.intendedAmount?.value).toBe("1500.00");
    expect(housing.changeType).toBe("REDUCE");
    expect(food.intendedAmount?.value).toBe("700.00");
  });

  it("REMOVE records an explicit, confident $0 — not a dropped row", () => {
    const intended = buildIntendedLifeCategories("lp1", current, [{ currentCategoryId: "transport", changeType: "REMOVE" }]);
    const transport = intended.find((c) => c.id === "transport")!;
    expect(transport.intendedAmount).toEqual({ value: "0.00", confidence: "EXACT" });
    expect(transport.changeType).toBe("REMOVE");
  });

  it("ADD introduces a category with no current counterpart", () => {
    const intended = buildIntendedLifeCategories("lp1", current, [
      { changeType: "ADD", id: "travel", kind: "OTHER", label: "Monthly travel fund", newAmount: { value: "250.00", confidence: "ROUGH_ESTIMATE" }, cadence: "MONTHLY" },
    ]);
    const travel = intended.find((c) => c.id === "travel")!;
    expect(travel.currentAmount).toBeNull();
    expect(travel.intendedAmount?.value).toBe("250.00");
    expect(travel.changeType).toBe("ADD");
    expect(intended).toHaveLength(4); // 3 implicit KEEPs + 1 ADD
  });

  it("throws when a change references a current category that doesn't exist", () => {
    expect(() => buildIntendedLifeCategories("lp1", current, [{ currentCategoryId: "nonexistent", changeType: "KEEP" }])).toThrow(RangeError);
  });
});

describe("compareLifeRequirements", () => {
  it("distinguishes living, security, and total requirement for both horizons, and preserves deferred needs", () => {
    const currentCategories = [category({ id: "housing", currentAmount: { value: "1800.00", confidence: "EXACT" } })];
    const intendedCategories = buildIntendedLifeCategories("lp1", currentCategories, [
      { currentCategoryId: "housing", changeType: "REDUCE", newAmount: { value: "1500.00", confidence: "STRONG_ESTIMATE" } },
    ]);
    const currentSecurity = [security({ currentAmount: { value: "200.00", confidence: "EXACT" } })];
    const intendedSecurity = [security({ intendedAmount: { value: "500.00", confidence: "ROUGH_ESTIMATE" } })];
    const deferredNeeds = [deferredNeed({ includeInIntended: true, estimatedAmount: { value: "150.00", confidence: "ROUGH_ESTIMATE" } })];

    const comparison = compareLifeRequirements({ currentCategories, intendedCategories, currentSecurity, intendedSecurity, deferredNeeds });

    expect(comparison.current.livingRequirement).toBe("1800.00");
    expect(comparison.current.securityRequirement).toBe("200.00");
    expect(comparison.current.totalPersonalEconomicRequirement).toBe("2000.00");

    // intended living = 1500 (reduced housing) + 150 (deferred need folded in) = 1650
    expect(comparison.intended.livingRequirement).toBe("1650.00");
    expect(comparison.intended.securityRequirement).toBe("500.00");
    expect(comparison.intended.totalPersonalEconomicRequirement).toBe("2150.00");

    expect(comparison.deferredNeeds.included).toEqual([{ description: "Dental work postponed", amount: "150.00" }]);
  });
});

describe("buildIntendedSecurityItems", () => {
  const current = [
    security({ id: "emergency", kind: "EMERGENCY_SAVINGS", label: "Emergency fund", currentAmount: { value: "200.00", confidence: "EXACT" } }),
    security({ id: "retirement", kind: "RETIREMENT", label: "401k", currentAmount: { value: "300.00", confidence: "STRONG_ESTIMATE" } }),
    security({ id: "investing", kind: "INVESTING", label: "Brokerage", currentAmount: { value: "100.00", confidence: "ROUGH_ESTIMATE" } }),
    security({ id: "insurance", kind: "INSURANCE_BENEFITS", label: "Life insurance", currentAmount: null }),
  ];

  it("unchanged current security carries into intended — no blank reconstruction", () => {
    const intended = buildIntendedSecurityItems("lp1", current, []);
    expect(intended).toHaveLength(4);
    const emergency = intended.find((s) => s.id === "emergency")!;
    expect(emergency.intendedAmount).toEqual({ value: "200.00", confidence: "EXACT" });
  });

  it("increased amount", () => {
    const intended = buildIntendedSecurityItems("lp1", current, [
      { currentSecurityId: "retirement", changeType: "INCREASE", newAmount: { value: "500.00", confidence: "STRONG_ESTIMATE" } },
    ]);
    const retirement = intended.find((s) => s.id === "retirement")!;
    expect(retirement.intendedAmount).toEqual({ value: "500.00", confidence: "STRONG_ESTIMATE" });
    expect(retirement.currentAmount?.value).toBe("300.00"); // current untouched
  });

  it("reduced amount", () => {
    const intended = buildIntendedSecurityItems("lp1", current, [
      { currentSecurityId: "investing", changeType: "REDUCE", newAmount: { value: "50.00", confidence: "ROUGH_ESTIMATE" } },
    ]);
    expect(intended.find((s) => s.id === "investing")!.intendedAmount?.value).toBe("50.00");
  });

  it("removed item — an explicit, confident $0, not a dropped row", () => {
    const intended = buildIntendedSecurityItems("lp1", current, [{ currentSecurityId: "emergency", changeType: "REMOVE" }]);
    expect(intended.find((s) => s.id === "emergency")!.intendedAmount).toEqual({ value: "0.00", confidence: "EXACT" });
    expect(intended).toHaveLength(4); // still present, not removed from the list
  });

  it("newly added intended security item — no current counterpart", () => {
    const intended = buildIntendedSecurityItems("lp1", current, [
      { changeType: "ADD", id: "giving", kind: "GIVING_FAMILY_SUPPORT", label: "Monthly giving", newAmount: { value: "75.00", confidence: "ROUGH_ESTIMATE" }, cadence: "MONTHLY" },
    ]);
    const giving = intended.find((s) => s.id === "giving")!;
    expect(giving.currentAmount).toBeNull();
    expect(giving.intendedAmount?.value).toBe("75.00");
    expect(intended).toHaveLength(5);
  });

  it("incomplete current security remains visibly incomplete if not resolved — never silently zeroed", () => {
    const intended = buildIntendedSecurityItems("lp1", current, []);
    const insurance = intended.find((s) => s.id === "insurance")!;
    expect(insurance.currentAmount).toBeNull();
    expect(insurance.intendedAmount).toBeNull(); // still incomplete, NOT "0.00"
  });

  it("an owner resolving a previously-incomplete item explicitly overrides the gap", () => {
    const intended = buildIntendedSecurityItems("lp1", current, [
      { currentSecurityId: "insurance", changeType: "INCREASE", newAmount: { value: "40.00", confidence: "ROUGH_ESTIMATE" } },
    ]);
    expect(intended.find((s) => s.id === "insurance")!.intendedAmount?.value).toBe("40.00");
  });

  it("throws when a change references a current security item that doesn't exist", () => {
    expect(() => buildIntendedSecurityItems("lp1", current, [{ currentSecurityId: "nonexistent", changeType: "KEEP" }])).toThrow(RangeError);
  });
});
