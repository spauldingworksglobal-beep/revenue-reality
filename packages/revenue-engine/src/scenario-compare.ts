import type {
  ActualRevenuePeriod,
  ConfidenceValue,
  ID,
  Money,
  ScenarioEngineInput,
  ScenarioResult,
  ScenarioType,
} from "@revenue-reality/domain";
import { sumKnownDelegationCost } from "./delegation";
import { subtract, parseMoney, parsePercent, formatMoney } from "./money";
import { sumKnownOperatingCost } from "./operating-cost";
import type { OwnershipRoleFitResult } from "./ownership-role-fit";

/**
 * COMPARE reads already-resolved scenario snapshots/results — it never
 * recomputes the methodology. A snapshot is exactly what each result page
 * already builds (buildXScenarioInput's READY variant + runScenario/
 * withXResultCaveats), plus the one store-only flag (opexListIsPartial) that
 * doesn't live on ScenarioEngineInput, plus ULTIMATELY's already-computed
 * ownership-role diagnostic (undefined for NOW/NEXT — no such test exists
 * for them in this build).
 */
export interface ScenarioCompareSnapshot {
  scenarioType: ScenarioType;
  input: ScenarioEngineInput;
  result: ScenarioResult;
  unknownOwnershipOwnerIds: ID[];
  mixWeightFallbackApplied: boolean;
  excludedStreamIds: ID[];
  opexListIsPartial: boolean;
  /** ULTIMATELY only. */
  roleFit?: OwnershipRoleFitResult;
}

export interface CompareLabels {
  streamLabelById: Record<ID, string>;
  ownerLabelById: Record<ID, string>;
}

/**
 * "Required Revenue: at least $X" (Build Spec Milestone 6 §8) — true when one
 * or more delegation/replacement costs aren't known yet, making the solved
 * figure a floor rather than a complete number. Centralizes the exact rule
 * already used ad hoc on now/next/ultimately result pages so COMPARE never
 * drifts from it.
 */
export function requiredRevenueIsFloor(result: ScenarioResult): boolean {
  return result.confidenceFlags.some((f) => f.field === "delegationItems" && f.confidence === "INCOMPLETE");
}

/**
 * NOW's Actual Revenue describes a real, specific period (a typical month, a
 * year, since restart, or a custom range — see ActualRevenuePeriod). Required
 * Revenue is always a normalized monthly planning figure. The two are only
 * safely comparable as a percentage when Actual Revenue's own period IS a
 * month — never annualized, never prorated. Mirrors now/result.tsx's
 * canCompareRevenueAlignment exactly.
 */
export function canCompareRevenueAlignment(revenuePeriod: ActualRevenuePeriod, requiredRevenue: Money | null): boolean {
  return revenuePeriod.periodType === "MONTH" && requiredRevenue !== null;
}

export interface RequiredRevenueDisplay {
  status: "KNOWN" | "UNKNOWN";
  text: string;
}

/** Floor-preserving display text for Required Revenue — never collapses "At least $X" to a bare number. */
export function displayRequiredRevenue(result: ScenarioResult): RequiredRevenueDisplay {
  if (result.requiredRevenue === null) return { status: "UNKNOWN", text: "Not yet known" };
  const text = requiredRevenueIsFloor(result)
    ? `At least $${result.requiredRevenue} — one or more replacement labor costs aren't known yet`
    : `$${result.requiredRevenue}`;
  return { status: "KNOWN", text };
}

/** Unknown (INCOMPLETE confidence) is never displayed as "0/week" — it's a distinct unanswered state. */
export function displayOwnerHours(hoursWeek: ConfidenceValue<number>): string {
  return hoursWeek.confidence === "INCOMPLETE" ? "Not yet known" : `${hoursWeek.value}/week`;
}

export function formatPercentForCompare(ratio: string): string {
  return `${(Number(ratio) * 100).toFixed(2)}%`;
}

/**
 * NOW describes what already happened — "actually received," "actual
 * revenue." NEXT and ULTIMATELY describe what the model requires — "must
 * provide," "target," "modeled." Never let a future figure read like a
 * settled fact (Build Spec Milestone 8 §2).
 */
export function ownerBenefitLabel(scenarioType: ScenarioType): "ACTUAL" | "MODELED" {
  return scenarioType === "NOW" ? "ACTUAL" : "MODELED";
}

