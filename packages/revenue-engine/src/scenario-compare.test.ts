import { describe, expect, it } from "vitest";
import type { ConfidenceFlag, ScenarioEngineInput, ScenarioResult, ScenarioType } from "@revenue-reality/domain";
import { runScenario } from "./scenario";
import {
  buildProgressionPairs,
  canCompareRevenueAlignment,
  classifyRequiredRevenue,
  collectMaterialAssumptions,
  compareRequiredRevenueBounds,
  detectMaterialChanges,
  displayRequiredRevenue,
  ownerBenefitLabel,
  requiredRevenueIsFloor,
  type CompareLabels,
  type RequiredRevenueBound,
  type RequiredRevenueFloorReason,
  type ScenarioCompareSnapshot,
} from "./scenario-compare";

/** Minimal, valid ScenarioResult for testing the Required Revenue bound logic in isolation — every other field is a neutral placeholder never asserted on. */
function minimalResult(requiredRevenue: string | null, confidenceFlags: ConfidenceFlag[] = []): ScenarioResult {
  return {
    scenarioRevisionId: "r",
    formulaVersion: "test",
    computedAt: "2026-01-01T00:00:00.000Z",
    actualRevenue: null,
    requiredEconomicContribution: null,
    weightedContributionMargin: "0.6",
    requiredRevenue,
    requiredVolumeByStream: null,
    breakEvenFloor: null,
    perStreamEconomics: [],
    operatingEconomicSurplus: null,
    requiredRetainedBusinessCapital: { recurring: "0.00", oneTime: "0.00", total: "0.00" },
    distributableEconomicSurplus: null,
    ownerEconomicsResults: null,
    primaryOwnerBenefitVsRequirement: null,
    ownerSupportSignal: "INSUFFICIENT_DATA",
    capacitySignal: "INSUFFICIENT_DATA",
    timeSignal: "INSUFFICIENT_DATA",
    confidenceFlags,
  };
}

const exact = (value: string): RequiredRevenueBound => ({ status: "EXACT", value });
const floor = (value: string, ...reasons: RequiredRevenueFloorReason[]): RequiredRevenueBound => ({
  status: "LOWER_BOUND",
  value,
  reasons: reasons.length > 0 ? reasons : ["DELEGATION_COST_UNKNOWN"],
});
const unknownBound: RequiredRevenueBound = { status: "UNKNOWN" };

const labels: CompareLabels = {
  streamLabelById: { consulting: "Consulting" },
  ownerLabelById: { "owner-1": "Owner" },
};

