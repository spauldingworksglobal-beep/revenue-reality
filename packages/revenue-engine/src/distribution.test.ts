import { describe, expect, it } from "vitest";
import {
  computeContributionEconomics,
  computeDistributableEconomicSurplus,
  computeOperatingEconomicSurplus,
  computeOwnerProfitDistribution,
  computeTotalOwnerEconomicBenefit,
  solveRequiredDistributableSurplus,
  solveRequiredRevenueFromOwnerTarget,
} from "./distribution.js";
import { dec, formatMoney, ZERO } from "./money.js";

describe("forward waterfall", () => {
  it("computeContributionEconomics: revenue × weighted contribution margin", () => {
    expect(formatMoney(computeContributionEconomics(dec("10000"), dec("0.4")))).toBe("4000.00");
  });

  it("computeOperatingEconomicSurplus: contribution − opex − Σ owner labor comp", () => {
    const surplus = computeOperatingEconomicSurplus(dec("4000"), dec("1500"), [dec("1000"), dec("500")]);
    expect(formatMoney(surplus)).toBe("1000.00");
  });

  it("retained capital strictly reduces distributable surplus below operating surplus", () => {
    const operating = dec("1000");
    const distributable = computeDistributableEconomicSurplus(operating, dec("300"));
    expect(formatMoney(distributable)).toBe("700.00");
    expect(distributable.lessThan(operating)).toBe(true);
  });

  it("computeOwnerProfitDistribution: distributable surplus × distribution percent", () => {
    expect(formatMoney(computeOwnerProfitDistribution(dec("700"), dec("0.5")))).toBe("350.00");
  });

  it("computeTotalOwnerEconomicBenefit: labor + distribution", () => {
    expect(formatMoney(computeTotalOwnerEconomicBenefit(dec("2000"), dec("350")))).toBe("2350.00");
  });
});

describe("backward solve", () => {
  it("solveRequiredDistributableSurplus: owner needs $4,000 distribution, entitled to 40% ⇒ $10,000 required distributable surplus", () => {
    expect(formatMoney(solveRequiredDistributableSurplus(dec("4000"), dec("0.4")))).toBe("10000.00");
  });

  it("solveRequiredRevenueFromOwnerTarget: full chain, X ÷ Y then retention added back", () => {
    const result = solveRequiredRevenueFromOwnerTarget({
      businessFundedRequirement: dec("8000"), // owner needs $8,000/mo total
      primaryOwnerTargetLaborCompensation: dec("4000"), // holds $4,000 as labor
      primaryOwnerDistributionPercent: dec("0.4"), // entitled to 40% of distributable surplus
      manualRequiredDistributableSurplus: null,
      knownOperatingCostMonthly: dec("1622"),
      allOwnersLaborCompensation: [dec("4000")],
      requiredRetainedCapitalTotal: dec("500"),
      weightedContributionMargin: dec("0.463636"),
    });
    expect(result.status).toBe("SOLVED");
    if (result.status !== "SOLVED") throw new Error("unreachable");

    // required profit distribution = 8000 - 4000 = 4000
    expect(formatMoney(result.requiredOwnerProfitDistribution)).toBe("4000.00");
    // required distributable surplus = 4000 / 0.4 = 10000
    expect(formatMoney(result.requiredDistributableSurplus)).toBe("10000.00");
    // REC = (10000 + 500 retained) + 1622 opex + 4000 labor = 16122
    expect(formatMoney(result.requiredEconomicContribution)).toBe("16122.00");
    // required revenue = 16122 / 0.463636
    expect(result.requiredRevenue.greaterThan(0)).toBe(true);
  });

  it("returns INSUFFICIENT_DATA when the distribution rule has no resolvable percentage and no manual target is given", () => {
    const result = solveRequiredRevenueFromOwnerTarget({
      businessFundedRequirement: dec("8000"),
      primaryOwnerTargetLaborCompensation: dec("4000"),
      primaryOwnerDistributionPercent: null, // DISCRETIONARY/OTHER
      manualRequiredDistributableSurplus: null,
      knownOperatingCostMonthly: dec("1622"),
      allOwnersLaborCompensation: [dec("4000")],
      requiredRetainedCapitalTotal: dec("0"),
      weightedContributionMargin: dec("0.463636"),
    });
    expect(result.status).toBe("INSUFFICIENT_DATA");
  });

  it("falls back to a manually-entered target distributable surplus when no percentage resolves", () => {
    const result = solveRequiredRevenueFromOwnerTarget({
      businessFundedRequirement: dec("8000"),
      primaryOwnerTargetLaborCompensation: dec("4000"),
      primaryOwnerDistributionPercent: null,
      manualRequiredDistributableSurplus: dec("9000"),
      knownOperatingCostMonthly: dec("1622"),
      allOwnersLaborCompensation: [dec("4000")],
      requiredRetainedCapitalTotal: dec("0"),
      weightedContributionMargin: dec("0.463636"),
    });
    expect(result.status).toBe("SOLVED");
    if (result.status !== "SOLVED") throw new Error("unreachable");
    expect(formatMoney(result.requiredDistributableSurplus)).toBe("9000.00");
  });

  it("required profit distribution never goes negative — floors at zero", () => {
    const result = solveRequiredRevenueFromOwnerTarget({
      businessFundedRequirement: dec("2000"), // less than the owner's own labor comp
      primaryOwnerTargetLaborCompensation: dec("5000"),
      primaryOwnerDistributionPercent: dec("1"),
      manualRequiredDistributableSurplus: null,
      knownOperatingCostMonthly: ZERO,
      allOwnersLaborCompensation: [dec("5000")],
      requiredRetainedCapitalTotal: ZERO,
      weightedContributionMargin: dec("1"),
    });
    expect(result.status).toBe("SOLVED");
    if (result.status !== "SOLVED") throw new Error("unreachable");
    expect(formatMoney(result.requiredOwnerProfitDistribution)).toBe("0.00");
  });

  it("round-trip invariant: forward(backward(target)) reproduces the same total owner economic benefit", () => {
    const businessFundedRequirement = dec("8000");
    const targetLaborComp = dec("4000");
    const distributionPercent = dec("0.4");
    const knownOpex = dec("1622");
    const retainedCapital = dec("500");
    const weightedCM = dec("0.463636");

    const backward = solveRequiredRevenueFromOwnerTarget({
      businessFundedRequirement,
      primaryOwnerTargetLaborCompensation: targetLaborComp,
      primaryOwnerDistributionPercent: distributionPercent,
      manualRequiredDistributableSurplus: null,
      knownOperatingCostMonthly: knownOpex,
      allOwnersLaborCompensation: [targetLaborComp],
      requiredRetainedCapitalTotal: retainedCapital,
      weightedContributionMargin: weightedCM,
    });
    expect(backward.status).toBe("SOLVED");
    if (backward.status !== "SOLVED") throw new Error("unreachable");

    // forward pass using the solved revenue
    const contribution = computeContributionEconomics(backward.requiredRevenue, weightedCM);
    const operatingSurplus = computeOperatingEconomicSurplus(contribution, knownOpex, [targetLaborComp]);
    const distributableSurplus = computeDistributableEconomicSurplus(operatingSurplus, retainedCapital);
    const profitDistribution = computeOwnerProfitDistribution(distributableSurplus, distributionPercent);
    const totalBenefit = computeTotalOwnerEconomicBenefit(targetLaborComp, profitDistribution);

    expect(formatMoney(totalBenefit)).toBe(formatMoney(businessFundedRequirement));
  });
});
