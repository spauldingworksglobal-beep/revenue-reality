"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ConfidenceLevel } from "@revenue-reality/domain";
import { ValidationError } from "@revenue-reality/validation";
import {
  assessOwnershipRoleFit,
  buildNextScenarioInput,
  buildNowScenarioInput,
  buildUltimatelyScenarioInput,
  formatMoney,
  resolveNextLifeCategories,
  resolveNextSecurityItems,
  runScenario,
  sumKnownOperatingCost,
  withNextResultCaveats,
  withNowResultCaveats,
  withUltimatelyResultCaveats,
  type UltimatelyScenarioMissingReason,
} from "@revenue-reality/revenue-engine";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { OWNERSHIP_INTENT_OPTIONS } from "@/lib/presets";
import { useLifeReality } from "@/lib/life-store";
import { useNow } from "@/lib/now-store";
import { useNext } from "@/lib/next-store";
import { useUltimately } from "@/lib/ultimately-store";

const MISSING_LABELS: Record<UltimatelyScenarioMissingReason, { label: string; href: string }> = {
  NO_USABLE_REVENUE_STREAM: { label: "At least one revenue stream with a price and a Cost of Delivery entered for the mature model", href: "/ultimately/streams" },
};

const ROLE_FIT_MESSAGES: Record<string, (ownershipLabel: string) => string> = {
  OWNER_HOURS_MAY_CONTRADICT_INTENDED_MODEL: (ownershipLabel) =>
    `You said this business should ultimately be "${ownershipLabel}," but this model still shows confirmed owner hours. Revenue Reality never reduces hours automatically — confirm this is intentional, or adjust Intended Time Reality or the ownership model.`,
  OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE: () =>
    `You said some of this work should no longer depend on you, but this model still lists it as work you continue to perform. Revenue Reality never invents a delegation resource to resolve this — reconcile it on the Time Reality or Owners/Delegation screens.`,
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  EXACT: "Exact",
  STRONG_ESTIMATE: "Strong estimate",
  ROUGH_ESTIMATE: "Rough estimate",
  INCOMPLETE: "Incomplete",
};

function asPercentDisplay(ratio: string): string {
  return `${(Number(ratio) * 100).toFixed(2)}%`;
}

