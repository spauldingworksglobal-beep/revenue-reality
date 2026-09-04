import { describe, expect, it } from "vitest";
import { hcfNowInput } from "./fixtures/hcf.js";
import { runScenario } from "./scenario.js";

describe("runScenario — HCF acceptance fixture (Build Spec §20)", () => {
  const result = runScenario(hcfNowInput(), { revisionId: "rev-1", computedAt: "2026-09-04T00:00:00.000Z" });

  it("computes COGS per bar as $2.95", () => {
    expect(result.perStreamEconomics).toEqual([
      expect.objectContaining({ streamId: "chocolate-bar" }),
    ]);
  });

  it("computes gross margin as ~46.36% (0.463636)", () => {
    expect(result.perStreamEconomics[0]!.grossMargin).toBe("0.463636");
  });

  it("computes contribution margin identically to gross margin — HCF has no other variable costs", () => {
    expect(result.perStreamEconomics[0]!.contributionMargin).toBe("0.463636");
  });

  it("known monthly operating cost sums to $1,622 (via the break-even floor)", () => {
    expect(result.breakEvenFloor?.revenue).toBe("3498.43");
  });

  it("break-even floor rounds up to 637 bars", () => {
    expect(result.breakEvenFloor?.volumeByStream).toEqual([{ streamId: "chocolate-bar", volume: 637 }]);
  });

  it("passes actualRevenue through untouched — $4,800 since restart, never annualized", () => {
    expect(result.actualRevenue).toBe("4800.00");
  });

  it("computes a non-null requiredRevenue for NOW, distinct from actualRevenue", () => {
    expect(result.requiredRevenue).toBeTruthy();
    expect(Number(result.requiredRevenue)).toBeGreaterThan(0);
    expect(result.requiredRevenue).not.toBe(result.actualRevenue);
  });

  it("preserves incomplete owner-role information without blocking the calculation", () => {
    expect(result.ownerEconomicsResults).toHaveLength(2);
    const owner1 = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-1")!;
    const owner2 = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-2")!;
    expect(owner1.totalOwnerEconomicBenefit).toBe("0.00");
    expect(owner2.totalOwnerEconomicBenefit).toBe("400.00");
  });

  it("flags the unclassified owner cash and partial operating cost list as low-confidence, worst-first", () => {
    const fields = result.confidenceFlags.map((f) => f.field);
    expect(fields).toContain("operatingCosts");
    expect(fields.some((f) => f.includes("cashReceived"))).toBe(true);
    // INCOMPLETE entries must sort before any lower-severity entries
    const severityOrder = ["INCOMPLETE", "ROUGH_ESTIMATE", "STRONG_ESTIMATE"];
    const seen = result.confidenceFlags.map((f) => f.confidence);
    const seenIndices = seen.map((c) => severityOrder.indexOf(c));
    expect([...seenIndices].sort((a, b) => a - b)).toEqual(seenIndices);
  });

  it("the primary respondent's benefit is compared to their business-funded requirement, not to revenue", () => {
    // owner-1 (primary) received $0 — well short of the illustrative $3,200 requirement
    expect(result.primaryOwnerBenefitVsRequirement.businessFundedPersonalEconomicRequirement).toBe("3200.00");
    expect(result.primaryOwnerBenefitVsRequirement.totalOwnerEconomicBenefit).toBe("0.00");
    expect(result.ownerSupportSignal).toBe("OWNER_SUPPORTS_BUSINESS");
  });

  it("stamps a formula version and the given revision id for reproducibility", () => {
    expect(result.formulaVersion).toBeTruthy();
    expect(result.scenarioRevisionId).toBe("rev-1");
  });
});

