"use client";

import { useMemo, useState } from "react";
import type { FundingSource } from "@revenue-reality/domain";
import {
  buildIntendedLifeCategories,
  compareLifeRequirements,
  formatMoney,
  parseMoney,
  resolveBusinessFundedAmount,
  subtract,
} from "@revenue-reality/revenue-engine";
import { ValidationError, parseCurrencyInput, parsePercentInput } from "@revenue-reality/validation";
import { FUNDING_SHARE_PRESETS } from "@/lib/presets";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { newId } from "@/lib/ids";

const SOURCE_TYPES: { value: FundingSource["sourceType"]; label: string }[] = [
  { value: "JOB", label: "A job" },
  { value: "SPOUSE_PARTNER", label: "Spouse / partner" },
  { value: "FREELANCE", label: "Freelance / consulting" },
  { value: "PASSIVE", label: "Passive income" },
  { value: "OTHER", label: "Other" },
];

export default function IntendedFundingPage() {
  const {
    currentCategories,
    lifeChanges,
    currentSecurity,
    intendedSecurity,
    deferredNeeds,
    intendedFundingSources,
    setIntendedFundingSources,
    outsideFundingRetained,
    setOutsideFundingRetained,
  } = useLifeReality();

  const [mode, setMode] = useState<"AMOUNT" | "PERCENT">("PERCENT");
  const [raw, setRaw] = useState(outsideFundingRetained ? "" : "");
  const [confirmed, setConfirmed] = useState(outsideFundingRetained !== null);
  const [error, setError] = useState<string | null>(null);

  // Intended categories are DERIVED from current + the owner's Keep/Reduce/Increase/Remove/Add
  // decisions — never re-entered. Importing this here (rather than in the store) keeps the
  // derivation in exactly one place: the engine.
  const intendedCategories = useMemo(
    () => buildIntendedLifeCategories("ephemeral-life-profile", currentCategories, lifeChanges),
    [currentCategories, lifeChanges],
  );

  const comparison = useMemo(
    () =>
      compareLifeRequirements({
        currentCategories,
        intendedCategories,
        currentSecurity,
        intendedSecurity,
        deferredNeeds,
      }),
    [currentCategories, intendedCategories, currentSecurity, intendedSecurity, deferredNeeds],
  );

  const totalIntended = parseMoney(comparison.intended.totalPersonalEconomicRequirement);

  function toggleSource(sourceType: FundingSource["sourceType"], checked: boolean) {
    setIntendedFundingSources((prev) => {
      if (!checked) return prev.filter((s) => s.sourceType !== sourceType);
      if (prev.some((s) => s.sourceType === sourceType)) return prev;
      return [...prev, { id: newId(), lifeProfileId: "ephemeral-life-profile", horizon: "INTENDED", sourceType, amount: null }];
    });
  }

  function applyPreset(suggestedPercent: string) {
    setMode("PERCENT");
    setRaw(suggestedPercent);
    setConfirmed(false); // a preset only suggests — it never saves on its own
  }

  function confirm() {
    if (raw.trim() === "") {
      setError("Enter an amount or percentage to confirm the business's funding responsibility.");
      return;
    }
    try {
      if (mode === "PERCENT") {
        const businessPercentHuman = Number(raw);
        if (Number.isNaN(businessPercentHuman) || businessPercentHuman < 0 || businessPercentHuman > 100) {
          throw new ValidationError("businessShare", "Enter a percentage between 0 and 100.");
        }
        const outsidePercentHuman = 100 - businessPercentHuman;
        const outsidePercent = parsePercentInput(String(outsidePercentHuman));
        setOutsideFundingRetained({ mode: "PERCENT_OF_TOTAL", percentOfTotal: outsidePercent, confidence: "STRONG_ESTIMATE" });
      } else {
        const businessAmount = parseMoney(parseCurrencyInput(raw));
        const outsideAmount = subtract(totalIntended, businessAmount);
        setOutsideFundingRetained({ mode: "AMOUNT", amount: formatMoney(outsideAmount), confidence: "STRONG_ESTIMATE" });
      }
      setError(null);
      setConfirmed(true);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  const businessFunded = outsideFundingRetained
    ? formatMoney(resolveBusinessFundedAmount(totalIntended, outsideFundingRetained))
    : null;

  return (
    <WizardShell
      eyebrow="Life Reality · Intended"
      title="When you reach that life, what will fund it — and what portion should this business carry?"
      intro={
        <>
          <p>Select the income sources you expect to keep, then confirm the business&rsquo;s share as an amount or a percentage.</p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/life/intended/outcomes"
      nextHref="/life/compare"
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Sources you expect to keep</legend>
        {SOURCE_TYPES.map((source) => (
          <label key={source.value} className="flex items-center gap-2 rounded-lg border border-ink/15 bg-white p-3 text-sm">
            <input
              type="checkbox"
              checked={intendedFundingSources.some((s) => s.sourceType === source.value)}
              onChange={(e) => toggleSource(source.value, e.target.checked)}
              className="h-5 w-5"
            />
            {source.label}
          </label>
        ))}
      </fieldset>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <p className="text-sm font-medium">What portion of that life should this business carry?</p>
        <p className="mt-1 text-xs text-ink/60">
          These are starting points only — nothing saves until you confirm an exact amount or percentage.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FUNDING_SHARE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.suggestedPercent)}
              className="rounded-full border border-ink/25 px-3 py-1.5 text-xs hover:border-accent"
            >
              {preset.label} (~{preset.suggestedPercent}%)
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div role="radiogroup" aria-label="Entry mode" className="flex gap-1">
            <button
              type="button"
              role="radio"
              aria-checked={mode === "PERCENT"}
              onClick={() => setMode("PERCENT")}
              className={`rounded-md border px-3 py-2 text-sm ${mode === "PERCENT" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
            >
              As a percent
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "AMOUNT"}
              onClick={() => setMode("AMOUNT")}
              className={`rounded-md border px-3 py-2 text-sm ${mode === "AMOUNT" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
            >
              As a dollar amount
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="funding-value" className="text-xs text-ink/70">
              {mode === "PERCENT" ? "Business's percent of total requirement" : "Business's monthly dollar amount"}
            </label>
            <input
              id="funding-value"
              type="text"
              inputMode="decimal"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setConfirmed(false);
              }}
              className="w-32 rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <button type="button" onClick={confirm} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">
            Confirm
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {error}
          </p>
        )}

        {confirmed && businessFunded && (
          <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-sm" aria-live="polite">
            Confirmed — the business is intended to fund <strong>${businessFunded}/mo</strong> of your ${comparison.intended.totalPersonalEconomicRequirement}/mo intended requirement.
          </p>
        )}
      </div>
    </WizardShell>
  );
}
