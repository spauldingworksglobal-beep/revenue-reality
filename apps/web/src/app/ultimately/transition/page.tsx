"use client";

import { useState } from "react";
import type { Cadence, CapitalNature, CapitalRequirementCategory } from "@revenue-reality/domain";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useUltimately } from "@/lib/ultimately-store";
import { newId } from "@/lib/ids";

type Nature = "MATURE_RECURRING" | "TRANSITION_ONLY" | "ONE_TIME";

const CAPITAL_CATEGORIES: { value: CapitalRequirementCategory; label: string }[] = [
  { value: "WORKING_CAPITAL", label: "Working capital" },
  { value: "INVENTORY_DEPOSIT", label: "Inventory / deposits" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "REINVESTMENT", label: "Reinvestment" },
  { value: "OTHER", label: "Other" },
];

export default function UltimatelyTransitionPage() {
  const { operatingCosts, setOperatingCosts, transitionOnlyCosts, setTransitionOnlyCosts, capitalItems, setCapitalItems } = useUltimately();
  const [label, setLabel] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [nature, setNature] = useState<Nature>("MATURE_RECURRING");
  const [cadence, setCadence] = useState<Cadence>("MONTHLY");
  const [capitalCategory, setCapitalCategory] = useState<CapitalRequirementCategory>("WORKING_CAPITAL");
  const [error, setError] = useState<string | null>(null);

  const matureAdds = operatingCosts.filter((c) => c.category.startsWith("Transition-to-mature: "));

  function addItem() {
    if (label.trim() === "" || amountRaw.trim() === "") return;
    try {
      const amount = parseCurrencyInput(amountRaw);
      if (nature === "MATURE_RECURRING") {
        setOperatingCosts((prev) => [
          ...prev,
          { id: newId(), scenarioId: "ultimately", category: `Transition-to-mature: ${label.trim()}`, amount, cadence, knownOrEstimated: "KNOWN", confidence: "STRONG_ESTIMATE", isPartialList: false },
        ]);
      } else if (nature === "TRANSITION_ONLY") {
        // Deliberately never added to operatingCosts — this is what keeps a
        // temporary cost from silently becoming permanent mature OPEX.
        setTransitionOnlyCosts((prev) => [
          ...prev,
          { id: newId(), scenarioId: "ultimately", category: label.trim(), amount, cadence, knownOrEstimated: "KNOWN", confidence: "STRONG_ESTIMATE", isPartialList: false },
        ]);
      } else {
        setCapitalItems((prev) => [
          ...prev,
          { id: newId(), scenarioId: "ultimately", category: capitalCategory, amount, nature: "ONE_TIME", cadence: "ONE_TIME", confidence: "STRONG_ESTIMATE" },
        ]);
      }
      setLabel("");
      setAmountRaw("");
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Getting To Mature Isn't Free"
      title="What has to be added or spent to get from here to the mature model?"
      intro={
        <p>
          Three different things, kept separate on purpose: a cost the mature business needs{" "}
          <strong>permanently</strong> becomes part of its real operating requirement. A cost needed{" "}
          <strong>only during the move</strong> from NEXT to ULTIMATELY — a consultant, temporary
          contractor support, a one-time systems migration retainer — is tracked here but never
          folded into the mature model&rsquo;s ongoing costs. A <strong>one-time</strong> cost (equipment,
          an inventory build) becomes a capital requirement instead.
        </p>
      }
      backHref="/ultimately/opex"
      nextHref="/ultimately/owners"
    >
      {matureAdds.length > 0 && (
        <ul className="flex flex-col gap-2">
          {matureAdds.map((cost) => (
            <li key={cost.id} className="flex items-center justify-between rounded-md border border-ink/15 bg-white p-3 text-sm">
              <span>{cost.category.replace("Transition-to-mature: ", "")} — ${cost.amount} / {cost.cadence.toLowerCase()} (permanent, mature)</span>
              <button type="button" onClick={() => setOperatingCosts((prev) => prev.filter((c) => c.id !== cost.id))} className="text-xs text-ink/60 underline hover:text-ink">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {transitionOnlyCosts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {transitionOnlyCosts.map((cost) => (
            <li key={cost.id} className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
              <span>{cost.category} — ${cost.amount} / {cost.cadence.toLowerCase()} (transition-only — not part of mature OPEX)</span>
              <button type="button" onClick={() => setTransitionOnlyCosts((prev) => prev.filter((c) => c.id !== cost.id))} className="text-xs text-ink/60 underline hover:text-ink">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {capitalItems.filter((c) => c.nature === "ONE_TIME").length > 0 && (
        <ul className="flex flex-col gap-2">
          {capitalItems
            .filter((c) => c.nature === "ONE_TIME")
            .map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-md border border-ink/15 bg-white p-3 text-sm">
                <span>{CAPITAL_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category} — ${item.amount} (one-time)</span>
                <button type="button" onClick={() => setCapitalItems((prev) => prev.filter((c) => c.id !== item.id))} className="text-xs text-ink/60 underline hover:text-ink">
                  Remove
                </button>
              </li>
            ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-ink/25 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-ink/70">What is it?</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="rounded-md border border-ink/25 px-3 py-2" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">Amount</label>
            <input type="text" inputMode="decimal" value={amountRaw} onChange={(e) => setAmountRaw(e.target.value)} className="w-28 rounded-md border border-ink/25 px-3 py-2" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">This is</label>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Nature of this cost">
              <button type="button" role="radio" aria-checked={nature === "MATURE_RECURRING"} onClick={() => setNature("MATURE_RECURRING")} className={`rounded-md border px-3 py-2 text-xs ${nature === "MATURE_RECURRING" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}>
                A permanent mature cost
              </button>
              <button type="button" role="radio" aria-checked={nature === "TRANSITION_ONLY"} onClick={() => setNature("TRANSITION_ONLY")} className={`rounded-md border px-3 py-2 text-xs ${nature === "TRANSITION_ONLY" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}>
                Temporary — only for the move
              </button>
              <button type="button" role="radio" aria-checked={nature === "ONE_TIME"} onClick={() => setNature("ONE_TIME")} className={`rounded-md border px-3 py-2 text-xs ${nature === "ONE_TIME" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}>
                A one-time cost
              </button>
            </div>
          </div>
          {nature !== "ONE_TIME" ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink/70">Cadence</label>
              <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)} className="rounded-md border border-ink/25 px-2 py-2">
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ANNUALLY">Annually</option>
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink/70">Capital category</label>
              <select value={capitalCategory} onChange={(e) => setCapitalCategory(e.target.value as CapitalRequirementCategory)} className="rounded-md border border-ink/25 px-2 py-2">
                {CAPITAL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="button" onClick={addItem} className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
            Add
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      </div>

      <p className="text-xs text-ink/50">
        If a one-time cost is financed, put the loan payment itself in the mature operating costs
        screen as a permanent recurring cost — Revenue Reality never assumes a financing structure
        for you.
      </p>
      {matureAdds.length === 0 && transitionOnlyCosts.length === 0 && capitalItems.filter((c) => c.nature === "ONE_TIME").length === 0 && (
        <p className="text-xs text-ink/50">If getting there costs nothing extra, that&rsquo;s a valid answer too — leave this empty.</p>
      )}
    </WizardShell>
  );
}
