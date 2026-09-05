"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ConfidenceLevel } from "@revenue-reality/domain";
import { ValidationError } from "@revenue-reality/validation";
import {
  buildIntendedLifeCategories,
  buildIntendedSecurityItems,
  buildNowScenarioInput,
  buildNextScenarioInput,
  resolveNextLifeCategories,
  resolveNextSecurityItems,
  runScenario,
  sumKnownOperatingCost,
  withNextResultCaveats,
  withNowResultCaveats,
  formatMoney,
  type NextScenarioMissingReason,
} from "@revenue-reality/revenue-engine";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { useNow } from "@/lib/now-store";
import { useNext, type NextImprovementType } from "@/lib/next-store";

const IMPROVEMENT_LABELS: Record<NextImprovementType, string> = {
  PAY_MYSELF_CONSISTENTLY: "Pay myself consistently",
  PAY_MYSELF_MORE: "Pay myself more",
  WORK_FEWER_HOURS: "Work fewer hours",
  STOP_PERSONAL_MONEY_IN: "Stop putting personal money into the business",
  REDUCE_OTHER_INCOME_DEPENDENCE: "Reduce dependence on another job/income source",
  BUILD_RESERVE: "Build a business reserve",
  HIRE_OR_DELEGATE: "Hire or delegate work",
  MORE_CONSISTENT_SALES: "Generate sales more consistently",
  INCREASE_CAPACITY: "Increase capacity",
  STRENGTHEN_OPERATING_FOUNDATION: "Strengthen the operating foundation",
  OTHER: "Other",
};

