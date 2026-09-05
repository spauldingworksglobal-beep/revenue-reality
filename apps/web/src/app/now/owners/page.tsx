"use client";

import { useState } from "react";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { HoursInputRow } from "@/components/HoursInputRow";
import { useLifeReality } from "@/lib/life-store";
import { useNow } from "@/lib/now-store";

const FUNCTION_CONFIDENCE_OPTIONS = [
  { value: "KNOWN" as const, label: "Known" },
  { value: "ROLE_CHANGING" as const, label: "Role changing" },
  { value: "NOT_SURE" as const, label: "Not sure" },
];

function OwnerCard({ ownerId, label, isPrimaryRespondent }: { ownerId: string; label: string; isPrimaryRespondent: boolean }) {
  const { currentBusinessHoursWeek } = useLifeReality();
  const { getOwnerInput, updateOwnerInput } = useNow();
  const input = getOwnerInput(ownerId);
  const [investmentError, setInvestmentError] = useState<string | null>(null);
  const [paidError, setPaidError] = useState<string | null>(null);

  function commitMoney(field: "personalCashInvestment" | "personallyPaidCosts", raw: string, setErr: (e: string | null) => void) {
    if (raw.trim() === "") {
      updateOwnerInput(ownerId, { [field]: "0.00" });
      setErr(null);
      return;
    }
    try {
      updateOwnerInput(ownerId, { [field]: parseCurrencyInput(raw) });
      setErr(null);
    } catch (e) {
      if (e instanceof ValidationError) setErr(e.message);
    }
  }

  return (
    <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
      <legend className="px-1 text-sm font-medium">{label || "Unnamed owner"}{isPrimaryRespondent && " (you)"}</legend>

      {isPrimaryRespondent ? (
        <p className="mb-2 text-sm text-ink/70">
          You already told us this in Time Reality: about <strong>{currentBusinessHoursWeek.value} hours/week</strong> currently.
          No need to re-enter it.
        </p>
      ) : (
        <HoursInputRow
          label={`About how many hours a week does the business currently use from ${label || "this owner"}?`}
          value={input.hoursWeek}
          onChange={(hoursWeek) => updateOwnerInput(ownerId, { hoursWeek })}
        />
      )}

      <div className="mt-3">
        <p className="mb-1 text-xs text-ink/70">Do you know roughly where that time goes?</p>
        <div className="flex gap-2" role="radiogroup" aria-label={`Function confidence for ${label}`}>
          {FUNCTION_CONFIDENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={input.functionConfidence === opt.value}
              onClick={() => updateOwnerInput(ownerId, { functionConfidence: opt.value })}
              className={`rounded-md border px-3 py-2 text-sm ${input.functionConfidence === opt.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink/70">Has any personal money gone into the business? (optional)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="$0.00"
            defaultValue={input.personalCashInvestment !== "0.00" ? input.personalCashInvestment : ""}
            onBlur={(e) => commitMoney("personalCashInvestment", e.target.value, setInvestmentError)}
            className="w-32 rounded-md border border-ink/25 px-3 py-2"
          />
          {investmentError && <p role="alert" className="text-xs text-red-700">{investmentError}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink/70">Business bills paid personally? (optional)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="$0.00"
            defaultValue={input.personallyPaidCosts !== "0.00" ? input.personallyPaidCosts : ""}
            onBlur={(e) => commitMoney("personallyPaidCosts", e.target.value, setPaidError)}
            className="w-32 rounded-md border border-ink/25 px-3 py-2"
          />
          {paidError && <p role="alert" className="text-xs text-red-700">{paidError}</p>}
        </div>
      </div>
      <p className="mt-2 text-xs text-ink/50">Unpaid or underpaid labor isn&rsquo;t zero — it&rsquo;s investment. This is captured separately below, in what the business has actually paid each owner.</p>
    </fieldset>
  );
}

export default function NowOwnersPage() {
  const { owners } = useLifeReality();

  return (
    <WizardShell
      eyebrow="NOW · Owner Labor &amp; Investment"
      title="What is each owner actually contributing that the books may not show?"
      intro={<p>What the business paid is one reality. What it actually consumed — including unpaid time and personally funded costs — is another. Revenue Reality tracks both.</p>}
      backHref="/now/opex"
      nextHref="/now/distribution"
    >
      {owners.map((owner) => (
        <OwnerCard key={owner.id} ownerId={owner.id} label={owner.label} isPrimaryRespondent={owner.isPrimaryRespondent} />
      ))}
    </WizardShell>
  );
}