export default function UltimatelyResultPage() {
  const { owners, revenueStreams, restructureDate, businessName, currentBusinessHoursWeek, currentAvailableHoursWeek, currentCategories, currentSecurity, workToEventuallyDelegate } = useLifeReality();
  const now = useNow();
  const next = useNext();
  const ultimately = useUltimately();

  const activeStreams = useMemo(() => revenueStreams.filter((s) => s.active), [revenueStreams]);
  const streamLabelById = useMemo(() => new Map(revenueStreams.map((s) => [s.id, s.name || "Unnamed stream"])), [revenueStreams]);
  const ownerLabelById = useMemo(() => new Map(owners.map((o) => [o.id, o.label || "Unnamed owner"])), [owners]);

  const ultimatelyAssembly = useMemo(
    () =>
      buildUltimatelyScenarioInput({
        scenarioId: "ultimately",
        owners,
        activeStreams,
        streamInputs: ultimately.streamInputs,
        operatingCosts: ultimately.operatingCosts,
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
      }),
    [owners, activeStreams, ultimately, restructureDate],
  );

  // Comparison baseline: NEXT if the owner went through it, otherwise NOW —
  // reads that scenario's own live current state, exactly the way NEXT's
  // result page reads NOW's live state for its own "what changes" section.
  // NEXT's life/security figures must go through its own resolver (its
  // snapshot only carries CURRENT/INTENDED; NEXT's own selections resolve
  // the actual NEXT-horizon amount) — mirrors next/result/page.tsx exactly.
  const nextCategoriesForComparison = useMemo(
    () => resolveNextLifeCategories(next.snapshotCurrentCategories, next.snapshotIntendedCategories, next.nextLifeCategorySelections),
    [next.snapshotCurrentCategories, next.snapshotIntendedCategories, next.nextLifeCategorySelections],
  );
  const nextSecurityForComparison = useMemo(
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
            ownerInputs: next.ownerInputs,
            nextBusinessHoursWeek: next.nextBusinessHoursWeek,
            nextAvailableHoursWeek: next.nextAvailableHoursWeek,
            otherTimeClaims: [],
            lifePriorityReservations: next.nextLifePriorities,
            distributionPolicy: next.distributionPolicy,
            distributionPercents: next.distributionPercents,
            capitalItems: next.capitalItems,
            delegationItems: next.delegationItems,
            nextLifeCategories: nextCategoriesForComparison,
            nextSecurity: nextSecurityForComparison,
            nextFundingConfirmation: next.nextFundingConfirmation,
            restructureDate,
            capacity: next.capacity,
          })
        : null,
    [next, owners, activeStreams, restructureDate, nextCategoriesForComparison, nextSecurityForComparison],
  );

  const nowAssembly = useMemo(
    () =>
      buildNowScenarioInput({
        scenarioId: "now",
        owners,
        activeStreams,
        streamInputs: now.streamInputs,
        operatingCosts: now.operatingCosts,
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

  if (ultimatelyAssembly.status === "INCOMPLETE") {
    return (
      <WizardShell
        eyebrow="ULTIMATELY · Result"
        title="A few things are still needed before we can compute your mature model"
        intro={<p>Nothing is lost — go back and fill these in, then return here.</p>}
        backHref="/ultimately/capacity"
      >
        <ul className="flex flex-col gap-2">
          {ultimatelyAssembly.missing.map((m) => (
            <li key={m} className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
              <span>{MISSING_LABELS[m].label}</span>
              <Link href={MISSING_LABELS[m].href} className="text-xs font-medium text-accent underline">
                Go fix this
              </Link>
            </li>
          ))}
        </ul>
        <EphemeralNotice />
      </WizardShell>
    );
  }

  let result;
  let runError: string | null = null;
  try {
    result = withUltimatelyResultCaveats(runScenario(ultimatelyAssembly.input, { revisionId: "ultimately-preview" }), ultimatelyAssembly);
  } catch (e) {
    runError = e instanceof ValidationError ? e.message : e instanceof Error ? e.message : "Something in your ULTIMATELY inputs doesn't add up yet.";
  }

  if (!result) {
    return (
      <WizardShell eyebrow="ULTIMATELY · Result" title="This doesn't quite add up yet" backHref="/ultimately/distribution">
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {runError}
        </p>
      </WizardShell>
    );
  }

  const hasUnknownDelegationCost = result.confidenceFlags.some((f) => f.field === "delegationItems" && f.confidence === "INCOMPLETE");

  // Diagnoses a contradiction between the owner's stated intended ownership
  // model and the mature model as actually built — never resolves it (no
  // auto-reducing hours, no invented delegation resource). Only
  // RUNS_WITHOUT_ME/ASSET carry an owner-independence expectation to check.
  const roleFit = assessOwnershipRoleFit({
    intendedOwnershipModel: ultimately.snapshotIntendedOwnershipModel,
    ownerBusinessHoursWeek: ultimately.snapshotUltimateBusinessHoursWeek,
    workOwnerContinuesToPerform: ultimately.ultimatelyWorkToContinue,
    workOwnerSaidShouldNotDependOnThem: workToEventuallyDelegate,
  });
  const ownershipModelLabel = OWNERSHIP_INTENT_OPTIONS.find((o) => o.value === ultimately.snapshotIntendedOwnershipModel)?.label ?? "";

  let baselineResult: ReturnType<typeof runScenario> | null = null;
  let baselineLabel: "NEXT" | "NOW" | null = null;
  if (nextAssembly && nextAssembly.status === "READY") {
    try {
      baselineResult = withNextResultCaveats(runScenario(nextAssembly.input, { revisionId: "next-for-comparison" }), nextAssembly);
      baselineLabel = "NEXT";
    } catch {
      baselineResult = null;
    }
  }
  if (!baselineResult && nowAssembly.status === "READY") {
    try {
      baselineResult = withNowResultCaveats(runScenario(nowAssembly.input, { revisionId: "now-for-comparison" }), nowAssembly);
      baselineLabel = "NOW";
    } catch {
      baselineResult = null;
    }
  }

  const differences: string[] = [];
  const baselineInput = baselineLabel === "NEXT" && nextAssembly?.status === "READY" ? nextAssembly.input : nowAssembly.status === "READY" ? nowAssembly.input : null;
  if (baselineResult && baselineInput) {
    for (const stream of result.perStreamEconomics) {
      const ultimatelyPrice = ultimatelyAssembly.input.streams.find((s) => s.streamId === stream.streamId)?.priceOrAvgValue.value;
      const baselinePrice = baselineInput.streams.find((s) => s.streamId === stream.streamId)?.priceOrAvgValue.value;
      if (ultimatelyPrice && baselinePrice && ultimatelyPrice !== baselinePrice) {
        differences.push(`Price for ${streamLabelById.get(stream.streamId) ?? stream.streamId} moves from $${baselinePrice} → $${ultimatelyPrice}`);
      }
    }
    if (result.requiredVolumeByStream && baselineResult.requiredVolumeByStream) {
      for (const v of result.requiredVolumeByStream) {
        const baselineV = baselineResult.requiredVolumeByStream.find((x) => x.streamId === v.streamId);
        if (baselineV && baselineV.volume !== v.volume) {
          differences.push(`Required sales volume for ${streamLabelById.get(v.streamId) ?? v.streamId} moves from ${baselineV.volume} → ${v.volume}`);
        }
      }
    }
    const baselineKnownOpex = sumKnownOperatingCost(baselineInput.operatingCosts);
    const ultimatelyKnownOpex = sumKnownOperatingCost(ultimatelyAssembly.input.operatingCosts);
    const opexDelta = Number(formatMoney(ultimatelyKnownOpex.monthly)) - Number(formatMoney(baselineKnownOpex.monthly));
    if (Math.abs(opexDelta) >= 0.01) {
      differences.push(`Known recurring operating costs ${opexDelta > 0 ? "increase" : "decrease"} by $${Math.abs(opexDelta).toFixed(2)}/mo`);
    }
    for (const owner of owners) {
      const baselineHours = baselineInput.ownerInputs.find((o) => o.ownerId === owner.id)?.hoursWeek.value;
      const ultimatelyHours = ultimatelyAssembly.input.ownerInputs.find((o) => o.ownerId === owner.id)?.hoursWeek.value;
      if (baselineHours !== undefined && ultimatelyHours !== undefined && baselineHours !== ultimatelyHours) {
        differences.push(`${ownerLabelById.get(owner.id) ?? "An owner"}'s hours move from ${baselineHours}/week → ${ultimatelyHours}/week`);
      }
    }
    const baselineRetained = Number(baselineResult.requiredRetainedBusinessCapital.total);
    const ultimatelyRetained = Number(result.requiredRetainedBusinessCapital.total);
    if (Math.abs(ultimatelyRetained - baselineRetained) >= 0.01) {
      differences.push(`Required retained business capital moves from $${baselineResult.requiredRetainedBusinessCapital.total} → $${result.requiredRetainedBusinessCapital.total}`);
    }
    if (baselineResult.primaryOwnerBenefitVsRequirement && result.primaryOwnerBenefitVsRequirement) {
      const baselineReq = baselineResult.primaryOwnerBenefitVsRequirement.businessFundedPersonalEconomicRequirement;
      const ultimatelyReq = result.primaryOwnerBenefitVsRequirement.businessFundedPersonalEconomicRequirement;
      if (baselineReq !== ultimatelyReq) {
        differences.push(`Business-funded personal economic requirement moves from $${baselineReq}/mo → $${ultimatelyReq}/mo`);
      }
    }
  }

  const delegatedFunctions = ultimatelyAssembly.input.delegationItems.map((d) => d.functionLabel);

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Result"
      title={`What ${businessName.trim() === "" ? "this business" : businessName} must ultimately become`}
      backHref="/ultimately/capacity"
    >
      <EphemeralNotice />

      {(ultimatelyAssembly.unknownOwnershipOwnerIds.length > 0 || ultimatelyAssembly.mixWeightFallbackApplied || ultimatelyAssembly.excludedStreamIds.length > 0) && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {ultimatelyAssembly.unknownOwnershipOwnerIds.length > 0 && (
            <p>Ownership isn&rsquo;t fully confirmed for {ultimatelyAssembly.unknownOwnershipOwnerIds.length === 1 ? "one owner" : "some owners"} — this stays unknown rather than assumed.</p>
          )}
          {ultimatelyAssembly.mixWeightFallbackApplied && (
            <p>The revenue split between streams isn&rsquo;t confirmed — an equal-weight split is used as a temporary <strong>modeling assumption</strong>, not a known fact.</p>
          )}
          {ultimatelyAssembly.excludedStreamIds.length > 0 && (
            <p>Not included yet (missing price or Cost of Delivery): {ultimatelyAssembly.excludedStreamIds.map((id) => streamLabelById.get(id) ?? id).join(", ")}.</p>
          )}
        </div>
      )}

      {roleFit.applies && roleFit.flags.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">This mature model may not match your intended ownership role yet:</p>
          {roleFit.flags.map((flag) => (
            <p key={flag}>{ROLE_FIT_MESSAGES[flag]?.(ownershipModelLabel)}</p>
          ))}
        </div>
      )}

      {result.requiredRevenue === null && (
        <div className="flex flex-col gap-2 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
          <p className="font-medium">Required Revenue isn&rsquo;t available yet — everything below it still is.</p>
          <p className="text-ink/70">
            The mature model hasn&rsquo;t confirmed how much of this life the business is responsible for funding,
            so Required Revenue and the owner-support comparison can&rsquo;t be solved truthfully yet. Stream
            economics, margins, operating costs, retained capital, capacity, and time all still reflect what&rsquo;s
            known below.
          </p>
          <Link href="/ultimately/life" className="w-fit text-xs font-medium text-accent underline">
            Confirm the business-funded share to unlock Required Revenue
          </Link>
        </div>
      )}

      {/* The life this model supports */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">The life this model supports</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink/60">Intended total personal economic requirement</dt>
          <dd>${ultimatelyAssembly.input.lifeAssumption.lifeRequirement} living + ${ultimatelyAssembly.input.lifeAssumption.securityRequirement} security</dd>
          <dt className="text-ink/60">Business-funded requirement</dt>
          <dd>{result.primaryOwnerBenefitVsRequirement ? `$${result.primaryOwnerBenefitVsRequirement.businessFundedPersonalEconomicRequirement}/mo` : "Needs funding confirmation"}</dd>
          <dt className="text-ink/60">Intended owner hours (primary)</dt>
          <dd>{ultimately.snapshotUltimateBusinessHoursWeek.confidence === "INCOMPLETE" ? "not set" : `${ultimately.snapshotUltimateBusinessHoursWeek.value}/week`}</dd>
        </dl>
        {ultimately.ultimatelyWorkToContinue.length > 0 && (
          <p className="mt-2 text-sm text-ink/70">Owner still performs: {ultimately.ultimatelyWorkToContinue.join(", ")}</p>
        )}
        {delegatedFunctions.length > 0 && (
          <p className="mt-1 text-sm text-ink/70">No longer depends on the owner: {delegatedFunctions.join(", ")}</p>
        )}
      </section>

      {/* The business required to support it */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">The business required to support it</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink/60">Required revenue</dt>
          <dd>
            {result.requiredRevenue
              ? hasUnknownDelegationCost
                ? `At least $${result.requiredRevenue} — one or more replacement labor costs aren't known yet`
                : `$${result.requiredRevenue}`
              : "Incomplete"}
          </dd>
          <dt className="text-ink/60">Weighted contribution margin</dt>
          <dd>{asPercentDisplay(result.weightedContributionMargin)}</dd>
          <dt className="text-ink/60">Mature operating costs (known)</dt>
          <dd>${formatMoney(sumKnownOperatingCost(ultimatelyAssembly.input.operatingCosts).monthly)}/mo</dd>
          <dt className="text-ink/60">Retained business capital</dt>
          <dd>${result.requiredRetainedBusinessCapital.recurring}/mo + ${result.requiredRetainedBusinessCapital.oneTime} one-time</dd>
          <dt className="text-ink/60">Capacity read</dt>
          <dd>{result.capacitySignal === "INSUFFICIENT_DATA" ? "Not assessed" : result.capacitySignal.replace(/_/g, " ").toLowerCase()}</dd>
        </dl>
        {result.requiredVolumeByStream && (
          <p className="mt-2 text-sm text-ink/70">
            Required sales: {result.requiredVolumeByStream.map((v) => `${v.volume} ${streamLabelById.get(v.streamId) ?? v.streamId}`).join(", ")}
          </p>
        )}
        {ultimately.transitionOnlyCosts.length > 0 && (
          <p className="mt-2 text-xs text-ink/50">
            Not included above — transition-only, never permanent mature OPEX: {ultimately.transitionOnlyCosts.map((c) => `${c.category} ($${c.amount}/${c.cadence.toLowerCase()})`).join(", ")}.
          </p>
        )}
      </section>

      {/* What this model must provide the owner — modeled, not actual/historical */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What this model must provide the owner</h2>
        <p className="mt-1 text-xs text-ink/50">
          Modeled, not actual — this is what the mature business would need to produce, not a record of payments that have happened.
        </p>
        {result.ownerEconomicsResults ? (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink/70">
            {result.ownerEconomicsResults.map((r) => (
              <li key={r.ownerId}>
                {ownerLabelById.get(r.ownerId) ?? "Owner"}: ${r.totalOwnerEconomicBenefit} total modeled owner economic benefit (target labor compensation ${r.laborCompensation} + required ownership return ${r.profitDistribution})
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink/50">Modeled owner economic benefit needs Required Revenue first — see above.</p>
        )}
      </section>

      {/* What changes from NEXT/NOW */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What changes from {baselineLabel ?? "NEXT"}</h2>
        {!baselineResult ? (
          <p className="mt-2 text-sm text-ink/50">No prior scenario result is available for comparison yet.</p>
        ) : differences.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">No material differences detected between {baselineLabel} and this mature model yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {differences.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </section>

      {/* What the business still depends on */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What the business still depends on</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-ink/70">
          <li>Owner labor: {ultimately.snapshotUltimateBusinessHoursWeek.value}/week{ultimately.ultimatelyWorkToContinue.length > 0 ? ` — ${ultimately.ultimatelyWorkToContinue.join(", ")}` : ""}</li>
          <li>{hasUnknownDelegationCost ? "One or more replacement labor costs are still unresolved." : delegatedFunctions.length > 0 ? "All delegated functions have a known replacement cost." : "No delegated functions yet."}</li>
          <li>{result.capacitySignal === "INSUFFICIENT_DATA" ? "Capacity/demand not yet assessed." : `Capacity/demand: ${result.capacitySignal.replace(/_/g, " ").toLowerCase()}.`}</li>
        </ul>
      </section>

      {/* Signals — the Life/Time/Role/Business/Sales tests, each on its own */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Signals — read each on its own, never as one verdict</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink/60">Life</dt>
          <dd>
            {result.ownerSupportSignal === "BUSINESS_SUPPORTS_OWNER"
              ? "This model would economically provide what you said it should"
              : result.ownerSupportSignal === "OWNER_SUPPORTS_BUSINESS"
                ? "The owner would still be supporting the business in this model"
                : result.ownerSupportSignal === "BOTH"
                  ? "Both — mutual support, modeled"
                  : "Not enough data yet"}
          </dd>
          <dt className="text-ink/60">Time</dt>
          <dd>{result.timeSignal === "FITS" ? "Operates within your intended business hours" : result.timeSignal === "EXCEEDS_AVAILABLE" ? "Exceeds your intended available hours" : "Not enough data yet"}</dd>
          <dt className="text-ink/60">Role</dt>
          <dd>
            {roleFit.applies && roleFit.flags.length > 0
              ? "May not match your intended ownership model — see above"
              : hasUnknownDelegationCost
                ? "Still depends on unresolved delegation costs"
                : "Owner's role in this model is fully resolved"}
          </dd>
          <dt className="text-ink/60">Business</dt>
          <dd>{ultimately.opexListIsPartial ? "Operating costs are known to be incomplete" : "Known operating costs and retention are complete"}</dd>
          <dt className="text-ink/60">Sales / Capacity</dt>
          <dd>{result.capacitySignal === "INSUFFICIENT_DATA" ? "Not assessed yet" : result.capacitySignal.replace(/_/g, " ").toLowerCase()}</dd>
        </dl>
      </section>

      {result.confidenceFlags.length > 0 && (
        <section className="rounded-lg border border-ink/15 bg-white p-4">
          <h2 className="text-sm font-semibold">What this result is still uncertain about</h2>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-ink/70">
            {result.confidenceFlags.map((f, i) => (
              <li key={i}>
                {f.field} — <span className="font-medium">{CONFIDENCE_LABELS[f.confidence]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </WizardShell>
  );
}
