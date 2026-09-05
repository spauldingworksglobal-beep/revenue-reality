"use client";

import { useEffect, useState } from "react";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { useNext, type NextImprovementType } from "@/lib/next-store";

const IMPROVEMENTS: { value: NextImprovementType; label: string }[] = [
  { value: "PAY_MYSELF_CONSISTENTLY", label: "Pay myself consistently" },
  { value: "PAY_MYSELF_MORE", label: "Pay myself more" },
  { value: "WORK_FEWER_HOURS", label: "Work fewer hours" },
  { value: "STOP_PERSONAL_MONEY_IN", label: "Stop putting personal money into the business" },
  { value: "REDUCE_OTHER_INCOME_DEPENDENCE", label: "Reduce dependence on another job/income source" },
  { value: "BUILD_RESERVE", label: "Build a business reserve" },
  { value: "HIRE_OR_DELEGATE", label: "Hire or delegate work" },
  { value: "MORE_CONSISTENT_SALES", label: "Generate sales more consistently" },
  { value: "INCREASE_CAPACITY", label: "Increase capacity" },
  { value: "STRENGTHEN_OPERATING_FOUNDATION", label: "Strengthen the operating foundation" },
  { value: "OTHER", label: "Other" },
];

export default function NextImprovementPage() {
  const {
    initializeFromNow,
    primaryImprovement,
    setPrimaryImprovement,
    primaryImprovementOtherLabel,
    setPrimaryImprovementOtherLabel,
    supportingImprovements,
    setSupportingImprovements,
  } = useNext();
  const [error, setError] = useState<string | null>(null);

  // Copies NOW's business model into NEXT's own independent state, exactly
  // once. Editing NOW later never reaches back into NEXT after this point.
  useEffect(() => {
    initializeFromNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSupporting(value: NextImprovementType) {
    setSupportingImprovements((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function selectPrimary(value: NextImprovementType) {
    setPrimaryImprovement(value);
    setSupportingImprovements((prev) => prev.filter((v) => v !== value));
    setError(null);
  }

  return (
    <WizardShell
      eyebrow="NEXT · The Intermediate Workable Model"
      title="What should become possible next?"
      intro={
        <>
          <p>
            NEXT isn&rsquo;t a revenue target — it&rsquo;s the first real, workable step between where the
            business is today and where you&rsquo;re ultimately building toward. You pick what should change
            for you; Revenue Reality figures out what the business has to become to support it.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/now/result"
      nextHref="/next/life"
    >
      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Primary improvement — pick one</legend>
        <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="Primary improvement">
          {IMPROVEMENTS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={primaryImprovement === opt.value}
              onClick={() => selectPrimary(opt.value)}
              className={`rounded-md border p-3 text-left text-sm ${
                primaryImprovement === opt.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {primaryImprovement === "OTHER" && (
          <input
            type="text"
            placeholder="Describe what should become possible"
            defaultValue={primaryImprovementOtherLabel}
            onBlur={(e) => setPrimaryImprovementOtherLabel(e.target.value)}
            className="mt-3 w-full rounded-md border border-ink/25 px-3 py-2"
          />
        )}
        {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      </fieldset>

      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Supporting changes (optional)</legend>
        <p className="mb-2 text-xs text-ink/60">Anything else that should also become true in this next step — not required.</p>
        <div className="flex flex-wrap gap-2">
          {IMPROVEMENTS.filter((opt) => opt.value !== primaryImprovement).map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={supportingImprovements.includes(opt.value)}
              onClick={() => toggleSupporting(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                supportingImprovements.includes(opt.value) ? "border-accent bg-accent/10 font-medium" : "border-ink/25 hover:border-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>
    </WizardShell>
  );
}
