"use client";

import { useState } from "react";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { newId } from "@/lib/ids";

/** ADD has no current counterpart, so it's handled separately below — this screen's
 *  per-category choices are exactly the four that apply to an EXISTING category. */
type ExistingCategoryChoice = "KEEP" | "REDUCE" | "INCREASE" | "REMOVE";

const CHOICES: { value: ExistingCategoryChoice; label: string }[] = [
  { value: "KEEP", label: "Keep" },
  { value: "REDUCE", label: "Reduce" },
  { value: "INCREASE", label: "Increase" },
  { value: "REMOVE", label: "Remove" },
];

export default function IntendedLifePage() {
  const { currentCategories, lifeChanges, setLifeChanges, deferredNeeds, setDeferredNeeds } = useLifeReality();
  const [newLabel, setNewLabel] = useState("");
  const [newAmountRaw, setNewAmountRaw] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  // Which button is visually selected, independent of whether a REDUCE/INCREASE
  // has an amount committed yet. Without this, clicking Reduce/Increase on a
  // category with no current amount had no fallback value to commit
  // immediately — the amount field never appeared and the click silently did
  // nothing. This tracks the click itself; setChoice still owns the store commit.
  const [pendingChoice, setPendingChoice] = useState<Record<string, ExistingCategoryChoice>>({});

  function choiceFor(categoryId: string): ExistingCategoryChoice {
    if (pendingChoice[categoryId]) return pendingChoice[categoryId];
    const existing = lifeChanges.find((c) => "currentCategoryId" in c && c.currentCategoryId === categoryId);
    return (existing?.changeType as ExistingCategoryChoice | undefined) ?? "KEEP";
  }

  function amountRawFor(categoryId: string, fallback: string): string {
    const existing = lifeChanges.find((c) => "currentCategoryId" in c && c.currentCategoryId === categoryId);
    if (existing && "newAmount" in existing) return existing.newAmount.value;
    return fallback;
  }

  function selectChoice(categoryId: string, changeType: ExistingCategoryChoice, currentAmountValue: string) {
    setPendingChoice((prev) => ({ ...prev, [categoryId]: changeType }));
    if (changeType === "KEEP" || changeType === "REMOVE") {
      setChoice(categoryId, changeType);
    } else if (currentAmountValue !== "") {
      // a current amount exists — commit it immediately as the starting point, same as before
      setChoice(categoryId, changeType, currentAmountValue);
    }
    // otherwise: just show the (now-empty) amount input and wait for the owner to type and blur
  }

  function setChoice(categoryId: string, changeType: ExistingCategoryChoice, amountRaw?: string) {
    setLifeChanges((prev) => {
      const withoutThis = prev.filter((c) => !("currentCategoryId" in c) || c.currentCategoryId !== categoryId);
      if (changeType === "KEEP" || changeType === "REMOVE") {
        return [...withoutThis, { currentCategoryId: categoryId, changeType }];
      }
      if (amountRaw === undefined || amountRaw.trim() === "") {
        // no amount yet — leave the store's KEEP in place; the pending-choice
        // state above is what keeps the amount input visible in the meantime
        return withoutThis;
      }
      try {
        const parsed = parseCurrencyInput(amountRaw);
        return [
          ...withoutThis,
          { currentCategoryId: categoryId, changeType, newAmount: { value: parsed, confidence: "STRONG_ESTIMATE" as const } },
        ];
      } catch {
        return withoutThis;
      }
    });
  }

  function addCategory() {
    if (newLabel.trim() === "" || newAmountRaw.trim() === "") return;
    try {
      const parsed = parseCurrencyInput(newAmountRaw);
      setLifeChanges((prev) => [
        ...prev,
        {
          changeType: "ADD",
          id: newId(),
          kind: "OTHER",
          label: newLabel.trim(),
          newAmount: { value: parsed, confidence: "ROUGH_ESTIMATE" },
          cadence: "MONTHLY",
        },
      ]);
      setAddError(null);
      setNewLabel("");
      setNewAmountRaw("");
    } catch (e) {
      if (e instanceof ValidationError) setAddError(e.message);
    }
  }

  return (
    <WizardShell
      eyebrow="Life Reality · Intended"
      title="Now build the life you actually want this business to help make possible."
      intro={
        <>
          <p>
            Every category below carries over from what you just entered. For each one: keep it,
            reduce it, increase it, or remove it. Nothing here is a bigger version of today by
            default — you decide.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/life/current/deferred"
      nextHref="/life/intended/security"
    >
      {currentCategories.map((category) => {
        const choice = choiceFor(category.id);
        const currentDisplay = category.currentAmount ? `$${category.currentAmount.value}` : "unknown";
        return (
          <fieldset key={category.id} className="rounded-lg border border-ink/15 bg-white p-4">
            <legend className="px-1 text-sm font-medium">
              {category.label} <span className="font-normal text-ink/50">— currently {currentDisplay}/mo</span>
            </legend>
            <div className="mt-2 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={`${category.label} — intended change`}>
              {CHOICES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={choice === opt.value}
                  onClick={() => selectChoice(category.id, opt.value, category.currentAmount?.value ?? "")}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    choice === opt.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {(choice === "REDUCE" || choice === "INCREASE") && (
                <input
                  key={choice}
                  type="text"
                  inputMode="decimal"
                  aria-label={`New monthly amount for ${category.label}`}
                  defaultValue={amountRawFor(category.id, category.currentAmount?.value ?? "")}
                  onBlur={(e) => setChoice(category.id, choice, e.target.value)}
                  className="w-28 rounded-md border border-ink/25 px-3 py-2"
                />
              )}
            </div>
          </fieldset>
        );
      })}

      {deferredNeeds.length > 0 && (
        <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
          <legend className="px-1 text-sm font-medium">
            You told us these are currently deferred or underfunded — include them in the life you&rsquo;re building?
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {deferredNeeds.map((need) => (
              <label key={need.id} className="flex items-center gap-2 rounded-md border border-ink/15 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={need.includeInIntended}
                  onChange={(e) =>
                    setDeferredNeeds((prev) => prev.map((n) => (n.id === need.id ? { ...n, includeInIntended: e.target.checked } : n)))
                  }
                  className="h-5 w-5"
                />
                <span>
                  {need.description}
                  {need.estimatedAmount ? ` — ~$${need.estimatedAmount.value}/mo` : " — amount not yet known"}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink/60">
            Leaving one unchecked doesn&rsquo;t discard it — it stays visible on the comparison screen either way.
          </p>
        </fieldset>
      )}

      <div className="rounded-lg border border-dashed border-ink/25 p-4">
        <p className="mb-2 text-sm font-medium">Add something new to the life you&rsquo;re building</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="add-label" className="text-xs text-ink/70">
              What is it?
            </label>
            <input
              id="add-label"
              type="text"
              placeholder="e.g. Monthly travel fund"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="add-amount" className="text-xs text-ink/70">
              Monthly amount
            </label>
            <input
              id="add-amount"
              type="text"
              inputMode="decimal"
              value={newAmountRaw}
              onChange={(e) => setNewAmountRaw(e.target.value)}
              className="w-28 rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <button type="button" onClick={addCategory} className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
            Add
          </button>
        </div>
        {addError && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {addError}
          </p>
        )}
      </div>
    </WizardShell>
  );
}
