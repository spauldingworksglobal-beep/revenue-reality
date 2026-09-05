import type { ScenarioEngineInput } from "@revenue-reality/domain";

/**
 * Ridgeline Coffee Roasters, one intermediate step forward from
 * fixtures/complete-business.ts's NOW snapshot — fully synthetic, every
 * input confirmed. This is NOT Harlem Chocolate Factory (see fixtures/hcf.ts)
 * and NOT the NOW snapshot itself; it proves the full NEXT forward/backward
 * waterfall: a confirmed NEXT life requirement, a primary owner's targeted
 * labor compensation (paid consistently, not measured — NEXT hasn't
 * happened yet), a known delegation cost, and both recurring and one-time
 * growth capital, all producing a real, engine-derived Required Revenue.
 */
export function completeNextInput(): ScenarioEngineInput {
  return {
    scenarioType: "NEXT",
    restructureDate: null,
    actualRevenue: null, // NEXT never has an actual — Required Revenue is solved, never entered as a goal

    lifeAssumption: {
      scenarioId: "ridgeline-next",
      source: "NEXT",
      lifeRequirement: "3000.00",
      securityRequirement: "700.00",
      outsideFundingRetained: { mode: "AMOUNT", amount: "0.00", confidence: "EXACT" }, // business confirmed responsible for the full $3,700/mo
      selectedLifeChanges: [],
    },

    timeAssumption: {
      scenarioId: "ridgeline-next",
      source: "NEXT",
      availableHoursWeek: { value: 35, confidence: "EXACT" },
      businessHoursWeek: { value: 15, confidence: "EXACT" }, // fewer hours than NOW's 20 — "work fewer hours" is the primary improvement
      otherTimeClaims: [],
      lifePriorityReservations: ["More evenings with family"],
    },

    streams: [
      {
        scenarioId: "ridgeline-next",
        streamId: "roast-subscription",
        priceOrAvgValue: { value: "10.00", confidence: "EXACT" },
        volume: null,
        mixWeight: "1",
        cogs: { method: "PER_UNIT", perUnit: { value: "4.00", confidence: "EXACT" } },
        cogsPerUnit: "4.00",
        otherVariableCosts: [],
        otherVariableCostPerUnit: "0.00",
        grossProfitPerUnit: "6.00",
        grossMargin: "0.6",
        contributionPerUnit: "6.00",
        contributionMargin: "0.6",
      },
    ],

    operatingCosts: [
      { id: "software", scenarioId: "ridgeline-next", category: "software", amount: "500.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
      { id: "rent", scenarioId: "ridgeline-next", category: "rent", amount: "300.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
      { id: "marketing", scenarioId: "ridgeline-next", category: "marketing", amount: "200.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "STRONG_ESTIMATE", isPartialList: false }, // growth cost: demand generation for the higher volume this model needs
    ],

    ownerInputs: [
      { scenarioId: "ridgeline-next", ownerId: "owner-1", hoursWeek: { value: 15, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN" },
      { scenarioId: "ridgeline-next", ownerId: "owner-2", hoursWeek: { value: 10, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN" },
    ],

    distributionPolicy: { scenarioId: "ridgeline-next", rule: "SAME_AS_OWNERSHIP" },
    ownerEconomics: [
      {
        scenarioId: "ridgeline-next",
        ownerId: "owner-1",
        ownershipPercent: "0.6",
        distributionPercent: null,
        isPrimaryRespondent: true,
        targetLaborCompensation: { value: "2000.00", confidence: "STRONG_ESTIMATE" }, // "pay myself consistently" — the primary improvement
      },
      {
        scenarioId: "ridgeline-next",
        ownerId: "owner-2",
        ownershipPercent: "0.4",
        distributionPercent: null,
        isPrimaryRespondent: false,
      },
    ],

    delegationItems: [
      {
        id: "bookkeeping",
        scenarioId: "ridgeline-next",
        functionLabel: "Bookkeeping",
        delegationType: "CONTRACTOR",
        replacementCost: { value: "300.00", confidence: "STRONG_ESTIMATE" },
        cadence: "MONTHLY",
      },
    ],
    capitalItems: [
      { id: "reserve", scenarioId: "ridgeline-next", category: "RESERVE", amount: "200.00", nature: "RECURRING", cadence: "MONTHLY", confidence: "EXACT" },
      { id: "equipment", scenarioId: "ridgeline-next", category: "EQUIPMENT", amount: "600.00", nature: "ONE_TIME", cadence: "ONE_TIME", confidence: "STRONG_ESTIMATE" },
    ],
    capacity: { scenarioId: "ridgeline-next", demandState: "PROBABLE", constraints: [] },
  };
}
