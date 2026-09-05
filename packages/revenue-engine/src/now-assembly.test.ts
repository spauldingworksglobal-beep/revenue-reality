import { describe, expect, it } from "vitest";
import type { LifeCategory, Owner, RevenueStream, SecurityItem } from "@revenue-reality/domain";
import { buildNowScenarioInput, withNowResultCaveats, type BuildNowScenarioInputParams } from "./now-assembly";
import { runScenario } from "./scenario";

// --- HCF: only known facts. Ownership and funding responsibility were never
// confirmed for HCF, so params here deliberately leave them null. ---

function hcfOwners(): Owner[] {
  return [
    { id: "owner-1", businessId: "hcf", label: "Jessica", isPrimaryRespondent: true, ownershipPercent: null },
    { id: "owner-2", businessId: "hcf", label: "Asha", isPrimaryRespondent: false, ownershipPercent: null },
  ];
}

function hcfStreams(): RevenueStream[] {
  return [{ id: "chocolate-bar", businessId: "hcf", name: "Chocolate bar", description: "wholesale chocolate bars", active: true }];
}

function hcfParams(overrides: Partial<BuildNowScenarioInputParams> = {}): BuildNowScenarioInputParams {
  return {
    scenarioId: "now",
    owners: hcfOwners(),
    activeStreams: hcfStreams(),
    streamInputs: [
      {
        streamId: "chocolate-bar",
        price: { value: "5.50", confidence: "EXACT" },
        volume: null,
        mixWeightOverride: null,
        cogs: {
          method: "COMPONENT_BUILDUP",
          components: [
            { label: "co-packer", amount: "2.50" },
            { label: "plastic bag", amount: "0.25" },
            { label: "sticker", amount: "0.20" },
          ],
        },
        otherVariableCosts: [],
      },
    ],
    operatingCosts: [
      { id: "software", scenarioId: "now", category: "software", amount: "583.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: true },
      { id: "insurance", scenarioId: "now", category: "insurance", amount: "106.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: true },
      { id: "storage", scenarioId: "now", category: "storage", amount: "450.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: true },
      { id: "phones", scenarioId: "now", category: "phones", amount: "483.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: true },
    ],
    opexListIsPartial: true,
    ownerInputs: [
      { ownerId: "owner-1", hoursWeek: { value: 5, confidence: "ROUGH_ESTIMATE" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "NOT_SURE", broadFunctions: [], cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "0.00", confidence: "EXACT" } } },
      { ownerId: "owner-2", hoursWeek: { value: 5, confidence: "ROUGH_ESTIMATE" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "NOT_SURE", broadFunctions: [], cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "400.00", confidence: "EXACT" } } },
    ],
    currentBusinessHoursWeek: { value: 5, confidence: "ROUGH_ESTIMATE" }, // Jessica (primary) only — not the combined 10
    currentAvailableHoursWeek: { value: 0, confidence: "INCOMPLETE" }, // never asked for HCF
    otherTimeClaims: [],
    distributionPolicy: { scenarioId: "now", rule: "DISCRETIONARY" }, // no rule known for HCF — the model's own "no predetermined split" state
    distributionPercents: {},
    capitalItems: [],
    currentCategories: [], // no Life Reality captured for HCF
    currentSecurity: [],
    currentFundingConfirmation: null, // never confirmed for HCF
    restructureDate: "2026-08-01",
    actualRevenue: { value: "4800.00", confidence: "EXACT" },
    ...overrides,
  };
}

describe("buildNowScenarioInput — HCF, known facts only", () => {
  it("is READY even though ownership and funding responsibility are unknown — unknowns don't block what's calculable", () => {
    const built = buildNowScenarioInput(hcfParams());
    expect(built.status).toBe("READY");
  });

  it("passes ownership straight through as unknown (null) for both owners — never an assumed equal split", () => {
    const built = buildNowScenarioInput(hcfParams());
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.ownerEconomics.map((o) => o.ownershipPercent)).toEqual([null, null]);
    expect(built.unknownOwnershipOwnerIds.sort()).toEqual(["owner-1", "owner-2"]);
  });

  it("passes funding responsibility straight through as unconfirmed (null) — never defaulted to 100% business-funded", () => {
    const built = buildNowScenarioInput(hcfParams());
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.lifeAssumption.outsideFundingRetained).toBeNull();
  });

  it("reproduces the HCF acceptance numbers through runScenario, and leaves life-linked outputs unavailable rather than manufacturing them", () => {
    const built = buildNowScenarioInput(hcfParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "rev-test", computedAt: "2026-09-04T00:00:00.000Z" });

    // known and calculable:
    expect(result.perStreamEconomics[0]!.grossMargin).toBe("0.463636");
    expect(result.perStreamEconomics[0]!.contributionMargin).toBe("0.463636");
    expect(result.breakEvenFloor?.revenue).toBe("3498.43");
    expect(result.breakEvenFloor?.volumeByStream).toEqual([{ streamId: "chocolate-bar", volume: 637 }]);
    expect(result.actualRevenue).toBe("4800.00");
    const owner1 = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-1")!;
    const owner2 = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-2")!;
    expect(owner1.totalOwnerEconomicBenefit).toBe("0.00");
    expect(owner2.totalOwnerEconomicBenefit).toBe("400.00");

    // unknown and correctly left unavailable, not manufactured:
    expect(result.requiredRevenue).toBeNull();
    expect(result.primaryOwnerBenefitVsRequirement).toBeNull();
    expect(result.ownerSupportSignal).toBe("INSUFFICIENT_DATA");
    expect(result.timeSignal).toBe("INSUFFICIENT_DATA");
  });

  it("overrides the primary respondent's hoursWeek with Time Reality's current business hours (Jessica's own ~5, never the combined 10)", () => {
    const built = buildNowScenarioInput(hcfParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const primaryInput = built.input.ownerInputs.find((o) => o.ownerId === "owner-1")!;
    expect(primaryInput.hoursWeek).toEqual({ value: 5, confidence: "ROUGH_ESTIMATE" });
  });
});

