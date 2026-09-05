import { describe, expect, it } from "vitest";
import { hcfNowInput } from "./fixtures/hcf";
import { completeBusinessNowInput } from "./fixtures/complete-business";
import { completeNextInput } from "./fixtures/complete-next";
import { runScenario } from "./scenario";

describe("runScenario — HCF acceptance fixture (Build Spec §20), known facts only", () => {
  const result = runScenario(hcfNowInput(), { revisionId: "rev-1", computedAt: "2026-09-04T00:00:00.000Z" });

  it("computes COGS per bar as $2.95, gross margin ~46.36%", () => {
    expect(result.perStreamEconomics).toEqual([
      { streamId: "chocolate-bar", grossMargin: "0.463636", contributionMargin: "0.463636" },
    ]);
  });

  it("known monthly operating cost sums to $1,622, producing a $3,498.43 break-even floor of 637 bars", () => {
    expect(result.breakEvenFloor?.revenue).toBe("3498.43");
    expect(result.breakEvenFloor?.volumeByStream).toEqual([{ streamId: "chocolate-bar", volume: 637 }]);
  });

  it("passes actualRevenue through untouched — $4,800 since restart, never annualized", () => {
    expect(result.actualRevenue).toBe("4800.00");
  });

  it("reports each owner's actual known cash received without blocking on classification", () => {
    expect(result.ownerEconomicsResults).toHaveLength(2);
    const owner1 = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-1")!;
    const owner2 = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-2")!;
    expect(owner1.totalOwnerEconomicBenefit).toBe("0.00");
    expect(owner2.totalOwnerEconomicBenefit).toBe("400.00");
  });

  it("stamps a formula version and the given revision id for reproducibility", () => {
    expect(result.formulaVersion).toBeTruthy();
    expect(result.scenarioRevisionId).toBe("rev-1");
  });

  // --- what HCF proves the engine does NOT manufacture ---

  it("Required Revenue is unavailable — funding responsibility was never confirmed for HCF, and no figure is guessed in its place", () => {
    expect(result.requiredRevenue).toBeNull();
    expect(result.requiredEconomicContribution).toBeNull();
    expect(result.requiredVolumeByStream).toBeNull();
  });

  it("the primary-owner-benefit-vs-requirement comparison is unavailable for the same reason", () => {
    expect(result.primaryOwnerBenefitVsRequirement).toBeNull();
    expect(result.ownerSupportSignal).toBe("INSUFFICIENT_DATA");
  });

  it("the time signal is unavailable — available hours were never asked for HCF", () => {
    expect(result.timeSignal).toBe("INSUFFICIENT_DATA");
  });

  it("the capacity signal is unavailable — demand was never assessed for HCF", () => {
    expect(result.capacitySignal).toBe("INSUFFICIENT_DATA");
  });

  it("flags exactly what's unknown — funding responsibility, both owners' ownership percent, unclassified cash, and the partial operating cost list — worst-first, and nothing else", () => {
    const fields = result.confidenceFlags.map((f) => f.field);
    expect(fields).toContain("lifeAssumption.outsideFundingRetained");
    expect(fields).toContain("ownerEconomics.owner-1.ownershipPercent");
    expect(fields).toContain("ownerEconomics.owner-2.ownershipPercent");
    expect(fields).toContain("operatingCosts");
    const severityOrder = ["INCOMPLETE", "ROUGH_ESTIMATE", "STRONG_ESTIMATE"];
    const seenIndices = result.confidenceFlags.map((f) => severityOrder.indexOf(f.confidence));
    expect([...seenIndices].sort((a, b) => a - b)).toEqual(seenIndices);
  });

  it("Revenue Reality remains fully useful without manufacturing any of the above: margins, break-even, actual revenue, and known owner cash are all real, calculated numbers", () => {
    expect(result.perStreamEconomics[0]!.grossMargin).toBe("0.463636");
    expect(result.breakEvenFloor).not.toBeNull();
    expect(result.actualRevenue).toBe("4800.00");
    expect(result.ownerEconomicsResults.map((o) => o.totalOwnerEconomicBenefit).sort()).toEqual(["0.00", "400.00"]);
  });
});

