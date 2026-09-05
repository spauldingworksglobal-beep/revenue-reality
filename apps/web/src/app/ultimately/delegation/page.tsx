"use client";

import { useState } from "react";
import type { Cadence, DelegationType } from "@revenue-reality/domain";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useUltimately } from "@/lib/ultimately-store";
import { newId } from "@/lib/ids";

const DELEGATION_TYPES: { value: DelegationType; label: string }[] = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "FRACTIONAL", label: "Fractional" },
  { value: "AUTOMATE", label: "Automate" },
  { value: "OUTSOURCE", label: "Outsource" },
  { value: "ELIMINATE", label: "Eliminate the work entirely" },
  { value: "UNSURE", label: "Not sure yet" },
];

export default function UltimatelyDelegationPage() {
  const { delegationItems, setDelegationItems } = useUltimately();
  const [functionLabel, setFunctionLabel] = useState("");
  const [delegationType, setDelegationType] = useState<DelegationType>("CONTRACTOR");
  const [costRaw, setCostRaw] = useState("");
  const [cadence, setCadence] = useState<Cadence>("MONTHLY");
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    if (functionLabel.trim() === "") return;
    try {
      const replacementCost = costRaw.trim() === "" ? null : { value: parseCurrencyInput(costRaw), confidence: "STRONG_ESTIMATE" as const };
      setDelegationItems((prev) => [
        ...prev,
        { id: newId(), scenarioId: "ultimately", functionLabel: functionLabel.trim(), delegationType, replacementCost, cadence },
      ]);
      setFunctionLabel("");
      setCostRaw("");
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  function updateCost(id: string, raw: string) {
    if (raw.trim() === "") {
      setDelegationItems((prev) => prev.map((d) => (d.id === id ? { ...d, replacementCost: null } : d)));
      return;
    }
    try {
      const replacementCost = { value: parseCurrencyInput(raw), confidence: "STRONG_ESTIMATE" as const };
      setDelegationItems((prev) => prev.map((d) => (d.id === id ? { ...d, replacementCost } : d)));
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Owner Labor / Delegation"
      title="What no longer depends on you in the mature business?"
      intro={
        <>
          <p>
            Pre-filled from what you already told us you eventually want off your plate — give each
            one a real cost if you know it, or leave it blank; Revenue Reality will never invent a
            market rate, and will say so plainly rather than pretend the number is complete.
          </p>
          <p className="mt-3 rounded-md border border-ink/15 bg-white p-3 text-xs text-ink/70">
            This never charges the same work twice. Three cases:
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs text-ink/70">
            <li>
              <strong>You keep doing this work.</strong> Don&rsquo;t list it here — it&rsquo;s already reflected in
              your own compensation on the owners screen.
            </li>
            <li>
              <strong>You stop doing it and it&rsquo;s replaced.</strong> List it here with its replacement cost —
              this is a real added cost, separate from your own pay, and it does not reduce what the
              business still owes you.
            </li>
            <li>
              <strong>You keep part of it and delegate the rest.</strong> List only the delegated portion here;
              the part you keep stays reflected in your own compensation, not here.
            </li>
          </ul>
        </>
      }
      backHref="/ultimately/owners"
      nextHref="/ultimately/distribution"
    >
      {delegationItems.length > 0 && (
        <ul className="flex flex-col gap-2">
          {delegationItems.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink/15 bg-white p-3 text-sm">
              <span className="flex-1">
                {item.functionLabel} — {DELEGATION_TYPES.find((t) => t.value === item.delegationType)?.label}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Cost not yet known"
                defaultValue={item.replacementCost?.value ?? ""}
                onBlur={(e) => updateCost(item.id, e.target.value)}
                className="w-32 rounded-md border border-ink/25 px-2 py-1 text-sm"
              />
              <select
                value={item.delegationType}
                onChange={(e) => setDelegationItems((prev) => prev.map((d) => (d.id === item.id ? { ...d, delegationType: e.target.value as DelegationType } : d)))}
                className="rounded-md border border-ink/25 px-2 py-1 text-sm"
              >
                {DELEGATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setDelegationItems((prev) => prev.filter((d) => d.id !== item.id))} className="text-xs text-ink/60 underline hover:text-ink">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-ink/25 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-ink/70">What work / function?</label>
            <input type="text" placeholder="e.g. Bookkeeping" value={functionLabel} onChange={(e) => setFunctionLabel(e.target.value)} className="rounded-md border border-ink/25 px-3 py-2" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">How</label>
            <select value={delegationType} onChange={(e) => setDelegationType(e.target.value as DelegationType)} className="rounded-md border border-ink/25 px-2 py-2">
              {DELEGATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">Replacement cost (optional — leave blank if unknown)</label>
            <input type="text" inputMode="decimal" placeholder="I don't know yet" value={costRaw} onChange={(e) => setCostRaw(e.target.value)} className="w-32 rounded-md border border-ink/25 px-3 py-2" />
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
          <button type="button" onClick={addItem} className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
            Add
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      </div>

      {delegationItems.length === 0 && <p className="text-xs text-ink/50">If the mature business still depends on you for everything, that&rsquo;s a valid answer too — leave this empty.</p>}
    </WizardShell>
  );
}
