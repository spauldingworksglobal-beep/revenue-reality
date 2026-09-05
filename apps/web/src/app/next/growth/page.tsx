"use client";

import { useState } from "react";
import type { Cadence, CapitalNature, CapitalRequirementCategory } from "@revenue-reality/domain";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useNext } from "@/lib/next-store";
import { newId } from "@/lib/ids";

const GROWTH_PRESETS = [
  "Marketing / demand generation",
  "Additional labor",
  "Contractor / fractional support",
  "Software / systems",
  "Fulfillment",
  "New operating step",
  "Increased inventory",
  "Deposits",
  "Working capital",
  "Equipment / capacity",
  "Other",
];

const CAPITAL_CATEGORIES: { value: CapitalRequirementCategory; label: string }[] = [
  { value: "WORKING_CAPITAL", label: "Working capital" },
  { value: "INVENTORY_DEPOSIT", label: "Inventory / deposits" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "REINVESTMENT", label: "Reinvestment" },
  { value: "OTHER", label: "Other" },
];

export default function NextGrowthPage() {
  const { operatingCosts, setOperatingCosts, capitalItems, setCapitalItems } = useNext();
  const [label, setLabel] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [nature, setNature] = useState<CapitalNature>("RECURRING");
  const [cadence, setCadence] = useState<Cadence>("MONTHLY");
  const [capitalCategory, setCapitalCategory] = useState<CapitalRequirementCategory>("WORKING_CAPITAL");
  const [error, setError] = useState<string | null>(null);

  const growthOpex = operatingCosts.filter((c) => c.category.startsWith("Growth: "));

  function addGrowthItem() {
    if (label.trim() === "" || amountRaw.trim() === "") return;
    try {
      const amount = parseCurrencyInput(amountRaw);
      if (nature === "RECURRING") {
        setOperatingCosts((prev) => [
          ...prev,
          { id: newId(), scenarioId: "next", category: `Growth: ${label.trim()}`, amount, cadence, knownOrEstimated: "KNOWN", confidence: "STRONG_ESTIMATE", isPartialList: false },
        ]);
      } else {
        setCapitalItems((prev) => [
          ...prev,
          { id: newId(), scenarioId: "next", category: capitalCategory, amount, nature: "ONE_TIME", cadence: "ONE_TIME", confidence: "STRONG_ESTIMATE" },
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
      eyebrow="NEXT · Growth Is Not Free"
      title="What will have to be added or spent to reach this NEXT model?"
      intro={
        <p>
          If NEXT needs more sales, more capacity, or new operating complexity, that has a real cost.
          A recurring cost (like new marketing spend) becomes part of NEXT&rsquo;s operating requirement.
          A one-time cost (like equipment or an inventory build) becomes a capital requirement — never
          folded into ongoing costs just to simplify the math.
        </p>
      }
      backHref="/next/opex"
      nextHref="/next/owners"
    >
      {growthOpex.length > 0 && (
        <ul className="flex flex-col gap-2">
          {growthOpex.map((cost) => (
            <li key={cost.id} className="flex items-center justify-between rounded-md border border-ink/15 bg-white p-3 text-sm">
              <span>{cost.category.replace("Growth: ", "")} — ${cost.amount} / {cost.cadence.toLowerCase()} (recurring)</span>
              <button type="button" onClick={() => setOperatingCosts((prev) => prev.filter((c) => c.id !== cost.id))} className="text-xs text-ink/60 underline hover:text-ink">
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
        <div className="flex flex-wrap gap-2">
          {GROWTH_PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => setLabel(p)} className="rounded-full border border-ink/25 px-3 py-1.5 text-xs hover:border-accent">
              {p}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
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
            <div className="flex gap-1" role="radiogroup" aria-label="Recurring or one-time">
              <button type="button" role="radio" aria-checked={nature === "RECURRING"} onClick={() => setNature("RECURRING")} className={`rounded-md border px-3 py-2 text-xs ${nature === "RECURRING" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}>
                A recurring cost
              </button>
              <button type="button" role="radio" aria-checked={nature === "ONE_TIME"} onClick={() => setNature("ONE_TIME")} className={`rounded-md border px-3 py-2 text-xs ${nature === "ONE_TIME" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}>
                A one-time cost
              </button>
            </div>
          </div>
          {nature === "RECURRING" ? (
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
          <button type="button" onClick={addGrowthItem} className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
            Add
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      </div>

      <p className="text-xs text-ink/50">
        If a one-time cost is financed, put the loan payment itself in the previous screen as a
        recurring operating cost — Revenue Reality never assumes a financing structure for you.
      </p>
      {growthOpex.length === 0 && capitalItems.filter((c) => c.nature === "ONE_TIME").length === 0 && (
        <p className="text-xs text-ink/50">If reaching this model costs nothing extra, that&rsquo;s a valid answer too — leave this empty.</p>
      )}
    </WizardShell>
  );
}
