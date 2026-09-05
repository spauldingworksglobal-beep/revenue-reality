"use client";

import { useState } from "react";
import type { VariableCostItem } from "@revenue-reality/domain";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { useUltimately } from "@/lib/ultimately-store";
import { newId } from "@/lib/ids";

const PRESETS = ["Payment processing fee", "Sales commission", "Platform / transaction fee", "Shipping"];

function StreamVariableCosts({ streamId, streamLabel, sourceLabel }: { streamId: string; streamLabel: string; sourceLabel: string }) {
  const { getStreamInput, updateStreamInput } = useUltimately();
  const input = getStreamInput(streamId);
  const [error, setError] = useState<string | null>(null);

  function addItem(label: string) {
    const item: VariableCostItem = { id: newId(), label };
    updateStreamInput(streamId, { otherVariableCosts: [...input.otherVariableCosts, item] });
  }

  function updateItem(id: string, patch: Partial<VariableCostItem>) {
    updateStreamInput(streamId, {
      otherVariableCosts: input.otherVariableCosts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  }

  function removeItem(id: string) {
    updateStreamInput(streamId, { otherVariableCosts: input.otherVariableCosts.filter((c) => c.id !== id) });
  }

  return (
    <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
      <legend className="px-1 text-sm font-medium">{streamLabel}</legend>
      <p className="mb-2 text-xs text-ink/60">Pre-filled from your {sourceLabel} model — adjust anything that changes at the mature model&rsquo;s volume or channel mix.</p>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => addItem(p)} className="rounded-full border border-ink/25 px-3 py-1.5 text-xs hover:border-accent">
            {p}
          </button>
        ))}
      </div>

      {input.otherVariableCosts.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {input.otherVariableCosts.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border border-ink/15 p-2">
              <span className="flex-1 text-sm">{item.label}</span>
              <div role="radiogroup" aria-label={`Entry mode for ${item.label}`} className="flex gap-1">
                <button
                  type="button"
                  role="radio"
                  aria-checked={item.percentOfPrice !== undefined}
                  onClick={() => updateItem(item.id, { percentOfPrice: { value: "0", confidence: "STRONG_ESTIMATE" }, amountPerUnit: undefined })}
                  className={`rounded-md border px-2 py-1 text-xs ${item.percentOfPrice !== undefined ? "border-accent bg-accent/10" : "border-ink/25"}`}
                >
                  % of price
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={item.amountPerUnit !== undefined}
                  onClick={() => updateItem(item.id, { amountPerUnit: { value: "0.00", confidence: "STRONG_ESTIMATE" }, percentOfPrice: undefined })}
                  className={`rounded-md border px-2 py-1 text-xs ${item.amountPerUnit !== undefined ? "border-accent bg-accent/10" : "border-ink/25"}`}
                >
                  $ per unit
                </button>
              </div>
              {item.percentOfPrice !== undefined && (
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={String(Number(item.percentOfPrice.value) * 100)}
                  onBlur={(e) => {
                    const pct = Number(e.target.value);
                    if (Number.isNaN(pct)) return;
                    updateItem(item.id, { percentOfPrice: { value: String(pct / 100), confidence: "STRONG_ESTIMATE" } });
                  }}
                  className="w-20 rounded-md border border-ink/25 px-2 py-1 text-sm"
                />
              )}
              {item.amountPerUnit !== undefined && (
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={item.amountPerUnit.value}
                  onBlur={(e) => {
                    try {
                      updateItem(item.id, { amountPerUnit: { value: parseCurrencyInput(e.target.value), confidence: "STRONG_ESTIMATE" } });
                      setError(null);
                    } catch (err) {
                      if (err instanceof ValidationError) setError(err.message);
                    }
                  }}
                  className="w-20 rounded-md border border-ink/25 px-2 py-1 text-sm"
                />
              )}
              <button type="button" onClick={() => removeItem(item.id)} className="text-xs text-ink/60 underline hover:text-ink">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </fieldset>
  );
}

export default function UltimatelyVariableCostsPage() {
  const { revenueStreams } = useLifeReality();
  const { initializedFrom } = useUltimately();
  const activeStreams = revenueStreams.filter((s) => s.active);
  const sourceLabel = initializedFrom ?? "NEXT";

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Other Variable Costs"
      title="Do these costs change in the mature model?"
      intro={<p>Optional — leave empty if nothing changes from {sourceLabel}.</p>}
      backHref="/ultimately/cogs"
      nextHref="/ultimately/opex"
    >
      {activeStreams.map((s) => (
        <StreamVariableCosts key={s.id} streamId={s.id} streamLabel={s.name || "Unnamed stream"} sourceLabel={sourceLabel} />
      ))}
    </WizardShell>
  );
}