const MISSING_LABELS: Record<NextScenarioMissingReason, { label: string; href: string }> = {
  NO_USABLE_REVENUE_STREAM: { label: "At least one revenue stream with a price and a Cost of Delivery entered for NEXT", href: "/next/streams" },
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

export default function NextResultPage() {
  const {
    owners,
    revenueStreams,
    currentCategories,
    lifeChanges,
    currentSecurity,
    securityChanges,
    lifeProfileId,
    restructureDate,
    businessName,
    currentBusinessHoursWeek,
    currentAvailableHoursWeek,
  } = useLifeReality();
  const now = useNow();
  const next = useNext();

  const activeStreams = useMemo(() => revenueStreams.filter((s) => s.active), [revenueStreams]);
  const streamLabelById = useMemo(() => new Map(revenueStreams.map((s) => [s.id, s.name || "Unnamed stream"])), [revenueStreams]);
  const ownerLabelById = useMemo(() => new Map(owners.map((o) => [o.id, o.label || "Unnamed owner"])), [owners]);

  // NOW's own comparison still reads live Current/Intended (NOW has no
  // snapshot — it always reflects the live state, same as elsewhere).
  const intendedCategories = useMemo(() => buildIntendedLifeCategories(lifeProfileId, currentCategories, lifeChanges), [lifeProfileId, currentCategories, lifeChanges]);
  const intendedSecurity = useMemo(() => buildIntendedSecurityItems(lifeProfileId, currentSecurity, securityChanges), [lifeProfileId, currentSecurity, securityChanges]);
  // NEXT resolves against its own frozen snapshot (captured at
  // initializeFromNow) — never live Current/Intended — so a later edit to
  // CURRENT life/security can't silently change an already-built NEXT model.
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
      buildNextScenarioInput({
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
        nextLifeCategories: nextCategories,
        nextSecurity: nextSecurityItems,
        nextFundingConfirmation: next.nextFundingConfirmation,
        restructureDate,
        capacity: next.capacity,
      }),
    [owners, activeStreams, next, nextCategories, nextSecurityItems, restructureDate],
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

  if (nextAssembly.status === "INCOMPLETE") {
    return (
      <WizardShell
        eyebrow="NEXT · Result"
        title="A few things are still needed before we can compute your NEXT model"
        intro={<p>Nothing is lost — go back and fill these in, then return here.</p>}
        backHref="/next/capacity"
      >
        <ul className="flex flex-col gap-2">
          {nextAssembly.missing.map((m) => (
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
    result = withNextResultCaveats(runScenario(nextAssembly.input, { revisionId: "next-preview" }), nextAssembly);
  } catch (e) {
    runError = e instanceof ValidationError ? e.message : e instanceof Error ? e.message : "Something in your NEXT inputs doesn't add up yet.";
  }

  if (!result) {
    return (
      <WizardShell eyebrow="NEXT · Result" title="This doesn't quite add up yet" backHref="/next/distribution">
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {runError}
        </p>
      </WizardShell>
    );
  }

  let nowResult: ReturnType<typeof runScenario> | null = null;
  if (nowAssembly.status === "READY") {
    try {
      nowResult = withNowResultCaveats(runScenario(nowAssembly.input, { revisionId: "now-for-comparison" }), nowAssembly);
    } catch {
      nowResult = null;
    }
  }

  const differences: string[] = [];
  if (nowResult) {
    for (const nextStream of result.perStreamEconomics) {
      const nowStream = nowResult.perStreamEconomics.find((s) => s.streamId === nextStream.streamId);
      const nextPrice = nextAssembly.input.streams.find((s) => s.streamId === nextStream.streamId)?.priceOrAvgValue.value;
      const nowPrice = nowAssembly.status === "READY" ? nowAssembly.input.streams.find((s) => s.streamId === nextStream.streamId)?.priceOrAvgValue.value : undefined;
      if (nextPrice && nowPrice && nextPrice !== nowPrice) {
        differences.push(`Price for ${streamLabelById.get(nextStream.streamId) ?? nextStream.streamId} moves from $${nowPrice} → $${nextPrice}`);
      }
    }
    if (result.requiredVolumeByStream && nowResult.requiredVolumeByStream) {
      for (const v of result.requiredVolumeByStream) {
        const nowV = nowResult.requiredVolumeByStream.find((x) => x.streamId === v.streamId);
        if (nowV && nowV.volume !== v.volume) {
          differences.push(`Required sales volume for ${streamLabelById.get(v.streamId) ?? v.streamId} moves from ${nowV.volume} → ${v.volume}`);
        }
      }
    }
    const nowKnownOpex = sumKnownOperatingCost(nowAssembly.status === "READY" ? nowAssembly.input.operatingCosts : []);
    const nextKnownOpex = sumKnownOperatingCost(nextAssembly.input.operatingCosts);
    const opexDelta = Number(formatMoney(nextKnownOpex.monthly)) - Number(formatMoney(nowKnownOpex.monthly));
    if (Math.abs(opexDelta) >= 0.01) {
      differences.push(`Known recurring operating costs ${opexDelta > 0 ? "increase" : "decrease"} by $${Math.abs(opexDelta).toFixed(2)}/mo`);
    }
    for (const owner of owners) {
      const nowHours = nowAssembly.status === "READY" ? nowAssembly.input.ownerInputs.find((o) => o.ownerId === owner.id)?.hoursWeek.value : undefined;
      const nextHours = nextAssembly.input.ownerInputs.find((o) => o.ownerId === owner.id)?.hoursWeek.value;
      if (nowHours !== undefined && nextHours !== undefined && nowHours !== nextHours) {
        differences.push(`${ownerLabelById.get(owner.id) ?? "An owner"}'s hours move from ${nowHours}/week → ${nextHours}/week`);
      }
      const nowInvestment = nowAssembly.status === "READY" ? nowAssembly.input.ownerInputs.find((o) => o.ownerId === owner.id)?.personalCashInvestment : undefined;
      const nextInvestment = nextAssembly.input.ownerInputs.find((o) => o.ownerId === owner.id)?.personalCashInvestment;
      if (nowInvestment && nowInvestment !== "0.00" && nextInvestment === "0.00") {
        differences.push(`${ownerLabelById.get(owner.id) ?? "An owner"}'s personal cash infusion can stop`);
      }
    }
    const nowRetained = Number(nowResult.requiredRetainedBusinessCapital.total);
    const nextRetained = Number(result.requiredRetainedBusinessCapital.total);
    if (Math.abs(nextRetained - nowRetained) >= 0.01) {
      differences.push(`Required retained business capital moves from $${nowResult.requiredRetainedBusinessCapital.total} → $${result.requiredRetainedBusinessCapital.total}`);
    }
  }

  const primaryImprovementLabel =
    next.primaryImprovement === "OTHER"
      ? next.primaryImprovementOtherLabel || "Other"
      : next.primaryImprovement
        ? IMPROVEMENT_LABELS[next.primaryImprovement]
        : "Not yet chosen";

  return (
    <WizardShell
      eyebrow="NEXT · Result"
      title={`What ${businessName.trim() === "" ? "this business" : businessName} must become for this NEXT step`}
      backHref="/next/capacity"
    >
      <EphemeralNotice />

      {(nextAssembly.unknownOwnershipOwnerIds.length > 0 || nextAssembly.mixWeightFallbackApplied || nextAssembly.excludedStreamIds.length > 0) && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {nextAssembly.unknownOwnershipOwnerIds.length > 0 && (
            <p>Ownership isn&rsquo;t fully confirmed for {nextAssembly.unknownOwnershipOwnerIds.length === 1 ? "one owner" : "some owners"} — this stays unknown rather than assumed.</p>
          )}
          {nextAssembly.mixWeightFallbackApplied && (
            <p>The revenue split between streams isn&rsquo;t confirmed — an equal-weight split is used as a temporary <strong>modeling assumption</strong>, not a known fact.</p>
          )}
          {nextAssembly.excludedStreamIds.length > 0 && (
            <p>Not included yet (missing price or Cost of Delivery): {nextAssembly.excludedStreamIds.map((id) => streamLabelById.get(id) ?? id).join(", ")}.</p>
          )}
        </div>
      )}

      {result.requiredRevenue === null && (
        <div className="flex flex-col gap-2 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
          <p className="font-medium">Required Revenue isn&rsquo;t available yet — everything below it still is.</p>
          <p className="text-ink/70">
            NEXT hasn&rsquo;t confirmed how much of this life the business is responsible for funding, so Required
            Revenue and the owner-support comparison can&rsquo;t be solved truthfully yet. Stream economics, margins,
            operating costs, retained capital, capacity, and time all still reflect what&rsquo;s known below.
          </p>
          <Link href="/next/life" className="w-fit text-xs font-medium text-accent underline">
            Confirm NEXT&rsquo;s business-funded share to unlock Required Revenue
          </Link>
        </div>
      )}

      {/* What becomes possible */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What becomes possible</h2>
        <p className="mt-2 text-sm">
          Primary: <strong>{primaryImprovementLabel}</strong>
        </p>
        {next.supportingImprovements.length > 0 && (
          <p className="mt-1 text-sm text-ink/70">
            Also: {next.supportingImprovements.map((v) => IMPROVEMENT_LABELS[v]).join(", ")}
          </p>
        )}
      </section>

      {/* What the business must support */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What the business must support</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink/60">NEXT personal economic requirement</dt>
          <dd>${nextAssembly.input.lifeAssumption.lifeRequirement} living + ${nextAssembly.input.lifeAssumption.securityRequirement} security</dd>
          <dt className="text-ink/60">NEXT business-funded requirement</dt>
          <dd>{result.primaryOwnerBenefitVsRequirement ? `$${result.primaryOwnerBenefitVsRequirement.businessFundedPersonalEconomicRequirement}/mo` : "Needs funding confirmation"}</dd>
          <dt className="text-ink/60">NEXT owner hours (primary)</dt>
          <dd>{next.nextBusinessHoursWeek.confidence === "INCOMPLETE" ? "not set" : `${next.nextBusinessHoursWeek.value}/week`}</dd>
        </dl>
      </section>

      {/* What the business must become */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What the business must become</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink/60">Required revenue</dt>
          <dd>{result.requiredRevenue ? `$${result.requiredRevenue}` : "Incomplete"}</dd>
          <dt className="text-ink/60">Weighted contribution margin</dt>
          <dd>{asPercentDisplay(result.weightedContributionMargin)}</dd>
          <dt className="text-ink/60">Known recurring operating costs</dt>
          <dd>${formatMoney(sumKnownOperatingCost(nextAssembly.input.operatingCosts).monthly)}/mo</dd>
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
        {result.ownerEconomicsResults ? (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink/70">
            {result.ownerEconomicsResults.map((r) => (
              <li key={r.ownerId}>
                {ownerLabelById.get(r.ownerId) ?? "Owner"}: ${r.totalOwnerEconomicBenefit} total economic benefit (labor ${r.laborCompensation} + distribution ${r.profitDistribution})
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink/50">Owner economic benefit needs Required Revenue first — see above.</p>
        )}
      </section>

      {/* What changes from NOW */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What changes from NOW</h2>
        {!nowResult ? (
          <p className="mt-2 text-sm text-ink/50">NOW&rsquo;s own result isn&rsquo;t available for comparison yet — build it at the NOW screens first.</p>
        ) : differences.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">No material differences detected between NOW and this NEXT model yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {differences.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Signals */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Signals — read each on its own, never as one verdict</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink/60">Owner support</dt>
          <dd>
            {result.ownerSupportSignal === "BUSINESS_SUPPORTS_OWNER"
              ? "The business supports the owner in this model"
              : result.ownerSupportSignal === "OWNER_SUPPORTS_BUSINESS"
                ? "The owner would still be supporting the business"
                : result.ownerSupportSignal === "BOTH"
                  ? "Both — mutual support"
                  : "Not enough data yet"}
          </dd>
          <dt className="text-ink/60">Time Reality fit</dt>
          <dd>{result.timeSignal === "FITS" ? "Fits within available hours" : result.timeSignal === "EXCEEDS_AVAILABLE" ? "Exceeds available hours" : "Not enough data yet"}</dd>
          <dt className="text-ink/60">Capacity / demand</dt>
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
