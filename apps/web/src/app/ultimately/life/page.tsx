"use client";

import { useMemo, useState } from "react";
import {
  add,
  computeLifeRequirement,
  computeSecurityRequirement,
  computeTotalPersonalEconomicRequirement,
  formatMoney,
  resolveConfirmedBusinessFundedAmount,
  resolveDeferredNeedsContribution,
  type BusinessFundedConfirmation,
} from "@revenue-reality/revenue-engine";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { useUltimately } from "@/lib/ultimately-store";

export default function UltimatelyLifePage() {
  const {
    snapshotIntendedCategories,
    snapshotIntendedSecurity,
    snapshotDeferredNeeds,
    ultimatelyFundingConfirmation,
    setUltimatelyFundingConfirmation,
  } = useUltimately();
  const [fundingRaw, setFundingRaw] = useState("");
  const [fundingMode, setFundingMode] = useState<"AMOUNT" | "PERCENT">("PERCENT");
  const [fundingError, setFundingError] = useState<string | null>(null);

  const lifeReq = useMemo(() => computeLifeRequirement(snapshotIntendedCategories, "INTENDED"), [snapshotIntendedCategories]);
  const securityReq = useMemo(() => computeSecurityRequirement(snapshotIntendedSecurity, "INTENDED"), [snapshotIntendedSecurity]);
  const deferred = useMemo(() => resolveDeferredNeedsContribution(snapshotDeferredNeeds), [snapshotDeferredNeeds]);
  const livingWithDeferred = useMemo(() => add(lifeReq.monthly, deferred.includedMonthly), [lifeReq, deferred]);
  const totalUltimately = useMemo(
    () => computeTotalPersonalEconomicRequirement(livingWithDeferred, securityReq.monthly),
    [livingWithDeferred, securityReq],
  );

  const ultimatelyBusinessFunded = ultimatelyFundingConfirmation
    ? formatMoney(resolveConfirmedBusinessFundedAmount(totalUltimately, ultimatelyFundingConfirmation))
    : null;

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
      setUltimatelyFundingConfirmation(confirmation);
      setFundingError(null);
    } catch (e) {
      if (e instanceof ValidationError) setFundingError(e.message);
    }
  }

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Life Reality"
      title="This is the life you already told us you're building toward"
      intro={
        <>
          <p>
            You already answered this — ULTIMATELY doesn&rsquo;t ask again. This is your Intended Life
            Reality exactly as you defined it. If something has changed, go update it at Intended
            Life Reality; ULTIMATELY will pick up the change the next time you start a new ULTIMATELY
            model, not retroactively inside this one.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/ultimately"
      nextHref="/ultimately/time"
    >
      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <p className="text-sm font-medium">Intended living requirement: ${formatMoney(lifeReq.monthly)}/mo</p>
        {snapshotDeferredNeeds.some((d) => d.includeInIntended) && (
          <p className="mt-1 text-xs text-ink/60">Includes ${formatMoney(deferred.includedMonthly)}/mo of deferred needs you chose to include.</p>
        )}
        {lifeReq.isPartial && <p className="mt-1 text-xs text-amber-800">Some categories aren&rsquo;t fully known yet — this is a floor.</p>}
      </div>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <p className="text-sm font-medium">Intended security requirement: ${formatMoney(securityReq.monthly)}/mo</p>
        {securityReq.isPartial && <p className="mt-1 text-xs text-amber-800">Some items aren&rsquo;t fully known yet — this is a floor.</p>}
      </div>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <p className="text-sm font-medium">ULTIMATELY total personal economic requirement: ${formatMoney(totalUltimately)}/mo</p>
        <p className="mt-1 text-xs text-ink/60">Living (including deferred needs you chose to include) + security, under the life you&rsquo;re ultimately building toward.</p>
      </div>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <p className="text-sm font-medium">How much of this ULTIMATELY life should the business be responsible for funding?</p>
        <p className="mt-1 text-xs text-ink/60">
          {ultimatelyFundingConfirmation
            ? "Already confirmed below — change it only if you intend the business to carry a different share than what you confirmed for your Intended life."
            : "Enter the business's share as an amount or a percentage — never both."}
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
        {ultimatelyBusinessFunded && (
          <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-sm" aria-live="polite">
            Confirmed — in ULTIMATELY, the business is responsible for <strong>${ultimatelyBusinessFunded}/mo</strong>.
          </p>
        )}
      </div>
    </WizardShell>
  );
}