function describeCapacitySignal(signal: ScenarioResult["capacitySignal"]): string {
  return signal === "INSUFFICIENT_DATA" ? "not assessed" : signal.replace(/_/g, " ").toLowerCase();
}

export type MaterialChangeCategory =
  | "REVENUE"
  | "TIME"
  | "COSTS"
  | "OWNER_ECONOMICS"
  | "STREAMS"
  | "RETENTION"
  | "CAPACITY"
  | "ROLE";

export interface MaterialChange {
  id: string;
  category: MaterialChangeCategory;
  text: string;
}

// ---- individual dimension comparisons (internal — detectMaterialChanges composes these) ----

function compareRequiredRevenue(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot): MaterialChange | null {
  const fromRR = from.result.requiredRevenue;
  const toRR = to.result.requiredRevenue;
  if (fromRR === null || toRR === null) {
    if (fromRR === null && toRR === null) return null;
    return {
      id: "required-revenue",
      category: "REVENUE",
      text: `Not enough information to compare Required Revenue between ${from.scenarioType} and ${to.scenarioType} — funding responsibility hasn't been confirmed for at least one of them.`,
    };
  }
  const delta = subtract(parseMoney(toRR), parseMoney(fromRR));
  if (delta.isZero()) return null;
  const isFloor = requiredRevenueIsFloor(from.result) || requiredRevenueIsFloor(to.result);
  const dir = delta.isPositive() ? "more" : "less";
  const qualifier = isFloor ? "at least " : "";
  const basis = isFloor ? ", based on currently known costs" : "";
  return {
    id: "required-revenue",
    category: "REVENUE",
    text: `${to.scenarioType} requires ${qualifier}$${formatMoney(delta.abs())}/mo ${dir} in Required Revenue than ${from.scenarioType}${basis}.`,
  };
}

function compareBusinessFundedRequirement(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot): MaterialChange | null {
  const fromReq = from.result.primaryOwnerBenefitVsRequirement?.businessFundedPersonalEconomicRequirement ?? null;
  const toReq = to.result.primaryOwnerBenefitVsRequirement?.businessFundedPersonalEconomicRequirement ?? null;
  if (fromReq === null || toReq === null) {
    if (fromReq === null && toReq === null) return null;
    return {
      id: "funding-requirement",
      category: "REVENUE",
      text: `Not enough information to compare the business-funded personal requirement between ${from.scenarioType} and ${to.scenarioType} — funding responsibility hasn't been confirmed for at least one of them.`,
    };
  }
  const delta = subtract(parseMoney(toReq), parseMoney(fromReq));
  if (delta.isZero()) return null;
  const dir = delta.isPositive() ? "increases" : "decreases";
  return {
    id: "funding-requirement",
    category: "REVENUE",
    text: `The business-funded personal economic requirement ${dir} from $${fromReq}/mo (${from.scenarioType}) to $${toReq}/mo (${to.scenarioType}).`,
  };
}

function compareOwnerHours(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot, labels: CompareLabels): MaterialChange[] {
  const changes: MaterialChange[] = [];
  for (const toOwner of to.input.ownerInputs) {
    const fromOwner = from.input.ownerInputs.find((o) => o.ownerId === toOwner.ownerId);
    if (!fromOwner) continue;
    if (fromOwner.hoursWeek.confidence === "INCOMPLETE" || toOwner.hoursWeek.confidence === "INCOMPLETE") continue;
    if (fromOwner.hoursWeek.value === toOwner.hoursWeek.value) continue;
    const label = labels.ownerLabelById[toOwner.ownerId] ?? "An owner";
    changes.push({
      id: `hours-${toOwner.ownerId}`,
      category: "TIME",
      text: `${label}'s hours move from ${fromOwner.hoursWeek.value}/week (${from.scenarioType}) to ${toOwner.hoursWeek.value}/week (${to.scenarioType}).`,
    });
  }
  return changes;
}

