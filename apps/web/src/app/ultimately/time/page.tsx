"use client";

import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { ChipMultiSelect } from "@/components/ChipMultiSelect";
import { useLifeReality } from "@/lib/life-store";
import { useUltimately } from "@/lib/ultimately-store";

export default function UltimatelyTimePage() {
  const { desiredWorkTypes, workToEventuallyDelegate } = useLifeReality();
  const {
    snapshotUltimateBusinessHoursWeek,
    snapshotIntendedAvailableHoursWeek,
    snapshotLifePriorityReservations,
    ultimatelyWorkToContinue,
    setUltimatelyWorkToContinue,
  } = useUltimately();

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Time Reality"
      title="This is the time you already told us this business should ultimately use"
      intro={
        <>
          <p>
            You already answered this — ULTIMATELY doesn&rsquo;t ask again. The mature business has to
            be designed to actually operate within these hours, not the other way around.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/ultimately/life"
      nextHref="/ultimately/streams"
    >
      <div className="rounded-lg border border-ink/15 bg-white p-4 text-sm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-ink/60">Ultimate business hours/week</dt>
          <dd>{snapshotUltimateBusinessHoursWeek.confidence === "INCOMPLETE" ? "not sure" : snapshotUltimateBusinessHoursWeek.value}</dd>
          <dt className="text-ink/60">Intended available hours/week</dt>
          <dd>{snapshotIntendedAvailableHoursWeek.confidence === "INCOMPLETE" ? "not sure" : snapshotIntendedAvailableHoursWeek.value}</dd>
        </dl>
        {snapshotLifePriorityReservations.length > 0 && (
          <p className="mt-2 text-xs text-ink/60">Protecting: {snapshotLifePriorityReservations.join(", ")}</p>
        )}
      </div>

      <ChipMultiSelect
        label="Confirm what you still intend to do yourself in the mature business"
        hint="Pre-filled from what you told us earlier — adjust if it's changed. Context only; it doesn't change the hours figures above."
        options={desiredWorkTypes.length > 0 ? desiredWorkTypes : ["Sales", "Product/service delivery", "Operations", "Finances", "Strategy"]}
        selected={ultimatelyWorkToContinue}
        onChange={setUltimatelyWorkToContinue}
      />

      {workToEventuallyDelegate.length > 0 && (
        <div className="rounded-lg border border-ink/15 bg-white p-4 text-sm">
          <p className="font-medium">You also said this should no longer depend on you:</p>
          <p className="mt-1 text-ink/70">{workToEventuallyDelegate.join(", ")}</p>
          <p className="mt-2 text-xs text-ink/60">You&rsquo;ll give each of these a real cost (or say it&rsquo;s not yet known) on the next few screens.</p>
        </div>
      )}
    </WizardShell>
  );
}