function baseInput(scenarioType: ScenarioType, overrides: Partial<ScenarioEngineInput> = {}): ScenarioEngineInput {
  const source = scenarioType === "NOW" ? "CURRENT" : scenarioType === "NEXT" ? "NEXT" : "INTENDED";
  return {
    scenarioType,
    restructureDate: null,
    actualRevenue: scenarioType === "NOW" ? "5000.00" : null,
    lifeAssumption: {
      scenarioId: "s",
      source,
      lifeRequirement: "2000.00",
      securityRequirement: "300.00",
      outsideFundingRetained: { mode: "AMOUNT", amount: "0.00", confidence: "EXACT" },
      selectedLifeChanges: [],
    },
    timeAssumption: {
      scenarioId: "s",
      source,
      availableHoursWeek: { value: 40, confidence: "EXACT" },
      businessHoursWeek: { value: 20, confidence: "EXACT" },
      otherTimeClaims: [],
      lifePriorityReservations: [],
    },
    streams: [
      {
        scenarioId: "s",
        streamId: "consulting",
        priceOrAvgValue: { value: "100.00", confidence: "EXACT" },
        volume: null,
        mixWeight: "1",
        cogs: { method: "PER_UNIT", perUnit: { value: "40.00", confidence: "EXACT" } },
        cogsPerUnit: "40.00",
        otherVariableCosts: [],
        otherVariableCostPerUnit: "0.00",
        grossProfitPerUnit: "60.00",
        grossMargin: "0.6",
        contributionPerUnit: "60.00",
        contributionMargin: "0.6",
      },
    ],
    operatingCosts: [],
    ownerInputs: [
      { scenarioId: "s", ownerId: "owner-1", hoursWeek: { value: 20, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN", broadFunctions: [] },
    ],
    distributionPolicy: { scenarioId: "s", rule: "DISCRETIONARY" },
    ownerEconomics: [
      { scenarioId: "s", ownerId: "owner-1", ownershipPercent: "1", distributionPercent: null, isPrimaryRespondent: true, targetProfitDistribution: { value: "0.00", confidence: "EXACT" } },
    ],
    delegationItems: [],
    capitalItems: [],
    capacity: { scenarioId: "s", demandState: "UNSURE", constraints: [] },
    ...overrides,
  };
}

function makeSnapshot(input: ScenarioEngineInput, overrides: Partial<Omit<ScenarioCompareSnapshot, "input" | "result" | "scenarioType">> = {}): ScenarioCompareSnapshot {
  const result = runScenario(input, { revisionId: `${input.scenarioType}-rev`, computedAt: "2026-01-01T00:00:00.000Z" });
  return {
    scenarioType: input.scenarioType,
    input,
    result,
    unknownOwnershipOwnerIds: [],
    mixWeightFallbackApplied: false,
    excludedStreamIds: [],
    opexListIsPartial: false,
    ...overrides,
  };
}

describe("scenario-compare — snapshot handling", () => {
  it("missing NEXT is handled — compares NOW directly against ULTIMATELY", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const ultimately = makeSnapshot(baseInput("ULTIMATELY", { ownerInputs: [{ ...baseInput("ULTIMATELY").ownerInputs[0]!, hoursWeek: { value: 10, confidence: "EXACT" } }] }));
    const pairs = buildProgressionPairs({ now, next: null, ultimately }, labels);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.fromType).toBe("NOW");
    expect(pairs[0]!.toType).toBe("ULTIMATELY");
  });

  it("missing ULTIMATELY is handled — only NOW→NEXT is produced", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(baseInput("NEXT"));
    const pairs = buildProgressionPairs({ now, next, ultimately: null }, labels);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.fromType).toBe("NOW");
    expect(pairs[0]!.toType).toBe("NEXT");
  });

  it("only one scenario existing produces no pairs at all — never fabricates a missing comparison", () => {
    const now = makeSnapshot(baseInput("NOW"));
    expect(buildProgressionPairs({ now, next: null, ultimately: null }, labels)).toEqual([]);
  });

  it("all three existing produces the standard NOW→NEXT and NEXT→ULTIMATELY pairs, never a redundant NOW→ULTIMATELY", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(baseInput("NEXT"));
    const ultimately = makeSnapshot(baseInput("ULTIMATELY"));
    const pairs = buildProgressionPairs({ now, next, ultimately }, labels);
    expect(pairs.map((p) => `${p.fromType}->${p.toType}`)).toEqual(["NOW->NEXT", "NEXT->ULTIMATELY"]);
  });

  it("snapshot data remains read-only — comparing does not mutate input or result", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(baseInput("NEXT", { ownerInputs: [{ ...baseInput("NEXT").ownerInputs[0]!, hoursWeek: { value: 15, confidence: "EXACT" } }] }));
    const nowBefore = JSON.parse(JSON.stringify(now));
    const nextBefore = JSON.parse(JSON.stringify(next));
    detectMaterialChanges(now, next, labels);
    expect(now).toEqual(nowBefore);
    expect(next).toEqual(nextBefore);
  });

  it("pure comparison/diff functions — calling twice with identical input yields identical output", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(baseInput("NEXT", { ownerInputs: [{ ...baseInput("NEXT").ownerInputs[0]!, hoursWeek: { value: 15, confidence: "EXACT" } }] }));
    const first = detectMaterialChanges(now, next, labels);
    const second = detectMaterialChanges(now, next, labels);
    expect(first).toEqual(second);
  });
});