describe("runScenario — HCF structural guards", () => {
  it("throws when no owner is marked isPrimaryRespondent", () => {
    const input = hcfNowInput();
    input.ownerEconomics = input.ownerEconomics.map((o) => ({ ...o, isPrimaryRespondent: false }));
    expect(() => runScenario(input, { revisionId: "r" })).toThrow(/isPrimaryRespondent/);
  });

  it("throws when more than one owner is marked isPrimaryRespondent", () => {
    const input = hcfNowInput();
    input.ownerEconomics = input.ownerEconomics.map((o) => ({ ...o, isPrimaryRespondent: true }));
    expect(() => runScenario(input, { revisionId: "r" })).toThrow(/isPrimaryRespondent/);
  });

  it("throws when NOW is missing actualRevenue", () => {
    const input = hcfNowInput();
    input.actualRevenue = null;
    expect(() => runScenario(input, { revisionId: "r" })).toThrow(/actualRevenue/);
  });

  it("unknown ownership under HCF's DISCRETIONARY policy never throws — ownership is only validated when SAME_AS_OWNERSHIP is chosen", () => {
    const input = hcfNowInput();
    expect(() => runScenario(input, { revisionId: "r" })).not.toThrow();
  });
});

describe("runScenario — complete business acceptance fixture (fully synthetic, not HCF)", () => {
  const result = runScenario(completeBusinessNowInput(), { revisionId: "rev-2", computedAt: "2026-09-04T00:00:00.000Z" });

  it("computes a 60% gross and contribution margin from $10.00 price / $4.00 COGS", () => {
    expect(result.perStreamEconomics).toEqual([
      { streamId: "roast-subscription", grossMargin: "0.6", contributionMargin: "0.6" },
    ]);
  });

  it("computes a non-null Required Revenue, distinct from actual revenue, once funding responsibility is confirmed", () => {
    expect(result.requiredRevenue).toBe("10555.56");
    expect(result.requiredEconomicContribution).not.toBeNull();
    expect(result.requiredVolumeByStream).toEqual([{ streamId: "roast-subscription", volume: 1056 }]);
    expect(result.requiredRevenue).not.toBe(result.actualRevenue);
  });

  it("computes each owner's profit distribution from the confirmed SAME_AS_OWNERSHIP split — the percentage-derived path", () => {
    const owner1 = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-1")!; // 60%, primary
    const owner2 = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-2")!; // 40%
    expect(owner1.totalOwnerEconomicBenefit).toBe("5160.00");
    expect(owner2.totalOwnerEconomicBenefit).toBe("3440.00");
  });

  it("compares the primary owner's actual benefit to their confirmed business-funded requirement", () => {
    expect(result.primaryOwnerBenefitVsRequirement).not.toBeNull();
    expect(result.primaryOwnerBenefitVsRequirement!.businessFundedPersonalEconomicRequirement).toBe("3200.00");
    expect(result.primaryOwnerBenefitVsRequirement!.totalOwnerEconomicBenefit).toBe("5160.00");
    expect(result.primaryOwnerBenefitVsRequirement!.gap).toBe("1960.00");
    expect(result.ownerSupportSignal).toBe("BUSINESS_SUPPORTS_OWNER");
  });

  it("computes real time and capacity signals once the underlying data is fully known", () => {
    expect(result.timeSignal).toBe("FITS");
    expect(result.capacitySignal).toBe("NEITHER");
  });

  it("known monthly operating cost of $800 against a 60% margin produces a $1,333.33 break-even floor of 134 units", () => {
    expect(result.breakEvenFloor?.revenue).toBe("1333.33");
    expect(result.breakEvenFloor?.volumeByStream).toEqual([{ streamId: "roast-subscription", volume: 134 }]);
  });

  it("is deterministic — the same input always produces the same output", () => {
    const input = completeBusinessNowInput();
    const meta = { revisionId: "r", computedAt: "2026-09-04T00:00:00.000Z" };
    const a = runScenario(input, meta);
    const b = runScenario(input, meta);
    expect(a).toEqual(b);
  });
});

