"use client";

import { useState } from "react";
import type { DemandState } from "@revenue-reality/domain";
import { WizardShell } from "@/components/WizardShell";
import { useUltimately } from "@/lib/ultimately-store";

const DEMAND_OPTIONS: { value: DemandState; label: string }[] = [
  { value: "COMFORTABLE", label: "Comfortable — demand and capacity aren't a concern" },
  { value: "PROBABLE", label: "Probable — likely achievable, some uncertainty" },
  { value: "DIFFICULT", label: "Difficult — capacity or demand would be a real stretch" },
  { value: "CANNOT", label: "Cannot — the business can't currently reach this" },
  { value: "UNSURE", label: "Not sure yet" },
];

export default function UltimatelyCapacityPage() {
  const { capacity, setCapacity } = useUltimately();
  const [constraintInput, setConstraintInput] = useState("");

  const current = capacity ?? { scenarioId: "ultimately", demandState: "UNSURE" as DemandState, constraints: [] };

  function setDemand(demandState: DemandState) {
    setCapacity({ ...current, demandState });
  }

  function addConstraint() {
    const trimmed = constraintInput.trim();
    if (trimmed === "") return;
    setCapacity({ ...current, constraints: [...current.constraints, trimmed] });
    setConstraintInput("");
  }

  function removeConstraint(index: number) {
    setCapacity({ ...current, constraints: current.constraints.filter((_, i) => i !== index) });
  }

  function setMaxVolume(raw: string) {
    if (raw.trim() === "") {
      const { maxVolume: _drop, ...rest } = current;
      setCapacity(rest);
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    setCapacity({ ...current, maxVolume: n });
  }

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Capacity"
      title="Can the mature business actually produce or deliver at this level?"
      intro={<p>Optional, but worth answering honestly — a model that's mathematically required but practically unreachable is exactly what this is meant to surface. Don't solve a capacity gap by silently inventing staff, equipment, or a location.</p>}
      backHref="/ultimately/retention"
      nextHref="/ultimately/result"
    >
      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">How achievable does this level of demand/capacity feel, once mature?</legend>
        <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="Demand state">
          {DEMAND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={current.demandState === opt.value}
              onClick={() => setDemand(opt.value)}
              className={`rounded-md border p-3 text-left text-sm ${current.demandState === opt.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <label className="text-sm font-medium">Maximum realistic volume per period (optional)</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="No known ceiling"
          defaultValue={current.maxVolume?.toString() ?? ""}
          onBlur={(e) => setMaxVolume(e.target.value)}
          className="mt-2 w-32 rounded-md border border-ink/25 px-3 py-2"
        />
      </div>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <p className="text-sm font-medium">Specific constraints (optional)</p>
        <p className="mt-1 text-xs text-ink/60">e.g. facility capacity, staff hours, supplier lead time, fulfillment throughput.</p>
        {current.constraints.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {current.constraints.map((c, i) => (
              <li key={i} className="flex items-center justify-between rounded-md border border-ink/15 p-2 text-sm">
                <span>{c}</span>
                <button type="button" onClick={() => removeConstraint(i)} className="text-xs text-ink/60 underline hover:text-ink">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex items-end gap-2">
          <input type="text" value={constraintInput} onChange={(e) => setConstraintInput(e.target.value)} className="flex-1 rounded-md border border-ink/25 px-3 py-2" />
          <button type="button" onClick={addConstraint} className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
            Add
          </button>
        </div>
      </div>
    </WizardShell>
  );
}
