import type { ScenarioEngineInput } from "@revenue-reality/domain";

/**
 * Ridgeline Coffee Roasters, the mature intended model — one step further
 * than fixtures/complete-next.ts's NEXT snapshot (which itself continues
 * fixtures/complete-business.ts's NOW snapshot). Fully synthetic, every
 * input confirmed. Proves the full ULTIMATELY forward/backward waterfall:
 * an Intended (already-defined) life requirement materially larger than
 * NEXT's, the primary owner's hours materially LOWER than NEXT's (8/week vs.
 * NEXT's 15), a smaller share of the owner's total benefit coming from labor
 * compensation and a larger share from ownership return, two delegation
 * costs (one carried from NEXT, one new — replacing work the owner no
 * longer performs), and both recurring and one-time mature capital
 * requirements, all producing a real, engine-derived Required Revenue.
 */
export function completeUltimatelyInput(): ScenarioEngineInput {
  return {
    scenarioType: "ULTIMATELY",
    restructureDate: null,
    actualRevenue: null, // ULTIMATELY never has an actual — Required Revenue is solved, never entered as a goal

    lifeAssumption: {
      scenarioId: "ridgeline-ultimately",
      source: "INTENDED",
      lifeRequirement: "3500.00",
      securityRequirement: "900.00",
      outsideFundingRetained: { mode: "AMOUNT", amount: "0.00", confidence: "EXACT" }, // business confirmed responsible for the full $4,400/mo
      selectedLifeChanges: [],
    },

    timeAssumption: {
      scenarioId: "ridgeline-ultimately",
      source: "INTENDED",
      availableHoursWeek: { value: 30, confidence: "EXACT" },
      businessHoursWeek: { value: 8, confidence: "EXACT" }, // materially fewer hours than NEXT's 15 — the mature model needs less of the owner
      otherTimeClaims: [],
      lifePriorityReservations: ["More evenings with family", "A real vacation each year"],
    },

    streams: [
      {
        scenarioId: "ridgeline-ultimately",
        streamId: "roast-subscription",
        priceOrAvgValue: { value: "12.00", confidence: "STRONG_ESTIMATE" }, // an explicit owner assumption — never an automatic "scale discount"
        volume: null,
        mixWeight: "1",
        cogs: { method: "PER_UNIT", perUnit: { value: "4.50", confidence: "STRONG_ESTIMATE" } },
        cogsPerUnit: "4.50",
        otherVariableCosts: [],
        otherVariableCostPerUnit: "0.00",
        grossProfitPerUnit: "7.50",
        grossMargin: "0.625",
        contributionPerUnit: "7.50",
        contributionMargin: "0.625",
      },
    ],

    operatingCosts: [
      { id: "software", scenarioId: "ridgeline-ultimately", category: "software", amount: "600.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
      { id: "rent", scenarioId: "ridgeline-ultimately", category: "rent", amount: "400.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
      { id: "admin-support", scenarioId: "ridgeline-ultimately", category: "administrative labor", amount: "1500.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "STRONG_ESTIMATE", isPartialList: false }, // the small team the mature model actually needs
    ],

    ownerInputs: [
      { scenarioId: "ridgeline-ultimately", ownerId: "owner-1", hoursWeek: { value: 8, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN" },
      { scenarioId: "ridgeline-ultimately", ownerId: "owner-2", hoursWeek: { value: 5, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN" },
    ],

    distributionPolicy: { scenarioId: "ridgeline-ultimately", rule: "SAME_AS_OWNERSHIP" },
    ownerEconomics: [
      {
        scenarioId: "ridgeline-ultimately",
        ownerId: "owner-1",
        ownershipPercent: "0.6",
        distributionPercent: null,
        isPrimaryRespondent: true,
        // Materially lower than NEXT's $2,000 — the mature model relies far
        // less on the owner's own labor. Their total benefit still has to
        // reach the confirmed business-funded requirement, so more of it
        // now arrives as ownership return instead of a paycheck.
        targetLaborCompensation: { value: "1000.00", confidence: "STRONG_ESTIMATE" },
      },
      {
        scenarioId: "ridgeline-ultimately",
        ownerId: "owner-2",
        ownershipPercent: "0.4",
        distributionPercent: null,
        isPrimaryRespondent: false,
      },
    ],

    delegationItems: [
      {
        id: "bookkeeping",
        scenarioId: "ridgeline-ultimately",
        functionLabel: "Bookkeeping",
        delegationType: "CONTRACTOR",
        replacementCost: { value: "300.00", confidence: "STRONG_ESTIMATE" },
        cadence: "MONTHLY",
      },
      {
        // New in the mature model — work the owner performed personally in
        // NEXT (selling) no longer depends on them at all.
        id: "sales",
        scenarioId: "ridgeline-ultimately",
        functionLabel: "Sales",
        delegationType: "EMPLOYEE",
        replacementCost: { value: "800.00", confidence: "STRONG_ESTIMATE" },
        cadence: "MONTHLY",
      },
    ],
    capitalItems: [
      { id: "reserve", scenarioId: "ridgeline-ultimately", category: "RESERVE", amount: "300.00", nature: "RECURRING", cadence: "MONTHLY", confidence: "EXACT" },
      { id: "equipment", scenarioId: "ridgeline-ultimately", category: "EQUIPMENT", amount: "1000.00", nature: "ONE_TIME", cadence: "ONE_TIME", confidence: "STRONG_ESTIMATE" },
    ],
    capacity: { scenarioId: "ridgeline-ultimately", demandState: "PROBABLE", constraints: [] },
  };
}

/**
 * A mature owner-operated variant of the same business — the owner
 * intentionally continues doing substantial work (business intent "Mostly
 * me"), so ULTIMATELY does not assume every mature business must become
 * owner-independent. Same life/time/revenue backbone; no delegation at all.
 */
export function ownerOperatedUltimatelyInput(): ScenarioEngineInput {
  const base = completeUltimatelyInput();
  return {
    ...base,
    timeAssumption: { ...base.timeAssumption, businessHoursWeek: { value: 25, confidence: "EXACT" } },
    ownerInputs: base.ownerInputs.map((o) => (o.ownerId === "owner-1" ? { ...o, hoursWeek: { value: 25, confidence: "EXACT" as const } } : o)),
    ownerEconomics: base.ownerEconomics.map((o) =>
      o.ownerId === "owner-1" ? { ...o, targetLaborCompensation: { value: "3500.00", confidence: "STRONG_ESTIMATE" as const } } : o,
    ),
    delegationItems: [],
  };
}
