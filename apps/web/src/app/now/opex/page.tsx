"use client";

import { useState } from "react";
import type { Cadence } from "@revenue-reality/domain";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useNow } from "@/lib/now-store";
import { newId } from "@/lib/ids";

const PRESET_CATEGORIES = ["Software", "Insurance", "Storage / rent", "Phones", "Marketing", "Professional services", "Administrative labor", "Utilities"];

export default function NowOpexPage() {
  const { operatingCosts, setOperatingCosts, opexListIsPartial, setOpexListIsPartial } = useNow();
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
        { id: newId(), scenarioId: "now", category: label.trim(), amount, cadence, knownOrEstimated: "KNOWN", confidence: "STRONG_ESTIMATE", isPartialList: false },
      ]);
      setCategory("");
      setAmountRaw("");
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  return (
    <WizardShell
      eyebrow="NOW · Operating Costs"
      title="What does the business pay to keep operating, even before the next sale?"
      intro={<p>Add what you know. If the list is incomplete, say so below — Revenue Reality will report your known costs as a floor, never a falsely complete total.</p>}
      backHref="/now/variable-costs"
      nextHref="/now/owners"
    >
      {operatingCosts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {operatingCosts.map((cost) => (
            <li key={cost.id} className="flex items-center justify-between rounded-md border border-ink/15 bg-white p-3 text-sm">
              <span>
                {cost.category} — ${cost.amount} / {cost.cadence.toLowerCase()}
              </span>
              <button
                type="button"
                onClick={() => setOperatingCosts((prev) => prev.filter((c) => c.id !== cost.id))}
                className="text-xs text-ink/60 underline hover:text-ink"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-ink/25 p-4">
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
        This isn&rsquo;t everything — there are other operating costs I haven&rsquo;t listed yet.
      </label>
      {operatingCosts.length === 0 && <p className="text-xs text-ink/50">That&rsquo;s all I know is a valid answer too.</p>}
    </WizardShell>
  );
}
