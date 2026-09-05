"use client";

import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { HoursInputRow } from "@/components/HoursInputRow";
import { ChipMultiSelect } from "@/components/ChipMultiSelect";
import { useLifeReality } from "@/lib/life-store";
import { useNext } from "@/lib/next-store";

export default function NextTimePage() {
  const { currentAvailableHoursWeek, currentBusinessHoursWeek, intendedAvailableHoursWeek, ultimateBusinessHoursWeek, desiredWorkTypes } = useLifeReality();
  const { nextAvailableHoursWeek, setNextAvailableHoursWeek, nextBusinessHoursWeek, setNextBusinessHoursWeek, nextWorkToContinue, setNextWorkToContinue, nextLifePriorities, setNextLifePriorities } = useNext();

  return (
    <WizardShell
      eyebrow="NEXT · Time Reality"
      title="How much of this business should your time support in this next step?"
      intro={
        <>
          <p>
            You already told us your current time and the time you&rsquo;re ultimately building toward.
            NEXT can equal either one, or land anywhere in between — Revenue Reality never picks a
            midpoint for you.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/next/life"
      nextHref="/next/streams"
    >
      <div className="rounded-lg border border-ink/15 bg-white p-4 text-sm">
        <p className="font-medium">For reference</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-ink/60">Current business hours/week</dt>
          <dd>{currentBusinessHoursWeek.confidence === "INCOMPLETE" ? "not sure" : currentBusinessHoursWeek.value}</dd>
          <dt className="text-ink/60">Current available hours/week</dt>
          <dd>{currentAvailableHoursWeek.confidence === "INCOMPLETE" ? "not sure" : currentAvailableHoursWeek.value}</dd>
          <dt className="text-ink/60">Intended (ultimate) business hours/week</dt>
          <dd>{ultimateBusinessHoursWeek.confidence === "INCOMPLETE" ? "not sure" : ultimateBusinessHoursWeek.value}</dd>
          <dt className="text-ink/60">Intended available hours/week</dt>
          <dd>{intendedAvailableHoursWeek.confidence === "INCOMPLETE" ? "not sure" : intendedAvailableHoursWeek.value}</dd>
        </dl>
      </div>

      <HoursInputRow
        label="In this NEXT step, about how many hours a week should the business use from you?"
        value={nextBusinessHoursWeek}
        onChange={setNextBusinessHoursWeek}
      />
      <HoursInputRow
        label="In this NEXT step, about how many hours a week can your life realistically give the business?"
        value={nextAvailableHoursWeek}
        onChange={setNextAvailableHoursWeek}
      />

      <ChipMultiSelect
        label="What work do you intend to keep doing yourself in NEXT?"
        hint="Context only — this doesn't change the hours figures above."
        options={desiredWorkTypes.length > 0 ? desiredWorkTypes : ["Sales", "Product/service delivery", "Operations", "Finances", "Strategy"]}
        selected={nextWorkToContinue}
        onChange={setNextWorkToContinue}
      />

      <ChipMultiSelect
        label="Any life priorities NEXT should protect?"
        hint="e.g. evenings, a specific day off, a caregiving commitment."
        options={[]}
        selected={nextLifePriorities}
        onChange={setNextLifePriorities}
      />
    </WizardShell>
  );
}
