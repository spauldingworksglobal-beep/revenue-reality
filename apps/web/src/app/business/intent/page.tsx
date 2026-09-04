"use client";

import { FUNDING_JOB_OPTIONS, OWNERSHIP_INTENT_OPTIONS } from "@/lib/presets";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";

export default function BusinessIntentPage() {
  const { fundingJob, setFundingJob, intendedOwnershipModel, setIntendedOwnershipModel, desiredWorkTypes } = useLifeReality();

  return (
    <WizardShell
      eyebrow="Business Profile"
      title="What is this business supposed to do for you — and become?"
      backHref="/business/stage"
      nextHref="/business/summary"
    >
      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">What financial job is this business supposed to do?</legend>
        <p className="mb-2 text-xs text-ink/60">
          This is about the business&rsquo;s intent — not the exact dollar amount you already
          worked out for it earlier.
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Financial job">
          {FUNDING_JOB_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={fundingJob === opt.value}
              onClick={() => setFundingJob(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                fundingJob === opt.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Ultimately, what kind of business do you want to own?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Intended ownership model">
          {OWNERSHIP_INTENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={intendedOwnershipModel === opt.value}
              onClick={() => setIntendedOwnershipModel(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                intendedOwnershipModel === opt.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      {desiredWorkTypes.length > 0 && (
        <div className="rounded-lg border border-ink/15 bg-white p-4">
          <p className="text-sm">
            <span className="text-ink/60">You already told us your intended role leans toward:</span>{" "}
            <strong>{desiredWorkTypes.join(", ")}</strong> — that carries forward as-is; no need to re-answer it here.
          </p>
        </div>
      )}
    </WizardShell>
  );
}
