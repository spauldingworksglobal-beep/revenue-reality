"use client";

import { useState } from "react";
import { TIME_CLAIM_PRESETS } from "@/lib/presets";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { HoursInputRow } from "@/components/HoursInputRow";
import { useLifeReality } from "@/lib/life-store";

export default function CurrentTimePage() {
  const {
    currentAvailableHoursWeek,
    setCurrentAvailableHoursWeek,
    currentBusinessHoursWeek,
    setCurrentBusinessHoursWeek,
    otherTimeClaims,
    setOtherTimeClaims,
  } = useLifeReality();
  const [customClaim, setCustomClaim] = useState("");

  function addClaim(label: string) {
    if (label.trim() === "" || otherTimeClaims.some((c) => c.label === label)) return;
    setOtherTimeClaims((prev) => [...prev, { label }]);
  }

  function setClaimHours(label: string, hoursRaw: string) {
    const hoursWeek = hoursRaw.trim() === "" ? undefined : Number(hoursRaw);
    setOtherTimeClaims((prev) => prev.map((c) => (c.label === label ? { ...c, hoursWeek } : c)));
  }

  return (
    <WizardShell
      eyebrow="Time Reality · Current"
      title="What can your life actually give this business right now?"
      intro={
        <>
          <p>
            A business can be mathematically profitable and still be personally impossible. This
            isn&rsquo;t a time-tracking exercise — you don&rsquo;t need to account for all 168
            hours in a week, just the real operating constraint.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/life/compare"
      nextHref="/life/time/intended"
    >
      <HoursInputRow
        label="About how many hours a week can your life realistically give this business right now?"
        value={currentAvailableHoursWeek}
        onChange={setCurrentAvailableHoursWeek}
      />

      <HoursInputRow
        label="About how many hours a week is the business actually taking from you right now?"
        value={currentBusinessHoursWeek}
        onChange={setCurrentBusinessHoursWeek}
      />

      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">What else has a real claim on your time?</legend>
        <p className="mb-2 text-xs text-ink/60">
          These are for context — they never automatically change the available-hours figure above.
        </p>
        <div className="flex flex-wrap gap-2">
          {TIME_CLAIM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => addClaim(preset)}
              disabled={otherTimeClaims.some((c) => c.label === preset)}
              className="rounded-full border border-ink/25 px-3 py-1.5 text-xs hover:border-accent disabled:opacity-40"
            >
              {preset}
            </button>
          ))}
        </div>

        {otherTimeClaims.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {otherTimeClaims.map((claim) => (
              <li key={claim.label} className="flex items-center gap-2 rounded-md border border-ink/15 p-2 text-sm">
                <span className="flex-1">{claim.label}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="hrs/wk (optional)"
                  defaultValue={claim.hoursWeek?.toString() ?? ""}
                  onBlur={(e) => setClaimHours(claim.label, e.target.value)}
                  className="w-32 rounded-md border border-ink/25 px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setOtherTimeClaims((prev) => prev.filter((c) => c.label !== claim.label))}
                  className="text-xs text-ink/60 underline hover:text-ink"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="custom-claim" className="text-xs text-ink/70">
              Something else
            </label>
            <input
              id="custom-claim"
              type="text"
              value={customClaim}
              onChange={(e) => setCustomClaim(e.target.value)}
              className="rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              addClaim(customClaim.trim());
              setCustomClaim("");
            }}
            className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5"
          >
            Add
          </button>
        </div>
      </fieldset>
    </WizardShell>
  );
}