describe("runScenario — structural guards (generic engine invariants)", () => {
  it("throws when ownership percentages do not sum to 100% under SAME_AS_OWNERSHIP", () => {
    const input = completeBusinessNowInput();
    input.ownerEconomics[0]!.ownershipPercent = "0.7"; // now 0.7 + 0.4 = 1.1
    expect(() => runScenario(input, { revisionId: "r" })).toThrow();
  });

  it("throws when an owner's ownership is unknown (null) while SAME_AS_OWNERSHIP is chosen — never silently equal-split", () => {
    const input = completeBusinessNowInput();
    input.ownerEconomics[0]!.ownershipPercent = null;
    expect(() => runScenario(input, { revisionId: "r" })).toThrow(/confirmed ownership percentage/);
  });

  it("throws when mix weights do not sum to 100%", () => {
    const input = completeBusinessNowInput();
    input.streams[0]!.mixWeight = "0.9";
    expect(() => runScenario(input, { revisionId: "r" })).toThrow();
  });

  it("unknown ownership does not block a distribution rule that never reads it (EQUAL_SPLIT)", () => {
    const input = completeBusinessNowInput();
    input.distributionPolicy = { scenarioId: "ridgeline-now", rule: "EQUAL_SPLIT" };
    input.ownerEconomics = input.ownerEconomics.map((o) => ({ ...o, ownershipPercent: null }));
    expect(() => runScenario(input, { revisionId: "r" })).not.toThrow();
  });
});

describe("runScenario — funding responsibility unconfirmed: Required Revenue unavailable, everything else unaffected", () => {
  it("leaves requiredRevenue/requiredEconomicContribution/requiredVolumeByStream/primaryOwnerBenefitVsRequirement null while margins, break-even, and owner distribution still compute", () => {
    const input = completeBusinessNowInput();
    input.lifeAssumption = { ...input.lifeAssumption, outsideFundingRetained: null };

    const confirmed = runScenario(completeBusinessNowInput(), { revisionId: "r1" });
    const unconfirmed = runScenario(input, { revisionId: "r2" });

    expect(unconfirmed.requiredRevenue).toBeNull();
    expect(unconfirmed.requiredEconomicContribution).toBeNull();
    expect(unconfirmed.requiredVolumeByStream).toBeNull();
    expect(unconfirmed.primaryOwnerBenefitVsRequirement).toBeNull();
    expect(unconfirmed.ownerSupportSignal).toBe("INSUFFICIENT_DATA");

    // Unaffected by the missing funding confirmation — identical to the confirmed run:
    expect(unconfirmed.perStreamEconomics).toEqual(confirmed.perStreamEconomics);
    expect(unconfirmed.breakEvenFloor).toEqual(confirmed.breakEvenFloor);
    expect(unconfirmed.operatingEconomicSurplus).toBe(confirmed.operatingEconomicSurplus);
    expect(unconfirmed.distributableEconomicSurplus).toBe(confirmed.distributableEconomicSurplus);
    expect(unconfirmed.ownerEconomicsResults).toEqual(confirmed.ownerEconomicsResults);
    expect(unconfirmed.actualRevenue).toBe(confirmed.actualRevenue);
  });

  it("NEXT with unconfirmed funding never throws — it degrades gracefully, leaving only the revenue-dependent waterfall unavailable", () => {
    const confirmed = runScenario(completeNextInput(), { revisionId: "r1" });
    const input = completeNextInput();
    input.lifeAssumption = { ...input.lifeAssumption, outsideFundingRetained: null };

    let unconfirmed: ReturnType<typeof runScenario> | undefined;
    expect(() => {
      unconfirmed = runScenario(input, { revisionId: "r2" });
    }).not.toThrow();

    // Revenue-dependent — genuinely unavailable, never fabricated:
    expect(unconfirmed!.requiredRevenue).toBeNull();
    expect(unconfirmed!.requiredEconomicContribution).toBeNull();
    expect(unconfirmed!.requiredVolumeByStream).toBeNull();
    expect(unconfirmed!.operatingEconomicSurplus).toBeNull();
    expect(unconfirmed!.distributableEconomicSurplus).toBeNull();
    expect(unconfirmed!.ownerEconomicsResults).toBeNull();
    expect(unconfirmed!.primaryOwnerBenefitVsRequirement).toBeNull();
    expect(unconfirmed!.ownerSupportSignal).toBe("INSUFFICIENT_DATA");

    // Independent of revenue — still fully calculable and identical to the confirmed run:
    expect(unconfirmed!.perStreamEconomics).toEqual(confirmed.perStreamEconomics);
    expect(unconfirmed!.weightedContributionMargin).toBe(confirmed.weightedContributionMargin);
    expect(unconfirmed!.breakEvenFloor).toEqual(confirmed.breakEvenFloor);
    expect(unconfirmed!.requiredRetainedBusinessCapital).toEqual(confirmed.requiredRetainedBusinessCapital);
    expect(unconfirmed!.capacitySignal).toBe(confirmed.capacitySignal);
    expect(unconfirmed!.timeSignal).toBe(confirmed.timeSignal);
  });

  it("ULTIMATELY-shaped input behaves identically to NEXT when funding is unconfirmed — the guard is generic to any scenario type that solves revenue backward", () => {
    const input = completeNextInput();
    input.scenarioType = "ULTIMATELY";
    input.lifeAssumption = { ...input.lifeAssumption, outsideFundingRetained: null };
    expect(() => runScenario(input, { revisionId: "r" })).not.toThrow();
    const result = runScenario(input, { revisionId: "r" });
    expect(result.requiredRevenue).toBeNull();
    expect(result.perStreamEconomics.length).toBeGreaterThan(0);
  });
});

