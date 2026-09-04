import type { ScenarioEngineInput } from "@revenue-reality/domain";

/**
 * Harlem Chocolate Factory — the first real-world acceptance test (Build
 * Spec §20). These are test fixtures, not hardcoded product assumptions.
 *
 * The business economics below (price, COGS components, operating costs,
 * revenue since restart) are the OFFICIAL fixture values from §20 and drive
 * the assertions in scenario.test.ts. The personal Life Reality figures
 * (lifeRequirement/securityRequirement/outsideFundingRetained) and the time/
 * capacity/ownership scaffolding are NOT part of the official HCF fixture —
 * Method v1.4/Build Spec v1.1 predate the Ownership Economics amendment and
 * never specified a personal life reality for HCF's owners. They're
 * constructed here, clearly, only so the full engine (which now always
 * requires a life assumption and owner economics) can run end-to-end.
 */
export function hcfNowInput(): ScenarioEngineInput {
  return {
    scenarioType: "NOW",
    restructureDate: "2026-08-01",
    actualRevenue: "4800.00", // cash collected since restart — must NOT be annualized

    // --- illustrative only, not part of the official HCF fixture ---
    lifeAssumption: {
      scenarioId: "hcf-now",
      source: "CURRENT",
      lifeRequirement: "3000.00",
      securityRequirement: "200.00",
      outsideFundingRetained: { mode: "AMOUNT", amount: "0.00", confidence: "INCOMPLETE" },
      selectedLifeChanges: [],
    },
    timeAssumption: {
      scenarioId: "hcf-now",
      source: "CURRENT",
      // "Current owner hours combined ~10 hours/week" — an official fixture value
      availableHoursWeek: { value: 20, confidence: "ROUGH_ESTIMATE" },
      businessHoursWeek: { value: 10, confidence: "STRONG_ESTIMATE" },
      otherTimeClaims: [],
      lifePriorityReservations: [],
    },
    // --- end illustrative section ---

    streams: [
      {
        scenarioId: "hcf-now",
        streamId: "chocolate-bar",
        priceOrAvgValue: { value: "5.50", confidence: "EXACT" },
        volume: null,
        mixWeight: "1",
        cogs: {
          method: "COMPONENT_BUILDUP",
          components: [
            { label: "co-packer", amount: "2.50" },
            { label: "plastic bag", amount: "0.25" },
            { label: "sticker", amount: "0.20" },
          ],
        },
        cogsPerUnit: "2.95",
        otherVariableCosts: [],
        otherVariableCostPerUnit: "0.00",
        grossProfitPerUnit: "2.55",
        grossMargin: "0.463636",
        contributionPerUnit: "2.55",
        contributionMargin: "0.463636",
      },
    ],

    operatingCosts: [
      { id: "software", scenarioId: "hcf-now", category: "software", amount: "583.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: true },
      { id: "insurance", scenarioId: "hcf-now", category: "insurance", amount: "106.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: true },
      { id: "storage", scenarioId: "hcf-now", category: "storage", amount: "450.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: true },
      { id: "phones", scenarioId: "hcf-now", category: "phones", amount: "483.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "EXACT", isPartialList: true },
    ],

    ownerInputs: [
      { scenarioId: "hcf-now", ownerId: "owner-1", hoursWeek: { value: 5, confidence: "ROUGH_ESTIMATE" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "NOT_SURE" },
      { scenarioId: "hcf-now", ownerId: "owner-2", hoursWeek: { value: 5, confidence: "ROUGH_ESTIMATE" }, personalCashInvestment: "0.00", personallyPaidCosts: "0.00", functionConfidence: "NOT_SURE" },
    ],

    // "Owner role breakdown: Unknown / restructuring" — both owners are UNCLASSIFIED_TOTAL, an official fixture condition
    distributionPolicy: { scenarioId: "hcf-now", rule: "SAME_AS_OWNERSHIP" },
    ownerEconomics: [
      {
        scenarioId: "hcf-now",
        ownerId: "owner-1",
        ownershipPercent: "0.5",
        distributionPercent: null,
        isPrimaryRespondent: true,
        cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "0.00", confidence: "INCOMPLETE" } },
      },
      {
        scenarioId: "hcf-now",
        ownerId: "owner-2",
        ownershipPercent: "0.5",
        distributionPercent: null,
        isPrimaryRespondent: false,
        cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "400.00", confidence: "INCOMPLETE" } },
      },
    ],

    delegationItems: [],
    capitalItems: [],
    capacity: { scenarioId: "hcf-now", demandState: "UNSURE", constraints: [] },
  };
}