function compareCashSubsidy(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot, labels: CompareLabels): MaterialChange[] {
  const changes: MaterialChange[] = [];
  for (const toOwner of to.input.ownerInputs) {
    const fromOwner = from.input.ownerInputs.find((o) => o.ownerId === toOwner.ownerId);
    if (!fromOwner) continue;
    const label = labels.ownerLabelById[toOwner.ownerId] ?? "An owner";
    const fromInvesting = parseMoney(fromOwner.personalCashInvestment).isPositive();
    const toInvesting = parseMoney(toOwner.personalCashInvestment).isPositive();
    if (fromInvesting && !toInvesting) {
      changes.push({
        id: `cash-subsidy-stops-${toOwner.ownerId}`,
        category: "OWNER_ECONOMICS",
        text: `${label}'s personal cash investment into the business stops between ${from.scenarioType} and ${to.scenarioType}.`,
      });
    } else if (!fromInvesting && toInvesting) {
      changes.push({
        id: `cash-subsidy-starts-${toOwner.ownerId}`,
        category: "OWNER_ECONOMICS",
        text: `${label} begins personally investing cash into the business in ${to.scenarioType}, which wasn't modeled in ${from.scenarioType}.`,
      });
    }
  }
  return changes;
}

function compareOwnerEconomics(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot, labels: CompareLabels): MaterialChange[] {
  const changes: MaterialChange[] = [];
  if (!from.result.ownerEconomicsResults || !to.result.ownerEconomicsResults) return changes;
  for (const toR of to.result.ownerEconomicsResults) {
    const fromR = from.result.ownerEconomicsResults.find((r) => r.ownerId === toR.ownerId);
    if (!fromR) continue;
    const label = labels.ownerLabelById[toR.ownerId] ?? "An owner";
    const laborDelta = subtract(parseMoney(toR.laborCompensation), parseMoney(fromR.laborCompensation));
    if (!laborDelta.isZero()) {
      changes.push({
        id: `labor-comp-${toR.ownerId}`,
        category: "OWNER_ECONOMICS",
        text: `${label}'s labor compensation moves from $${fromR.laborCompensation} (${from.scenarioType}) to $${toR.laborCompensation} (${to.scenarioType}).`,
      });
    }
    const distDelta = subtract(parseMoney(toR.profitDistribution), parseMoney(fromR.profitDistribution));
    if (!distDelta.isZero()) {
      changes.push({
        id: `profit-distribution-${toR.ownerId}`,
        category: "OWNER_ECONOMICS",
        text: `${label}'s ownership/profit distribution moves from $${fromR.profitDistribution} (${from.scenarioType}) to $${toR.profitDistribution} (${to.scenarioType}).`,
      });
    }
  }
  return changes;
}

function compareStreams(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot, labels: CompareLabels): MaterialChange[] {
  const changes: MaterialChange[] = [];
  const fromStreamIds = new Set(from.input.streams.map((s) => s.streamId));
  const toStreamIds = new Set(to.input.streams.map((s) => s.streamId));

  for (const s of to.input.streams) {
    const label = labels.streamLabelById[s.streamId] ?? s.streamId;
    if (!fromStreamIds.has(s.streamId)) {
      changes.push({
        id: `stream-added-${s.streamId}`,
        category: "STREAMS",
        text: `${label} is a new revenue stream in ${to.scenarioType} that wasn't modeled in ${from.scenarioType}.`,
      });
      continue;
    }
    const fromStream = from.input.streams.find((x) => x.streamId === s.streamId)!;
    if (s.priceOrAvgValue.confidence !== "INCOMPLETE" && fromStream.priceOrAvgValue.confidence !== "INCOMPLETE") {
      const priceDelta = subtract(parseMoney(s.priceOrAvgValue.value), parseMoney(fromStream.priceOrAvgValue.value));
      if (!priceDelta.isZero()) {
        changes.push({
          id: `price-${s.streamId}`,
          category: "STREAMS",
          text: `${label}'s price moves from $${fromStream.priceOrAvgValue.value} (${from.scenarioType}) to $${s.priceOrAvgValue.value} (${to.scenarioType}).`,
        });
      }
    }
    const cogsDelta = subtract(parseMoney(s.cogsPerUnit), parseMoney(fromStream.cogsPerUnit));
    if (!cogsDelta.isZero()) {
      changes.push({
        id: `cogs-${s.streamId}`,
        category: "STREAMS",
        text: `${label}'s Cost of Delivery moves from $${fromStream.cogsPerUnit} (${from.scenarioType}) to $${s.cogsPerUnit} (${to.scenarioType}) per unit.`,
      });
    }
  }

  for (const s of from.input.streams) {
    if (!toStreamIds.has(s.streamId)) {
      const label = labels.streamLabelById[s.streamId] ?? s.streamId;
      changes.push({
        id: `stream-removed-${s.streamId}`,
        category: "STREAMS",
        text: `${label}, modeled in ${from.scenarioType}, is no longer part of ${to.scenarioType}.`,
      });
    }
  }

  for (const toM of to.result.perStreamEconomics) {
    const fromM = from.result.perStreamEconomics.find((m) => m.streamId === toM.streamId);
    if (!fromM) continue;
    const label = labels.streamLabelById[toM.streamId] ?? toM.streamId;
    const gmDelta = subtract(parsePercent(toM.grossMargin), parsePercent(fromM.grossMargin));
    if (!gmDelta.isZero()) {
      changes.push({
        id: `gross-margin-${toM.streamId}`,
        category: "STREAMS",
        text: `${label}'s gross margin moves from ${formatPercentForCompare(fromM.grossMargin)} (${from.scenarioType}) to ${formatPercentForCompare(toM.grossMargin)} (${to.scenarioType}).`,
      });
    }
    const cmDelta = subtract(parsePercent(toM.contributionMargin), parsePercent(fromM.contributionMargin));
    if (!cmDelta.isZero()) {
      changes.push({
        id: `contribution-margin-${toM.streamId}`,
        category: "STREAMS",
        text: `${label}'s contribution margin moves from ${formatPercentForCompare(fromM.contributionMargin)} (${from.scenarioType}) to ${formatPercentForCompare(toM.contributionMargin)} (${to.scenarioType}).`,
      });
    }
  }

  return changes;
}