// --- Complete business: every input confirmed, proving the full waterfall via
// buildNowScenarioInput's own orchestration (not HCF data). ---

function completeOwners(): Owner[] {
  return [
    { id: "owner-1", businessId: "complete-biz", label: "Sam", isPrimaryRespondent: true, ownershipPercent: { value: "0.6", confidence: "EXACT" } },
    { id: "owner-2", businessId: "complete-biz", label: "Robin", isPrimaryRespondent: false, ownershipPercent: { value: "0.4", confidence: "EXACT" } },
  ];
}

function completeStreams(): RevenueStream[] {
  return [{ id: "roast-subscription", businessId: "complete-biz", name: "Roast subscription", description: "monthly coffee subscription", active: true }];
}

function completeLifeCategories(): LifeCategory[] {
  return [
    { id: "housing", lifeProfileId: "complete-biz", kind: "HOUSING", label: "Housing", currentAmount: { value: "2600.00", confidence: "EXACT" }, intendedAmount: null, cadence: "MONTHLY", changeType: "KEEP" },
  ];
}

function completeSecurity(): SecurityItem[] {
  return [
    { id: "reserve", lifeProfileId: "complete-biz", kind: "EMERGENCY_SAVINGS", label: "Emergency savings", currentAmount: { value: "600.00", confidence: "EXACT" }, intendedAmount: null, cadence: "MONTHLY" },
  ];
}

