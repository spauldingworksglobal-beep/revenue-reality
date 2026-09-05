import { describe, expect, it } from "vitest";
import type { LifeCategory, Owner, RevenueStream, SecurityItem } from "@revenue-reality/domain";
import { buildNowScenarioInput, type BuildNowScenarioInputParams } from "./now-assembly";
import { runScenario } from "./scenario";

function hcfOwners(): Owner[] {
  return [
    { id: "owner-1", businessId: "hcf", label: "Jessica", isPrimaryRespondent: true, ownershipPercent: { value: "0.5", confidence: "EXACT" } },
    { id: "owner-2", businessId: "hcf", label: "Asha", isPrimaryRespondent: false, ownershipPercent: { value: "0.5", confidence: "EXACT" } },
  ];
}

function hcfStreams(): RevenueStream[] {
  return [{ id: "chocolate-bar", businessId: "hcf", name: "Chocolate bar", description: "wholesale chocolate bars", active: true }];
}

function hcfLifeCategories(): LifeCategory[] {
  return [
    {
      id: "housing",
      lifeProfileId: "hcf",
      kind: "HOUSING",
      label: "Housing",
      currentAmount: { value: "3000.00", confidence: "STRONG_ESTIMATE" },
      intendedAmount: null,
      cadence: "MONTHLY",
      changeType: "KEEP",
    },
  ];
}

function hcfSecurity(): SecurityItem[] {
  return [
    {
      id: "reserve",
      lifeProfileId: "hcf",
      kind: "EMERGENCY_SAVINGS",
      label: "Emergency savings",
      currentAmount: { value: "200.00", confidence: "STRONG_ESTIMATE" },
      intendedAmount: null,
      cadence: "MONTHLY",
    },
  ];
}

function baseParams(overrides: Partial<BuildNowScenarioInputParams> = {}): BuildNowScenarioInputParams {
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
    ownerInputs: [
      { ownerId: "owner-1", hoursWeek: { value: 999, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "NOT_SURE", broadFunctions: [], cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "0.00", confidence: "INCOMPLETE" } } },
      { ownerId: "owner-2", hoursWeek: { value: 5, confidence: "ROUGH_ESTIMATE" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "NOT_SURE", broadFunctions: [], cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "400.00", confidence: "INCOMPLETE" } } },
    ],
    currentBusinessHoursWeek: { value: 10, confidence: "STRONG_ESTIMATE" },
    currentAvailableHoursWeek: { value: 20, confidence: "ROUGH_ESTIMATE" },
    otherTimeClaims: [],
    distributionPolicy: { scenarioId: "now", rule: "SAME_AS_OWNERSHIP" },
    distributionPercents: {},
    capitalItems: [],
    currentCategories: hcfLifeCategories(),
    currentSecurity: hcfSecurity(),
    currentFundingConfirmation: { mode: "AMOUNT", amount: "3200.00", confidence: "INCOMPLETE" },
    restructureDate: "2026-08-01",
    actualRevenue: { value: "4800.00", confidence: "EXACT" },
    ...overrides,
  };
}

describe("buildNowScenarioInput — HCF reproduction", () => {
  it("reproduces the HCF acceptance numbers end-to-end through runScenario", () => {
    const built = buildNowScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error(`expected READY, got INCOMPLETE: ${built.missing}`);

    const result = runScenario(built.input, { revisionId: "rev-test", computedAt: "2026-09-04T00:00:00.000Z" });

    expect(result.perStreamEconomics[0]!.grossMargin).toBe("0.463636");
    expect(result.perStreamEconomics[0]!.contributionMargin).toBe("0.463636");
    expect(result.breakEvenFloor?.revenue).toBe("3498.43");
    expect(result.breakEvenFloor?.volumeByStream).toEqual([{ streamId: "chocolate-bar", volume: 637 }]);
    expect(result.actualRevenue).toBe("4800.00");

    const owner1 = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-1")!;
    const owner2 = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-2")!;
    expect(owner1.totalOwnerEconomicBenefit).toBe("0.00");
    expect(owner2.totalOwnerEconomicBenefit).toBe("400.00");
  });

  it("does not fall back on ownership split when Business Profile ownership is complete and valid", () => {
    const built = buildNowScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.ownershipSplitFallbackApplied).toBe(false);
    expect(built.input.ownerEconomics.map((o) => o.ownershipPercent)).toEqual(["0.5", "0.5"]);
  });

  it("overrides the primary respondent's hoursWeek with Time Reality's current business hours, never the stored NOW input", () => {
    const built = buildNowScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const primaryInput = built.input.ownerInputs.find((o) => o.ownerId === "owner-1")!;
    expect(primaryInput.hoursWeek).toEqual({ value: 10, confidence: "STRONG_ESTIMATE" });
  });
});