function compareOperatingCosts(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot): MaterialChange[] {
  const changes: MaterialChange[] = [];
  const fromOpex = sumKnownOperatingCost(from.input.operatingCosts);
  const toOpex = sumKnownOperatingCost(to.input.operatingCosts);

  const recurringDelta = subtract(toOpex.monthly, fromOpex.monthly);
  if (!recurringDelta.isZero()) {
    const dir = recurringDelta.isPositive() ? "rises" : "falls";
    changes.push({
      id: "opex-recurring",
      category: "COSTS",
      text: `Known recurring operating costs ${dir} by $${formatMoney(recurringDelta.abs())}/mo from ${from.scenarioType} to ${to.scenarioType}.`,
    });
  }

  // Never merged into the recurring figure above — a one-time capital/opex
  // need is never treated as an ongoing cost (Build Spec Milestone 8 §4).
  const oneTimeDelta = subtract(toOpex.oneTimeTotal, fromOpex.oneTimeTotal);
  if (!oneTimeDelta.isZero()) {
    const dir = oneTimeDelta.isPositive() ? "rises" : "falls";
    changes.push({
      id: "opex-onetime",
      category: "COSTS",
      text: `Known one-time operating costs ${dir} by $${formatMoney(oneTimeDelta.abs())} from ${from.scenarioType} to ${to.scenarioType} — never merged into the recurring figure above.`,
    });
  }

  return changes;
}

function compareDelegation(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot): MaterialChange | null {
  const fromKnown = sumKnownDelegationCost(from.input.delegationItems);
  const toKnown = sumKnownDelegationCost(to.input.delegationItems);
  const fromHasAny = from.input.delegationItems.length > 0;
  const toHasAny = to.input.delegationItems.length > 0;

  if (!fromHasAny && toHasAny) {
    const costNote = toKnown.isPartial
      ? "replacement cost not yet fully known"
      : `adding $${formatMoney(toKnown.monthly)}/mo in known replacement cost`;
    return {
      id: "delegation-appears",
      category: "COSTS",
      text: `${to.scenarioType} introduces delegated/replacement work that wasn't present in ${from.scenarioType} — ${costNote}.`,
    };
  }

  const delta = subtract(toKnown.monthly, fromKnown.monthly);
  if (!delta.isZero()) {
    const dir = delta.isPositive() ? "increases" : "decreases";
    const basis = fromKnown.isPartial || toKnown.isPartial ? " (based on currently known costs only)" : "";
    return {
      id: "delegation-cost-change",
      category: "COSTS",
      text: `Known delegation/replacement cost ${dir} by $${formatMoney(delta.abs())}/mo from ${from.scenarioType} to ${to.scenarioType}${basis}.`,
    };
  }

  return null;
}

