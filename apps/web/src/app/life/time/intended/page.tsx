"use client";

import { DESIRED_WORK_TYPE_OPTIONS, LIFE_PRIORITY_OPTIONS, WORK_TO_DELEGATE_OPTIONS } from "@/lib/presets";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { HoursInputRow } from "@/components/HoursInputRow";
import { ChipMultiSelect } from "@/components/ChipMultiSelect";
import { useLifeReality } from "@/lib/life-store";

export default function IntendedTimePage() {
  const {
    ultimateBusinessHoursWeek,
    setUltimateBusinessHoursWeek,
    intendedAvailableHoursWeek,
    setIntendedAvailableHoursWeek,
    desiredWorkTypes,
    setDesiredWorkTypes,
    workToEventuallyDelegate,
    setWorkToEventuallyDelegate,
    lifePriorityReservations,
    setLifePriorityReservations,
  } = useLifeReality();

  return (
    <WizardShell
      eyebrow="Time Reality · Intended"
      title="What do you ultimately want the business to ask of you?"
      intro={
        <>
          <p>Not a schedule — just the relationship to time and work you&rsquo;re building toward.</p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/life/time/current"
      nextHref="/life/time/compare"
    >
      <HoursInputRow
        label="Ultimately, how many hours a week do you want this business to receive from your life?"
        value={ultimateBusinessHoursWeek}
        onChange={setUltimateBusinessHoursWeek}
      />

      <HoursInputRow
        label="What can your intended life realistically make available for the business?"
        value={intendedAvailableHoursWeek}
        onChange={setIntendedAvailableHoursWeek}
      />

      <ChipMultiSelect
        label="What work do you want to spend your business time doing?"
        options={DESIRED_WORK_TYPE_OPTIONS}
        selected={desiredWorkTypes}
        onChange={setDesiredWorkTypes}
      />

      <ChipMultiSelect
        label="What work do you eventually not want to depend on you?"
        hint="Qualitative only, for now — what it costs to change comes later, once we get to business economics."
        options={WORK_TO_DELEGATE_OPTIONS}
        selected={workToEventuallyDelegate}
        onChange={setWorkToEventuallyDelegate}
      />

      <ChipMultiSelect
        label="What must your life still have room for once the business is working the way you want?"
        options={LIFE_PRIORITY_OPTIONS}
        selected={lifePriorityReservations}
        onChange={setLifePriorityReservations}
      />
    </WizardShell>
  );
}