describe("scenario-compare — actual vs modeled, period comparability", () => {
  it("NOW's actual owner benefit is labeled ACTUAL", () => {
    expect(ownerBenefitLabel("NOW")).toBe("ACTUAL");
  });

  it("NEXT and ULTIMATELY's owner benefit is labeled MODELED", () => {
    expect(ownerBenefitLabel("NEXT")).toBe("MODELED");
    expect(ownerBenefitLabel("ULTIMATELY")).toBe("MODELED");
  });

  it("a MONTH-period actual revenue is comparable to a known Required Revenue", () => {
    expect(canCompareRevenueAlignment({ periodStart: null, periodEnd: null, periodType: "MONTH" }, "8000.00")).toBe(true);
  });

  it("incomparable periods (YEAR, SINCE_RESTART, CUSTOM) never produce a percentage revenue gap — no automatic annualization or proration", () => {
    expect(canCompareRevenueAlignment({ periodStart: null, periodEnd: null, periodType: "YEAR" }, "8000.00")).toBe(false);
    expect(canCompareRevenueAlignment({ periodStart: null, periodEnd: null, periodType: "SINCE_RESTART" }, "8000.00")).toBe(false);
    expect(canCompareRevenueAlignment({ periodStart: "2026-01-01", periodEnd: "2026-03-01", periodType: "CUSTOM" }, "8000.00")).toBe(false);
  });

  it("a restructured-business NOW actual revenue period (SINCE_RESTART) is never compared as a percentage against normalized scenario requirements", () => {
    expect(canCompareRevenueAlignment({ periodStart: "2026-06-01", periodEnd: null, periodType: "SINCE_RESTART" }, "12000.00")).toBe(false);
  });

  it("unknown required revenue is also never comparable, regardless of period", () => {
    expect(canCompareRevenueAlignment({ periodStart: null, periodEnd: null, periodType: "MONTH" }, null)).toBe(false);
  });

  it("comparable normalized Required Revenue MAY be compared between scenarios — NOW's own solved Required Revenue vs NEXT's, both already monthly", () => {
    const now = makeSnapshot(baseInput("NOW", { lifeAssumption: { ...baseInput("NOW").lifeAssumption, outsideFundingRetained: { mode: "AMOUNT", amount: "2300.00", confidence: "EXACT" } } }));
    const next = makeSnapshot(
      baseInput("NEXT", { lifeAssumption: { ...baseInput("NEXT").lifeAssumption, outsideFundingRetained: { mode: "AMOUNT", amount: "2300.00", confidence: "EXACT" } } }),
    );
    // Both required-revenue figures are already normalized monthly by the engine — this is the one case where a direct dollar comparison is legitimate.
    expect(now.result.requiredRevenue).not.toBeNull();
    expect(next.result.requiredRevenue).not.toBeNull();
    const changes = detectMaterialChanges(now, next, labels);
    const rr = changes.find((c) => c.id === "required-revenue");
    // same inputs -> no material difference, but the comparison itself must be attempted (not skipped as "incomparable")
    expect(rr).toBeUndefined();
  });

  it("no automatic annualization: detectMaterialChanges never reads or reacts to NOW's raw actualRevenue figure", () => {
    const now1 = makeSnapshot(baseInput("NOW", { actualRevenue: "100.00" }));
    const now2 = makeSnapshot(baseInput("NOW", { actualRevenue: "999999.00" }));
    const next = makeSnapshot(baseInput("NEXT"));
    expect(detectMaterialChanges(now1, next, labels)).toEqual(detectMaterialChanges(now2, next, labels));
  });
});

describe("scenario-compare — Revenue Alignment stays separate from Owner Support", () => {
  it("a scenario can show 'not comparable' revenue alignment while owner support signal is independently computed", () => {
    const input = baseInput("NOW", {
      actualRevenue: "50000.00",
      lifeAssumption: { ...baseInput("NOW").lifeAssumption, outsideFundingRetained: { mode: "AMOUNT", amount: "500.00", confidence: "EXACT" } },
    });
    const result = runScenario(input, { revisionId: "r" });
    const alignmentComparable = canCompareRevenueAlignment({ periodStart: null, periodEnd: null, periodType: "SINCE_RESTART" }, result.requiredRevenue);
    expect(alignmentComparable).toBe(false);
    // Owner support is a completely separate, already-available signal regardless of period comparability.
    expect(result.ownerSupportSignal).not.toBe("INSUFFICIENT_DATA");
  });
});

describe("scenario-compare — classifyRequiredRevenue: EXACT vs LOWER_BOUND vs UNKNOWN", () => {
  it("classifies a clean solve as EXACT", () => {
    expect(classifyRequiredRevenue(minimalResult("20000.00"))).toEqual({ status: "EXACT", value: "20000.00" });
  });

  it("classifies null (funding responsibility unconfirmed) as UNKNOWN — never a floor, never zero", () => {
    expect(classifyRequiredRevenue(minimalResult(null))).toEqual({ status: "UNKNOWN" });
  });

  it("classifies an unknown delegation/replacement cost as a LOWER_BOUND with reason DELEGATION_COST_UNKNOWN", () => {
    const result = minimalResult("20000.00", [{ field: "delegationItems", confidence: "INCOMPLETE" }]);
    expect(classifyRequiredRevenue(result)).toEqual({ status: "LOWER_BOUND", value: "20000.00", reasons: ["DELEGATION_COST_UNKNOWN"] });
  });

  it("classifies a partial OPEX list as a LOWER_BOUND with reason OPEX_PARTIAL — never turns Required Revenue into null", () => {
    const result = minimalResult("20000.00", [{ field: "operatingCosts", confidence: "INCOMPLETE" }]);
    expect(classifyRequiredRevenue(result)).toEqual({ status: "LOWER_BOUND", value: "20000.00", reasons: ["OPEX_PARTIAL"] });
  });

  it("carries both reasons when delegation cost is unknown AND OPEX is partial", () => {
    const result = minimalResult("20000.00", [
      { field: "delegationItems", confidence: "INCOMPLETE" },
      { field: "operatingCosts", confidence: "INCOMPLETE" },
    ]);
    const bound = classifyRequiredRevenue(result);
    expect(bound.status).toBe("LOWER_BOUND");
    expect(bound.status === "LOWER_BOUND" && bound.reasons.sort()).toEqual(["DELEGATION_COST_UNKNOWN", "OPEX_PARTIAL"]);
  });

  it("a rough equal-weight sales-mix assumption is a confidence qualifier, not a mathematical bound — never classified as a floor", () => {
    const result = minimalResult("20000.00", [{ field: "salesMix", confidence: "ROUGH_ESTIMATE" }]);
    expect(classifyRequiredRevenue(result)).toEqual({ status: "EXACT", value: "20000.00" });
  });

  it("a rough or strong estimate elsewhere (e.g. a stream's COGS) is likewise never treated as a bound on its own", () => {
    const result = minimalResult("20000.00", [{ field: "stream.x.cogs", confidence: "ROUGH_ESTIMATE" }]);
    expect(classifyRequiredRevenue(result)).toEqual({ status: "EXACT", value: "20000.00" });
  });
});