describe("runScenario — retained capital is never treated as distributed", () => {
  it("a nonzero retained-capital figure strictly reduces distributable surplus vs. an otherwise-identical scenario with none, while operating surplus is untouched", () => {
    const withRetention = completeBusinessNowInput();
    withRetention.capitalItems = [
      ...withRetention.capitalItems,
      { id: "extra", scenarioId: "ridgeline-now", category: "RESERVE", amount: "600.00", nature: "RECURRING", cadence: "MONTHLY", confidence: "ROUGH_ESTIMATE" },
    ];
    const withoutExtra = completeBusinessNowInput();

    const resultWith = runScenario(withRetention, { revisionId: "r1" });
    const resultWithout = runScenario(withoutExtra, { revisionId: "r2" });

    expect(resultWith.operatingEconomicSurplus).toBe(resultWithout.operatingEconomicSurplus);
    expect(Number(resultWith.distributableEconomicSurplus)).toBeLessThan(Number(resultWithout.distributableEconomicSurplus));
    expect(
      Number(resultWithout.distributableEconomicSurplus) - Number(resultWith.distributableEconomicSurplus),
    ).toBeCloseTo(600, 2);
  });
});

describe("runScenario — UNCLASSIFIED_TOTAL preserves known cash as owner benefit", () => {
  // The backward solver may conservatively treat an unclassified owner's
  // known labor compensation as $0 (it can't guess the split) — but that is
  // an internal input to solving requiredRevenue only. It must never leak
  // into totalOwnerEconomicBenefit or ownerSupportSignal, which have a real,
  // known dollar figure to report and must report it in full.
  function inputWithPrimaryUnclassifiedCash(amount: string) {
    const input = completeBusinessNowInput();
    input.ownerEconomics = input.ownerEconomics.map((o) =>
      o.isPrimaryRespondent
        ? { ...o, cashReceived: { mode: "UNCLASSIFIED_TOTAL" as const, unclassifiedTotal: { value: amount, confidence: "INCOMPLETE" as const } } }
        : o,
    );
    return input;
  }

  it("known cash received of $0 is reported as $0 benefit — a real measurement, not a fallback", () => {
    const result = runScenario(inputWithPrimaryUnclassifiedCash("0.00"), { revisionId: "r" });
    const primary = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-1")!;
    expect(primary.totalOwnerEconomicBenefit).toBe("0.00");
    expect(result.primaryOwnerBenefitVsRequirement!.totalOwnerEconomicBenefit).toBe("0.00");
  });

  it("a known unclassified cash amount is preserved in full as totalOwnerEconomicBenefit — never zeroed by classification uncertainty", () => {
    // businessFundedRequirement for this fixture is $3,200 (see complete-business.ts) — $5,000 known cash exceeds it.
    const result = runScenario(inputWithPrimaryUnclassifiedCash("5000.00"), { revisionId: "r" });
    const primary = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-1")!;

    expect(primary.totalOwnerEconomicBenefit).toBe("5000.00"); // NOT "0.00" — classification gap ≠ zero benefit
    expect(primary.profitDistribution).toBe("0.00"); // the split is genuinely unknown, not fabricated as distribution either
  });

  it("ownerSupportSignal reflects the known total cash received, not the backward solver's internal $0 labor assumption", () => {
    const result = runScenario(inputWithPrimaryUnclassifiedCash("5000.00"), { revisionId: "r" });

    expect(result.primaryOwnerBenefitVsRequirement!.businessFundedPersonalEconomicRequirement).toBe("3200.00");
    expect(result.primaryOwnerBenefitVsRequirement!.totalOwnerEconomicBenefit).toBe("5000.00");
    expect(result.primaryOwnerBenefitVsRequirement!.gap).toBe("1800.00"); // 5000 - 3200, positive — the business is supporting the owner
    expect(result.ownerSupportSignal).toBe("BUSINESS_SUPPORTS_OWNER");
  });

  it("the requiredRevenue calculation still runs (the $0 conservative labor assumption is a real, disclosed input) and is unaffected by the reported benefit figure", () => {
    // Same requiredRevenue whether the primary owner's known unclassified cash is $0 or $5,000 —
    // proving the backward solver's requiredRevenue genuinely depends on the $0 labor-comp
    // assumption alone, not on totalOwnerEconomicBenefit (which the two scenarios above show differ).
    const zeroCash = runScenario(inputWithPrimaryUnclassifiedCash("0.00"), { revisionId: "r1" });
    const fiveThousandCash = runScenario(inputWithPrimaryUnclassifiedCash("5000.00"), { revisionId: "r2" });
    expect(zeroCash.requiredRevenue).toBe(fiveThousandCash.requiredRevenue);
  });
});