describe("runScenario — structural guards", () => {
  it("throws when no owner is marked isPrimaryRespondent", () => {
    const input = hcfNowInput();
    input.ownerEconomics = input.ownerEconomics.map((o) => ({ ...o, isPrimaryRespondent: false }));
    expect(() => runScenario(input, { revisionId: "r" })).toThrow(/isPrimaryRespondent/);
  });

  it("throws when more than one owner is marked isPrimaryRespondent", () => {
    const input = hcfNowInput();
    input.ownerEconomics = input.ownerEconomics.map((o) => ({ ...o, isPrimaryRespondent: true }));
    expect(() => runScenario(input, { revisionId: "r" })).toThrow(/isPrimaryRespondent/);
  });

  it("throws when ownership percentages do not sum to 100%", () => {
    const input = hcfNowInput();
    input.ownerEconomics[0]!.ownershipPercent = "0.6"; // now 0.6 + 0.5 = 1.1
    expect(() => runScenario(input, { revisionId: "r" })).toThrow();
  });

  it("throws when mix weights do not sum to 100%", () => {
    const input = hcfNowInput();
    input.streams[0]!.mixWeight = "0.9";
    expect(() => runScenario(input, { revisionId: "r" })).toThrow();
  });

  it("throws when NOW is missing actualRevenue", () => {
    const input = hcfNowInput();
    input.actualRevenue = null;
    expect(() => runScenario(input, { revisionId: "r" })).toThrow(/actualRevenue/);
  });

  it("is deterministic — the same input always produces the same output", () => {
    const input = hcfNowInput();
    const meta = { revisionId: "r", computedAt: "2026-09-04T00:00:00.000Z" };
    const a = runScenario(input, meta);
    const b = runScenario(input, meta);
    expect(a).toEqual(b);
  });
});

describe("runScenario — retained capital is never treated as distributed", () => {
  // Held on NOW deliberately: its forward pass runs on a FIXED actualRevenue,
  // so this isolates retention's effect on distributable surplus. (A scenario
  // that SOLVES revenue backward from a target, like ULTIMATELY, is built to
  // land on the same distributable surplus regardless of retention's size —
  // that's the round-trip invariant covered separately in distribution.test.ts
  // and above, not a counter-example to this guard.)
  it("a nonzero retained-capital figure strictly reduces distributable surplus vs. an otherwise-identical scenario with none, while operating surplus is untouched", () => {
    const withRetention = hcfNowInput();
    withRetention.capitalItems = [
      { id: "reserve", scenarioId: "hcf-now", category: "RESERVE", amount: "600.00", nature: "RECURRING", cadence: "MONTHLY", confidence: "ROUGH_ESTIMATE" },
    ];
    const withoutRetention = hcfNowInput();

    const resultWith = runScenario(withRetention, { revisionId: "r1" });
    const resultWithout = runScenario(withoutRetention, { revisionId: "r2" });

    expect(resultWith.operatingEconomicSurplus).toBe(resultWithout.operatingEconomicSurplus);
    expect(Number(resultWith.distributableEconomicSurplus)).toBeLessThan(Number(resultWithout.distributableEconomicSurplus));
    expect(
      Number(resultWithout.distributableEconomicSurplus) - Number(resultWith.distributableEconomicSurplus),
    ).toBeCloseTo(600, 2);
    expect(resultWith.requiredRetainedBusinessCapital.recurring).toBe("600.00");
  });
});

describe("runScenario — DISCRETIONARY distribution without a manual target", () => {
  it("degrades gracefully: still returns a real (floor) requiredRevenue and flags the gap, never crashes", () => {
    const input = hcfNowInput();
    input.distributionPolicy = { scenarioId: "hcf-now", rule: "DISCRETIONARY" };
    input.ownerEconomics = input.ownerEconomics.map((o) => ({ ...o, distributionPercent: null }));

    const result = runScenario(input, { revisionId: "r" });

    expect(Number(result.requiredRevenue)).toBeGreaterThan(0);
    expect(result.confidenceFlags.some((f) => f.field.includes("profitDistribution"))).toBe(true);
  });
});