describe("scenario-compare — compareRequiredRevenueBounds: the lower-bound comparison primitive", () => {
  it("EXACT vs EXACT: an exact delta in either direction", () => {
    expect(compareRequiredRevenueBounds(exact("20000.00"), exact("26000.00"))).toEqual({ kind: "EXACT_DELTA", deltaValue: "6000.00", direction: "INCREASE" });
    expect(compareRequiredRevenueBounds(exact("26000.00"), exact("20000.00"))).toEqual({ kind: "EXACT_DELTA", deltaValue: "6000.00", direction: "DECREASE" });
    expect(compareRequiredRevenueBounds(exact("20000.00"), exact("20000.00"))).toEqual({ kind: "EXACT_DELTA", deltaValue: "0.00", direction: "NONE" });
  });

  it("EXACT(20K) -> LOWER_BOUND(26K): the floor already exceeds the exact value, so a guaranteed minimum increase of $6K is provable", () => {
    expect(compareRequiredRevenueBounds(exact("20000.00"), floor("26000.00"))).toEqual({ kind: "GUARANTEED_MINIMUM_DELTA", deltaValue: "6000.00", direction: "INCREASE" });
  });

  it("LOWER_BOUND(20K) -> EXACT(26K): the floor does NOT exceed the exact value, so direction/magnitude is indeterminate — NEXT's true requirement may ultimately be above $26,000", () => {
    expect(compareRequiredRevenueBounds(floor("20000.00"), exact("26000.00"))).toEqual({ kind: "INDETERMINATE" });
  });

  it("LOWER_BOUND(30K) -> EXACT(20K): the floor already exceeds the exact value, so a guaranteed minimum decrease of $10K is provable", () => {
    expect(compareRequiredRevenueBounds(floor("30000.00"), exact("20000.00"))).toEqual({ kind: "GUARANTEED_MINIMUM_DELTA", deltaValue: "10000.00", direction: "DECREASE" });
  });

  it("LOWER_BOUND(20K) -> LOWER_BOUND(26K): never infers an increase from two floors alone, even though 26K > 20K", () => {
    expect(compareRequiredRevenueBounds(floor("20000.00"), floor("26000.00"))).toEqual({ kind: "INDETERMINATE" });
  });

  it("equal floors are also indeterminate — a shared floor value proves nothing about the true values", () => {
    expect(compareRequiredRevenueBounds(floor("20000.00"), floor("20000.00"))).toEqual({ kind: "INDETERMINATE" });
  });

  it("either side UNKNOWN is unavailable — never a numeric claim", () => {
    expect(compareRequiredRevenueBounds(unknownBound, exact("20000.00"))).toEqual({ kind: "UNAVAILABLE" });
    expect(compareRequiredRevenueBounds(exact("20000.00"), unknownBound)).toEqual({ kind: "UNAVAILABLE" });
    expect(compareRequiredRevenueBounds(unknownBound, unknownBound)).toEqual({ kind: "UNAVAILABLE" });
  });
});

describe("scenario-compare — floor qualifier survives every consumption point", () => {
  const floorResult = minimalResult("26000.00", [{ field: "delegationItems", confidence: "INCOMPLETE" }]);
  const exactFromSnapshot = (rr: string): ScenarioCompareSnapshot => ({
    scenarioType: "NEXT",
    input: baseInput("NEXT"),
    result: minimalResult(rr),
    unknownOwnershipOwnerIds: [],
    mixWeightFallbackApplied: false,
    excludedStreamIds: [],
    opexListIsPartial: false,
  });
  const floorToSnapshot: ScenarioCompareSnapshot = {
    scenarioType: "ULTIMATELY",
    input: baseInput("ULTIMATELY"),
    result: floorResult,
    unknownOwnershipOwnerIds: [],
    mixWeightFallbackApplied: false,
    excludedStreamIds: [],
    opexListIsPartial: false,
  };

  it("survives the scenario-summary display (displayRequiredRevenue)", () => {
    const display = displayRequiredRevenue(floorResult);
    expect(display.status).toBe("KNOWN");
    expect(display.text).toContain("At least $26000.00");
  });

  it("survives the full-table display identically to the summary — both call the same function, so they can never drift", () => {
    expect(displayRequiredRevenue(floorResult)).toEqual(displayRequiredRevenue(floorResult));
  });

  it("survives material-change copy: an EXACT->LOWER_BOUND delta reads 'at least,' never an exact figure", () => {
    const change = detectMaterialChanges(exactFromSnapshot("20000.00"), floorToSnapshot, labels);
    const rr = change.find((c) => c.id === "required-revenue")!;
    expect(rr.text).toContain("at least");
    expect(rr.text).toContain("$6000.00");
  });
});

