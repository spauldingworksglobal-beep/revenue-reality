"use client";

import { useState } from "react";
import type { Cadence } from "@revenue-reality/domain";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useUltimately } from "@/lib/ultimately-store";
import { newId } from "@/lib/ids";

const PRESET_CATEGORIES = [
  "Software / systems",
  "Insurance",
  "Storage / rent",
  "Team / labor",
  "Administrative support",
  "Management",
  "Marketing / demand generation",
  "Professional services",
  "Fulfillment",
  "Utilities",
];

export default function UltimatelyOpexPage() {
  const { operatingCosts, setOperatingCosts, opexListIsPartial, setOpexListIsPartial } = useUltimately();
  const [category, setCategory] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [cadence, setCadence] = useState<Cadence>("MONTHLY");
  const [error, setError] = useState<string | null>(null);

  function addCost(label: string) {
    if (label.trim() === "" || amountRaw.trim() === "") {
      setCategory(label);
      return;
    }
    try {
      const amount = parseCurrencyInput(amountRaw);
      setOperatingCosts((prev) => [
        ...prev,
        { id: newId(), scenarioId: "ultimately", category: label.trim(), amount, cadence, knownOrEstimated: "KNOWN", confidence: "STRONG_ESTIMATE", isPartialList: false },
      ]);
      setCategory("");
      setAmountRaw("");
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  function removeCost(id: string) {
    setOperatingCosts((prev) => prev.filter((c) => c.id !== id));
  }

  function updateAmount(id: string, raw: string) {
    if (raw.trim() === "") return;
    try {
      const amount = parseCurrencyInput(raw);
      setOperatingCosts((prev) => prev.map((c) => (c.id === id ? { ...c, amount } : c)));
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Mature Operating Costs"
      title="What does the business that has to exist, once mature, actually cost to run?"
      intro={
        <p>
          Pre-filled from NEXT. This is the ongoing cost of the business AFTER the transition is
          complete — a cost needed only to get there belongs on the next screen, not here, so it
          never quietly becomes a permanent part of the mature model.
        </p>
      }
      backHref="/ultimately/variable-costs"
      nextHref="/ultimately/transition"
    >
      {operatingCosts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {operatingCosts.map((cost) => (
            <li key={cost.id} className="flex items-center justify-between gap-2 rounded-md border border-ink/15 bg-white p-3 text-sm">
              <span>{cost.category}</span>
              <input
                type="text"
                inputMode="decimal"
                defaultValue={cost.amount}
                onBlur={(e) => updateAmount(cost.id, e.target.value)}
                className="w-24 rounded-md border border-ink/25 px-2 py-1"
              />
              <span className="text-ink/50">/ {cost.cadence.toLowerCase()}</span>
              <button type="button" onClick={() => removeCost(cost.id)} className="text-xs text-ink/60 underline hover:text-ink">
                This stops once mature
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-ink/25 p-4">
        <p className="mb-2 text-sm font-medium">Add another mature operating cost</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className="rounded-full border border-ink/25 px-3 py-1.5 text-xs hover:border-accent">
              {c}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-ink/70">Category</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-ink/25 px-3 py-2" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">Amount</label>
            <input type="text" inputMode="decimal" value={amountRaw} onChange={(e) => setAmountRaw(e.target.value)} className="w-28 rounded-md border border-ink/25 px-3 py-2" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">Cadence</label>
            <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)} className="rounded-md border border-ink/25 px-2 py-2">
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUALLY">Annually</option>
              <option value="ONE_TIME">One-time</option>
            </select>
          </div>
          <button type="button" onClick={() => addCost(category)} className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
            Add
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-ink/15 bg-white p-4 text-sm">
        <input type="checkbox" checked={opexListIsPartial} onChange={(e) => setOpexListIsPartial(e.target.checked)} className="h-5 w-5" />
        This isn&rsquo;t everything — there are other mature operating costs I haven&rsquo;t listed yet.
      </label>
    </WizardShell>
  );
}
