"use client";

import { BUSINESS_STAGE_OPTIONS } from "@/lib/presets";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";

export default function BusinessStagePage() {
  const { businessStage, setBusinessStage, restructureDate, setRestructureDate } = useLifeReality();
  const needsDate = businessStage === "RESTARTED" || businessStage === "RESTRUCTURED";

  return (
    <WizardShell
      eyebrow="Business Profile"
      title="Has the business materially changed recently?"
      intro={
        <p>
          A short period since a restart or restructure is never automatically turned into an
          annualized figure — Revenue Reality treats the model that exists today as what it is,
          not a partial year of a bigger one.
        </p>
      }
      backHref="/business/model"
      nextHref="/business/intent"
    >
      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="sr-only">Business stage</legend>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Business stage">
          {BUSINESS_STAGE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 ${
                businessStage === opt.value ? "border-accent bg-accent/10" : "border-ink/15"
              }`}
            >
              <input
                type="radio"
                name="business-stage"
                checked={businessStage === opt.value}
                onChange={() => setBusinessStage(opt.value)}
                className="h-4 w-4"
              />
              <span className="font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {needsDate && (
        <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
          <legend className="px-1 text-sm font-medium">When did the current model begin?</legend>
          <input
            type="date"
            value={restructureDate ?? ""}
            onChange={(e) => setRestructureDate(e.target.value === "" ? null : e.target.value)}
            className="mt-2 rounded-md border border-ink/25 px-3 py-2"
          />
        </fieldset>
      )}
    </WizardShell>
  );
}