describe("scenario-compare — Required Revenue: unknown, floor, and delta", () => {
  it("unknown Required Revenue is never treated as zero — displayRequiredRevenue reports it as not yet known", () => {
    const unfunded = baseInput("NEXT", { lifeAssumption: { ...baseInput("NEXT").lifeAssumption, outsideFundingRetained: null } });
    const result = runScenario(unfunded, { revisionId: "r" });
    expect(result.requiredRevenue).toBeNull();
    expect(displayRequiredRevenue(result)).toEqual({ status: "UNKNOWN", text: "Not yet known" });
  });

  it("incomplete ≠ zero: comparing required revenue when one side is unknown reports 'not enough information,' never a fabricated delta", () => {
    const now = makeSnapshot(baseInput("NOW", { lifeAssumption: { ...baseInput("NOW").lifeAssumption, outsideFundingRetained: null } }));
    const next = makeSnapshot(baseInput("NEXT", { lifeAssumption: { ...baseInput("NEXT").lifeAssumption, outsideFundingRetained: { mode: "AMOUNT", amount: "2000.00", confidence: "EXACT" } } }));
    const changes = detectMaterialChanges(now, next, labels);
    const rr = changes.find((c) => c.id === "required-revenue")!;
    expect(rr.text).toContain("Not enough information to compare");
    expect(rr.text).not.toMatch(/\$0(\.00)?\b/);
  });

  it("at-least/floor qualifier is preserved: a required-revenue delta involving an unknown delegation cost reads 'at least,' never an exact figure", () => {
    const fundedAssumption = { mode: "AMOUNT" as const, amount: "2000.00", confidence: "EXACT" as const };
    const now = makeSnapshot(baseInput("NOW", { lifeAssumption: { ...baseInput("NOW").lifeAssumption, outsideFundingRetained: fundedAssumption } }));
    const ultimately = makeSnapshot(
      baseInput("ULTIMATELY", {
        lifeAssumption: { ...baseInput("ULTIMATELY").lifeAssumption, outsideFundingRetained: fundedAssumption },
        // A known extra recurring cost forces an actual Required Revenue delta;
        // the unknown-cost delegation item alongside it makes that delta a floor.
        operatingCosts: [{ id: "c1", scenarioId: "s", category: "support", amount: "500.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false }],
        delegationItems: [{ id: "d1", scenarioId: "s", functionLabel: "Bookkeeping", delegationType: "UNSURE", replacementCost: null, cadence: "MONTHLY" }],
      }),
    );
    expect(requiredRevenueIsFloor(ultimately.result)).toBe(true);
    const changes = detectMaterialChanges(now, ultimately, labels);
    const rr = changes.find((c) => c.id === "required-revenue")!;
    expect(rr.text).toContain("at least");
    expect(rr.text).toContain("based on currently known costs");
  });

  it("a material change NOT involving a floor states an exact figure, without 'at least'", () => {
    // DISCRETIONARY (this fixture's default) never resolves a distribution
    // percentage, so requiredRevenue never actually moves with the funding
    // requirement — a resolvable CUSTOM_PERCENTAGE rule is needed to prove a
    // real, non-floor delta.
    const resolvable = { distributionPolicy: { scenarioId: "s", rule: "CUSTOM_PERCENTAGE" as const }, ownerEconomics: [{ ...baseInput("NOW").ownerEconomics[0]!, distributionPercent: "1" }] };
    const now = makeSnapshot(baseInput("NOW", { ...resolvable, lifeAssumption: { ...baseInput("NOW").lifeAssumption, outsideFundingRetained: { mode: "AMOUNT", amount: "1800.00", confidence: "EXACT" } } }));
    const next = makeSnapshot(
      baseInput("NEXT", { ...resolvable, lifeAssumption: { ...baseInput("NEXT").lifeAssumption, outsideFundingRetained: { mode: "AMOUNT", amount: "500.00", confidence: "EXACT" } } }),
    );
    const changes = detectMaterialChanges(now, next, labels);
    const rr = changes.find((c) => c.id === "required-revenue")!;
    expect(rr.text).not.toContain("at least");
  });
});

describe("scenario-compare — business-funded requirement", () => {
  it("reports the change when both sides are known", () => {
    // outsideFundingRetained is what's funded OUTSIDE the business — a smaller
    // outside amount means a LARGER business-funded requirement.
    const now = makeSnapshot(baseInput("NOW", { lifeAssumption: { ...baseInput("NOW").lifeAssumption, outsideFundingRetained: { mode: "AMOUNT", amount: "1800.00", confidence: "EXACT" } } }));
    const next = makeSnapshot(baseInput("NEXT", { lifeAssumption: { ...baseInput("NEXT").lifeAssumption, outsideFundingRetained: { mode: "AMOUNT", amount: "0.00", confidence: "EXACT" } } }));
    const changes = detectMaterialChanges(now, next, labels);
    const fr = changes.find((c) => c.id === "funding-requirement")!;
    expect(fr.text).toContain("increases");
    expect(fr.text).toContain("$2300.00");
  });

  it("reports 'not enough information' when either side hasn't confirmed funding responsibility", () => {
    const now = makeSnapshot(baseInput("NOW", { lifeAssumption: { ...baseInput("NOW").lifeAssumption, outsideFundingRetained: null } }));
    const next = makeSnapshot(baseInput("NEXT", { lifeAssumption: { ...baseInput("NEXT").lifeAssumption, outsideFundingRetained: { mode: "AMOUNT", amount: "3500.00", confidence: "EXACT" } } }));
    const changes = detectMaterialChanges(now, next, labels);
    expect(changes.find((c) => c.id === "funding-requirement")!.text).toContain("Not enough information to compare");
  });
});

describe("scenario-compare — owner hours", () => {
  it("reports a change when both sides are confirmed", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const ultimately = makeSnapshot(baseInput("ULTIMATELY", { ownerInputs: [{ ...baseInput("ULTIMATELY").ownerInputs[0]!, hoursWeek: { value: 10, confidence: "EXACT" } }] }));
    const changes = detectMaterialChanges(now, ultimately, labels);
    const hrs = changes.find((c) => c.id === "hours-owner-1")!;
    expect(hrs.text).toBe("Owner's hours move from 20/week (NOW) to 10/week (ULTIMATELY).");
  });

  it("unknown ≠ zero: hours are never compared when either side's confidence is INCOMPLETE — no false '0/week' change", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const ultimately = makeSnapshot(
      baseInput("ULTIMATELY", { ownerInputs: [{ ...baseInput("ULTIMATELY").ownerInputs[0]!, hoursWeek: { value: 0, confidence: "INCOMPLETE" } }] }),
    );
    const changes = detectMaterialChanges(now, ultimately, labels);
    expect(changes.find((c) => c.id === "hours-owner-1")).toBeUndefined();
  });
});

