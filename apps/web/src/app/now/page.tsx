"use client";

import { useMemo, useState } from "react";
import type { RevenuePeriodType } from "@revenue-reality/domain";
import {
  computeLifeRequirement,
  computeSecurityRequirement,
  computeTotalPersonalEconomicRequirement,
  formatMoney,
  resolveConfirmedBusinessFundedAmount,
  type BusinessFundedConfirmation,
} from "@revenue-reality/revenue-engine";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { CategoryAmountRow } from "@/components/CategoryAmountRow";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { useNow } from "@/lib/now-store";

const PERIOD_TYPES: { value: RevenuePeriodType; label: string }[] = [
  { value: "MONTH", label: "A typical month" },
  { value: "YEAR", label: "A year" },
  { value: "SINCE_RESTART", label: "Since the current model began" },
  { value: "CUSTOM", label: "A custom range" },
];

export default function NowRevenuePage() {
  const { businessStage, businessName, currentCategories, currentSecurity } = useLifeReality();
  const {
    actualRevenue,
    setActualRevenue,
    revenuePeriod,
    setRevenuePeriod,
    cashCollected,
    setCashCollected,
    hasAccountsReceivable,
    setHasAccountsReceivable,
    accountsReceivableAmount,
    setAccountsReceivableAmount,
    currentFundingConfirmation,
    setCurrentFundingConfirmation,
  } = useNow();

  const [fundingRaw, setFundingRaw] = useState("");
  const [fundingMode, setFundingMode] = useState<"AMOUNT" | "PERCENT">("PERCENT");
  const [fundingError, setFundingError] = useState<string | null>(null);

  const currentLiving = useMemo(() => computeLifeRequirement(currentCategories, "CURRENT"), [currentCategories]);
  const currentSecurityReq = useMemo(() => computeSecurityRequirement(currentSecurity, "CURRENT"), [currentSecurity]);
  const totalCurrent = useMemo(
    () => computeTotalPersonalEconomicRequirement(currentLiving.monthly, currentSecurityReq.monthly),
    [currentLiving, currentSecurityReq],
  );

  const isRestartLike = businessStage === "RESTARTED" || businessStage === "RESTRUCTURED";

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
      setCurrentFundingConfirmation(confirmation);
      setFundingError(null);
    } catch (e) {
      if (e instanceof ValidationError) setFundingError(e.message);
    }
  }

  const currentBusinessFunded = currentFundingConfirmation
    ? formatMoney(resolveConfirmedBusinessFundedAmount(totalCurrent, currentFundingConfirmation))
    : null;

  return (
    <WizardShell
      eyebrow="NOW · Current Business Reality"
      title={`What does ${businessName.trim() === "" ? "the business" : businessName} actually produce today?`}
      intro={
        <>
          <p>
            What does the business, as it actually operates today, produce, require, and support?
            We&rsquo;ll use the same engine that already understands your life and time — not a
            new calculator.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/business/summary"
      nextHref="/now/streams"
    >
      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">How much revenue has the current version of the business generated?</legend>
        {isRestartLike && (
          <p className="mb-2 text-xs text-ink/60">
            Since your current model began — this is never automatically turned into an annualized figure.
          </p>
        )}
        <CategoryAmountRow label="Actual revenue" amount={actualRevenue} cadence="ONE_TIME" hideCadence onChange={(amount) => setActualRevenue(amount)} />

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div role="radiogroup" aria-label="Period type" className="flex flex-wrap gap-1">
            {PERIOD_TYPES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={revenuePeriod.periodType === p.value}
                onClick={() => setRevenuePeriod({ ...revenuePeriod, periodType: p.value })}
                className={`rounded-md border px-3 py-2 text-sm ${
                  revenuePeriod.periodType === p.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">Period start</label>
            <input
              type="date"
              value={revenuePeriod.periodStart ?? ""}
              onChange={(e) => setRevenuePeriod({ ...revenuePeriod, periodStart: e.target.value === "" ? null : e.target.value })}
              className="rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">Through / period end</label>
            <input
              type="date"
              value={revenuePeriod.periodEnd ?? ""}
              onChange={(e) => setRevenuePeriod({ ...revenuePeriod, periodEnd: e.target.value === "" ? null : e.target.value })}
              className="rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
        </div>
      </fieldset>

      <CategoryAmountRow
        label="How much of that money has actually been collected?"
        amount={cashCollected}
        cadence="ONE_TIME"
        hideCadence
        onChange={(amount) => setCashCollected(amount)}
      />

      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Are customers currently owed to you for sales already made?</legend>
        <p className="mb-2 text-xs text-ink/60">
          Revenue Reality calls this <strong>Accounts Receivable</strong> — money customers owe
          you for sales already made but not yet collected.
        </p>
        <div className="flex gap-2" role="radiogroup" aria-label="Accounts receivable">
          {(["YES", "NO", "UNSURE"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={hasAccountsReceivable === v}
              onClick={() => setHasAccountsReceivable(v)}
              className={`rounded-md border px-3 py-2 text-sm ${
                hasAccountsReceivable === v ? "border-accent bg-accent/10 font-medium" : "border-ink/25"
              }`}
            >
              {v === "YES" ? "Yes" : v === "NO" ? "No" : "Not sure"}
            </button>
          ))}
        </div>
        {hasAccountsReceivable === "YES" && (
          <div className="mt-3">
            <CategoryAmountRow
              label="Accounts Receivable amount"
              amount={accountsReceivableAmount}
              cadence="ONE_TIME"
              hideCadence
              onChange={(amount) => setAccountsReceivableAmount(amount)}
            />
          </div>
        )}
      </fieldset>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <p className="text-sm font-medium">How much of your current life is this business currently responsible for funding?</p>
        <p className="mt-1 text-xs text-ink/60">
          Total current personal economic requirement: ${formatMoney(totalCurrent)}/mo. Enter the
          business&rsquo;s current share as an amount or a percentage — never both.
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
          <input
            type="text"
            inputMode="decimal"
            value={fundingRaw}
            onChange={(e) => setFundingRaw(e.target.value)}
            className="w-32 rounded-md border border-ink/25 px-3 py-2"
          />
          <button type="button" onClick={confirmFunding} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">
            Confirm
          </button>
        </div>
        {fundingError && <p role="alert" className="mt-2 text-xs text-red-700">{fundingError}</p>}
        {currentBusinessFunded && (
          <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-sm" aria-live="polite">
            Confirmed — the business is currently responsible for <strong>${currentBusinessFunded}/mo</strong>.
          </p>
        )}
      </div>
    </WizardShell>
  );
}
