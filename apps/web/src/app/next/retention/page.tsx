"use client";

import { useState } from "react";
import type { Cadence, CapitalNature, CapitalRequirementCategory } from "@revenue-reality/domain";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useNext } from "@/lib/next-store";
import { newId } from "@/lib/ids";

const CATEGORIES: { value: CapitalRequirementCategory; label: string; defaultNature: CapitalNature }[] = [
  { value: "RESERVE", label: "Operating reserve", defaultNature: "RECURRING" },
  { value: "WORKING_CAPITAL", label: "Working capital", defaultNature: "RECURRING" },
  { value: "INVENTORY_DEPOSIT", label: "Inventory / deposits", defaultNature: "ONE_TIME" },
  { value: "EQUIPMENT", label: "Equipment replacement", defaultNature: "ONE_TIME" },
  { value: "REINVESTMENT", label: "Reinvestment / growth", defaultNature: "ONE_TIME" },
  { value: "DEBT_REDUCTION", label: "Debt reduction", defaultNature: "RECURRING" },
  { value: "OTHER", label: "Other", defaultNature: "ONE_TIME" },
];

export default function NextRetentionPage() {
  const { capitalItems, setCapitalItems } = useNext();
  const [category, setCategory] = useState<CapitalRequirementCategory | null>(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [nature, setNature] = useState<CapitalNature>("ONE_TIME");
  const [cadence, setCadence] = useState<Cadence>("MONTHLY");
  const [error, setError] = useState<string | null>(null);

  function pickCategory(c: (typeof CATEGORIES)[number]) {
    setCategory(c.value);
    setNature(c.defaultNature);
  }

  function addItem() {
    if (category === null || amountRaw.trim() === "") return;
    try {
      const amount = parseCurrencyInput(amountRaw);
      setCapitalItems((prev) => [
        ...prev,
        {
          id: newId(),
          scenarioId: "next",
          category,
          amount,
          nature,
          cadence: nature === "ONE_TIME" ? "ONE_TIME" : cadence,
          confidence: "STRONG_ESTIMATE",
        },
      ]);
      setCategory(null);
      setAmountRaw("");
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  return (
    <WizardShell
      eyebrow="NEXT · Business Retention"
      title="What will this NEXT model need to keep or put back into itself?"
      intro={
        <p>
          Pre-filled from NOW, plus anything you already added on the growth-costs screen. Adjust what
          NEXT actually needs to retain before anything is available to the owner.
        </p>
      }
      backHref="/next/distribution"
      nextHref="/next/capacity"
    >
      {capitalItems.length > 0 && (
        <ul className="flex flex-col gap-2">
          {capitalItems.map((item) => {
            const label = CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;
            return (
              <li key={item.id} className="flex items-center justify-between rounded-md border border-ink/15 bg-white p-3 text-sm">
                <span>
                  {label} — ${item.amount}
                  {item.nature === "ONE_TIME" ? " (one-time)" : ` / ${item.cadence.toLowerCase()}`}
                </span>
                <button
                  type="button"
                  onClick={() => setCapitalItems((prev) => prev.filter((i) => i.id !== item.id))}
                  className="text-xs text-ink/60 underline hover:text-ink"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-ink/25 p-4">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Retention category">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={category === c.value}
              onClick={() => pickCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-xs ${category === c.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25 hover:border-accent"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {category !== null && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink/70">Amount</label>
              <input
                type="text"
                inputMode="decimal"
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
                className="w-28 rounded-md border border-ink/25 px-3 py-2"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink/70">This is</label>
              <div className="flex gap-1" role="radiogroup" aria-label="Recurring or one-time">
                <button
                  type="button"
                  role="radio"
                  aria-checked={nature === "ONE_TIME"}
                  onClick={() => setNature("ONE_TIME")}
                  className={`rounded-md border px-3 py-2 text-xs ${nature === "ONE_TIME" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
                >
                  A one-time capital need
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={nature === "RECURRING"}
                  onClick={() => setNature("RECURRING")}
                  className={`rounded-md border px-3 py-2 text-xs ${nature === "RECURRING" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
                >
                  A recurring requirement
                </button>
              </div>
            </div>
            {nature === "RECURRING" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink/70">Cadence</label>
                <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)} className="rounded-md border border-ink/25 px-2 py-2">
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>
            )}
            <button type="button" onClick={addItem} className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
              Add
            </button>
          </div>
        )}
        {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      </div>

      {capitalItems.length === 0 && (
        <p className="text-xs text-ink/50">If NEXT doesn&rsquo;t need to retain anything, that&rsquo;s a valid answer too — leave this empty.</p>
      )}
    </WizardShell>
  );
}
