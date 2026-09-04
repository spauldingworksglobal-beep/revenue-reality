"use client";

import { useState } from "react";
import type { SecurityItemKind } from "@revenue-reality/domain";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { newId } from "@/lib/ids";

/** ADD has no current counterpart, so it's handled separately below. */
type ExistingSecurityChoice = "KEEP" | "REDUCE" | "INCREASE" | "REMOVE";

const CHOICES: { value: ExistingSecurityChoice; label: string }[] = [
  { value: "KEEP", label: "Keep" },
  { value: "REDUCE", label: "Reduce" },
  { value: "INCREASE", label: "Increase" },
  { value: "REMOVE", label: "Remove" },
];

export default function IntendedSecurityPage() {
  const { currentSecurity, securityChanges, setSecurityChanges } = useLifeReality();
  const [newLabel, setNewLabel] = useState("");
  const [newAmountRaw, setNewAmountRaw] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  // See the identical note in /life/intended/page.tsx — without this, clicking
  // Reduce/Increase on an item with no current amount had no fallback value to
  // commit immediately, so the amount field never appeared.
  const [pendingChoice, setPendingChoice] = useState<Record<string, ExistingSecurityChoice>>({});

  function choiceFor(securityId: string): ExistingSecurityChoice {
    if (pendingChoice[securityId]) return pendingChoice[securityId];
    const existing = securityChanges.find((c) => "currentSecurityId" in c && c.currentSecurityId === securityId);
    return (existing?.changeType as ExistingSecurityChoice | undefined) ?? "KEEP";
  }

  function amountRawFor(securityId: string, fallback: string): string {
    const existing = securityChanges.find((c) => "currentSecurityId" in c && c.currentSecurityId === securityId);
    if (existing && "newAmount" in existing) return existing.newAmount.value;
    return fallback;
  }

  function selectChoice(securityId: string, changeType: ExistingSecurityChoice, currentAmountValue: string) {
    setPendingChoice((prev) => ({ ...prev, [securityId]: changeType }));
    if (changeType === "KEEP" || changeType === "REMOVE") {
      setChoice(securityId, changeType);
    } else if (currentAmountValue !== "") {
      setChoice(securityId, changeType, currentAmountValue);
    }
  }

  function setChoice(securityId: string, changeType: ExistingSecurityChoice, amountRaw?: string) {
    setSecurityChanges((prev) => {
      const withoutThis = prev.filter((c) => !("currentSecurityId" in c) || c.currentSecurityId !== securityId);
      if (changeType === "KEEP" || changeType === "REMOVE") {
        return [...withoutThis, { currentSecurityId: securityId, changeType }];
      }
      if (amountRaw === undefined || amountRaw.trim() === "") {
        return withoutThis;
      }
      try {
        const parsed = parseCurrencyInput(amountRaw);
        return [
          ...withoutThis,
          { currentSecurityId: securityId, changeType, newAmount: { value: parsed, confidence: "STRONG_ESTIMATE" as const } },
        ];
      } catch {
        return withoutThis;
      }
    });
  }

  function addSecurityItem() {
    if (newLabel.trim() === "" || newAmountRaw.trim() === "") return;
    try {
      const parsed = parseCurrencyInput(newAmountRaw);
      setSecurityChanges((prev) => [
        ...prev,
        {
          changeType: "ADD",
          id: newId(),
          kind: "OTHER" as SecurityItemKind,
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
      title="What financial security, benefits, or major goals should be included in that life?"
      intro={
        <p>
          Every item below carries over from what you told us about your current security — you
          never start this screen blank. For each one: keep it, reduce it, increase it, or remove
          it.
        </p>
      }
      backHref="/life/intended"
      nextHref="/life/intended/outcomes"
    >
      {currentSecurity.map((item) => {
        const choice = choiceFor(item.id);
        const currentDisplay = item.currentAmount ? `$${item.currentAmount.value}` : "unknown";
        return (
          <fieldset key={item.id} className="rounded-lg border border-ink/15 bg-white p-4">
            <legend className="px-1 text-sm font-medium">
              {item.label} <span className="font-normal text-ink/50">— currently {currentDisplay}/mo</span>
            </legend>
            <div className="mt-2 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={`${item.label} — intended change`}>
              {CHOICES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={choice === opt.value}
                  onClick={() => selectChoice(item.id, opt.value, item.currentAmount?.value ?? "")}
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
                  aria-label={`New monthly amount for ${item.label}`}
                  defaultValue={amountRawFor(item.id, item.currentAmount?.value ?? "")}
                  onBlur={(e) => setChoice(item.id, choice, e.target.value)}
                  className="w-28 rounded-md border border-ink/25 px-3 py-2"
                />
              )}
            </div>
            {choice === "KEEP" && item.currentAmount === null && (
              <p className="mt-2 text-xs text-ink/50">Still marked incomplete — carried over as-is, not zeroed.</p>
            )}
          </fieldset>
        );
      })}

      <div className="rounded-lg border border-dashed border-ink/25 p-4">
        <p className="mb-2 text-sm font-medium">Add a new security or wealth-building goal</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="add-security-label" className="text-xs text-ink/70">
              What is it?
            </label>
            <input
              id="add-security-label"
              type="text"
              placeholder="e.g. Home down payment fund"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="add-security-amount" className="text-xs text-ink/70">
              Monthly amount
            </label>
            <input
              id="add-security-amount"
              type="text"
              inputMode="decimal"
              value={newAmountRaw}
              onChange={(e) => setNewAmountRaw(e.target.value)}
              className="w-28 rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <button type="button" onClick={addSecurityItem} className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
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