describe("buildNowScenarioInput — incomplete data never crashes, never fabricates", () => {
  it("reports INCOMPLETE when actual revenue hasn't been entered", () => {
    const built = buildNowScenarioInput(baseParams({ actualRevenue: null }));
    expect(built.status).toBe("INCOMPLETE");
    if (built.status === "INCOMPLETE") expect(built.missing).toContain("ACTUAL_REVENUE");
  });

  it("reports INCOMPLETE when the current funding question hasn't been answered, rather than assuming a split", () => {
    const built = buildNowScenarioInput(baseParams({ currentFundingConfirmation: null }));
    expect(built.status).toBe("INCOMPLETE");
    if (built.status === "INCOMPLETE") expect(built.missing).toContain("CURRENT_FUNDING_CONFIRMATION");
  });

  it("reports INCOMPLETE when no active stream has both a price and a Cost of Delivery entry", () => {
    const built = buildNowScenarioInput(
      baseParams({ streamInputs: [{ streamId: "chocolate-bar", price: null, volume: null, mixWeightOverride: null, cogs: null, otherVariableCosts: [] }] }),
    );
    expect(built.status).toBe("INCOMPLETE");
    if (built.status === "INCOMPLETE") expect(built.missing).toContain("NO_USABLE_REVENUE_STREAM");
  });

  it("falls back to an equal ownership split — flagged, not silent — when Business Profile ownership is unknown", () => {
    const owners: Owner[] = [
      { id: "owner-1", businessId: "hcf", label: "Jessica", isPrimaryRespondent: true, ownershipPercent: null },
      { id: "owner-2", businessId: "hcf", label: "Asha", isPrimaryRespondent: false, ownershipPercent: null },
    ];
    const built = buildNowScenarioInput(baseParams({ owners }));
    if (built.status !== "READY") throw new Error("expected READY — incomplete ownership must not block NOW");
    expect(built.ownershipSplitFallbackApplied).toBe(true);
    expect(built.input.ownerEconomics.map((o) => o.ownershipPercent)).toEqual(["0.50000000", "0.50000000"]);
  });

  it("falls back to an equal ownership split when the Business Profile split is complete but invalid (doesn't sum to 100%)", () => {
    const owners: Owner[] = [
      { id: "owner-1", businessId: "hcf", label: "Jessica", isPrimaryRespondent: true, ownershipPercent: { value: "0.6", confidence: "EXACT" } },
      { id: "owner-2", businessId: "hcf", label: "Asha", isPrimaryRespondent: false, ownershipPercent: { value: "0.6", confidence: "EXACT" } },
    ];
    const built = buildNowScenarioInput(baseParams({ owners }));
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.ownershipSplitFallbackApplied).toBe(true);
  });

  it("falls back to an equal sales-mix split when one of several streams is missing its mix share", () => {
    const activeStreams: RevenueStream[] = [
      { id: "bars", businessId: "hcf", name: "Bars", description: "bars", active: true },
      { id: "gift-boxes", businessId: "hcf", name: "Gift boxes", description: "boxes", active: true },
    ];
    const built = buildNowScenarioInput(
      baseParams({
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
  });

  it("excludes an active stream with no price/COGS entered yet, but still runs on the streams that are usable", () => {
    const activeStreams: RevenueStream[] = [
      { id: "bars", businessId: "hcf", name: "Bars", description: "bars", active: true },
      { id: "untouched-stream", businessId: "hcf", name: "New idea", description: "not started yet", active: true },
    ];
    const built = buildNowScenarioInput(
      baseParams({
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
    const built = buildNowScenarioInput(baseParams({ distributionPolicy: null }));
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.distributionPolicy.rule).toBe("DISCRETIONARY");
  });
});
