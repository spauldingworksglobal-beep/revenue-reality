"use client";

import { useMemo, useState } from "react";
import type { DistributionRule } from "@revenue-reality/domain";
import { resolveOwnershipSplitStatus, ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { useNow } from "@/lib/now-store";

const RULES: { value: DistributionRule; label: string }[] = [
  { value: "SAME_AS_OWNERSHIP", label: "Same as ownership" },
  { value: "EQUAL_SPLIT", label: "Equal split" },
  { value: "CUSTOM_PERCENTAGE", label: "Custom percentage split" },
  { value: "DISCRETIONARY", label: "No predetermined split / discretionary" },
  { value: "OTHER", label: "Other" },
];

function OwnerCashCard({ ownerId, label }: { ownerId: string; label: string }) {
  const { getOwnerInput, updateOwnerInput } = useNow();
  const input = getOwnerInput(ownerId);
  const [error, setError] = useState<string | null>(null);
  const mode = input.cashReceived?.mode ?? "UNCLASSIFIED_TOTAL";

  function commitUnclassified(raw: string) {
    if (raw.trim() === "") {
      updateOwnerInput(ownerId, { cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "0.00", confidence: "INCOMPLETE" } } });
      return;
    }
    try {
      updateOwnerInput(ownerId, { cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: parseCurrencyInput(raw), confidence: "STRONG_ESTIMATE" } } });
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  function commitClassified(field: "laborCompensation" | "profitDistribution", raw: string) {
    const current = input.cashReceived?.mode === "CLASSIFIED" ? input.cashReceived : { mode: "CLASSIFIED" as const };
    if (raw.trim() === "") return;
    try {
      updateOwnerInput(ownerId, {
        cashReceived: { ...current, mode: "CLASSIFIED", [field]: { value: parseCurrencyInput(raw), confidence: "STRONG_ESTIMATE" } },
      });
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  return (
    <div className="rounded-md border border-ink/15 p-3">
      <p className="text-sm font-medium">{label || "Unnamed owner"}</p>
      <p className="mt-1 text-xs text-ink/60">
        How much money has this owner actually received from the business during this period? If
        you don&rsquo;t know whether it was salary, a distribution, or something else, that&rsquo;s
        fine — the total still counts as real economic benefit.
      </p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label={`Cash classification for ${label}`}>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "UNCLASSIFIED_TOTAL"}
          onClick={() => updateOwnerInput(ownerId, { cashReceived: { mode: "UNCLASSIFIED_TOTAL", unclassifiedTotal: { value: "0.00", confidence: "INCOMPLETE" } } })}
          className={`rounded-md border px-3 py-2 text-xs ${mode === "UNCLASSIFIED_TOTAL" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
        >
          Just the total — I don&rsquo;t know the breakdown
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "CLASSIFIED"}
          onClick={() => updateOwnerInput(ownerId, { cashReceived: { mode: "CLASSIFIED" } })}
          className={`rounded-md border px-3 py-2 text-xs ${mode === "CLASSIFIED" ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
        >
          I know the split
        </button>
      </div>

      {mode === "UNCLASSIFIED_TOTAL" ? (
        <div className="mt-2 flex flex-col gap-1">
          <label className="text-xs text-ink/70">Total received</label>
          <input
            type="text"
            inputMode="decimal"
            defaultValue={input.cashReceived?.mode === "UNCLASSIFIED_TOTAL" ? input.cashReceived.unclassifiedTotal?.value : ""}
            onBlur={(e) => commitUnclassified(e.target.value)}
            className="w-32 rounded-md border border-ink/25 px-3 py-2"
          />
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">Labor compensation</label>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={input.cashReceived?.mode === "CLASSIFIED" ? input.cashReceived.laborCompensation?.value : ""}
              onBlur={(e) => commitClassified("laborCompensation", e.target.value)}
              className="w-32 rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink/70">Profit distribution</label>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={input.cashReceived?.mode === "CLASSIFIED" ? input.cashReceived.profitDistribution?.value : ""}
              onBlur={(e) => commitClassified("profitDistribution", e.target.value)}
              className="w-32 rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export default function NowDistributionPage() {
  const { owners } = useLifeReality();
  const { distributionPolicy, setDistributionPolicy, distributionPercents, setDistributionPercent } = useNow();

  const ownershipStatus = useMemo(() => resolveOwnershipSplitStatus(owners), [owners]);
  const sameAsOwnershipDisabled = ownershipStatus !== "COMPLETE_VALID";

  return (
    <WizardShell
      eyebrow="NOW · Ownership Economics"
      title="How is profit or cash actually distributed today?"
      intro={
        <p>
          This is never assumed from ownership percentage — a 50% owner is not automatically
          entitled to 50% of distributions. Revenue Reality asks directly.
        </p>
      }
      backHref="/now/owners"
      nextHref="/now/retention"
    >
      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Distribution rule</legend>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Distribution rule">
          {RULES.map((r) => {
            const disabled = r.value === "SAME_AS_OWNERSHIP" && sameAsOwnershipDisabled;
            return (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={distributionPolicy?.rule === r.value}
                disabled={disabled}
                onClick={() => setDistributionPolicy({ scenarioId: "now", rule: r.value })}
                className={`rounded-md border p-3 text-left text-sm ${
                  distributionPolicy?.rule === r.value ? "border-accent bg-accent/10 font-medium" : "border-ink/25"
                } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        {sameAsOwnershipDisabled && (
          <p className="mt-2 text-xs text-amber-800" role="status">
            {ownershipStatus === "COMPLETE_INVALID"
              ? "The ownership percentages on file don't sum to 100% — that split is invalid, so it can't drive distribution yet. Fix it in Business Profile, or choose a different rule below."
              : "Ownership percentages aren't fully known yet, so “same as ownership” isn't available until they are. Choose a different rule below, or fill in ownership in Business Profile."}
          </p>
        )}

        {distributionPolicy?.rule === "CUSTOM_PERCENTAGE" && (
          <div className="mt-3 flex flex-col gap-2">
            {owners.map((owner) => (
              <div key={owner.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{owner.label || "Unnamed owner"}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="%"
                  defaultValue={distributionPercents[owner.id] ? String(Number(distributionPercents[owner.id]) * 100) : ""}
                  onBlur={(e) => {
                    const pct = Number(e.target.value);
                    if (!Number.isNaN(pct)) setDistributionPercent(owner.id, String(pct / 100));
                  }}
                  className="w-24 rounded-md border border-ink/25 px-3 py-2"
                />
              </div>
            ))}
            <p className="text-xs text-ink/60">Custom percentages must total 100% — Revenue Reality checks this before calculating.</p>
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-3">
        {owners.map((owner) => (
          <OwnerCashCard key={owner.id} ownerId={owner.id} label={owner.label} />
        ))}
      </div>
    </WizardShell>
  );
}
