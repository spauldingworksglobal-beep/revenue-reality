"use client";

import { useMemo } from "react";
import type { ConfidenceValue, RevenuePeriodType } from "@revenue-reality/domain";
import { ValidationError } from "@revenue-reality/validation";
import {
  assessOwnershipRoleFit,
  buildNextScenarioInput,
  buildNowScenarioInput,
  buildUltimatelyScenarioInput,
  buildProgressionPairs,
  collectMaterialAssumptions,
  displayOwnerHours,
  displayRequiredRevenue,
  formatMoney,
  formatPercentForCompare,
  canCompareRevenueAlignment,
  ownerBenefitLabel,
  resolveNextLifeCategories,
  resolveNextSecurityItems,
  runScenario,
  sumKnownOperatingCost,
  withNextResultCaveats,
  withNowResultCaveats,
  withUltimatelyResultCaveats,
  type CompareLabels,
  type MaterialChange,
  type ScenarioCompareSnapshot,
} from "@revenue-reality/revenue-engine";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { OWNERSHIP_INTENT_OPTIONS } from "@/lib/presets";
import { useLifeReality } from "@/lib/life-store";
import { useNow } from "@/lib/now-store";
import { useNext } from "@/lib/next-store";
import { useUltimately } from "@/lib/ultimately-store";

const PERIOD_LABELS: Record<RevenuePeriodType, string> = {
  MONTH: "a typical month",
  YEAR: "a year",
  SINCE_RESTART: "since the current model began",
  CUSTOM: "a custom range",
};

const SCENARIO_LABELS = { NOW: "NOW", NEXT: "NEXT", ULTIMATELY: "ULTIMATELY" } as const;

function moneyOrUnknown(value: ConfidenceValue<string> | null): string {
  if (!value) return "Not yet known";
  return value.confidence === "INCOMPLETE" ? "Not yet known" : `$${value.value}`;
}

function CategoryBadge({ children }: { children: string }) {
  return <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink/50">{children}</span>;
}