function completeParams(overrides: Partial<BuildNowScenarioInputParams> = {}): BuildNowScenarioInputParams {
  return {
    scenarioId: "now",
    owners: completeOwners(),
    activeStreams: completeStreams(),
    streamInputs: [
      { streamId: "roast-subscription", price: { value: "10.00", confidence: "EXACT" }, volume: null, mixWeightOverride: null, cogs: { method: "PER_UNIT", perUnit: { value: "4.00", confidence: "EXACT" } }, otherVariableCosts: [] },
    ],
    operatingCosts: [
      { id: "software", scenarioId: "now", category: "software", amount: "500.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
      { id: "rent", scenarioId: "now", category: "rent", amount: "300.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
    ],
    opexListIsPartial: false,
    ownerInputs: [
      { ownerId: "owner-1", hoursWeek: { value: 20, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN", broadFunctions: [], cashReceived: null },
      { ownerId: "owner-2", hoursWeek: { value: 10, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN", broadFunctions: [], cashReceived: null },
    ],
    currentBusinessHoursWeek: { value: 20, confidence: "EXACT" },
    currentAvailableHoursWeek: { value: 40, confidence: "EXACT" },
    otherTimeClaims: [],
    distributionPolicy: { scenarioId: "now", rule: "SAME_AS_OWNERSHIP" },
    distributionPercents: {},
    capitalItems: [
      { id: "reserve", scenarioId: "now", category: "RESERVE", amount: "200.00", nature: "RECURRING", cadence: "MONTHLY", confidence: "EXACT" },
    ],
    currentCategories: completeLifeCategories(),
    currentSecurity: completeSecurity(),
    currentFundingConfirmation: { mode: "AMOUNT", amount: "0.00", confidence: "EXACT" }, // business confirmed responsible for the full $3,200
    restructureDate: null,
    actualRevenue: { value: "16000.00", confidence: "EXACT" },
    ...overrides,
  };
}

describe("buildNowScenarioInput — complete business, proves the full waterfall", () => {
  it("passes through the confirmed ownership split exactly as given", () => {
    const built = buildNowScenarioInput(completeParams());
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.unknownOwnershipOwnerIds).toEqual([]);
    expect(built.input.ownerEconomics.map((o) => o.ownershipPercent)).toEqual(["0.6", "0.4"]);
  });

  it("derives outsideFundingRetained from the confirmed funding responsibility", () => {
    const built = buildNowScenarioInput(completeParams());
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.lifeAssumption.outsideFundingRetained).toEqual({ mode: "AMOUNT", amount: "3200.00", confidence: "EXACT" });
  });

  it("runs end-to-end to a non-null Required Revenue and a real owner-benefit comparison", () => {
    const built = buildNowScenarioInput(completeParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "rev-test" });
    expect(result.requiredRevenue).not.toBeNull();
    expect(Number(result.requiredRevenue)).toBeGreaterThan(0);
    expect(result.primaryOwnerBenefitVsRequirement).not.toBeNull();
  });
});

describe("buildNowScenarioInput — incomplete data never crashes, never fabricates", () => {
  it("reports INCOMPLETE when actual revenue hasn't been entered", () => {
    const built = buildNowScenarioInput(completeParams({ actualRevenue: null }));
    expect(built.status).toBe("INCOMPLETE");
    if (built.status === "INCOMPLETE") expect(built.missing).toContain("ACTUAL_REVENUE");
  });

  it("does NOT gate the whole scenario when the funding question hasn't been answered — it flows through as null instead", () => {
    const built = buildNowScenarioInput(completeParams({ currentFundingConfirmation: null }));
    expect(built.status).toBe("READY");
    if (built.status === "READY") expect(built.input.lifeAssumption.outsideFundingRetained).toBeNull();
  });

  it("reports INCOMPLETE when no active stream has both a price and a Cost of Delivery entry", () => {
    const built = buildNowScenarioInput(
      completeParams({ streamInputs: [{ streamId: "roast-subscription", price: null, volume: null, mixWeightOverride: null, cogs: null, otherVariableCosts: [] }] }),
    );
    expect(built.status).toBe("INCOMPLETE");
    if (built.status === "INCOMPLETE") expect(built.missing).toContain("NO_USABLE_REVENUE_STREAM");
  });

  it("passes through unknown (null) ownership without assuming any split — never an equal-split placeholder", () => {
    const owners: Owner[] = [
      { id: "owner-1", businessId: "complete-biz", label: "Sam", isPrimaryRespondent: true, ownershipPercent: null },
      { id: "owner-2", businessId: "complete-biz", label: "Robin", isPrimaryRespondent: false, ownershipPercent: null },
    ];
    const built = buildNowScenarioInput(completeParams({ owners, distributionPolicy: { scenarioId: "now", rule: "EQUAL_SPLIT" } }));
    if (built.status !== "READY") throw new Error("expected READY — unknown ownership must not block NOW");
    expect(built.input.ownerEconomics.map((o) => o.ownershipPercent)).toEqual([null, null]);
    expect(built.unknownOwnershipOwnerIds.sort()).toEqual(["owner-1", "owner-2"]);
  });

  it("passes through an invalid (non-null but not summing to 100%) ownership split unmodified — it's only rejected by runScenario if a rule that reads it is chosen", () => {
    const owners: Owner[] = [
      { id: "owner-1", businessId: "complete-biz", label: "Sam", isPrimaryRespondent: true, ownershipPercent: { value: "0.7", confidence: "EXACT" } },
      { id: "owner-2", businessId: "complete-biz", label: "Robin", isPrimaryRespondent: false, ownershipPercent: { value: "0.6", confidence: "EXACT" } },
    ];
    const built = buildNowScenarioInput(completeParams({ owners }));
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.ownerEconomics.map((o) => o.ownershipPercent)).toEqual(["0.7", "0.6"]);
    // distributionPolicy here is SAME_AS_OWNERSHIP (completeParams default), which DOES read it:
    expect(() => runScenario(built.input, { revisionId: "r" })).toThrow();
  });

  it("falls back to an equal sales-mix MODELING ASSUMPTION when one of several streams is missing its mix share, and flags it — never a silent equal split", () => {
    const activeStreams: RevenueStream[] = [
      { id: "bars", businessId: "complete-biz", name: "Bars", description: "bars", active: true },
      { id: "gift-boxes", businessId: "complete-biz", name: "Gift boxes", description: "boxes", active: true },
    ];
    const built = buildNowScenarioInput(
      completeParams({
        activeStreams,
        streamInputs: [
          { streamId: "bars", price: { value: "5.50", confidence: "EXACT" }, volume: null, mixWeightOverride: "0.7", cogs: { method: "ESTIMATE", perUnit: { value: "2.95", confidence: "ROUGH_ESTIMATE" } }, otherVariableCosts: [] },
          { streamId: "gift-boxes", price: { value: "20.00", confidence: "EXACT" }, volume: null, mixWeightOverride: null, cogs: { method: "ESTIMATE", perUnit: { value: "8.00", confidence: "ROUGH_ESTIMATE" } }, otherVariableCosts: [] },
        ],
      }),
    );
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.mixWeightFallbackApplied).toBe(true);
    expect(built.input.streams.map((s) => s.mixWeight)).toEqual(["0.50000000", "0.50000000"]);

    const result = runScenario(built.input, { revisionId: "r" });
    const withCaveats = withNowResultCaveats(result, built);
    expect(withCaveats.confidenceFlags).toContainEqual({ field: "salesMix", confidence: "ROUGH_ESTIMATE" });
  });

  it("withNowResultCaveats leaves the result untouched when no sales-mix assumption was used", () => {
    const built = buildNowScenarioInput(completeParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "r" });
    expect(withNowResultCaveats(result, built)).toEqual(result);
  });

  it("a scenario-level opexListIsPartial=true propagates into confidenceFlags as an operatingCosts INCOMPLETE flag, making Required Revenue a floor (Build Spec Milestone 8 follow-up §2)", () => {
    const built = buildNowScenarioInput(completeParams({ opexListIsPartial: true }));
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "r" });
    const withCaveats = withNowResultCaveats(result, built);
    expect(withCaveats.confidenceFlags).toContainEqual({ field: "operatingCosts", confidence: "INCOMPLETE" });
    // Required Revenue itself is never nulled out for this reason — the
    // known costs still provide a useful floor.
    expect(withCaveats.requiredRevenue).not.toBeNull();
  });

  it("never double-flags operatingCosts when both opexListIsPartial and a per-item isPartialList are true", () => {
    const built = buildNowScenarioInput(
      completeParams({
        opexListIsPartial: true,
        operatingCosts: [{ id: "software", scenarioId: "now", category: "software", amount: "500.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: true }],
      }),
    );
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "r" });
    const withCaveats = withNowResultCaveats(result, built);
    expect(withCaveats.confidenceFlags.filter((f) => f.field === "operatingCosts")).toHaveLength(1);
  });

  it("excludes an active stream with no price/COGS entered yet, but still runs on the streams that are usable", () => {
    const activeStreams: RevenueStream[] = [
      { id: "bars", businessId: "complete-biz", name: "Bars", description: "bars", active: true },
      { id: "untouched-stream", businessId: "complete-biz", name: "New idea", description: "not started yet", active: true },
    ];
    const built = buildNowScenarioInput(
      completeParams({
        activeStreams,
        streamInputs: [
          { streamId: "bars", price: { value: "5.50", confidence: "EXACT" }, volume: null, mixWeightOverride: null, cogs: { method: "ESTIMATE", perUnit: { value: "2.95", confidence: "ROUGH_ESTIMATE" } }, otherVariableCosts: [] },
        ],
      }),
    );
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.excludedStreamIds).toEqual(["untouched-stream"]);
    expect(built.input.streams).toHaveLength(1);
  });

  it("defaults to a DISCRETIONARY distribution policy — never a fabricated percentage — when none has been chosen yet", () => {
    const built = buildNowScenarioInput(completeParams({ distributionPolicy: null }));
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.distributionPolicy.rule).toBe("DISCRETIONARY");
  });
});
