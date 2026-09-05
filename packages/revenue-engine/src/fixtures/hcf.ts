import type { ScenarioEngineInput } from "@revenue-reality/domain";

/**
 * Harlem Chocolate Factory — the first real-world acceptance test (Build
 * Spec §20). This fixture contains ONLY known HCF facts. Everything the
 * spec doesn't actually tell us — Jessica/Asha's personal Life Reality,
 * their ownership split, a profit-distribution rule, available hours,
 * retained-capital needs — is left genuinely unknown (null), never
 * invented to make a number come out. Required Revenue and the
 * primary-owner-benefit-vs-requirement comparison are therefore
 * unavailable for this fixture, on purpose — see scenario.test.ts for the
 * assertions proving the engine still produces everything that IS
 * calculable from known facts alone (margins, break-even, actual owner
 * cash received) without manufacturing the rest.
 *
 * A separate, fully-synthetic fixture (fixtures/complete-business.ts)
 * exists to prove the full forward/backward waterfall when every input is
 * known — that fixture is not HCF and must never be confused with it.
 */
export function hcfNowInput(): ScenarioEngineInput {
  return {
    scenarioType: "NOW",
    restructureDate: "2026-08-01",
    actualRevenue: "4800.00", // cash collected since restart — must NOT be annualized

    // Life Reality was never captured for HCF's owners. lifeRequirement/
    // securityRequirement floor at $0 (nothing entered — the same "floor,
    // not a claim" convention used throughout Milestone 2 for an empty
    // category list), and outsideFundingRetained is null because the
    // funding-responsibility question itself was never confirmed. Required
    // Revenue, the business-funded requirement, and the owner-support
    // signal are unavailable as a direct result — never defaulted.
    lifeAssumption: {
      scenarioId: "hcf-now",
      source: "CURRENT",
      lifeRequirement: "0.00",
      securityRequirement: "0.00",
      outsideFundingRetained: null,
      selectedLifeChanges: [],
    },

    // The only known HCF time fact: Jessica (the primary respondent)
    // currently gives the business ~5 hours/week — not the combined
    // 10 owner-hours. Available hours were never asked for HCF.
    timeAssumption: {
      scenarioId: "hcf-now",
      source: "CURRENT",
      availableHoursWeek: { value: 0, confidence: "INCOMPLETE" },
      businessHoursWeek: { value: 5, confidence: "ROUGH_ESTIMATE" },
      otherTimeClaims: [],
      lifePriorityReservations: [],
    },

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

    // No profit-distribution rule is known for HCF. DISCRETIONARY is the domain
    // model's own "no predetermined split" state — not an invented rule — and
    // it's structurally inert here regardless: both owners have a fully KNOWN
    // cash figure (UNCLASSIFIED_TOTAL), so the engine never needs to consult
    // the distribution rule to report what they actually received.
    distributionPolicy: { scenarioId: "hcf-now", rule: "DISCRETIONARY" },
    ownerEconomics: [
      {
        scenarioId: "hcf-now",
        ownerId: "owner-1",
        ownershipPercent: null, // never confirmed for HCF — not assumed as an equal split
        distributionPercent: null,
        isPrimaryRespondent: true,
        cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "0.00", confidence: "EXACT" } },
      },
      {
        scenarioId: "hcf-now",
        ownerId: "owner-2",
        ownershipPercent: null,
        distributionPercent: null,
        isPrimaryRespondent: false,
        cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "400.00", confidence: "EXACT" } },
      },
    ],

    delegationItems: [],
    capitalItems: [], // no retained-capital requirement known for HCF
    capacity: { scenarioId: "hcf-now", demandState: "UNSURE", constraints: [] },
  };
}