function ChangeList({ changes }: { changes: MaterialChange[] }) {
  if (changes.length === 0) {
    return <p className="text-sm text-ink/50">No material differences detected.</p>;
  }
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {changes.map((c) => (
        <li key={c.id} className="flex items-start gap-2">
          <CategoryBadge>{c.category.replace(/_/g, " ")}</CategoryBadge>
          <span>{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Three empty-string-safe columns — never fabricates a value for a scenario that isn't built yet. */
function CompareRow({ label, now, next, ultimately }: { label: string; now: string | null; next: string | null; ultimately: string | null }) {
  return (
    <tr className="border-b border-ink/10">
      <th scope="row" className="py-2 pr-3 text-left align-top font-medium text-ink/70">
        {label}
      </th>
      <td className="py-2 pr-3 align-top">{now ?? <span className="text-ink/30">Not yet built</span>}</td>
      <td className="py-2 pr-3 align-top">{next ?? <span className="text-ink/30">Not yet built</span>}</td>
      <td className="py-2 align-top">{ultimately ?? <span className="text-ink/30">Not yet built</span>}</td>
    </tr>
  );
}

function CompareTable({ rows }: { rows: { label: string; now: string | null; next: string | null; ultimately: string | null }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-ink/20 text-xs uppercase tracking-wide text-ink/60">
            <th scope="col" className="pb-2 text-left">
              &nbsp;
            </th>
            <th scope="col" className="pb-2 text-left">
              NOW
            </th>
            <th scope="col" className="pb-2 text-left">
              NEXT
            </th>
            <th scope="col" className="pb-2 text-left">
              ULTIMATELY
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <CompareRow key={r.label} {...r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ComparePage() {
  const life = useLifeReality();
  const now = useNow();
  const next = useNext();
  const ultimately = useUltimately();

  const {
    owners,
    revenueStreams,
    currentCategories,
    currentSecurity,
    currentBusinessHoursWeek,
    currentAvailableHoursWeek,
    restructureDate,
    intendedOwnershipModel,
    workToEventuallyDelegate,
  } = life;

  const activeStreams = useMemo(() => revenueStreams.filter((s) => s.active), [revenueStreams]);
  const streamLabelById = useMemo(() => Object.fromEntries(revenueStreams.map((s) => [s.id, s.name || "Unnamed stream"])), [revenueStreams]);
  const ownerLabelById = useMemo(() => Object.fromEntries(owners.map((o) => [o.id, o.label || "Unnamed owner"])), [owners]);
  const labels: CompareLabels = useMemo(() => ({ streamLabelById, ownerLabelById }), [streamLabelById, ownerLabelById]);
  const primaryOwnerId = useMemo(() => owners.find((o) => o.isPrimaryRespondent)?.id ?? owners[0]?.id, [owners]);

  // ---- NOW: read-only re-derivation of the exact assembly the NOW result page itself builds ----
  const nowAssembly = useMemo(
    () =>
      buildNowScenarioInput({
        scenarioId: "now",
        owners,
        activeStreams,
        streamInputs: now.streamInputs,
        operatingCosts: now.operatingCosts,
        opexListIsPartial: now.opexListIsPartial,
        ownerInputs: now.ownerInputs,
        currentBusinessHoursWeek,
        currentAvailableHoursWeek,
        otherTimeClaims: [],
        distributionPolicy: now.distributionPolicy,
        distributionPercents: now.distributionPercents,
        capitalItems: now.capitalItems,
        currentCategories,
        currentSecurity,
        currentFundingConfirmation: now.currentFundingConfirmation,
        restructureDate,
        actualRevenue: now.actualRevenue,
      }),
    [owners, activeStreams, now, currentCategories, currentSecurity, restructureDate, currentBusinessHoursWeek, currentAvailableHoursWeek],
  );

  // ---- NEXT: only if the owner has actually gone through it — never fabricated ----
  const nextCategories = useMemo(
    () => resolveNextLifeCategories(next.snapshotCurrentCategories, next.snapshotIntendedCategories, next.nextLifeCategorySelections),
    [next.snapshotCurrentCategories, next.snapshotIntendedCategories, next.nextLifeCategorySelections],
  );
  const nextSecurityItems = useMemo(
    () => resolveNextSecurityItems(next.snapshotCurrentSecurity, next.snapshotIntendedSecurity, next.nextSecurityItemSelections),
    [next.snapshotCurrentSecurity, next.snapshotIntendedSecurity, next.nextSecurityItemSelections],
  );
  const nextAssembly = useMemo(
    () =>
      next.hasInitializedFromNow
        ? buildNextScenarioInput({
            scenarioId: "next",
            owners,
            activeStreams,
            streamInputs: next.streamInputs,
            operatingCosts: next.operatingCosts,
            opexListIsPartial: next.opexListIsPartial,
            ownerInputs: next.ownerInputs,
            nextBusinessHoursWeek: next.nextBusinessHoursWeek,
            nextAvailableHoursWeek: next.nextAvailableHoursWeek,
            otherTimeClaims: [],
            lifePriorityReservations: next.nextLifePriorities,
            distributionPolicy: next.distributionPolicy,
            distributionPercents: next.distributionPercents,
            capitalItems: next.capitalItems,
            delegationItems: next.delegationItems,
            nextLifeCategories: nextCategories,
            nextSecurity: nextSecurityItems,
            nextFundingConfirmation: next.nextFundingConfirmation,
            restructureDate,
            capacity: next.capacity,
          })
        : null,
    [next, owners, activeStreams, restructureDate, nextCategories, nextSecurityItems],
  );

  // ---- ULTIMATELY: only if initialized — never fabricated ----
  const ultimatelyAssembly = useMemo(
    () =>
      ultimately.hasInitialized
        ? buildUltimatelyScenarioInput({
            scenarioId: "ultimately",
            owners,
            activeStreams,
            streamInputs: ultimately.streamInputs,
            operatingCosts: ultimately.operatingCosts,
            opexListIsPartial: ultimately.opexListIsPartial,
            ownerInputs: ultimately.ownerInputs,
            ultimateBusinessHoursWeek: ultimately.snapshotUltimateBusinessHoursWeek,
            intendedAvailableHoursWeek: ultimately.snapshotIntendedAvailableHoursWeek,
            otherTimeClaims: ultimately.snapshotOtherTimeClaims,
            lifePriorityReservations: ultimately.snapshotLifePriorityReservations,
            distributionPolicy: ultimately.distributionPolicy,
            distributionPercents: ultimately.distributionPercents,
            capitalItems: ultimately.capitalItems,
            delegationItems: ultimately.delegationItems,
            intendedLifeCategories: ultimately.snapshotIntendedCategories,
            intendedSecurity: ultimately.snapshotIntendedSecurity,
            deferredNeeds: ultimately.snapshotDeferredNeeds,
            ultimatelyFundingConfirmation: ultimately.ultimatelyFundingConfirmation,
            restructureDate,
            capacity: ultimately.capacity,
          })
        : null,
    [ultimately, owners, activeStreams, restructureDate],
  );

  // ---- run each scenario, never letting one failure block the others (§15) ----
  const nowResult = useMemo(() => {
    if (nowAssembly.status !== "READY") return null;
    try {
      return withNowResultCaveats(runScenario(nowAssembly.input, { revisionId: "now-compare" }), nowAssembly);
    } catch {
      return null;
    }
  }, [nowAssembly]);

  const nextResult = useMemo(() => {
    if (!nextAssembly || nextAssembly.status !== "READY") return null;
    try {
      return withNextResultCaveats(runScenario(nextAssembly.input, { revisionId: "next-compare" }), nextAssembly);
    } catch {
      return null;
    }
  }, [nextAssembly]);

  const ultimatelyResult = useMemo(() => {
    if (!ultimatelyAssembly || ultimatelyAssembly.status !== "READY") return null;
    try {
      return withUltimatelyResultCaveats(runScenario(ultimatelyAssembly.input, { revisionId: "ultimately-compare" }), ultimatelyAssembly);
    } catch {
      return null;
    }
  }, [ultimatelyAssembly]);

  // ULTIMATELY is the only scenario with an ownership-role diagnostic in this build.
  const roleFit = useMemo(() => {
    if (!ultimatelyResult) return undefined;
    return assessOwnershipRoleFit({
      intendedOwnershipModel: ultimately.snapshotIntendedOwnershipModel,
      ownerBusinessHoursWeek: ultimately.snapshotUltimateBusinessHoursWeek,
      workOwnerContinuesToPerform: ultimately.ultimatelyWorkToContinue,
      workOwnerSaidShouldNotDependOnThem: workToEventuallyDelegate,
      ownerInvolvementNature: ultimately.ownerInvolvementNature,
      requiredFunctionsWhenMixed: ultimately.requiredFunctionsWhenMixed,
    });
  }, [ultimatelyResult, ultimately, workToEventuallyDelegate]);

  const nowSnapshot: ScenarioCompareSnapshot | null =
    nowAssembly.status === "READY" && nowResult
      ? {
          scenarioType: "NOW",
          input: nowAssembly.input,
          result: nowResult,
          unknownOwnershipOwnerIds: nowAssembly.unknownOwnershipOwnerIds,
          mixWeightFallbackApplied: nowAssembly.mixWeightFallbackApplied,
          excludedStreamIds: nowAssembly.excludedStreamIds,
          opexListIsPartial: now.opexListIsPartial,
        }
      : null;

  const nextSnapshot: ScenarioCompareSnapshot | null =
    nextAssembly && nextAssembly.status === "READY" && nextResult
      ? {
          scenarioType: "NEXT",
          input: nextAssembly.input,
          result: nextResult,
          unknownOwnershipOwnerIds: nextAssembly.unknownOwnershipOwnerIds,
          mixWeightFallbackApplied: nextAssembly.mixWeightFallbackApplied,
          excludedStreamIds: nextAssembly.excludedStreamIds,
          opexListIsPartial: next.opexListIsPartial,
        }
      : null;

  const ultimatelySnapshot: ScenarioCompareSnapshot | null =
    ultimatelyAssembly && ultimatelyAssembly.status === "READY" && ultimatelyResult
      ? {
          scenarioType: "ULTIMATELY",
          input: ultimatelyAssembly.input,
          result: ultimatelyResult,
          unknownOwnershipOwnerIds: ultimatelyAssembly.unknownOwnershipOwnerIds,
          mixWeightFallbackApplied: ultimatelyAssembly.mixWeightFallbackApplied,
          excludedStreamIds: ultimatelyAssembly.excludedStreamIds,
          opexListIsPartial: ultimately.opexListIsPartial,
          roleFit,
        }
      : null;

  const progressionPairs = useMemo(
    () => buildProgressionPairs({ now: nowSnapshot, next: nextSnapshot, ultimately: ultimatelySnapshot }, labels),
    [nowSnapshot, nextSnapshot, ultimatelySnapshot, labels],
  );

  const builtCount = [nowSnapshot, nextSnapshot, ultimatelySnapshot].filter(Boolean).length;

  const ownershipModelLabel = OWNERSHIP_INTENT_OPTIONS.find((o) => o.value === intendedOwnershipModel)?.label ?? "Not yet chosen";

  // ---- Cash reality (NOW only) — never lost when comparing planning scenarios (§10) ----
  const revenueAlignmentComparable = nowResult ? canCompareRevenueAlignment(now.revenuePeriod, nowResult.requiredRevenue) : false;
  const revenueGapPercent =
    revenueAlignmentComparable && nowResult?.actualRevenue && nowResult.requiredRevenue
      ? ((Number(nowResult.actualRevenue) - Number(nowResult.requiredRevenue)) / Number(nowResult.requiredRevenue)) * 100
      : null;

  // ---- per-stream union across whichever scenarios exist ----
  const allStreamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of [nowSnapshot, nextSnapshot, ultimatelySnapshot]) {
      if (!s) continue;
      for (const stream of s.input.streams) ids.add(stream.streamId);
    }
    return [...ids];
  }, [nowSnapshot, nextSnapshot, ultimatelySnapshot]);

  function streamField(snapshot: ScenarioCompareSnapshot | null, streamId: string, field: "price" | "cogs" | "gross" | "contribution"): string | null {
    if (!snapshot) return null;
    const stream = snapshot.input.streams.find((s) => s.streamId === streamId);
    if (!stream) return "Not modeled here";
    if (field === "price") return stream.priceOrAvgValue.confidence === "INCOMPLETE" ? "Not yet known" : `$${stream.priceOrAvgValue.value}`;
    if (field === "cogs") return `$${stream.cogsPerUnit}`;
    const econ = snapshot.result.perStreamEconomics.find((m) => m.streamId === streamId);
    if (!econ) return null;
    return field === "gross" ? formatPercentForCompare(econ.grossMargin) : formatPercentForCompare(econ.contributionMargin);
  }

  const assumptionsByScenario = [
    { type: "NOW", snapshot: nowSnapshot },
    { type: "NEXT", snapshot: nextSnapshot },
    { type: "ULTIMATELY", snapshot: ultimatelySnapshot },
  ] as const;

  return (
    <WizardShell
      eyebrow="COMPARE"
      title="Where you are, what's next, and what this business must ultimately become"
      intro={
        <>
          <p>
            Current life + time → NOW business → NEXT → Intended life + time → ULTIMATELY. NOW describes what has
            actually happened; NEXT and ULTIMATELY are modeled requirements this business must meet — never a record
            of something that's already occurred. COMPARE reads what each of those already-built scenarios
            concluded — it never recalculates the methodology with a new formula.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/ultimately/result"
    >
      {builtCount === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nothing is built yet to compare. Go through NOW at least once, then come back here.
        </div>
      )}
      {builtCount > 0 && builtCount < 3 && (
        <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs text-ink/80">
          {[
            !nowSnapshot && "NOW isn't fully built yet.",
            !nextSnapshot && "NEXT hasn't been built yet (or is incomplete).",
            !ultimatelySnapshot && "ULTIMATELY hasn't been built yet (or is incomplete).",
          ]
            .filter(Boolean)
            .join(" ")}{" "}
          Showing what's available below — nothing missing is guessed.
        </div>
      )}

      {/* A — Your Revenue Reality: Layer 1 scenario summary */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Your Revenue Reality — NOW / NEXT / ULTIMATELY at a glance</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              { type: "NOW" as const, snapshot: nowSnapshot },
              { type: "NEXT" as const, snapshot: nextSnapshot },
              { type: "ULTIMATELY" as const, snapshot: ultimatelySnapshot },
            ]
          ).map(({ type, snapshot }) => (
            <div key={type} className="rounded-md border border-ink/10 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{SCENARIO_LABELS[type]}</p>
              {!snapshot ? (
                <p className="mt-2 text-ink/40">Not yet built</p>
              ) : (
                <dl className="mt-2 flex flex-col gap-1">
                  {type === "NOW" && (
                    <>
                      <dt className="text-xs text-ink/50">Actual revenue ({PERIOD_LABELS[now.revenuePeriod.periodType]})</dt>
                      <dd className="font-medium">${nowResult?.actualRevenue ?? "—"}</dd>
                    </>
                  )}
                  <dt className="text-xs text-ink/50">Required revenue</dt>
                  <dd className="font-medium">{displayRequiredRevenue(snapshot.result).text}</dd>
                  <dt className="text-xs text-ink/50">Owner hours (primary)</dt>
                  <dd className="font-medium">{displayOwnerHours(snapshot.input.ownerInputs.find((o) => o.ownerId === primaryOwnerId)?.hoursWeek ?? { value: 0, confidence: "INCOMPLETE" })}</dd>
                  <dt className="text-xs text-ink/50">Owner benefit ({ownerBenefitLabel(type)})</dt>
                  <dd className="font-medium">
                    {snapshot.result.ownerEconomicsResults?.find((r) => r.ownerId === primaryOwnerId)?.totalOwnerEconomicBenefit
                      ? `$${snapshot.result.ownerEconomicsResults.find((r) => r.ownerId === primaryOwnerId)!.totalOwnerEconomicBenefit}`
                      : "Not yet known"}
                  </dd>
                  {type === "ULTIMATELY" && roleFit && (
                    <>
                      <dt className="text-xs text-ink/50">Role fit</dt>
                      <dd className="font-medium">{roleFit.status === "CONSISTENT" ? "Consistent" : roleFit.status === "MISMATCH" ? "Mismatch — see below" : "Incomplete — see below"}</dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          ))}
        </div>

        {/* A simple step visualization — hours only. Required Revenue and actual revenue are deliberately never charted together (different bases). */}
        {[nowSnapshot, nextSnapshot, ultimatelySnapshot].some((s) => s && s.input.ownerInputs.find((o) => o.ownerId === primaryOwnerId)?.hoursWeek.confidence !== "INCOMPLETE") && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Primary owner hours/week, across whichever scenarios are built</p>
            <div className="mt-2 flex flex-col gap-1">
              {([
                { type: "NOW" as const, snapshot: nowSnapshot },
                { type: "NEXT" as const, snapshot: nextSnapshot },
                { type: "ULTIMATELY" as const, snapshot: ultimatelySnapshot },
              ]).map(({ type, snapshot }) => {
                const hours = snapshot?.input.ownerInputs.find((o) => o.ownerId === primaryOwnerId)?.hoursWeek;
                const known = hours && hours.confidence !== "INCOMPLETE";
                const maxHours = 60;
                const widthPercent = known ? Math.min(100, (hours!.value / maxHours) * 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <span className="w-20 shrink-0 text-ink/60">{SCENARIO_LABELS[type]}</span>
                    <div className="h-3 flex-1 rounded bg-ink/5">
                      <div className="h-3 rounded bg-accent/70" style={{ width: `${widthPercent}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right">{known ? `${hours!.value}/week` : snapshot ? "Not yet known" : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* H — What Changes */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What changes — described, never judged as good or bad</h2>
        {progressionPairs.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">At least two adjacent scenarios need to be built before a comparison is possible.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {progressionPairs.map((pair) => (
              <div key={`${pair.fromType}-${pair.toType}`}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  {SCENARIO_LABELS[pair.fromType]} → {SCENARIO_LABELS[pair.toType]}
                </p>
                <ChangeList changes={pair.changes} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cash reality — NOW only, never lost while comparing planning scenarios */}
      {nowSnapshot && (
        <section className="rounded-lg border border-ink/15 bg-white p-4">
          <h2 className="text-sm font-semibold">Cash reality (NOW only — this never disappears into the planning scenarios)</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink/60">Actual revenue</dt>
            <dd>
              ${nowResult?.actualRevenue ?? "—"} ({PERIOD_LABELS[now.revenuePeriod.periodType]})
            </dd>
            <dt className="text-ink/60">Cash collected</dt>
            <dd>{now.cashCollected ? moneyOrUnknown(now.cashCollected) : "Not entered"}</dd>
            <dt className="text-ink/60">Money on the way (AR)</dt>
            <dd>
              {now.hasAccountsReceivable === "YES" && now.accountsReceivableAmount
                ? `${moneyOrUnknown(now.accountsReceivableAmount)} owed but not yet collected`
                : now.hasAccountsReceivable === "NO"
                  ? "None"
                  : "Unknown"}
            </dd>
            <dt className="text-ink/60">Revenue alignment</dt>
            <dd>
              {revenueAlignmentComparable && revenueGapPercent !== null
                ? `${revenueGapPercent >= 0 ? "+" : ""}${revenueGapPercent.toFixed(1)}% vs. NOW's own required revenue`
                : "Not comparable — actual revenue's period isn't the same basis as a normalized required-revenue figure"}
            </dd>
          </dl>
        </section>
      )}

      {/* B — Life + Time */}
      <details className="rounded-lg border border-ink/15 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Life + Time — Current → NEXT → Intended</summary>
        <div className="mt-3">
          <CompareTable
            rows={[
              {
                label: "Personal economic requirement (living + security)",
                now: nowSnapshot ? `$${nowSnapshot.input.lifeAssumption.lifeRequirement} + $${nowSnapshot.input.lifeAssumption.securityRequirement}` : null,
                next: nextSnapshot ? `$${nextSnapshot.input.lifeAssumption.lifeRequirement} + $${nextSnapshot.input.lifeAssumption.securityRequirement}` : null,
                ultimately: ultimatelySnapshot ? `$${ultimatelySnapshot.input.lifeAssumption.lifeRequirement} + $${ultimatelySnapshot.input.lifeAssumption.securityRequirement}` : null,
              },
              {
                label: "Business-funded requirement",
                now: nowSnapshot?.result.primaryOwnerBenefitVsRequirement ? `$${nowSnapshot.result.primaryOwnerBenefitVsRequirement.businessFundedPersonalEconomicRequirement}/mo` : nowSnapshot ? "Needs funding confirmation" : null,
                next: nextSnapshot?.result.primaryOwnerBenefitVsRequirement ? `$${nextSnapshot.result.primaryOwnerBenefitVsRequirement.businessFundedPersonalEconomicRequirement}/mo` : nextSnapshot ? "Needs funding confirmation" : null,
                ultimately: ultimatelySnapshot?.result.primaryOwnerBenefitVsRequirement ? `$${ultimatelySnapshot.result.primaryOwnerBenefitVsRequirement.businessFundedPersonalEconomicRequirement}/mo` : ultimatelySnapshot ? "Needs funding confirmation" : null,
              },
              {
                label: "Business hours/week (primary owner)",
                now: nowSnapshot ? displayOwnerHours(nowSnapshot.input.timeAssumption.businessHoursWeek) : null,
                next: nextSnapshot ? displayOwnerHours(nextSnapshot.input.timeAssumption.businessHoursWeek) : null,
                ultimately: ultimatelySnapshot ? displayOwnerHours(ultimatelySnapshot.input.timeAssumption.businessHoursWeek) : null,
              },
              {
                label: "Realistic available hours/week",
                now: nowSnapshot ? displayOwnerHours(nowSnapshot.input.timeAssumption.availableHoursWeek) : null,
                next: nextSnapshot ? displayOwnerHours(nextSnapshot.input.timeAssumption.availableHoursWeek) : null,
                ultimately: ultimatelySnapshot ? displayOwnerHours(ultimatelySnapshot.input.timeAssumption.availableHoursWeek) : null,
              },
              {
                label: "Time Reality fit",
                now: nowSnapshot ? (nowSnapshot.result.timeSignal === "FITS" ? "Fits" : nowSnapshot.result.timeSignal === "EXCEEDS_AVAILABLE" ? "Exceeds available hours" : "Not enough data") : null,
                next: nextSnapshot ? (nextSnapshot.result.timeSignal === "FITS" ? "Fits" : nextSnapshot.result.timeSignal === "EXCEEDS_AVAILABLE" ? "Exceeds available hours" : "Not enough data") : null,
                ultimately: ultimatelySnapshot ? (ultimatelySnapshot.result.timeSignal === "FITS" ? "Fits" : ultimatelySnapshot.result.timeSignal === "EXCEEDS_AVAILABLE" ? "Exceeds available hours" : "Not enough data") : null,
              },
            ]}
          />
        </div>
      </details>

      {/* C — Business Economics */}
      <details className="rounded-lg border border-ink/15 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Business Economics — revenue, margins, costs, sales activity</summary>
        <div className="mt-3 flex flex-col gap-4">
          <CompareTable
            rows={[
              {
                label: "Required revenue",
                now: nowSnapshot ? displayRequiredRevenue(nowSnapshot.result).text : null,
                next: nextSnapshot ? displayRequiredRevenue(nextSnapshot.result).text : null,
                ultimately: ultimatelySnapshot ? displayRequiredRevenue(ultimatelySnapshot.result).text : null,
              },
              {
                label: "Weighted contribution margin",
                now: nowSnapshot ? formatPercentForCompare(nowSnapshot.result.weightedContributionMargin) : null,
                next: nextSnapshot ? formatPercentForCompare(nextSnapshot.result.weightedContributionMargin) : null,
                ultimately: ultimatelySnapshot ? formatPercentForCompare(ultimatelySnapshot.result.weightedContributionMargin) : null,
              },
              {
                label: "Known recurring operating costs",
                now: nowSnapshot ? `$${formatMoney(sumKnownOperatingCost(nowSnapshot.input.operatingCosts).monthly)}/mo${nowSnapshot.opexListIsPartial ? " (partial list)" : ""}` : null,
                next: nextSnapshot ? `$${formatMoney(sumKnownOperatingCost(nextSnapshot.input.operatingCosts).monthly)}/mo${nextSnapshot.opexListIsPartial ? " (partial list)" : ""}` : null,
                ultimately: ultimatelySnapshot ? `$${formatMoney(sumKnownOperatingCost(ultimatelySnapshot.input.operatingCosts).monthly)}/mo${ultimatelySnapshot.opexListIsPartial ? " (partial list)" : ""}` : null,
              },
              {
                label: "Known one-time operating/growth costs",
                now: nowSnapshot ? `$${formatMoney(sumKnownOperatingCost(nowSnapshot.input.operatingCosts).oneTimeTotal)}` : null,
                next: nextSnapshot ? `$${formatMoney(sumKnownOperatingCost(nextSnapshot.input.operatingCosts).oneTimeTotal)}` : null,
                ultimately: ultimatelySnapshot ? `$${formatMoney(sumKnownOperatingCost(ultimatelySnapshot.input.operatingCosts).oneTimeTotal)}` : null,
              },
              {
                label: "Break-even revenue (known OPEX only)",
                now: nowSnapshot ? `$${nowSnapshot.result.breakEvenFloor?.revenue ?? "—"}` : null,
                next: nextSnapshot ? `$${nextSnapshot.result.breakEvenFloor?.revenue ?? "—"}` : null,
                ultimately: ultimatelySnapshot ? `$${ultimatelySnapshot.result.breakEvenFloor?.revenue ?? "—"}` : null,
              },
              {
                label: "Required sales (units/transactions)",
                now: nowSnapshot?.result.requiredVolumeByStream ? nowSnapshot.result.requiredVolumeByStream.map((v) => `${v.volume} ${streamLabelById[v.streamId] ?? v.streamId}`).join(", ") : nowSnapshot ? "Incomplete" : null,
                next: nextSnapshot?.result.requiredVolumeByStream ? nextSnapshot.result.requiredVolumeByStream.map((v) => `${v.volume} ${streamLabelById[v.streamId] ?? v.streamId}`).join(", ") : nextSnapshot ? "Incomplete" : null,
                ultimately: ultimatelySnapshot?.result.requiredVolumeByStream ? ultimatelySnapshot.result.requiredVolumeByStream.map((v) => `${v.volume} ${streamLabelById[v.streamId] ?? v.streamId}`).join(", ") : ultimatelySnapshot ? "Incomplete" : null,
              },
            ]}
          />

          {allStreamIds.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/50">Per-stream economics</p>
              <CompareTable
                rows={allStreamIds.flatMap((streamId) => {
                  const label = streamLabelById[streamId] ?? streamId;
                  return [
                    { label: `${label} — price`, now: streamField(nowSnapshot, streamId, "price"), next: streamField(nextSnapshot, streamId, "price"), ultimately: streamField(ultimatelySnapshot, streamId, "price") },
                    { label: `${label} — Cost of Delivery`, now: streamField(nowSnapshot, streamId, "cogs"), next: streamField(nextSnapshot, streamId, "cogs"), ultimately: streamField(ultimatelySnapshot, streamId, "cogs") },
                    { label: `${label} — gross margin`, now: streamField(nowSnapshot, streamId, "gross"), next: streamField(nextSnapshot, streamId, "gross"), ultimately: streamField(ultimatelySnapshot, streamId, "gross") },
                    { label: `${label} — contribution margin`, now: streamField(nowSnapshot, streamId, "contribution"), next: streamField(nextSnapshot, streamId, "contribution"), ultimately: streamField(ultimatelySnapshot, streamId, "contribution") },
                  ];
                })}
              />
            </div>
          )}
        </div>
      </details>

      {/* D — Owner Economics */}
      <details className="rounded-lg border border-ink/15 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Owner Economics — actual (NOW) vs. modeled (NEXT / ULTIMATELY)</summary>
        <div className="mt-3">
          <CompareTable
            rows={owners.flatMap((owner) => {
              const label = ownerLabelById[owner.id] ?? "Owner";
              const cell = (snapshot: ScenarioCompareSnapshot | null, field: "laborCompensation" | "profitDistribution" | "totalOwnerEconomicBenefit") => {
                if (!snapshot) return null;
                const r = snapshot.result.ownerEconomicsResults?.find((x) => x.ownerId === owner.id);
                return r ? `$${r[field]}` : "Not yet known";
              };
              return [
                { label: `${label} — labor compensation (${ownerBenefitLabel("NOW")}/${ownerBenefitLabel("ULTIMATELY")})`, now: cell(nowSnapshot, "laborCompensation"), next: cell(nextSnapshot, "laborCompensation"), ultimately: cell(ultimatelySnapshot, "laborCompensation") },
                { label: `${label} — ownership/profit distribution`, now: cell(nowSnapshot, "profitDistribution"), next: cell(nextSnapshot, "profitDistribution"), ultimately: cell(ultimatelySnapshot, "profitDistribution") },
                { label: `${label} — total economic benefit`, now: cell(nowSnapshot, "totalOwnerEconomicBenefit"), next: cell(nextSnapshot, "totalOwnerEconomicBenefit"), ultimately: cell(ultimatelySnapshot, "totalOwnerEconomicBenefit") },
              ];
            })}
          />
          <p className="mt-2 text-xs text-ink/50">
            NOW&rsquo;s figures are actual — money that has already moved. NEXT and ULTIMATELY&rsquo;s figures are modeled — what the business would need to
            produce, not a record of a payment that has happened.
          </p>
        </div>
      </details>

      {/* E — Owner Role */}
      <details className="rounded-lg border border-ink/15 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Owner Role — work, dependency, delegation</summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm">
            Intended ownership model: <strong>{ownershipModelLabel}</strong>
          </p>
          <CompareTable
            rows={[
              {
                label: "Owner still performs",
                now: nowSnapshot ? (owners.flatMap((o) => now.getOwnerInput(o.id).broadFunctions).filter(Boolean).join(", ") || "Not recorded") : null,
                next: nextSnapshot ? (next.nextWorkToContinue.join(", ") || "Not recorded") : null,
                ultimately: ultimatelySnapshot ? (ultimately.ultimatelyWorkToContinue.join(", ") || "None recorded") : null,
              },
              {
                label: "No longer depends on the owner (delegated)",
                now: nowSnapshot ? "N/A — NOW never delegates" : null,
                next: nextSnapshot ? (next.delegationItems.map((d) => d.functionLabel).join(", ") || "None yet") : null,
                ultimately: ultimatelySnapshot ? (ultimately.delegationItems.map((d) => d.functionLabel).join(", ") || "None yet") : null,
              },
              {
                label: "Required vs. chosen involvement",
                now: nowSnapshot ? "Not asked for NOW" : null,
                next: nextSnapshot ? "Not asked for NEXT" : null,
                ultimately: ultimatelySnapshot
                  ? ultimately.ownerInvolvementNature === "UNKNOWN"
                    ? "Not yet clarified"
                    : ultimately.ownerInvolvementNature === "REQUIRED"
                      ? "Required for the business to operate"
                      : ultimately.ownerInvolvementNature === "CHOSEN"
                        ? "Chosen involvement"
                        : "A mix of both"
                  : null,
              },
              {
                label: "Role fit",
                now: nowSnapshot ? "No Role-fit test in this build" : null,
                next: nextSnapshot ? "No Role-fit test in this build" : null,
                ultimately: ultimatelySnapshot && roleFit ? (roleFit.status === "CONSISTENT" ? "Consistent with intended model" : roleFit.status === "MISMATCH" ? "May not match intended model" : "Not yet clarified") : null,
              },
            ]}
          />
        </div>
      </details>

      {/* F — Business Resilience */}
      <details className="rounded-lg border border-ink/15 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Business Resilience — retained capital</summary>
        <div className="mt-3">
          <CompareTable
            rows={[
              {
                label: "Recurring retention (reserve, working capital, ...)",
                now: nowSnapshot ? `$${nowSnapshot.result.requiredRetainedBusinessCapital.recurring}/mo` : null,
                next: nextSnapshot ? `$${nextSnapshot.result.requiredRetainedBusinessCapital.recurring}/mo` : null,
                ultimately: ultimatelySnapshot ? `$${ultimatelySnapshot.result.requiredRetainedBusinessCapital.recurring}/mo` : null,
              },
              {
                label: "One-time capital (equipment, deposits, ...)",
                now: nowSnapshot ? `$${nowSnapshot.result.requiredRetainedBusinessCapital.oneTime}` : null,
                next: nextSnapshot ? `$${nextSnapshot.result.requiredRetainedBusinessCapital.oneTime}` : null,
                ultimately: ultimatelySnapshot ? `$${ultimatelySnapshot.result.requiredRetainedBusinessCapital.oneTime}` : null,
              },
            ]}
          />
        </div>
      </details>

      {/* G — Capacity + Demand */}
      <details className="rounded-lg border border-ink/15 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Capacity + Demand</summary>
        <div className="mt-3">
          <CompareTable
            rows={[
              {
                label: "Capacity / demand signal",
                now: nowSnapshot ? (nowSnapshot.result.capacitySignal === "INSUFFICIENT_DATA" ? "Not assessed" : nowSnapshot.result.capacitySignal.replace(/_/g, " ").toLowerCase()) : null,
                next: nextSnapshot ? (nextSnapshot.result.capacitySignal === "INSUFFICIENT_DATA" ? "Not assessed" : nextSnapshot.result.capacitySignal.replace(/_/g, " ").toLowerCase()) : null,
                ultimately: ultimatelySnapshot ? (ultimatelySnapshot.result.capacitySignal === "INSUFFICIENT_DATA" ? "Not assessed" : ultimatelySnapshot.result.capacitySignal.replace(/_/g, " ").toLowerCase()) : null,
              },
            ]}
          />
        </div>
      </details>

      {/* I — Assumptions + Unknowns */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Assumptions + unknowns — what's materially doing the work</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {assumptionsByScenario.map(({ type, snapshot }) => (
            <div key={type} className="rounded-md border border-ink/10 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{SCENARIO_LABELS[type]}</p>
              {!snapshot ? (
                <p className="mt-2 text-ink/40">Not yet built</p>
              ) : (
                (() => {
                  const notes = collectMaterialAssumptions(snapshot);
                  return notes.length === 0 ? (
                    <p className="mt-2 text-ink/50">No material assumptions flagged.</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-1 text-xs text-ink/70">
                      {notes.map((n) => (
                        <li key={n.id}>{n.text}</li>
                      ))}
                    </ul>
                  );
                })()
              )}
            </div>
          ))}
        </div>
      </section>
    </WizardShell>
  );
}