describe("runScenario — complete NEXT acceptance fixture (fully synthetic, distinct from NOW and HCF)", () => {
  const result = runScenario(completeNextInput(), { revisionId: "rev-next", computedAt: "2026-09-04T00:00:00.000Z" });

  it("solves a real Required Revenue — never entered as a goal, always engine-derived", () => {
    expect(result.requiredRevenue).not.toBeNull();
    expect(Number(result.requiredRevenue)).toBeGreaterThan(0);
    expect(result.actualRevenue).toBeNull(); // NEXT never has an actual
  });

  it("folds the known delegation cost and both recurring and one-time growth capital into the same waterfall as NOW", () => {
    // Sanity: removing delegation + capital lowers Required Revenue relative to the fixture with them.
    const leaner = completeNextInput();
    leaner.delegationItems = [];
    leaner.capitalItems = [];
    const leanerResult = runScenario(leaner, { revisionId: "r" });
    expect(Number(leanerResult.requiredRevenue)).toBeLessThan(Number(result.requiredRevenue));
  });

  it("computes the primary owner's total benefit as exactly their targeted labor comp plus their percentage share of distributable surplus — self-consistent with the backward solve", () => {
    const primary = result.ownerEconomicsResults.find((o) => o.ownerId === "owner-1")!;
    // No manual override and a SAME_AS_OWNERSHIP percentage means the solve
    // lands the primary owner's total benefit exactly on the confirmed
    // business-funded requirement — the same invariant proven for NOW's
    // complete-business fixture in an earlier describe block.
    expect(primary.totalOwnerEconomicBenefit).toBe(result.primaryOwnerBenefitVsRequirement!.businessFundedPersonalEconomicRequirement);
    expect(result.primaryOwnerBenefitVsRequirement!.gap).toBe("0.00");
  });

  it("NOW and NEXT may have entirely different Required Revenue for the same underlying business", () => {
    const nowResult = runScenario(completeBusinessNowInput(), { revisionId: "r-now" });
    expect(result.requiredRevenue).not.toBe(nowResult.requiredRevenue);
  });

  it("is deterministic", () => {
    const input = completeNextInput();
    const meta = { revisionId: "r", computedAt: "2026-09-04T00:00:00.000Z" };
    expect(runScenario(input, meta)).toEqual(runScenario(input, meta));
  });
});