function compareRetainedCapital(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot): MaterialChange[] {
  const changes: MaterialChange[] = [];
  const recurringDelta = subtract(
    parseMoney(to.result.requiredRetainedBusinessCapital.recurring),
    parseMoney(from.result.requiredRetainedBusinessCapital.recurring),
  );
  if (!recurringDelta.isZero()) {
    changes.push({
      id: "retained-capital-recurring",
      category: "RETENTION",
      text: `Required recurring retained business capital moves from $${from.result.requiredRetainedBusinessCapital.recurring}/mo (${from.scenarioType}) to $${to.result.requiredRetainedBusinessCapital.recurring}/mo (${to.scenarioType}).`,
    });
  }
  const oneTimeDelta = subtract(
    parseMoney(to.result.requiredRetainedBusinessCapital.oneTime),
    parseMoney(from.result.requiredRetainedBusinessCapital.oneTime),
  );
  if (!oneTimeDelta.isZero()) {
    changes.push({
      id: "retained-capital-onetime",
      category: "RETENTION",
      text: `Required one-time retained business capital moves from $${from.result.requiredRetainedBusinessCapital.oneTime} (${from.scenarioType}) to $${to.result.requiredRetainedBusinessCapital.oneTime} (${to.scenarioType}).`,
    });
  }
  return changes;
}

function compareCapacitySignal(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot): MaterialChange | null {
  if (from.result.capacitySignal === to.result.capacitySignal) return null;
  return {
    id: "capacity-signal",
    category: "CAPACITY",
    text: `Capacity/demand moves from "${describeCapacitySignal(from.result.capacitySignal)}" (${from.scenarioType}) to "${describeCapacitySignal(to.result.capacitySignal)}" (${to.scenarioType}).`,
  };
}

function compareOwnerDependentFunctions(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot): MaterialChange | null {
  const fromFn = new Set(from.input.ownerInputs.flatMap((o) => o.broadFunctions ?? []));
  const toFn = new Set(to.input.ownerInputs.flatMap((o) => o.broadFunctions ?? []));
  const newlyDependent = [...toFn].filter((f) => !fromFn.has(f));
  const noLongerDependent = [...fromFn].filter((f) => !toFn.has(f));
  if (newlyDependent.length === 0 && noLongerDependent.length === 0) return null;
  const parts: string[] = [];
  if (noLongerDependent.length > 0) parts.push(`no longer requires the owner for: ${noLongerDependent.join(", ")}`);
  if (newlyDependent.length > 0) parts.push(`now requires the owner for: ${newlyDependent.join(", ")}`);
  return {
    id: "owner-dependent-functions",
    category: "ROLE",
    text: `${to.scenarioType} ${parts.join("; ")}, compared to ${from.scenarioType}.`,
  };
}

/** Only meaningful for ULTIMATELY (the only scenario with a Role-fit diagnostic) — never fabricated for NOW/NEXT. */
function compareRoleFit(to: ScenarioCompareSnapshot): MaterialChange | null {
  if (!to.roleFit || to.roleFit.status === "CONSISTENT") return null;
  const description =
    to.roleFit.status === "MISMATCH"
      ? "may not match the intended ownership model"
      : "has owner involvement that isn't yet clarified as required or chosen";
  return {
    id: "role-fit",
    category: "ROLE",
    text: `${to.scenarioType}'s Role fit ${description} — see the Owner Role section.`,
  };
}

/**
 * The one pure diff layer for COMPARE (Build Spec Milestone 8 §6) — never
 * hardcoded into a component. Describes a change before judging it: no
 * "improves"/"worsens," no automatic direction-is-good framing (§7). Floors
 * and unknowns are preserved exactly, never collapsed to zero or an exact
 * figure (§12–13). Reads only `from`/`to`'s already-resolved input/result —
 * never mutates either snapshot and never re-derives a financial formula.
 */
export function detectMaterialChanges(from: ScenarioCompareSnapshot, to: ScenarioCompareSnapshot, labels: CompareLabels): MaterialChange[] {
  const changes: MaterialChange[] = [];

  const rr = compareRequiredRevenue(from, to);
  if (rr) changes.push(rr);

  changes.push(...compareOwnerHours(from, to, labels));

  const fr = compareBusinessFundedRequirement(from, to);
  if (fr) changes.push(fr);

  changes.push(...compareStreams(from, to, labels));
  changes.push(...compareOperatingCosts(from, to));
  changes.push(...compareOwnerEconomics(from, to, labels));
  changes.push(...compareCashSubsidy(from, to, labels));

  const dc = compareDelegation(from, to);
  if (dc) changes.push(dc);

  changes.push(...compareRetainedCapital(from, to));

  const cap = compareCapacitySignal(from, to);
  if (cap) changes.push(cap);

  const dep = compareOwnerDependentFunctions(from, to);
  if (dep) changes.push(dep);

  const role = compareRoleFit(to);
  if (role) changes.push(role);

  return changes;
}

