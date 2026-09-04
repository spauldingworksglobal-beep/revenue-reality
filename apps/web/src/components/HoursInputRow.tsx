"use client";

import { useId, useState } from "react";
import type { ConfidenceLevel, ConfidenceValue } from "@revenue-reality/domain";

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: "EXACT", label: "Exact" },
  { value: "STRONG_ESTIMATE", label: "Strong estimate" },
  { value: "ROUGH_ESTIMATE", label: "Rough estimate" },
  { value: "INCOMPLETE", label: "Not sure" },
];

export interface HoursInputRowProps {
  label: string;
  hint?: string;
  value: ConfidenceValue<number>;
  onChange: (value: ConfidenceValue<number>) => void;
}

/** A single hours/week question with categorical confidence, including an explicit "Not sure" — never a numerical score. */
export function HoursInputRow({ label, hint, value, onChange }: HoursInputRowProps) {
  const inputId = useId();
  const [raw, setRaw] = useState(value.confidence === "INCOMPLETE" && value.value === 0 ? "" : String(value.value));

  function commit(rawValue: string, confidence: ConfidenceLevel) {
    const parsed = Number(rawValue);
    if (rawValue.trim() === "" || Number.isNaN(parsed) || parsed < 0) {
      onChange({ value: 0, confidence: "INCOMPLETE" });
      return;
    }
    onChange({ value: parsed, confidence });
  }

  return (
    <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      {hint && <p className="mb-2 text-xs text-ink/60">{hint}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-xs text-ink/70">
            Hours / week
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            placeholder="Not sure"
            value={raw}
            className="w-24 rounded-md border border-ink/25 px-3 py-2"
            onChange={(e) => setRaw(e.target.value)}
            onBlur={(e) => commit(e.target.value, value.confidence === "INCOMPLETE" ? "STRONG_ESTIMATE" : value.confidence)}
          />
        </div>

        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs text-ink/70">Confidence</legend>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`Confidence for ${label}`}>
            {CONFIDENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={value.confidence === opt.value}
                onClick={() => commit(opt.value === "INCOMPLETE" && raw.trim() === "" ? "0" : raw, opt.value)}
                className={`rounded-md border px-2 py-2 text-xs ${
                  value.confidence === opt.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {value.confidence === "INCOMPLETE" && (
          <span className="rounded-md bg-ink/5 px-2 py-2 text-xs text-ink/60" aria-live="polite">
            Not sure — still usable
          </span>
        )}
      </div>
    </fieldset>
  );
}
