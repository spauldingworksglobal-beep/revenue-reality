"use client";

import { useMemo } from "react";
import { compareTimeRequirements, type TimeHorizonSummary } from "@revenue-reality/revenue-engine";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";

function fitMessage(summary: TimeHorizonSummary, horizonLabel: string): string {
  const { businessHoursWeek, availableHoursWeek, gapHoursWeek, fitsWithinAvailable } = summary;
  if (fitsWithinAvailable) {
    return `${horizonLabel} the business uses about ${businessHoursWeek} hours/week, and your life realistically has about ${availableHoursWeek} hours/week available for it — the model fits inside that.`;
  }
  return `${horizonLabel} the business uses about ${businessHoursWeek} hours/week. Your life realistically has about ${availableHoursWeek} hours/week available for it. The model requires roughly ${gapHoursWeek} more hours than your life can sustainably give it.`;
}

function HorizonCard({ title, summary, message }: { title: string; summary: TimeHorizonSummary; message: string }) {
  return (
    <div className="rounded-lg border border-ink/15 bg-white p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink/60">Business hours/week</dt>
        <dd className="tabular-nums">{summary.businessHoursWeek}</dd>
        <dt className="text-ink/60">Realistic available hours/week</dt>
        <dd className="tabular-nums">{summary.availableHoursWeek}</dd>
      </dl>
      <p className="mt-3 text-sm text-ink/80">{message}</p>
      {summary.isPartial && (
        <p className="mt-2 text-xs text-amber-800" role="status">
          At least one of these figures is marked &ldquo;not sure&rdquo; — still usable, just worth revisiting later.
        </p>
      )}
    </div>
  );
}

export default function TimeComparePage() {
  const {
    currentBusinessHoursWeek,
    currentAvailableHoursWeek,
    ultimateBusinessHoursWeek,
    intendedAvailableHoursWeek,
    desiredWorkTypes,
    workToEventuallyDelegate,
    lifePriorityReservations,
    otherTimeClaims,
  } = useLifeReality();

  const comparison = useMemo(
    () =>
      compareTimeRequirements({
        currentBusinessHoursWeek,
        currentAvailableHoursWeek,
        ultimateBusinessHoursWeek,
        intendedAvailableHoursWeek,
        desiredWorkTypes,
        workToEventuallyDelegate,
        lifePriorityReservations,
        otherTimeClaims,
      }),
    [
      currentBusinessHoursWeek,
      currentAvailableHoursWeek,
      ultimateBusinessHoursWeek,
      intendedAvailableHoursWeek,
      desiredWorkTypes,
      workToEventuallyDelegate,
      lifePriorityReservations,
      otherTimeClaims,
    ],
  );

  return (
    <WizardShell
      eyebrow="Time Reality · Comparison"
      title="Here is the time reality you described. Does this reflect now and what you're building toward?"
      backHref="/life/time/intended"
      nextHref="/business"
      nextLabel="Now, the business"
    >
      <HorizonCard title="Current" summary={comparison.current} message={fitMessage(comparison.current, "Right now,")} />
      <HorizonCard title="Intended" summary={comparison.intended} message={fitMessage(comparison.intended, "In the life you're building,")} />

      {otherTimeClaims.length > 0 && (
        <div className="rounded-lg border border-ink/15 bg-white p-4">
          <h2 className="text-sm font-semibold">Other claims on your time</h2>
          <ul className="mt-1 list-inside list-disc text-sm text-ink/70">
            {otherTimeClaims.map((c) => (
              <li key={c.label}>
                {c.label}
                {c.hoursWeek ? ` — ~${c.hoursWeek} hrs/wk` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(desiredWorkTypes.length > 0 || workToEventuallyDelegate.length > 0) && (
        <div className="rounded-lg border border-ink/15 bg-white p-4">
          <h2 className="text-sm font-semibold">Your intended relationship to the work</h2>
          {desiredWorkTypes.length > 0 && (
            <p className="mt-1 text-sm">
              <span className="text-ink/60">Wants to keep doing:</span> {desiredWorkTypes.join(", ")}
            </p>
          )}
          {workToEventuallyDelegate.length > 0 && (
            <p className="mt-1 text-sm">
              <span className="text-ink/60">Wants to eventually hand off:</span> {workToEventuallyDelegate.join(", ")}
            </p>
          )}
        </div>
      )}

      {lifePriorityReservations.length > 0 && (
        <div className="rounded-lg border border-ink/15 bg-white p-4">
          <h2 className="text-sm font-semibold">What the business must leave room for</h2>
          <p className="mt-1 text-sm text-ink/70">{lifePriorityReservations.join(", ")}</p>
        </div>
      )}

      <p className="rounded-md bg-ink/5 px-4 py-3 text-sm text-ink/70">
        Time Reality is complete. Next, Revenue Reality introduces the business.
      </p>
    </WizardShell>
  );
}
