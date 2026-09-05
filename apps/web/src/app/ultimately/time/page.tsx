"use client";

import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { ChipMultiSelect } from "@/components/ChipMultiSelect";
import { useLifeReality } from "@/lib/life-store";
import { useUltimately } from "@/lib/ultimately-store";
import type { OwnerInvolvementNature } from "@revenue-reality/revenue-engine";

const INVOLVEMENT_OPTIONS: { value: OwnerInvolvementNature; label: string }[] = [
  { value: "REQUIRED", label: "Required for the business to operate" },
  { value: "CHOSEN", label: "Chosen involvement" },
  { value: "MIXED", label: "A mix of both" },
  { value: "UNKNOWN", label: "I'm not sure" },
];

export default function UltimatelyTimePage() {
  const { desiredWorkTypes, workToEventuallyDelegate } = useLifeReality();
  const {
    snapshotUltimateBusinessHoursWeek,
    snapshotIntendedAvailableHoursWeek,
    snapshotLifePriorityReservations,
    ultimatelyWorkToContinue,
    setUltimatelyWorkToContinue,
    ownerInvolvementNature,
    setOwnerInvolvementNature,
    requiredFunctionsWhenMixed,
    setRequiredFunctionsWhenMixed,
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

      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">
          In the mature business, are these hours work the business still requires from you, or time you choose to stay involved?
        </legend>
        <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="Owner involvement nature">
          {INVOLVEMENT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 ${
                ownerInvolvementNature === opt.value ? "border-accent bg-accent/10" : "border-ink/15"
              }`}
            >
              <input
                type="radio"
                name="owner-involvement-nature"
                checked={ownerInvolvementNature === opt.value}
                onChange={() => setOwnerInvolvementNature(opt.value)}
                className="h-4 w-4"
              />
              <span className="font-medium">{opt.label}</span>
            </label>
          ))}
        </div>

        {ownerInvolvementNature === "MIXED" && ultimatelyWorkToContinue.length > 0 && (
          <div className="mt-3">
            <ChipMultiSelect
              label="Which of these does the business still require from you?"
              hint="Leave the rest unselected — those are treated as chosen involvement, not required."
              options={ultimatelyWorkToContinue}
              selected={requiredFunctionsWhenMixed}
              onChange={setRequiredFunctionsWhenMixed}
            />
          </div>
        )}
      </fieldset>

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
