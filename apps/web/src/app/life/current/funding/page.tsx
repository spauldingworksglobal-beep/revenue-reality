"use client";

import type { FundingSource } from "@revenue-reality/domain";
import { CategoryAmountRow } from "@/components/CategoryAmountRow";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { newId } from "@/lib/ids";

const SOURCE_TYPES: { value: FundingSource["sourceType"]; label: string }[] = [
  { value: "BUSINESS", label: "This business" },
  { value: "JOB", label: "A job" },
  { value: "SPOUSE_PARTNER", label: "Spouse / partner" },
  { value: "FREELANCE", label: "Freelance / consulting" },
  { value: "PASSIVE", label: "Passive income" },
  { value: "OTHER", label: "Other" },
];

export default function CurrentFundingPage() {
  const { currentFundingSources, setCurrentFundingSources } = useLifeReality();

  function toggle(sourceType: FundingSource["sourceType"], checked: boolean) {
    setCurrentFundingSources((prev) => {
      if (!checked) return prev.filter((s) => s.sourceType !== sourceType);
      if (prev.some((s) => s.sourceType === sourceType)) return prev;
      return [...prev, { id: newId(), lifeProfileId: "ephemeral-life-profile", horizon: "CURRENT", sourceType, amount: null }];
    });
  }

  return (
    <WizardShell
      eyebrow="Life Reality · Current"
      title="How is your life funded today?"
      intro={<p>Select every source that applies. An amount is optional here — we&rsquo;ll ask about the business&rsquo;s share later.</p>}
      backHref="/life/current/security"
      nextHref="/life/current/deferred"
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Current funding sources</legend>
        {SOURCE_TYPES.map((source) => {
          const entry = currentFundingSources.find((s) => s.sourceType === source.value);
          return (
            <div key={source.value} className="rounded-lg border border-ink/15 bg-white p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(entry)}
                  onChange={(e) => toggle(source.value, e.target.checked)}
                  className="h-5 w-5"
                />
                {source.label}
              </label>
              {entry && (
                <div className="mt-3">
                  <CategoryAmountRow
                    label="Amount (optional)"
                    amount={entry.amount}
                    cadence="MONTHLY"
                    hideCadence
                    onChange={(amount) =>
                      setCurrentFundingSources((prev) => prev.map((s) => (s.sourceType === source.value ? { ...s, amount } : s)))
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </fieldset>
    </WizardShell>
  );
}
