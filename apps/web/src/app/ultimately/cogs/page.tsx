"use client";

import { useState } from "react";
import type { CogsInput, CogsMethod } from "@revenue-reality/domain";
import { formatMoney, resolveCogsPerUnit } from "@revenue-reality/revenue-engine";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { useUltimately } from "@/lib/ultimately-store";

const METHODS: { value: CogsMethod; label: string }[] = [
  { value: "PER_UNIT", label: "Per unit" },
  { value: "PER_BATCH", label: "Per batch" },
  { value: "COMPONENT_BUILDUP", label: "By components" },
  { value: "ESTIMATE", label: "I'm not sure" },
];

function StreamCogsEditor({ streamId, streamLabel, sourceLabel }: { streamId: string; streamLabel: string; sourceLabel: string }) {
  const { getStreamInput, updateStreamInput } = useUltimately();
  const input = getStreamInput(streamId);
  const cogs = input.cogs;
  const [error, setError] = useState<string | null>(null);

  function setMethod(method: CogsMethod) {
    const base: CogsInput = { method };
    if (method === "COMPONENT_BUILDUP") base.components = [];
    updateStreamInput(streamId, { cogs: base });
    setError(null);
  }

  function commit(next: CogsInput) {
    try {
      resolveCogsPerUnit(next);
      updateStreamInput(streamId, { cogs: next });
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  let preview: string | null = null;
  if (cogs) {
    try {
      preview = formatMoney(resolveCogsPerUnit(cogs));
    } catch {
      preview = null;
    }
  }

  return (
    <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
      <legend className="px-1 text-sm font-medium">{streamLabel}</legend>
      <p className="mb-2 text-xs text-ink/60">
        Will this change once mature? Pre-filled from your {sourceLabel} model — an improved margin has to be an
        explicit assumption you enter here, never automatic just because volume grows.
      </p>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`COGS method for ${streamLabel}`}>
        {METHODS.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={cogs?.method === m.value}
            onClick={() => setMethod(m.value)}
            className={`rounded-md border px-3 py-2 text-sm ${cogs?.method === m.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {cogs?.method === "PER_UNIT" && (
        <div className="mt-3 flex flex-col gap-1">
          <label className="text-xs text-ink/70">Cost per unit</label>
          <input
            type="text"
            inputMode="decimal"
            defaultValue={cogs.perUnit?.value ?? ""}
            onBlur={(e) => {
              if (e.target.value.trim() === "") return;
              try {
                commit({ method: "PER_UNIT", perUnit: { value: parseCurrencyInput(e.target.value), confidence: "STRONG_ESTIMATE" } });
              } catch (err) {
                if (err instanceof ValidationError) setError(err.message);
              }
            }}
            className="w-32 rounded-md border border-ink/25 px-3 py-2"
          />
        </div>
      )}

      {cogs?.method === "PER_BATCH" && (
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">Total batch cost</label>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={cogs.batch?.batchCost ?? ""}
              onBlur={(e) => {
                if (e.target.value.trim() === "") return;
                try {
                  const batchCost = parseCurrencyInput(e.target.value);
                  commit({ method: "PER_BATCH", batch: { batchCost, sellableUnits: cogs.batch?.sellableUnits ?? 0 } });
                } catch (err) {
                  if (err instanceof ValidationError) setError(err.message);
                }
              }}
              className="w-32 rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">Sellable units produced</label>
            <input
              type="text"
              inputMode="numeric"
              defaultValue={cogs.batch?.sellableUnits?.toString() ?? ""}
              onBlur={(e) => {
                if (e.target.value.trim() === "") return;
                const units = Number(e.target.value);
                commit({ method: "PER_BATCH", batch: { batchCost: cogs.batch?.batchCost ?? "0.00", sellableUnits: units } });
              }}
              className="w-32 rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
        </div>
      )}

      {cogs?.method === "COMPONENT_BUILDUP" && (
        <div className="mt-3 flex flex-col gap-2">
          {(cogs.components ?? []).map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. co-packer"
                defaultValue={c.label}
                onBlur={(e) => {
                  const components = [...(cogs.components ?? [])];
                  components[i] = { ...components[i]!, label: e.target.value };
                  commit({ method: "COMPONENT_BUILDUP", components });
                }}
                className="flex-1 rounded-md border border-ink/25 px-3 py-2"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="$0.00"
                defaultValue={c.amount}
                onBlur={(e) => {
                  if (e.target.value.trim() === "") return;
                  try {
                    const components = [...(cogs.components ?? [])];
                    components[i] = { ...components[i]!, amount: parseCurrencyInput(e.target.value) };
                    commit({ method: "COMPONENT_BUILDUP", components });
                  } catch (err) {
                    if (err instanceof ValidationError) setError(err.message);
                  }
                }}
                className="w-28 rounded-md border border-ink/25 px-3 py-2"
              />
              <button
                type="button"
                onClick={() => commit({ method: "COMPONENT_BUILDUP", components: (cogs.components ?? []).filter((_, j) => j !== i) })}
                className="text-xs text-ink/60 underline hover:text-ink"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => commit({ method: "COMPONENT_BUILDUP", components: [...(cogs.components ?? []), { label: "", amount: "0.00" }] })}
            className="mt-1 self-start rounded-md border border-ink/25 px-3 py-2 text-xs font-medium hover:bg-ink/5"
          >
            Add a cost component
          </button>
        </div>
      )}

      {cogs?.method === "ESTIMATE" && (
        <div className="mt-3 flex flex-col gap-1">
          <label className="text-xs text-ink/70">Your best estimate, per unit</label>
          <input
            type="text"
            inputMode="decimal"
            defaultValue={cogs.perUnit?.value ?? ""}
            onBlur={(e) => {
              if (e.target.value.trim() === "") return;
              try {
                commit({ method: "ESTIMATE", perUnit: { value: parseCurrencyInput(e.target.value), confidence: "ROUGH_ESTIMATE" } });
              } catch (err) {
                if (err instanceof ValidationError) setError(err.message);
              }
            }}
            className="w-32 rounded-md border border-ink/25 px-3 py-2"
          />
        </div>
      )}

      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      {preview && <p className="mt-2 text-sm text-ink/70">Resolved COGS per unit: <strong>${preview}</strong></p>}
    </fieldset>
  );
}

export default function UltimatelyCogsPage() {
  const { revenueStreams } = useLifeReality();
  const { initializedFrom } = useUltimately();
  const activeStreams = revenueStreams.filter((s) => s.active);

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Cost of Delivery"
      title="What will it cost to make or deliver what you sell, mature?"
      backHref="/ultimately/streams"
      nextHref="/ultimately/variable-costs"
    >
      {activeStreams.map((s) => (
        <StreamCogsEditor key={s.id} streamId={s.id} streamLabel={s.name || "Unnamed stream"} sourceLabel={initializedFrom ?? "NEXT"} />
      ))}
    </WizardShell>
  );
}
