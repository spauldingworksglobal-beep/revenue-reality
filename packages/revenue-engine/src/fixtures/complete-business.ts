import type { ScenarioEngineInput } from "@revenue-reality/domain";

/**
 * Ridgeline Coffee Roasters — a fully synthetic acceptance fixture, entirely
 * separate from the Harlem Chocolate Factory fixture (fixtures/hcf.ts).
 * Every input here is invented but internally consistent and fully known:
 * Life Reality, funding responsibility, ownership split, distribution rule,
 * and retained capital are all confirmed. This is the fixture that proves
 * the complete forward/backward waterfall — Required Revenue, the
 * primary-owner-benefit-vs-requirement comparison, and a percentage-derived
 * owner profit distribution all populate — which HCF's known-facts-only
 * fixture deliberately cannot exercise.
 */
export function completeBusinessNowInput(): ScenarioEngineInput {
  return {
    scenarioType: "NOW",
    restructureDate: null,
    actualRevenue: "16000.00",

    lifeAssumption: {
      scenarioId: "ridgeline-now",
      source: "CURRENT",
      lifeRequirement: "2600.00",
      securityRequirement: "600.00",
      outsideFundingRetained: { mode: "AMOUNT", amount: "0.00", confidence: "EXACT" }, // business confirmed responsible for the full $3,200/mo
      selectedLifeChanges: [],
    },

    timeAssumption: {
      scenarioId: "ridgeline-now",
      source: "CURRENT",
      availableHoursWeek: { value: 40, confidence: "EXACT" },
      businessHoursWeek: { value: 20, confidence: "EXACT" },
      otherTimeClaims: [],
      lifePriorityReservations: [],
    },

    streams: [
      {
        scenarioId: "ridgeline-now",
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
      { id: "software", scenarioId: "ridgeline-now", category: "software", amount: "500.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
      { id: "rent", scenarioId: "ridgeline-now", category: "rent", amount: "300.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: false },
    ],

    ownerInputs: [
      { scenarioId: "ridgeline-now", ownerId: "owner-1", hoursWeek: { value: 20, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN" },
      { scenarioId: "ridgeline-now", ownerId: "owner-2", hoursWeek: { value: 10, confidence: "EXACT" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "KNOWN" },
    ],

    distributionPolicy: { scenarioId: "ridgeline-now", rule: "SAME_AS_OWNERSHIP" },
    ownerEconomics: [
      {
        scenarioId: "ridgeline-now",
        ownerId: "owner-1",
        ownershipPercent: "0.6",
        distributionPercent: null,
        isPrimaryRespondent: true,
        // cashReceived intentionally omitted — no measured cash on file, so the
        // engine computes this owner's profit distribution from the confirmed
        // SAME_AS_OWNERSHIP split, exercising the percentage-derived path that
        // HCF's fully-known-cash owners never touch.
      },
      {
        scenarioId: "ridgeline-now",
        ownerId: "owner-2",
        ownershipPercent: "0.4",
        distributionPercent: null,
        isPrimaryRespondent: false,
      },
    ],

    delegationItems: [],
    capitalItems: [
      { id: "reserve", scenarioId: "ridgeline-now", category: "RESERVE", amount: "200.00", nature: "RECURRING", cadence: "MONTHLY", confidence: "EXACT" },
    ],
    capacity: { scenarioId: "ridgeline-now", demandState: "COMFORTABLE", constraints: [] },
  };
}