export interface ProgressionPair {
  fromType: ScenarioType;
  toType: ScenarioType;
  changes: MaterialChange[];
}

/**
 * NOW → NEXT → ULTIMATELY is the standard progression, but any subset may
 * exist (Build Spec Milestone 8 §15 — recovery/testing/partial state never
 * crashes COMPARE). Pairs only adjacent scenarios that both actually exist;
 * when NEXT is missing, compares NOW directly against ULTIMATELY rather than
 * fabricating a NEXT that was never built.
 */
export function buildProgressionPairs(
  scenarios: { now: ScenarioCompareSnapshot | null; next: ScenarioCompareSnapshot | null; ultimately: ScenarioCompareSnapshot | null },
  labels: CompareLabels,
): ProgressionPair[] {
  const pairs: ProgressionPair[] = [];
  if (scenarios.now && scenarios.next) {
    pairs.push({ fromType: "NOW", toType: "NEXT", changes: detectMaterialChanges(scenarios.now, scenarios.next, labels) });
  }
  if (scenarios.next && scenarios.ultimately) {
    pairs.push({ fromType: "NEXT", toType: "ULTIMATELY", changes: detectMaterialChanges(scenarios.next, scenarios.ultimately, labels) });
  } else if (scenarios.now && scenarios.ultimately && !scenarios.next) {
    pairs.push({ fromType: "NOW", toType: "ULTIMATELY", changes: detectMaterialChanges(scenarios.now, scenarios.ultimately, labels) });
  }
  return pairs;
}

export interface AssumptionNote {
  id: string;
  text: string;
}

/**
 * Which assumptions materially affect how a scenario's numbers should be
 * read — never a fabricated numeric confidence score (Build Spec Milestone
 * 8 §11). Which scenario is "most assumption-dependent" is left to the
 * reader to see by comparing list lengths side by side, not computed here.
 */
export function collectMaterialAssumptions(snapshot: ScenarioCompareSnapshot): AssumptionNote[] {
  const notes: AssumptionNote[] = [];

  if (snapshot.mixWeightFallbackApplied) {
    notes.push({
      id: "sales-mix",
      text: `${snapshot.scenarioType}'s revenue split between streams isn't confirmed — an equal-weight split is used as a temporary modeling assumption.`,
    });
  }
  if (requiredRevenueIsFloor(snapshot.result)) {
    notes.push({
      id: "delegation-cost-unknown",
      text: `${snapshot.scenarioType}'s Required Revenue is a floor — one or more replacement/delegation costs aren't known yet.`,
    });
  }
  if (snapshot.opexListIsPartial) {
    notes.push({ id: "opex-partial", text: `${snapshot.scenarioType}'s operating cost list is known to be incomplete.` });
  }
  if (snapshot.unknownOwnershipOwnerIds.length > 0) {
    notes.push({
      id: "ownership-unknown",
      text: `${snapshot.scenarioType} has ${snapshot.unknownOwnershipOwnerIds.length === 1 ? "one owner" : "owners"} whose ownership percentage isn't confirmed.`,
    });
  }
  if (snapshot.input.lifeAssumption.outsideFundingRetained === null) {
    notes.push({
      id: "funding-unconfirmed",
      text: `${snapshot.scenarioType} hasn't confirmed how much of the personal requirement the business is responsible for funding.`,
    });
  }
  if (snapshot.input.capacity.demandState === "UNSURE" && snapshot.input.capacity.constraints.length === 0) {
    notes.push({ id: "capacity-unassessed", text: `${snapshot.scenarioType}'s capacity/demand hasn't been assessed yet.` });
  }
  if (snapshot.excludedStreamIds.length > 0) {
    notes.push({
      id: "streams-excluded",
      text: `${snapshot.scenarioType} excludes ${snapshot.excludedStreamIds.length} stream${snapshot.excludedStreamIds.length === 1 ? "" : "s"} missing a price or Cost of Delivery.`,
    });
  }

  return notes;
}
