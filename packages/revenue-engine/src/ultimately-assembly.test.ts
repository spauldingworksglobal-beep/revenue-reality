import { describe, expect, it } from "vitest";
import type { Owner, RevenueStream } from "@revenue-reality/domain";
import { buildUltimatelyScenarioInput, type BuildUltimatelyScenarioInputParams } from "./ultimately-assembly";
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

function baseParams(overrides: Partial<BuildUltimatelyScenarioInputParams> = {}): BuildUltimatelyScenarioInputParams {
  return {
    scenarioId: "ultimately",
    owners: owners(),
    activeStreams: streams(),
    streamInputs: [
      { streamId: "roast-subscription", price: { value: "12.00", confidence: "EXACT" }, volume: null, mixWeightOverride: null, cogs: { method: "PER_UNIT", perUnit: { value: "4.50", confidence: "EXACT" } }, otherVariableCosts: [] },
    ],
    operatingCosts: [
      { id: "software", scenarioId: "ultimately", category: "software", amount: "600.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
      { id: "admin", scenarioId: "ultimately", category: "administrative labor", amount: "1500.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "STRONG_ESTIMATE", isPartialList: false },
    ],
    ownerInputs: [
      { ownerId: "owner-1", hoursWeek: { value: 999, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN", broadFunctions: [], targetLaborCompensation: { value: "1000.00", confidence: "STRONG_ESTIMATE" }, targetProfitDistribution: null },
      { ownerId: "owner-2", hoursWeek: { value: 5, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN", broadFunctions: [], targetLaborCompensation: null, targetProfitDistribution: null },
    ],
    ultimateBusinessHoursWeek: { value: 8, confidence: "EXACT" },
    intendedAvailableHoursWeek: { value: 30, confidence: "EXACT" },
    otherTimeClaims: [],
    lifePriorityReservations: ["More evenings with family"],
    distributionPolicy: { scenarioId: "ultimately", rule: "SAME_AS_OWNERSHIP" },
    distributionPercents: {},
    capitalItems: [
      { id: "reserve", scenarioId: "ultimately", category: "RESERVE", amount: "300.00", nature: "RECURRING", cadence: "MONTHLY", confidence: "EXACT" },
      { id: "equipment", scenarioId: "ultimately", category: "EQUIPMENT", amount: "1000.00", nature: "ONE_TIME", cadence: "ONE_TIME", confidence: "STRONG_ESTIMATE" },
    ],
    delegationItems: [
      { id: "sales", scenarioId: "ultimately", functionLabel: "Sales", delegationType: "EMPLOYEE", replacementCost: { value: "800.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" },
    ],
    intendedLifeCategories: [
      { id: "housing", lifeProfileId: "lp1", kind: "HOUSING", label: "Housing", currentAmount: { value: "2600.00", confidence: "EXACT" }, nextAmount: { value: "3000.00", confidence: "STRONG_ESTIMATE" }, intendedAmount: { value: "3500.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY", changeType: "INCREASE" },
    ],
    intendedSecurity: [
      { id: "reserve-fund", lifeProfileId: "lp1", kind: "EMERGENCY_SAVINGS", label: "Emergency savings", currentAmount: { value: "0.00", confidence: "EXACT" }, nextAmount: { value: "700.00", confidence: "STRONG_ESTIMATE" }, intendedAmount: { value: "900.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" },
    ],
    deferredNeeds: [],
    ultimatelyFundingConfirmation: { mode: "AMOUNT", amount: "0.00", confidence: "EXACT" }, // business confirmed responsible for the full $4,400
    restructureDate: null,
    capacity: { scenarioId: "ultimately", demandState: "PROBABLE", constraints: [] },
    ...overrides,
  };
}

describe("buildUltimatelyScenarioInput — complete ULTIMATELY snapshot", () => {
  it("is READY and produces a scenarioType ULTIMATELY input with actualRevenue always null", () => {
    const built = buildUltimatelyScenarioInput(baseParams());
    expect(built.status).toBe("READY");
    if (built.status !== "READY") return;
    expect(built.input.scenarioType).toBe("ULTIMATELY");
    expect(built.input.actualRevenue).toBeNull();
  });

  it("sums life/security under the INTENDED horizon directly — no intermediate selection step the way NEXT has", () => {
    const built = buildUltimatelyScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    // 3500 (intendedAmount housing) + 900 (intendedAmount security) = 4400,
    // matching neither the current (2600+0=2600) nor NEXT (3000+700=3700) totals.
    expect(built.input.lifeAssumption.lifeRequirement).toBe("3500.00");
    expect(built.input.lifeAssumption.securityRequirement).toBe("900.00");
  });

  it("includes deferred needs the owner chose to carry into the Intended total, exactly as compareLifeRequirements does", () => {
    const built = buildUltimatelyScenarioInput(
      baseParams({
        deferredNeeds: [
          { id: "d1", lifeProfileId: "lp1", description: "A second vehicle", estimatedAmount: { value: "250.00", confidence: "ROUGH_ESTIMATE" }, includeInIntended: true },
          { id: "d2", lifeProfileId: "lp1", description: "Not included", estimatedAmount: { value: "999.00", confidence: "ROUGH_ESTIMATE" }, includeInIntended: false },
        ],
      }),
    );
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.lifeAssumption.lifeRequirement).toBe("3750.00"); // 3500 + 250, not +999
  });

  it("uses the owner's already-defined Intended Time Reality, distinct from NOW or NEXT", () => {
    const built = buildUltimatelyScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.timeAssumption.availableHoursWeek).toEqual({ value: 30, confidence: "EXACT" });
    expect(built.input.timeAssumption.businessHoursWeek).toEqual({ value: 8, confidence: "EXACT" });
    expect(built.input.timeAssumption.lifePriorityReservations).toEqual(["More evenings with family"]);
  });

  it("overrides the primary respondent's hoursWeek with the intended ultimate business hours, ignoring whatever is stored on their owner input", () => {
    const built = buildUltimatelyScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const primary = built.input.ownerInputs.find((o) => o.ownerId === "owner-1")!;
    expect(primary.hoursWeek).toEqual({ value: 8, confidence: "EXACT" });
  });

  it("reads targetLaborCompensation, not cashReceived — ULTIMATELY hasn't happened yet, so nothing is measured", () => {
    const built = buildUltimatelyScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const primary = built.input.ownerEconomics.find((o) => o.ownerId === "owner-1")!;
    expect(primary.targetLaborCompensation).toEqual({ value: "1000.00", confidence: "STRONG_ESTIMATE" });
    expect(primary.cashReceived).toBeUndefined();
  });

  it("carries delegation items and both recurring and one-time capital straight through", () => {
    const built = buildUltimatelyScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.delegationItems).toHaveLength(1);
    expect(built.input.capitalItems).toHaveLength(2);
  });

  it("runs end-to-end through runScenario to a real, non-null Required Revenue", () => {
    const built = buildUltimatelyScenarioInput(baseParams());
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "r" });
    expect(result.requiredRevenue).not.toBeNull();
    expect(Number(result.requiredRevenue)).toBeGreaterThan(0);
  });
});

describe("buildUltimatelyScenarioInput — incomplete data never crashes, never fabricates", () => {
  it("does NOT gate the whole ULTIMATELY result when funding responsibility hasn't been confirmed — it flows through as null instead, same as NOW/NEXT", () => {
    const built = buildUltimatelyScenarioInput(baseParams({ ultimatelyFundingConfirmation: null }));
    expect(built.status).toBe("READY");
    if (built.status !== "READY") return;
    expect(built.input.lifeAssumption.outsideFundingRetained).toBeNull();
  });

  it("an unconfirmed funding responsibility still produces a real result via runScenario — margins, opex, retained capital, and signals stay available; only Required Revenue and the owner-benefit comparison become unavailable", () => {
    const built = buildUltimatelyScenarioInput(baseParams({ ultimatelyFundingConfirmation: null }));
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "r" });

    expect(result.requiredRevenue).toBeNull();
    expect(result.primaryOwnerBenefitVsRequirement).toBeNull();
    expect(result.ownerSupportSignal).toBe("INSUFFICIENT_DATA");

    expect(result.perStreamEconomics.length).toBeGreaterThan(0);
    expect(result.perStreamEconomics[0]!.grossMargin).toBe("0.625");
    expect(result.breakEvenFloor).not.toBeNull();
    expect(result.requiredRetainedBusinessCapital.total).not.toBe("0.00");
    expect(result.capacitySignal).toBe("NEITHER"); // PROBABLE demand, no listed constraints
    expect(result.timeSignal).toBe("FITS");
  });

  it("PERCENT funding mode: the confirmed percentage is preserved and its dollar value scales with the Intended personal economic requirement", () => {
    const built = buildUltimatelyScenarioInput(baseParams({ ultimatelyFundingConfirmation: { mode: "PERCENT_OF_TOTAL", percentOfTotal: "1", confidence: "STRONG_ESTIMATE" } }));
    if (built.status !== "READY") throw new Error("expected READY");
    // total is 4400 (3500 + 900); 100% business-funded, 0% retained outside.
    expect(built.input.lifeAssumption.outsideFundingRetained).toEqual({ mode: "PERCENT_OF_TOTAL", percentOfTotal: "0", confidence: "STRONG_ESTIMATE" });
  });

  it("AMOUNT funding mode: the confirmed dollar amount is read directly and does not drift", () => {
    const built = buildUltimatelyScenarioInput(baseParams({ ultimatelyFundingConfirmation: { mode: "AMOUNT", amount: "4400.00", confidence: "STRONG_ESTIMATE" } }));
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.lifeAssumption.outsideFundingRetained).toEqual({ mode: "AMOUNT", amount: "0.00", confidence: "STRONG_ESTIMATE" });
  });

  it("a revenue stream removed from the mature model (no price/COGS entered for it) is excluded, never silently kept", () => {
    const twoStreams: RevenueStream[] = [
      { id: "roast-subscription", businessId: "ridgeline", name: "Roast subscription", description: "subscription", active: true },
      { id: "wholesale", businessId: "ridgeline", name: "Wholesale", description: "discontinued in the mature model", active: true },
    ];
    const built = buildUltimatelyScenarioInput(
      baseParams({
        activeStreams: twoStreams,
        streamInputs: [
          { streamId: "roast-subscription", price: { value: "12.00", confidence: "EXACT" }, volume: null, mixWeightOverride: null, cogs: { method: "PER_UNIT", perUnit: { value: "4.50", confidence: "EXACT" } }, otherVariableCosts: [] },
          { streamId: "wholesale", price: null, volume: null, mixWeightOverride: null, cogs: null, otherVariableCosts: [] },
        ],
      }),
    );
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.input.streams.map((s) => s.streamId)).toEqual(["roast-subscription"]);
    expect(built.excludedStreamIds).toEqual(["wholesale"]);
  });

  it("reports INCOMPLETE when no active stream has both a price and a Cost of Delivery entry", () => {
    const built = buildUltimatelyScenarioInput(
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
    const built = buildUltimatelyScenarioInput(baseParams({ owners: unknownOwners, distributionPolicy: { scenarioId: "ultimately", rule: "EQUAL_SPLIT" } }));
    if (built.status !== "READY") throw new Error("expected READY — unknown ownership must not block ULTIMATELY");
    expect(built.unknownOwnershipOwnerIds.sort()).toEqual(["owner-1", "owner-2"]);
    expect(() => runScenario(built.input, { revisionId: "r" })).not.toThrow();
  });

  it("falls back to an equal sales-mix modeling assumption, flagged, when a multi-stream mix is unresolved", () => {
    const twoStreams: RevenueStream[] = [
      { id: "roast-subscription", businessId: "ridgeline", name: "Roast subscription", description: "subscription", active: true },
      { id: "wholesale", businessId: "ridgeline", name: "Wholesale", description: "wholesale bags", active: true },
    ];
    const built = buildUltimatelyScenarioInput(
      baseParams({
        activeStreams: twoStreams,
        streamInputs: [
          { streamId: "roast-subscription", price: { value: "12.00", confidence: "EXACT" }, volume: null, mixWeightOverride: null, cogs: { method: "PER_UNIT", perUnit: { value: "4.50", confidence: "EXACT" } }, otherVariableCosts: [] },
          { streamId: "wholesale", price: { value: "8.00", confidence: "EXACT" }, volume: null, mixWeightOverride: null, cogs: { method: "PER_UNIT", perUnit: { value: "3.00", confidence: "EXACT" } }, otherVariableCosts: [] },
        ],
      }),
    );
    if (built.status !== "READY") throw new Error("expected READY");
    expect(built.mixWeightFallbackApplied).toBe(true);
    expect(built.input.streams.map((s) => s.mixWeight)).toEqual(["0.50000000", "0.50000000"]);
  });

  it("an incomplete delegation replacement cost never blocks ULTIMATELY — it's a floor, flagged, not a fabricated market rate", () => {
    const built = buildUltimatelyScenarioInput(
      baseParams({ delegationItems: [{ id: "d1", scenarioId: "ultimately", functionLabel: "Ops support", delegationType: "UNSURE", replacementCost: null, cadence: "MONTHLY" }] }),
    );
    if (built.status !== "READY") throw new Error("expected READY");
    const result = runScenario(built.input, { revisionId: "r" });
    expect(result.requiredRevenue).not.toBeNull();
    expect(result.confidenceFlags).toContainEqual({ field: "delegationItems", confidence: "INCOMPLETE" });
  });
});

describe("buildUltimatelyScenarioInput — ULTIMATELY can start from HCF's known-but-incomplete NOW facts without silently filling the gaps", () => {
  it("carries HCF's known price/COGS forward into an ULTIMATELY snapshot and stays useful (margins, break-even) while ownership, distribution rule, and funding remain unconfirmed", () => {
    const hcfOwners: Owner[] = [
      { id: "owner-1", businessId: "hcf", label: "Jessica", isPrimaryRespondent: true, ownershipPercent: null },
      { id: "owner-2", businessId: "hcf", label: "Asha", isPrimaryRespondent: false, ownershipPercent: null },
    ];
    const hcfStreams: RevenueStream[] = [{ id: "chocolate-bar", businessId: "hcf", name: "Chocolate bar", description: "wholesale chocolate bars", active: true }];
    const built = buildUltimatelyScenarioInput(
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
        ultimatelyFundingConfirmation: null, // never confirmed
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
});
