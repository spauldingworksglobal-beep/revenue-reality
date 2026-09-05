"use client";

import { useState } from "react";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { HoursInputRow } from "@/components/HoursInputRow";
import { useLifeReality } from "@/lib/life-store";
import { useUltimately } from "@/lib/ultimately-store";

const FUNCTION_CONFIDENCE_OPTIONS = [
  { value: "KNOWN" as const, label: "Known" },
  { value: "ROLE_CHANGING" as const, label: "Role changing" },
  { value: "NOT_SURE" as const, label: "Not sure" },
];

function OwnerCard({ ownerId, label, isPrimaryRespondent, sourceLabel }: { ownerId: string; label: string; isPrimaryRespondent: boolean; sourceLabel: string }) {
  const { snapshotUltimateBusinessHoursWeek, getOwnerInput, updateOwnerInput } = useUltimately();
  const input = getOwnerInput(ownerId);
  const [investmentError, setInvestmentError] = useState<string | null>(null);
  const [paidError, setPaidError] = useState<string | null>(null);
  const [compError, setCompError] = useState<string | null>(null);

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

  function commitTarget(raw: string) {
    if (raw.trim() === "") {
      updateOwnerInput(ownerId, { targetLaborCompensation: null });
      setCompError(null);
      return;
    }
    try {
      updateOwnerInput(ownerId, { targetLaborCompensation: { value: parseCurrencyInput(raw), confidence: "STRONG_ESTIMATE" } });
      setCompError(null);
    } catch (e) {
      if (e instanceof ValidationError) setCompError(e.message);
    }
  }

  return (
    <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
      <legend className="px-1 text-sm font-medium">{label || "Unnamed owner"}{isPrimaryRespondent && " (you)"}</legend>

      {isPrimaryRespondent ? (
        <p className="mb-2 text-sm text-ink/70">
          Set by your Intended Time Reality: about <strong>{snapshotUltimateBusinessHoursWeek.value} hours/week</strong>, once mature.
        </p>
      ) : (
        <HoursInputRow
          label={`About how many hours a week should the business use from ${label || "this owner"}, once mature?`}
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

      <div className="mt-3 flex flex-col gap-1">
        <label className="text-xs text-ink/70">
          Targeted labor compensation, once mature — a real paycheck for work this owner still performs (optional)
        </label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Not yet targeted"
          defaultValue={input.targetLaborCompensation?.value ?? ""}
          onBlur={(e) => commitTarget(e.target.value)}
          className="w-32 rounded-md border border-ink/25 px-3 py-2"
        />
        {compError && <p role="alert" className="text-xs text-red-700">{compError}</p>}
        <p className="text-xs text-ink/50">
          Lower than before? That&rsquo;s expected if less of the owner&rsquo;s work survives into the mature
          model — the rest of what they&rsquo;re owed shows up as ownership return instead, not a smaller
          total.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink/70">Personal money into the business, once mature — continues at (0 if it should stop)</label>
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
          <label className="text-xs text-ink/70">Business bills paid personally, once mature — continues at (0 if it should stop)</label>
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
      <p className="mt-2 text-xs text-ink/50">
        Pre-filled from your {sourceLabel} model&rsquo;s figures — set either to $0 to signal it should stop once mature.
      </p>
    </fieldset>
  );
}

export default function UltimatelyOwnersPage() {
  const { owners } = useLifeReality();
  const { initializedFrom } = useUltimately();

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Owners"
      title="What should change about what each owner puts in — and gets paid, once mature?"
      intro={
        <p>
          Labor compensation and ownership return are tracked separately on purpose — reducing an
          owner&rsquo;s hours never automatically reduces their total intended benefit from the
          business. Set a labor target if you have one; leave it blank if you don&rsquo;t yet.
        </p>
      }
      backHref="/ultimately/transition"
      nextHref="/ultimately/delegation"
    >
      {owners.map((owner) => (
        <OwnerCard key={owner.id} ownerId={owner.id} label={owner.label} isPrimaryRespondent={owner.isPrimaryRespondent} sourceLabel={initializedFrom ?? "NEXT"} />
      ))}
    </WizardShell>
  );
}