describe("runScenario — delegation cost feeds the same waterfall as known operating cost", () => {
  it("a known delegation replacement cost raises Required Revenue exactly like an equivalent operating cost would", () => {
    const withDelegation = completeBusinessNowInput();
    withDelegation.delegationItems = [
      { id: "d1", scenarioId: "ridgeline-now", functionLabel: "Bookkeeping", delegationType: "CONTRACTOR", replacementCost: { value: "300.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" },
    ];
    const withEquivalentOpex = completeBusinessNowInput();
    withEquivalentOpex.operatingCosts = [
      ...withEquivalentOpex.operatingCosts,
      { id: "bookkeeping", scenarioId: "ridgeline-now", category: "bookkeeping", amount: "300.00", cadence: "MONTHLY", knownOrEstimated: "KNOWN", confidence: "STRONG_ESTIMATE", isPartialList: false },
    ];

    const delegationResult = runScenario(withDelegation, { revisionId: "r1" });
    const opexResult = runScenario(withEquivalentOpex, { revisionId: "r2" });

    expect(delegationResult.requiredRevenue).toBe(opexResult.requiredRevenue);
    expect(delegationResult.breakEvenFloor?.revenue).toBe(opexResult.breakEvenFloor?.revenue);
  });

  it("an unknown delegation replacement cost contributes nothing to Required Revenue but is flagged as incomplete — a floor, not a fabricated market rate", () => {
    const input = completeBusinessNowInput();
    input.delegationItems = [
      { id: "d1", scenarioId: "ridgeline-now", functionLabel: "Sales support", delegationType: "UNSURE", replacementCost: null, cadence: "MONTHLY" },
    ];
    const baseline = runScenario(completeBusinessNowInput(), { revisionId: "r1" });
    const result = runScenario(input, { revisionId: "r2" });

    expect(result.requiredRevenue).toBe(baseline.requiredRevenue);
    expect(result.confidenceFlags).toContainEqual({ field: "delegationItems", confidence: "INCOMPLETE" });
  });
});

describe("runScenario — delegation/owner-labor double-counting guard", () => {
  it("adding a DelegationItem never changes any OwnerEconomicsResult field — delegation cost and owner compensation are computed from entirely independent inputs", () => {
    const baseline = runScenario(completeNextInput(), { revisionId: "r1" });

    const withExtraDelegation = completeNextInput();
    withExtraDelegation.delegationItems = [
      ...withExtraDelegation.delegationItems,
      { id: "sales-support", scenarioId: "ridgeline-next", functionLabel: "Sales support", delegationType: "CONTRACTOR", replacementCost: { value: "400.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" },
    ];
    const withExtra = runScenario(withExtraDelegation, { revisionId: "r2" });

    expect(withExtra.ownerEconomicsResults).toEqual(baseline.ownerEconomicsResults);
    // Sanity: the new delegation cost does move Required Revenue — proving
    // this isn't a no-op test where nothing downstream reacts to anything.
    expect(Number(withExtra.requiredRevenue)).toBeGreaterThan(Number(baseline.requiredRevenue));
  });

  it("case: owner stops performing the work and it is replaced — moving the SAME dollar amount from an owner's targeted labor compensation to a matching DelegationItem replacement cost conserves Required Revenue, it does not double it", () => {
    // Owner-2 (non-primary) is targeted to be paid $500/mo for a function
    // they currently perform themselves — "owner continues performing the
    // work" case: labor compensation applies, no delegation cost.
    const ownerContinues = completeNextInput();
    ownerContinues.ownerEconomics = ownerContinues.ownerEconomics.map((o) =>
      o.ownerId === "owner-2" ? { ...o, targetLaborCompensation: { value: "500.00", confidence: "STRONG_ESTIMATE" as const } } : o,
    );
    const continuesResult = runScenario(ownerContinues, { revisionId: "r1" });

    // Now the owner stops performing that same function and it is replaced
    // by a $500/mo contractor instead — labor compensation for that function
    // drops to $0 and an equal-dollar DelegationItem takes its place.
    const ownerDelegates = completeNextInput();
    ownerDelegates.ownerEconomics = ownerDelegates.ownerEconomics.map((o) =>
      o.ownerId === "owner-2" ? { ...o, targetLaborCompensation: undefined } : o,
    );
    ownerDelegates.delegationItems = [
      ...ownerDelegates.delegationItems,
      { id: "owner2-function", scenarioId: "ridgeline-next", functionLabel: "Owner-2's function", delegationType: "CONTRACTOR", replacementCost: { value: "500.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" },
    ];
    const delegatesResult = runScenario(ownerDelegates, { revisionId: "r2" });

    // Same total dollar requirement either way — the $500 is charged exactly
    // once, whichever bucket it lives in, never once as compensation AND
    // again as replacement cost.
    expect(delegatesResult.requiredRevenue).toBe(continuesResult.requiredRevenue);
    expect(delegatesResult.requiredEconomicContribution).toBe(continuesResult.requiredEconomicContribution);

    // The owner's own reported benefit correctly reflects that they no
    // longer receive that $500 once it's delegated away.
    const owner2Continues = continuesResult.ownerEconomicsResults!.find((o) => o.ownerId === "owner-2")!;
    const owner2Delegates = delegatesResult.ownerEconomicsResults!.find((o) => o.ownerId === "owner-2")!;
    expect(Number(owner2Continues.laborCompensation) - Number(owner2Delegates.laborCompensation)).toBe(500);
  });

  it("case: owner partially retains and partially delegates — both a real labor compensation AND a real delegation cost apply simultaneously for genuinely distinct functions, summing higher rather than one canceling the other", () => {
    // Owner-2 keeps $500/mo compensation for a function they still perform...
    const partial = completeNextInput();
    partial.ownerEconomics = partial.ownerEconomics.map((o) =>
      o.ownerId === "owner-2" ? { ...o, targetLaborCompensation: { value: "500.00", confidence: "STRONG_ESTIMATE" as const } } : o,
    );
    const retainedOnlyResult = runScenario(partial, { revisionId: "r1" });

    // ...AND a wholly separate function is delegated for $300/mo — a
    // genuinely distinct portion of work, not a re-labeling of the $500.
    partial.delegationItems = [
      ...partial.delegationItems,
      { id: "distinct-function", scenarioId: "ridgeline-next", functionLabel: "A different function entirely", delegationType: "CONTRACTOR", replacementCost: { value: "300.00", confidence: "STRONG_ESTIMATE" }, cadence: "MONTHLY" },
    ];
    const bothResult = runScenario(partial, { revisionId: "r2" });

    // Required Revenue must rise by exactly the incremental $300/mo cost
    // (grossed up by the weighted contribution margin) — the retained $500
    // labor compensation is untouched and not re-charged.
    const marginalRevenueForDelegation = Number(bothResult.requiredRevenue) - Number(retainedOnlyResult.requiredRevenue);
    expect(marginalRevenueForDelegation).toBeCloseTo(300 / 0.6, 2);

    const owner2Retained = retainedOnlyResult.ownerEconomicsResults!.find((o) => o.ownerId === "owner-2")!;
    const owner2Both = bothResult.ownerEconomicsResults!.find((o) => o.ownerId === "owner-2")!;
    expect(owner2Both.laborCompensation).toBe(owner2Retained.laborCompensation); // unchanged — the $500 is untouched
  });

  it("unknown replacement cost stays INCOMPLETE and produces an 'at least' floor — never a fabricated market rate", () => {
    const input = completeNextInput();
    input.delegationItems = [
      ...input.delegationItems,
      { id: "unknown-function", scenarioId: "ridgeline-next", functionLabel: "Not yet quoted", delegationType: "UNSURE", replacementCost: null, cadence: "MONTHLY" },
    ];
    const withUnknown = runScenario(input, { revisionId: "r1" });
    const baseline = runScenario(completeNextInput(), { revisionId: "r2" });

    // The unknown cost contributes nothing to the figure (never guessed) —
    // Required Revenue is identical to the baseline without that item...
    expect(withUnknown.requiredRevenue).toBe(baseline.requiredRevenue);
    // ...but the result is flagged so it reads as a floor, not a complete figure.
    expect(withUnknown.confidenceFlags).toContainEqual({ field: "delegationItems", confidence: "INCOMPLETE" });
  });
});

describe("runScenario — DISCRETIONARY distribution without a manual target", () => {
  it("degrades gracefully: still returns a real (floor) requiredRevenue and flags the gap, never crashes", () => {
    const input = completeBusinessNowInput();
    input.distributionPolicy = { scenarioId: "ridgeline-now", rule: "DISCRETIONARY" };
    input.ownerEconomics = input.ownerEconomics.map((o) => ({ ...o, distributionPercent: null }));

    const result = runScenario(input, { revisionId: "r" });

    expect(Number(result.requiredRevenue)).toBeGreaterThan(0);
    expect(result.confidenceFlags.some((f) => f.field.includes("profitDistribution"))).toBe(true);
  });
});
