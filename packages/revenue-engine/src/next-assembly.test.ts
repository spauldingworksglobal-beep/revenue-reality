import { describe, expect, it } from "vitest";
import type { Owner, RevenueStream } from "@revenue-reality/domain";
import { buildNextScenarioInput, type BuildNextScenarioInputParams } from "./next-assembly";
import { runScenario } from "./scenario";

function owners(): Owner[] {
  return [
    { id: "owner-1", businessId: "ridgeline", label: "Sam", isPrimaryRespondent: true, ownershipPercent: { value: "0.6", confidence: "EXACT" } },
    { id: "owner-2", businessId: "ridgeline", label: "Robin", isPrimaryRespondent: false, ownershipPercent: { value: "0.4", confidence: "EXACT" } },
  ];
}

function streams(): RevenueStream[] {
  return [{ id: "roast-subscription", businessId: "ridgeline", name: "Roast subscription", description: "monthly coffee subscription", active: true }];
}

function baseParams(overrides: Partial<BuildNextScenarioInputParams> = {}): BuildNextScenarioInputParams {
  return {
    scenarioId: "next",
    owners: owners(),
    activeStreams: streams(),
    streamInputs: [
      { streamId: "roast-subscription", price: { value: "10.00", confidence: "EXACT" }, volume: null, mixWeightOverride: null, cogs: { method: "PER_UNIT", perUnit: { value: "4.00", confidence: "EXACT" } }, otherVariableCosts: [] },
    ],
    operatingCosts: [
      { id: "software", scenarioId: "next", category: "software", amount: "500.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
      { id: "rent", scenarioId: "next", category: "rent", amount: "300.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
      { id: "marketing", scenarioId: "next", category: "marketing", amount: "200.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "STRONG_ESTIMATE", isPartialList: false },
    ],
    opexListIsPartial: false,
    ownerInputs: [
      { ownerId: "owner-1", hoursWeek: { value: 999, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN", broadFunctions: [], targetLaborCompensation: { value: "2000.00", confidence: "STRONG_ESTIMATE" }, targetProfitDistribution: null },
      { ownerId: "owner-2", hoursWeek: { value: 10, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN", broadFunctions: [], targetLaborCompensation: null, targetProfitDistribution: null },
    ],
    nextBusinessHoursWeek: { value: 15, confidence: "EXACT" },
    nextAvailableHoursWeek: { value: 35, confidence: "EXACT" },
    otherTimeClaims: [],
    lifePriorityReservations: ["More evenings with family"],
    distributionPolicy: { scenarioId: "next", rule: "SAME_AS_OWNERSHIP" },
    distributionPercents: {},
    capitalItems: [
      { id: "reserve", scenarioId: "next", category: "RESERVE", amount: "200.00", nature: "RECURRING", cadence: "MONTHLY", confidence: "EXACT" },
      { id: "equipment", scenarioId: "next", category: "EQUIPMENT", amount: "600.00", nature: "ONE_TIME", cadence: "ONE_TIME", confidence: "STRONG_ESTIMATE" },
    ],
    delegationItems: [
      { id: "bookkeeping", scenarioId: "next", functionLabel: "Bookkeeping", delegationType: "CONTRACTOR", replacementCost: { value: "300.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" },
    ],
    nextLifeCategories: [
      { id: "housing", lifeProfileId: "lp1", kind: "HOUSING", label: "Housing", currentAmount: { value: "2600.00", confidence: "EXACT" }, nextAmount: { value: "3000.00", confidence: "STRONG_ESTIMATE" }, intendedAmount: { value: "3200.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY", changeType: "INCREASE" },
    ],
    nextSecurity: [
      { id: "reserve-fund", lifeProfileId: "lp1", kind: "EMERGENCY_SAVINGS", label: "Emergency savings", currentAmount: { value: "0.00", confidence: "EXACT" }, nextAmount: { value: "700.00", confidence: "STRONG_ESTIMATE" }, intendedAmount: { value: "1000.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" },
    ],
    nextFundingConfirmation: { mode: "AMOUNT", amount: "0.00", confidence: "EXACT" }, // business confirmed responsible for the full $3,700
    restructureDate: null,
    capacity: { scenarioId: "next", demandState: "PROBABLE", constraints: [] },
    ...overrides,
  };
}

describe("buildNextScenarioInput — complete NEXT snapshot", () => {
  it("is READY and produces a scenarioType NEXT input with actualRevenue always null", () => {
    const built = buildNextScenarioInput(baseParams());
    expect(built.status).toBe("READY");
    if (built.status !== "READY") return;
    expect(built.input.scenarioType).toBe("NEXT");
    expect(built.input.actualRevenue).toBeNull();
  });

  it("sums NEXT life categories/security under the NEXT horizon, not CURRENT or INTENDED", () => {
    const built = buildNextScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    // 3000 (nextAmount housing) + 700 (nextAmount security) = 3700, matching neither
    // the current (2600+0=2600) nor intended (3200+1000=4200) totals.
    expect(built.input.lifeAssumption.lifeRequirement).toBe("3000.00");
    expect(built.input.lifeAssumption.securityRequirement).toBe("700.00");
  });

  it("uses NEXT's own available/business hours, distinct from any other horizon", () => {
    const built = buildNextScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.timeAssumption.availableHoursWeek).toEqual({ value: 35, confidence: "EXACT" });
    expect(built.input.timeAssumption.businessHoursWeek).toEqual({ value: 15, confidence: "EXACT" });
    expect(built.input.timeAssumption.lifePriorityReservations).toEqual(["More evenings with family"]);
  });

  it("overrides the primary respondent's hoursWeek with NEXT's own business hours, ignoring whatever is stored on their owner input", () => {
    const built = buildNextScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const primary = built.input.ownerInputs.find((o) => o.ownerId === "owner-1")!;
    expect(primary.hoursWeek).toEqual({ value: 15, confidence: "EXACT" });
  });

  it("reads targetLaborCompensation, not cashReceived — NEXT hasn't happened yet, so nothing is measured", () => {
    const built = buildNextScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const primary = built.input.ownerEconomics.find((o) => o.ownerId === "owner-1")!;
    expect(primary.targetLaborCompensation).toEqual({ value: "2000.00", confidence: "STRONG_ESTIMATE" });
    expect(primary.cashReceived).toBeUndefined();
  });

  it("carries delegation items and both recurring and one-time capital straight through", () => {
    const built = buildNextScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.delegationItems).toHaveLength(1);
    expect(built.input.capitalItems).toHaveLength(2);
  });

  it("runs end-to-end through runScenario to a real, non-null Required Revenue", () => {
    const built = buildNextScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "r" });
    expect(result.requiredRevenue).not.toBeNull();
    expect(Number(result.requiredRevenue)).toBeGreaterThan(0);
  });
});

describe("buildNextScenarioInput — incomplete data never crashes, never fabricates", () => {
  it("does NOT gate the whole NEXT result when funding responsibility hasn't been confirmed — it flows through as null instead, same as NOW", () => {
    const built = buildNextScenarioInput(baseParams({ nextFundingConfirmation: null }));
    expect(built.status).toBe("READY");
    if (built.status !== "READY") return;
    expect(built.input.lifeAssumption.outsideFundingRetained).toBeNull();
  });

  it("an unconfirmed funding responsibility still produces a real result via runScenario — margins, opex, retained capital, and signals stay available; only Required Revenue and the owner-benefit comparison become unavailable", () => {
    const built = buildNextScenarioInput(baseParams({ nextFundingConfirmation: null }));
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "r" });

    expect(result.requiredRevenue).toBeNull();
    expect(result.primaryOwnerBenefitVsRequirement).toBeNull();
    expect(result.ownerSupportSignal).toBe("INSUFFICIENT_DATA");

    expect(result.perStreamEconomics.length).toBeGreaterThan(0);
    expect(result.perStreamEconomics[0]!.grossMargin).toBe("0.6");
    expect(result.breakEvenFloor).not.toBeNull();
    expect(result.requiredRetainedBusinessCapital.total).not.toBe("0.00");
    expect(result.capacitySignal).toBe("NEITHER"); // PROBABLE demand, no listed constraints
    expect(result.timeSignal).toBe("FITS");
  });

  it("PERCENT funding mode: the confirmed percentage is preserved and its dollar value scales with the NEXT personal economic requirement", () => {
    const built = buildNextScenarioInput(baseParams({ nextFundingConfirmation: { mode: "PERCENT_OF_TOTAL", percentOfTotal: "1", confidence: "STRONG_ESTIMATE" } }));
    if (built.status !== "READY") throw new Error("expected READY");
    // total is 3700 (3000 + 700); 100% business-funded, 0% retained outside.
    expect(built.input.lifeAssumption.outsideFundingRetained).toEqual({ mode: "PERCENT_OF_TOTAL", percentOfTotal: "0", confidence: "STRONG_ESTIMATE" });
  });

  it("AMOUNT funding mode: the confirmed dollar amount is read directly and does not drift", () => {
    const built = buildNextScenarioInput(baseParams({ nextFundingConfirmation: { mode: "AMOUNT", amount: "3700.00", confidence: "STRONG_ESTIMATE" } }));
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.lifeAssumption.outsideFundingRetained).toEqual({ mode: "AMOUNT", amount: "0.00", confidence: "STRONG_ESTIMATE" });
  });

  it("reports INCOMPLETE when no active stream has both a price and a Cost of Delivery entry", () => {
    const built = buildNextScenarioInput(
      baseParams({ streamInputs: [{ streamId: "roast-subscription", price: null, volume: null, mixWeightOverride: null, cogs: null, otherVariableCosts: [] }] }),
    );
    expect(built.status).toBe("INCOMPLETE");
    if (built.status === "INCOMPLETE") expect(built.missing).toContain("NO_USABLE_REVENUE_STREAM");
  });

  it("passes through unknown (null) ownership without assuming any split, and still runs when the chosen rule doesn't need it", () => {
    const unknownOwners: Owner[] = [
      { id: "owner-1", businessId: "ridgeline", label: "Sam", isPrimaryRespondent: true, ownershipPercent: null },
      { id: "owner-2", businessId: "ridgeline", label: "Robin", isPrimaryRespondent: false, ownershipPercent: null },
    ];
    const built = buildNextScenarioInput(baseParams({ owners: unknownOwners, distributionPolicy: { scenarioId: "next", rule: "EQUAL_SPLIT" } }));
    if (built.status !== "READY") throw new Error("expected READY — unknown ownership must not block NEXT");
    expect(built.unknownOwnershipOwnerIds.sort()).toEqual(["owner-1", "owner-2"]);
    expect(() => runScenario(built.input, { revisionId: "r" })).not.toThrow();
  });

  it("falls back to an equal sales-mix modeling assumption, flagged, when a multi-stream mix is unresolved", () => {
    const twoStreams: RevenueStream[] = [
      { id: "roast-subscription", businessId: "ridgeline", name: "Roast subscription", description: "subscription", active: true },
      { id: "wholesale", businessId: "ridgeline", name: "Wholesale", description: "wholesale bags", active: true },
    ];
    const built = buildNextScenarioInput(
      baseParams({
        activeStreams: twoStreams,
        streamInputs: [
          { streamId: "roast-subscription", price: { value: "10.00", confidence: "EXACT" }, volume: null, mixWeightOverride: null, cogs: { method: "PER_UNIT", perUnit: { value: "4.00", confidence: "EXACT" } }, otherVariableCosts: [] },
          { streamId: "wholesale", price: { value: "8.00", confidence: "EXACT" }, volume: null, mixWeightOverride: null, cogs: { method: "PER_UNIT", perUnit: { value: "3.00", confidence: "EXACT" } }, otherVariableCosts: [] },
        ],
      }),
    );
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.mixWeightFallbackApplied).toBe(true);
    expect(built.input.streams.map((s) => s.mixWeight)).toEqual(["0.50000000", "0.50000000"]);
  });

  it("an incomplete delegation replacement cost never blocks NEXT — it's a floor, flagged, not a fabricated market rate", () => {
    const built = buildNextScenarioInput(
      baseParams({ delegationItems: [{ id: "d1", scenarioId: "next", functionLabel: "Sales support", delegationType: "UNSURE", replacementCost: null, cadence: "MONTHLY" }] }),
    );
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "r" });
    expect(result.requiredRevenue).not.toBeNull();
    expect(result.confidenceFlags).toContainEqual({ field: "delegationItems", confidence: "INCOMPLETE" });
  });
});

