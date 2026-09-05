"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ConfidenceLevel } from "@revenue-reality/domain";
import { ValidationError } from "@revenue-reality/validation";
import {
  buildNowScenarioInput,
  formatMoney,
  runScenario,
  sumKnownOperatingCost,
  withNowResultCaveats,
  type NowScenarioMissingReason,
} from "@revenue-reality/revenue-engine";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { useNow } from "@/lib/now-store";

const MISSING_LABELS: Record<NowScenarioMissingReason, { label: string; href: string }> = {
  ACTUAL_REVENUE: { label: "Actual revenue for the current period", href: "/now" },
  NO_USABLE_REVENUE_STREAM: { label: "At least one revenue stream with a price and a Cost of Delivery entered", href: "/now/streams" },
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

export default function NowResultPage() {
  const {
    owners,
    revenueStreams,
    currentCategories,
    currentSecurity,
    currentBusinessHoursWeek,
    currentAvailableHoursWeek,
    otherTimeClaims,
    restructureDate,
    businessName,
  } = useLifeReality();
  const {
    actualRevenue,
    revenuePeriod,
    cashCollected,
    hasAccountsReceivable,
    accountsReceivableAmount,
    currentFundingConfirmation,
    streamInputs,
    operatingCosts,
    opexListIsPartial,
    ownerInputs,
    distributionPolicy,
    distributionPercents,
    capitalItems,
  } = useNow();

  const activeStreams = useMemo(() => revenueStreams.filter((s) => s.active), [revenueStreams]);
  const streamLabelById = useMemo(() => new Map(revenueStreams.map((s) => [s.id, s.name || "Unnamed stream"])), [revenueStreams]);

  const assembly = useMemo(
    () =>
      buildNowScenarioInput({
        scenarioId: "now",
        owners,
        activeStreams,
        streamInputs,
        operatingCosts,
        ownerInputs,
        currentBusinessHoursWeek,
        currentAvailableHoursWeek,
        otherTimeClaims,
        distributionPolicy,
        distributionPercents,
        capitalItems,
        currentCategories,
        currentSecurity,
        currentFundingConfirmation,
        restructureDate,
        actualRevenue,
      }),
    [
      owners,
      activeStreams,
      streamInputs,
      operatingCosts,
      ownerInputs,
      currentBusinessHoursWeek,
      currentAvailableHoursWeek,
      otherTimeClaims,
      distributionPolicy,
      distributionPercents,
      capitalItems,
      currentCategories,
      currentSecurity,
      currentFundingConfirmation,
      restructureDate,
      actualRevenue,
    ],
  );

  if (assembly.status === "INCOMPLETE") {
    return (
      <WizardShell
        eyebrow="NOW · Result"
        title="A few things are still needed before we can compute your NOW model"
        intro={<p>Nothing is lost — go back and fill these in, then return here.</p>}
        backHref="/now/retention"
      >
        <ul className="flex flex-col gap-2">
          {assembly.missing.map((m) => (
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
    result = withNowResultCaveats(runScenario(assembly.input, { revisionId: "now-preview" }), assembly);
  } catch (e) {
    runError = e instanceof ValidationError ? e.message : e instanceof Error ? e.message : "Something in your NOW inputs doesn't add up yet.";
  }

  if (!result) {
    return (
      <WizardShell
        eyebrow="NOW · Result"
        title="This doesn't quite add up yet"
        backHref="/now/distribution"
      >
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {runError}
        </p>
      </WizardShell>
    );
  }

  const canCompareRevenueAlignment = revenuePeriod.periodType === "MONTH" && result.requiredRevenue !== null;
  const revenueGapPercent =
    canCompareRevenueAlignment && result.actualRevenue && result.requiredRevenue
      ? ((Number(result.actualRevenue) - Number(result.requiredRevenue)) / Number(result.requiredRevenue)) * 100
      : null;
  const fundingUnconfirmed = assembly.input.lifeAssumption.outsideFundingRetained === null;

  return (
    <WizardShell
      eyebrow="NOW · Result"
      title={`What ${businessName.trim() === "" ? "this business" : businessName} actually produces today`}
      backHref="/now/retention"
    >
      <EphemeralNotice />

      {(fundingUnconfirmed || assembly.unknownOwnershipOwnerIds.length > 0 || assembly.mixWeightFallbackApplied || assembly.excludedStreamIds.length > 0) && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {fundingUnconfirmed && (
            <p>
              You haven&rsquo;t confirmed how much of your current life this business is responsible for funding — Required
              Revenue and the owner-benefit comparison below aren&rsquo;t shown yet because of that. Everything else on this
              page still reflects your real numbers.{" "}
              <Link href="/now" className="font-medium underline">
                Answer this on the NOW screen
              </Link>
              .
            </p>
          )}
          {assembly.unknownOwnershipOwnerIds.length > 0 && (
            <p>
              Ownership isn&rsquo;t fully confirmed for {assembly.unknownOwnershipOwnerIds.length === 1 ? "one owner" : "some owners"} — this
              stays unknown rather than assumed, and only blocks a &ldquo;Same as ownership&rdquo; distribution rule.
            </p>
          )}
          {assembly.mixWeightFallbackApplied && (
            <p>
              The revenue split between streams isn&rsquo;t confirmed — an equal-weight split is used here as a temporary{" "}
              <strong>modeling assumption</strong>, not a known fact (see &ldquo;still uncertain about&rdquo; below). It was
              not saved back to your stream inputs.
            </p>
          )}
          {assembly.excludedStreamIds.length > 0 && (
            <p>
              Not included yet (missing price or Cost of Delivery): {assembly.excludedStreamIds.map((id) => streamLabelById.get(id) ?? id).join(", ")}.
            </p>
          )}
        </div>
      )}

      {/* What came in */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What came in</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink/60">Actual revenue</dt>
          <dd>${result.actualRevenue ?? "—"}</dd>
          <dt className="text-ink/60">Cash collected</dt>
          <dd>{cashCollected ? `$${cashCollected.value}` : "Not entered"}</dd>
          <dt className="text-ink/60">Accounts Receivable</dt>
          <dd>
            {hasAccountsReceivable === "YES" && accountsReceivableAmount
              ? `$${accountsReceivableAmount.value} owed but not yet collected`
              : hasAccountsReceivable === "NO"
                ? "None"
                : "Unknown"}
          </dd>
        </dl>
      </section>

      {/* What each sale leaves */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What each sale leaves</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {result.perStreamEconomics.map((s) => (
            <li key={s.streamId} className="rounded-md border border-ink/10 p-2">
              <p className="font-medium">{streamLabelById.get(s.streamId) ?? s.streamId}</p>
              <p className="text-ink/70">
                Gross margin (after Cost of Delivery): <strong>{asPercentDisplay(s.grossMargin)}</strong> · Contribution margin
                (after all variable costs): <strong>{asPercentDisplay(s.contributionMargin)}</strong>
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">
          Blended across all streams — weighted contribution margin: <strong>{asPercentDisplay(result.weightedContributionMargin)}</strong>
        </p>
      </section>

      {/* What it costs to operate */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What it costs to operate</h2>
        <p className="mt-2 text-sm">
          Known monthly operating costs: <strong>${formatMoney(sumKnownOperatingCost(assembly.input.operatingCosts).monthly)}</strong>{" "}
          {opexListIsPartial && <span className="text-amber-800">(known costs — this isn&rsquo;t everything)</span>}
        </p>
        {result.breakEvenFloor && (
          <p className="mt-1 text-sm text-ink/70">
            Break-even floor: <strong>${result.breakEvenFloor.revenue}</strong> —{" "}
            {result.breakEvenFloor.volumeByStream.map((v) => `${v.volume} ${streamLabelById.get(v.streamId) ?? v.streamId}`).join(", ")}
          </p>
        )}
      </section>

      {/* What the owner is contributing that the books don't show */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What owners are contributing that the books may not show</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {assembly.input.ownerInputs.map((oi) => {
            const owner = owners.find((o) => o.id === oi.ownerId);
            return (
              <li key={oi.ownerId} className="rounded-md border border-ink/10 p-2">
                <p className="font-medium">{owner?.label || "Unnamed owner"}</p>
                <p className="text-ink/70">
                  ~{oi.hoursWeek.value} hrs/week
                  {oi.personalCashInvestment !== "0.00" && <> · ${oi.personalCashInvestment} personally invested</>}
                  {oi.personallyPaidCosts !== "0.00" && <> · ${oi.personallyPaidCosts} in business costs paid personally</>}
                </p>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-ink/50">Unpaid or underpaid labor isn&rsquo;t zero — it&rsquo;s investment.</p>
      </section>

      {/* What the business needs to keep */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What the business needs to keep</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink/60">Recurring retention</dt>
          <dd>${result.requiredRetainedBusinessCapital.recurring}/mo</dd>
          <dt className="text-ink/60">One-time capital</dt>
          <dd>${result.requiredRetainedBusinessCapital.oneTime}</dd>
        </dl>
      </section>

      {/* What the current model actually provides the owner */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What the current model actually provides each owner</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {result.ownerEconomicsResults.map((r) => {
            const owner = owners.find((o) => o.id === r.ownerId);
            return (
              <li key={r.ownerId} className="rounded-md border border-ink/10 p-2">
                <p className="font-medium">{owner?.label || "Unnamed owner"}</p>
                <p className="text-ink/70">Total economic benefit: ${r.totalOwnerEconomicBenefit}</p>
              </li>
            );
          })}
        </ul>
        {result.primaryOwnerBenefitVsRequirement ? (
          <p className="mt-2 text-sm">
            Primary respondent&rsquo;s business-funded personal requirement: <strong>${result.primaryOwnerBenefitVsRequirement.businessFundedPersonalEconomicRequirement}</strong> vs.
            actual benefit received: <strong>${result.primaryOwnerBenefitVsRequirement.totalOwnerEconomicBenefit}</strong> —{" "}
            gap: <strong className={Number(result.primaryOwnerBenefitVsRequirement.gap) < 0 ? "text-red-700" : "text-emerald-700"}>
              ${result.primaryOwnerBenefitVsRequirement.gap}
            </strong>
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink/50">
            Incomplete — confirm your current funding responsibility on the{" "}
            <Link href="/now" className="font-medium text-accent underline">
              NOW screen
            </Link>{" "}
            to see this comparison.
          </p>
        )}
      </section>

      {/* What the model would need to produce for this life to work */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">What the business would need to produce for this life to work</h2>
        {result.requiredRevenue !== null && result.requiredVolumeByStream !== null ? (
          <p className="mt-2 text-sm">
            Required revenue: <strong>${result.requiredRevenue}</strong> —{" "}
            {result.requiredVolumeByStream.map((v) => `${v.volume} ${streamLabelById.get(v.streamId) ?? v.streamId}`).join(", ")}
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink/50">
            Incomplete — this is tied to your life&rsquo;s funding requirement, which hasn&rsquo;t been confirmed yet. Answer
            the current funding question on the{" "}
            <Link href="/now" className="font-medium text-accent underline">
              NOW screen
            </Link>{" "}
            to see it.
          </p>
        )}
      </section>

      {/* Signals — kept separate, never collapsed into one verdict */}
      <section className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Signals — read each on its own, never as one verdict</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink/60">Revenue alignment</dt>
          <dd>
            {canCompareRevenueAlignment && revenueGapPercent !== null
              ? `${revenueGapPercent >= 0 ? "+" : ""}${revenueGapPercent.toFixed(1)}% vs. required`
              : "Not comparable — actual revenue's period isn't the same basis as the required-revenue calculation"}
          </dd>
          <dt className="text-ink/60">Owner support</dt>
          <dd>
            {result.ownerSupportSignal === "BUSINESS_SUPPORTS_OWNER"
              ? "The business is currently supporting the owner"
              : result.ownerSupportSignal === "OWNER_SUPPORTS_BUSINESS"
                ? "The owner is currently supporting the business"
                : result.ownerSupportSignal === "BOTH"
                  ? "Both — mutual support"
                  : "Not enough data yet"}
          </dd>
          <dt className="text-ink/60">Time Reality fit</dt>
          <dd>{result.timeSignal === "FITS" ? "Fits within available hours" : result.timeSignal === "EXCEEDS_AVAILABLE" ? "Exceeds available hours" : "Not enough data yet"}</dd>
          <dt className="text-ink/60">Capacity / demand</dt>
          <dd>
            {result.capacitySignal === "INSUFFICIENT_DATA" ? "Not assessed yet" : result.capacitySignal.replace(/_/g, " ").toLowerCase()}
          </dd>
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
