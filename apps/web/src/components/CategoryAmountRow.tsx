"use client";

import { useId, useState } from "react";
import type { Cadence, ConfidenceLevel, ConfidenceValue, Money } from "@revenue-reality/domain";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";

const CADENCES: { value: Cadence; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "ONE_TIME", label: "One-time" },
];

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: "EXACT", label: "Exact" },
  { value: "STRONG_ESTIMATE", label: "Strong estimate" },
  { value: "ROUGH_ESTIMATE", label: "Rough estimate" },
];

export interface CategoryAmountRowProps {
  label: string;
  amount: ConfidenceValue<Money> | null;
  cadence: Cadence;
  onChange: (amount: ConfidenceValue<Money> | null, cadence: Cadence) => void;
  hideCadence?: boolean;
}

/** One guided category row: amount, cadence, confidence, and an explicit "I don't know" state. */
export function CategoryAmountRow({ label, amount, cadence, onChange, hideCadence = false }: CategoryAmountRowProps) {
  const inputId = useId();
  const [rawValue, setRawValue] = useState(amount ? amount.value : "");
  const [error, setError] = useState<string | null>(null);
  const dontKnow = amount === null && rawValue === "";

  function commitAmount(raw: string, confidence: ConfidenceLevel) {
    if (raw.trim() === "") {
      onChange(null, cadence);
      setError(null);
      return;
    }
    try {
      const parsed = parseCurrencyInput(raw);
      setError(null);
      onChange({ value: parsed, confidence }, cadence);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  return (
    <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-xs text-ink/70">
            Amount
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            placeholder="I don't know"
            value={rawValue}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="w-32 rounded-md border border-ink/25 px-3 py-2"
            onChange={(e) => setRawValue(e.target.value)}
            onBlur={(e) => commitAmount(e.target.value, amount?.confidence ?? "STRONG_ESTIMATE")}
          />
        </div>

        {!hideCadence && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70" htmlFor={`${inputId}-cadence`}>
              Cadence
            </label>
            <select
              id={`${inputId}-cadence`}
              className="rounded-md border border-ink/25 px-2 py-2"
              value={cadence}
              onChange={(e) => onChange(amount, e.target.value as Cadence)}
            >
              {CADENCES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <fieldset className="flex flex-col gap-1" disabled={dontKnow}>
          <legend className="text-xs text-ink/70">Confidence</legend>
          <div className="flex gap-1" role="radiogroup" aria-label={`Confidence for ${label}`}>
            {CONFIDENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={amount?.confidence === opt.value}
                onClick={() => rawValue.trim() !== "" && commitAmount(rawValue, opt.value)}
                className={`rounded-md border px-2 py-2 text-xs ${
                  amount?.confidence === opt.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {dontKnow && (
          <span className="rounded-md bg-ink/5 px-2 py-2 text-xs text-ink/60" aria-live="polite">
            Marked incomplete — still usable
          </span>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