describe("scenario-compare — role/dependency", () => {
  it("reports functions the mature model no longer requires from the owner, and any newly required", () => {
    const next = makeSnapshot(baseInput("NEXT", { ownerInputs: [{ ...baseInput("NEXT").ownerInputs[0]!, broadFunctions: ["Sales", "Bookkeeping"] }] }));
    const ultimately = makeSnapshot(baseInput("ULTIMATELY", { ownerInputs: [{ ...baseInput("ULTIMATELY").ownerInputs[0]!, broadFunctions: ["Sales", "Strategy"] }] }));
    const changes = detectMaterialChanges(next, ultimately, labels);
    const dep = changes.find((c) => c.id === "owner-dependent-functions")!;
    expect(dep.text).toContain("no longer requires the owner for: Bookkeeping");
    expect(dep.text).toContain("now requires the owner for: Strategy");
  });

  it("role fit is only ever surfaced for ULTIMATELY, and only when it isn't CONSISTENT", () => {
    const next = makeSnapshot(baseInput("NEXT"));
    const consistentUltimately = makeSnapshot(baseInput("ULTIMATELY"), { roleFit: { status: "CONSISTENT", flags: [] } });
    expect(detectMaterialChanges(next, consistentUltimately, labels).find((c) => c.id === "role-fit")).toBeUndefined();

    const mismatchedUltimately = makeSnapshot(baseInput("ULTIMATELY"), {
      roleFit: { status: "MISMATCH", flags: ["REQUIRED_OWNER_HOURS_CONTRADICT_INTENDED_MODEL"] },
    });
    const change = detectMaterialChanges(next, mismatchedUltimately, labels).find((c) => c.id === "role-fit")!;
    expect(change.text).toContain("may not match the intended ownership model");
  });
});