describe("buildNextScenarioInput — NEXT can start from HCF's known-but-incomplete NOW facts without silently filling the gaps", () => {
  it("carries HCF's known price/COGS/opex forward into a NEXT snapshot and stays useful (margins, break-even) while ownership, distribution rule, and funding remain unconfirmed", () => {
    const hcfOwners: Owner[] = [
      { id: "owner-1", businessId: "hcf", label: "Jessica", isPrimaryRespondent: true, ownershipPercent: null },
      { id: "owner-2", businessId: "hcf", label: "Asha", isPrimaryRespondent: false, ownershipPercent: null },
    ];
    const hcfStreams: RevenueStream[] = [{ id: "chocolate-bar", businessId: "hcf", name: "Chocolate bar", description: "wholesale chocolate bars", active: true }];
    const built = buildNextScenarioInput(
      baseParams({
        owners: hcfOwners,
        activeStreams: hcfStreams,
        streamInputs: [
          {
            streamId: "chocolate-bar",
            price: { value: "5.50", confidence: "EXACT" },
            volume: null,
            mixWeightOverride: null,
            cogs: { method: "COMPONENT_BUILDUP", components: [{ label: "co-packer", amount: "2.50" }, { label: "plastic bag", amount: "0.25" }, { label: "sticker", amount: "0.20" }] },
            otherVariableCosts: [],
          },
        ],
        distributionPolicy: null, // no rule known
        nextFundingConfirmation: null, // never confirmed
      }),
    );
    expect(built.status).toBe("READY");
    if (built.status !== "READY") return;
    expect(built.input.lifeAssumption.outsideFundingRetained).toBeNull();
    expect(built.unknownOwnershipOwnerIds.sort()).toEqual(["owner-1", "owner-2"]);

    const result = runScenario(built.input, { revisionId: "r" });
    expect(result.perStreamEconomics[0]!.grossMargin).toBe("0.463636");
    expect(result.requiredRevenue).toBeNull();
  });

  it("still reports INCOMPLETE when HCF's known stream can't even be built (no price/COGS entered for NEXT yet)", () => {
    const hcfStreams: RevenueStream[] = [{ id: "chocolate-bar", businessId: "hcf", name: "Chocolate bar", description: "wholesale chocolate bars", active: true }];
    const built = buildNextScenarioInput(
      baseParams({
        activeStreams: hcfStreams,
        streamInputs: [{ streamId: "chocolate-bar", price: null, volume: null, mixWeightOverride: null, cogs: null, otherVariableCosts: [] }],
        nextFundingConfirmation: null,
      }),
    );
    expect(built.status).toBe("INCOMPLETE");
    if (built.status === "INCOMPLETE") expect(built.missing).toEqual(["NO_USABLE_REVENUE_STREAM"]);
  });
});
