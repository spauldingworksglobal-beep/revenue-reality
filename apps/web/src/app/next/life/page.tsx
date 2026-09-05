"use client";

import { useMemo, useState } from "react";
import {
  computeLifeRequirement,
  computeSecurityRequirement,
  computeTotalPersonalEconomicRequirement,
  formatMoney,
  resolveConfirmedBusinessFundedAmount,
  resolveNextLifeCategories,
  resolveNextSecurityItems,
  type BusinessFundedConfirmation,
} from "@revenue-reality/revenue-engine";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { useNext } from "@/lib/next-store";

type Choice = "CURRENT" | "INTENDED" | "CUSTOM";

function ChoiceRow({
  label,
  currentDisplay,
  intendedDisplay,
  choice,
  customRaw,
  onChoose,
  onCustomBlur,
}: {
  label: string;
  currentDisplay: string;
  intendedDisplay: string;
  choice: Choice;
  customRaw: string;
  onChoose: (choice: Choice) => void;
  onCustomBlur: (raw: string) => void;
}) {
  return (
    <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <p className="mb-2 text-xs text-ink/60">
        Current: <strong>{currentDisplay}</strong> · Intended: <strong>{intendedDisplay}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={`NEXT choice for ${label}`}>
        <button type="button" role="radio" aria-checked={choice === "CURRENT"} onClick={() => onChoose("CURRENT")} className={`rounded-md border px-3 py-2 text-sm ${choice === "CURRENT" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}>
          Keep at current
        </button>
        <button type="button" role="radio" aria-checked={choice === "INTENDED"} onClick={() => onChoose("INTENDED")} className={`rounded-md border px-3 py-2 text-sm ${choice === "INTENDED" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}>
          Move to intended
        </button>
        <button type="button" role="radio" aria-checked={choice === "CUSTOM"} onClick={() => onChoose("CUSTOM")} className={`rounded-md border px-3 py-2 text-sm ${choice === "CUSTOM" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}>
          Custom amount
        </button>
        {choice === "CUSTOM" && (
          <input
            type="text"
            inputMode="decimal"
            defaultValue={customRaw}
            onBlur={(e) => onCustomBlur(e.target.value)}
            className="w-28 rounded-md border border-ink/25 px-3 py-2"
            aria-label={`Custom NEXT amount for ${label}`}
          />
        )}
      </div>
    </fieldset>
  );
}

export default function NextLifePage() {
  const {
    snapshotCurrentCategories,
    snapshotIntendedCategories,
    snapshotCurrentSecurity,
    snapshotIntendedSecurity,
    nextLifeCategorySelections,
    setNextLifeCategorySelection,
    nextSecurityItemSelections,
    setNextSecurityItemSelection,
    nextFundingConfirmation,
    setNextFundingConfirmation,
  } = useNext();
  const [fundingRaw, setFundingRaw] = useState("");
  const [fundingMode, setFundingMode] = useState<"AMOUNT" | "PERCENT">("PERCENT");
  const [fundingError, setFundingError] = useState<string | null>(null);

  const nextCategories = useMemo(
    () => resolveNextLifeCategories(snapshotCurrentCategories, snapshotIntendedCategories, nextLifeCategorySelections),
    [snapshotCurrentCategories, snapshotIntendedCategories, nextLifeCategorySelections],
  );
  const nextSecurityItems = useMemo(
    () => resolveNextSecurityItems(snapshotCurrentSecurity, snapshotIntendedSecurity, nextSecurityItemSelections),
    [snapshotCurrentSecurity, snapshotIntendedSecurity, nextSecurityItemSelections],
  );

  const nextLife = useMemo(() => computeLifeRequirement(nextCategories, "NEXT"), [nextCategories]);
  const nextSecurityReq = useMemo(() => computeSecurityRequirement(nextSecurityItems, "NEXT"), [nextSecurityItems]);
  const totalNext = useMemo(() => computeTotalPersonalEconomicRequirement(nextLife.monthly, nextSecurityReq.monthly), [nextLife, nextSecurityReq]);

  function choiceFor(id: string, selections: { categoryId?: string; itemId?: string; choice: Choice }[]): Choice {
    const found = selections.find((s) => s.categoryId === id || s.itemId === id);
    return found?.choice ?? "CURRENT";
  }

  const nextBusinessFunded = nextFundingConfirmation ? formatMoney(resolveConfirmedBusinessFundedAmount(totalNext, nextFundingConfirmation)) : null;

  function confirmFunding() {
    if (fundingRaw.trim() === "") {
      setFundingError("Enter an amount or percentage to confirm.");
      return;
    }
    try {
      let confirmation: BusinessFundedConfirmation;
      if (fundingMode === "PERCENT") {
        const pct = Number(fundingRaw);
        if (Number.isNaN(pct) || pct < 0 || pct > 100) throw new ValidationError("businessShare", "Enter a percentage between 0 and 100.");
        confirmation = { mode: "PERCENT_OF_TOTAL", percentOfTotal: String(pct / 100), confidence: "STRONG_ESTIMATE" };
      } else {
        confirmation = { mode: "AMOUNT", amount: parseCurrencyInput(fundingRaw), confidence: "STRONG_ESTIMATE" };
      }
      setNextFundingConfirmation(confirmation);
      setFundingError(null);
    } catch (e) {
      if (e instanceof ValidationError) setFundingError(e.message);
    }
  }

  return (
    <WizardShell
      eyebrow="NEXT · Life Reality"
      title="Which parts of the life you're building toward should become real in this next step?"
      intro={
        <>
          <p>
            You already told us your current life and the life you&rsquo;re building toward. NEXT doesn&rsquo;t
            ask you to answer a third time — for each category, choose where NEXT should land: at today&rsquo;s
            level, at your intended level, or somewhere of your own choosing in between.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/next"
      nextHref="/next/time"
    >
      {nextCategories.map((category) => {
        const current = snapshotCurrentCategories.find((c) => c.id === category.id);
        return (
          <ChoiceRow
            key={category.id}
            label={category.label}
            currentDisplay={current?.currentAmount ? `$${current.currentAmount.value}/mo` : "not entered"}
            intendedDisplay={category.intendedAmount ? `$${category.intendedAmount.value}/mo` : "not entered"}
            choice={choiceFor(category.id, nextLifeCategorySelections)}
            customRaw={category.nextAmount?.value ?? ""}
            onChoose={(choice) => {
              if (choice === "CUSTOM") {
                setNextLifeCategorySelection({ categoryId: category.id, choice: "CUSTOM", amount: category.nextAmount ?? { value: "0.00", confidence: "STRONG_ESTIMATE" } });
              } else {
                setNextLifeCategorySelection({ categoryId: category.id, choice });
              }
            }}
            onCustomBlur={(raw) => {
              if (raw.trim() === "") return;
              try {
                setNextLifeCategorySelection({ categoryId: category.id, choice: "CUSTOM", amount: { value: parseCurrencyInput(raw), confidence: "STRONG_ESTIMATE" } });
              } catch {
                // ignore invalid input, leave prior value in place
              }
            }}
          />
        );
      })}

      {nextSecurityItems.map((item) => {
        const current = snapshotCurrentSecurity.find((s) => s.id === item.id);
        return (
          <ChoiceRow
            key={item.id}
            label={item.label}
            currentDisplay={current?.currentAmount ? `$${current.currentAmount.value}/mo` : "not entered"}
            intendedDisplay={item.intendedAmount ? `$${item.intendedAmount.value}/mo` : "not entered"}
            choice={choiceFor(item.id, nextSecurityItemSelections)}
            customRaw={item.nextAmount?.value ?? ""}
            onChoose={(choice) => {
              if (choice === "CUSTOM") {
                setNextSecurityItemSelection({ itemId: item.id, choice: "CUSTOM", amount: item.nextAmount ?? { value: "0.00", confidence: "STRONG_ESTIMATE" } });
              } else {
                setNextSecurityItemSelection({ itemId: item.id, choice });
              }
            }}
            onCustomBlur={(raw) => {
              if (raw.trim() === "") return;
              try {
                setNextSecurityItemSelection({ itemId: item.id, choice: "CUSTOM", amount: { value: parseCurrencyInput(raw), confidence: "STRONG_ESTIMATE" } });
              } catch {
                // ignore invalid input
              }
            }}
          />
        );
      })}

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <p className="text-sm font-medium">NEXT personal economic requirement: ${formatMoney(totalNext)}/mo</p>
        <p className="mt-1 text-xs text-ink/60">
          Living {formatMoney(nextLife.monthly)} + Security {formatMoney(nextSecurityReq.monthly)}
          {(nextLife.isPartial || nextSecurityReq.isPartial) && " — a floor; some categories aren't fully known yet."}
        </p>
      </div>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <p className="text-sm font-medium">How much of this NEXT life should the business be responsible for funding?</p>
        <p className="mt-1 text-xs text-ink/60">
          {nextFundingConfirmation
            ? "Already confirmed below — change it if NEXT should carry a different share than NOW."
            : "Enter the business's NEXT share as an amount or a percentage — never both."}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div role="radiogroup" aria-label="Entry mode" className="flex gap-1">
            <button type="button" role="radio" aria-checked={fundingMode === "PERCENT"} onClick={() => setFundingMode("PERCENT")} className={`rounded-md border px-3 py-2 text-sm ${fundingMode === "PERCENT" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}>
              As a percent
            </button>
            <button type="button" role="radio" aria-checked={fundingMode === "AMOUNT"} onClick={() => setFundingMode("AMOUNT")} className={`rounded-md border px-3 py-2 text-sm ${fundingMode === "AMOUNT" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}>
              As a dollar amount
            </button>
          </div>
          <input type="text" inputMode="decimal" value={fundingRaw} onChange={(e) => setFundingRaw(e.target.value)} className="w-32 rounded-md border border-ink/25 px-3 py-2" />
          <button type="button" onClick={confirmFunding} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">
            Confirm
          </button>
        </div>
        {fundingError && <p role="alert" className="mt-2 text-xs text-red-700">{fundingError}</p>}
        {nextBusinessFunded && (
          <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-sm" aria-live="polite">
            Confirmed — in NEXT, the business is responsible for <strong>${nextBusinessFunded}/mo</strong>.
          </p>
        )}
      </div>
    </WizardShell>
  );
}