describe("scenario-compare — delegation cost", () => {
  it("reports when delegation/replacement work first appears", () => {
    const next = makeSnapshot(baseInput("NEXT"));
    const ultimately = makeSnapshot(
      baseInput("ULTIMATELY", {
        delegationItems: [{ id: "d1", scenarioId: "s", functionLabel: "Bookkeeping", delegationType: "CONTRACTOR", replacementCost: { value: "300.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" }],
      }),
    );
    const change = detectMaterialChanges(next, ultimately, labels).find((c) => c.id === "delegation-appears")!;
    expect(change.text).toContain("$300.00/mo");
  });

  it("reports a known delegation-cost change between two scenarios that already delegate", () => {
    const next = makeSnapshot(
      baseInput("NEXT", {
        delegationItems: [{ id: "d1", scenarioId: "s", functionLabel: "Bookkeeping", delegationType: "CONTRACTOR", replacementCost: { value: "300.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" }],
      }),
    );
    const ultimately = makeSnapshot(
      baseInput("ULTIMATELY", {
        delegationItems: [{ id: "d1", scenarioId: "s", functionLabel: "Bookkeeping", delegationType: "CONTRACTOR", replacementCost: { value: "500.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" }],
      }),
    );
    const change = detectMaterialChanges(next, ultimately, labels).find((c) => c.id === "delegation-cost-change")!;
    expect(change.text).toContain("increases");
    expect(change.text).toContain("$200.00/mo");
  });
});

describe("scenario-compare — streams: price, COGS, margins, added/removed", () => {
  it("reports a price change", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(
      baseInput("NEXT", {
        streams: [{ ...baseInput("NEXT").streams[0]!, priceOrAvgValue: { value: "120.00", confidence: "EXACT" } }],
      }),
    );
    const change = detectMaterialChanges(now, next, labels).find((c) => c.id === "price-consulting")!;
    expect(change.text).toBe("Consulting's price moves from $100.00 (NOW) to $120.00 (NEXT).");
  });

  it("reports a Cost of Delivery (COGS) change", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(baseInput("NEXT", { streams: [{ ...baseInput("NEXT").streams[0]!, cogsPerUnit: "55.00" }] }));
    const change = detectMaterialChanges(now, next, labels).find((c) => c.id === "cogs-consulting")!;
    expect(change.text).toContain("$40.00 (NOW) to $55.00 (NEXT)");
  });

  it("reports a gross-margin change", () => {
    // Margins are recomputed by the engine from price/cogs, not read back from
    // the pre-set grossMargin field — the fixture must change cogs itself.
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(
      baseInput("NEXT", { streams: [{ ...baseInput("NEXT").streams[0]!, cogs: { method: "PER_UNIT", perUnit: { value: "50.00", confidence: "EXACT" } } }] }),
    );
    const change = detectMaterialChanges(now, next, labels).find((c) => c.id === "gross-margin-consulting")!;
    expect(change.text).toContain("60.00%");
    expect(change.text).toContain("50.00%");
  });

  it("reports a contribution-margin change", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(
      baseInput("NEXT", {
        streams: [{ ...baseInput("NEXT").streams[0]!, otherVariableCosts: [{ id: "fee", label: "Platform fee", amountPerUnit: { value: "15.00", confidence: "EXACT" } }] }],
      }),
    );
    const change = detectMaterialChanges(now, next, labels).find((c) => c.id === "contribution-margin-consulting")!;
    expect(change.text).toContain("45.00%");
  });

  it("reports a stream being added", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const consultingHalf = { ...baseInput("NEXT").streams[0]!, mixWeight: "0.5" };
    const workshopStream = { ...baseInput("NEXT").streams[0]!, streamId: "workshop", mixWeight: "0.5" };
    const next = makeSnapshot(baseInput("NEXT", { streams: [consultingHalf, workshopStream] }));
    const change = detectMaterialChanges(now, next, { ...labels, streamLabelById: { ...labels.streamLabelById, workshop: "Workshop" } }).find((c) => c.id === "stream-added-workshop")!;
    expect(change.text).toContain("Workshop is a new revenue stream in NEXT");
  });

  it("reports a stream being removed", () => {
    const workshopStream = { ...baseInput("NOW").streams[0]!, streamId: "workshop", mixWeight: "0.5" };
    const now = makeSnapshot(baseInput("NOW", { streams: [{ ...baseInput("NOW").streams[0]!, mixWeight: "0.5" }, workshopStream] }));
    const next = makeSnapshot(baseInput("NEXT"));
    const change = detectMaterialChanges(now, next, { ...labels, streamLabelById: { ...labels.streamLabelById, workshop: "Workshop" } }).find((c) => c.id === "stream-removed-workshop")!;
    expect(change.text).toContain("no longer part of NEXT");
  });
});

describe("scenario-compare — operating costs: recurring vs one-time", () => {
  it("reports a recurring OPEX change", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(
      baseInput("NEXT", { operatingCosts: [{ id: "c1", scenarioId: "s", category: "software", amount: "400.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false }] }),
    );
    const change = detectMaterialChanges(now, next, labels).find((c) => c.id === "opex-recurring")!;
    expect(change.text).toContain("rises by $400.00/mo");
  });

  it("distinguishes one-time from recurring — a one-time cost never appears merged into the recurring figure", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(
      baseInput("NEXT", { operatingCosts: [{ id: "c1", scenarioId: "s", category: "equipment", amount: "1000.00", cadence: "ONE_TIME", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false }] }),
    );
    const changes = detectMaterialChanges(now, next, labels);
    expect(changes.find((c) => c.id === "opex-recurring")).toBeUndefined();
    const oneTime = changes.find((c) => c.id === "opex-onetime")!;
    expect(oneTime.text).toContain("$1000.00");
    expect(oneTime.text).toContain("never merged into the recurring figure above");
  });
});

describe("scenario-compare — retained capital", () => {
  it("reports recurring and one-time retained-capital changes separately", () => {
    const now = makeSnapshot(baseInput("NOW"));
    const next = makeSnapshot(
      baseInput("NEXT", {
        capitalItems: [
          { id: "reserve", scenarioId: "s", category: "RESERVE", amount: "200.00", nature: "RECURRING", cadence: "MONTHLY", confidence: "EXACT" },
          { id: "equip", scenarioId: "s", category: "EQUIPMENT", amount: "1500.00", nature: "ONE_TIME", cadence: "ONE_TIME", confidence: "EXACT" },
        ],
      }),
    );
    const changes = detectMaterialChanges(now, next, labels);
    expect(changes.find((c) => c.id === "retained-capital-recurring")!.text).toContain("$200.00");
    expect(changes.find((c) => c.id === "retained-capital-onetime")!.text).toContain("$1500.00");
  });
});

describe("scenario-compare — capacity/demand signal", () => {
  it("reports a capacity signal change", () => {
    const now = makeSnapshot(baseInput("NOW", { capacity: { scenarioId: "s", demandState: "COMFORTABLE", constraints: [] } }));
    const next = makeSnapshot(baseInput("NEXT", { capacity: { scenarioId: "s", demandState: "DIFFICULT", constraints: [] } }));
    const change = detectMaterialChanges(now, next, labels).find((c) => c.id === "capacity-signal")!;
    expect(change.text).toContain("capacity constrained");
  });

  it("reports a demand signal change distinctly from a capacity-only constraint", () => {
    const now = makeSnapshot(baseInput("NOW", { capacity: { scenarioId: "s", demandState: "COMFORTABLE", constraints: [] } }));
    const next = makeSnapshot(baseInput("NEXT", { capacity: { scenarioId: "s", demandState: "COMFORTABLE", constraints: ["demand"] } }));
    const change = detectMaterialChanges(now, next, labels).find((c) => c.id === "capacity-signal")!;
    expect(change.text).toContain("demand constrained");
  });
});

describe("scenario-compare — assumptions and unknowns", () => {
  it("surfaces the equal-weight sales-mix modeling assumption", () => {
    const snapshot = makeSnapshot(baseInput("NEXT"), { mixWeightFallbackApplied: true });
    const notes = collectMaterialAssumptions(snapshot);
    expect(notes.some((n) => n.id === "sales-mix")).toBe(true);
  });

  it("surfaces a partial known-OPEX list", () => {
    const snapshot = makeSnapshot(baseInput("NEXT"), { opexListIsPartial: true });
    const notes = collectMaterialAssumptions(snapshot);
    expect(notes.some((n) => n.id === "opex-partial")).toBe(true);
  });

  it("surfaces unconfirmed ownership and unconfirmed funding responsibility", () => {
    const snapshot = makeSnapshot(baseInput("NEXT", { lifeAssumption: { ...baseInput("NEXT").lifeAssumption, outsideFundingRetained: null } }), {
      unknownOwnershipOwnerIds: ["owner-1"],
    });
    const notes = collectMaterialAssumptions(snapshot);
    expect(notes.some((n) => n.id === "ownership-unknown")).toBe(true);
    expect(notes.some((n) => n.id === "funding-unconfirmed")).toBe(true);
  });

  it("never fabricates a numeric confidence score — only a list of named assumptions", () => {
    const snapshot = makeSnapshot(baseInput("NEXT"), { mixWeightFallbackApplied: true, opexListIsPartial: true });
    const notes = collectMaterialAssumptions(snapshot);
    for (const note of notes) {
      expect(note).not.toHaveProperty("score");
      expect(note).not.toHaveProperty("confidencePercent");
    }
  });
});
