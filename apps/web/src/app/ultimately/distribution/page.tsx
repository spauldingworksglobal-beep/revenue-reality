"use client";

import { useMemo, useState } from "react";
import type { DistributionRule } from "@revenue-reality/domain";
import { resolveOwnershipSplitStatus, ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { useUltimately } from "@/lib/ultimately-store";

const RULES: { value: DistributionRule; label: string }[] = [
  { value: "SAME_AS_OWNERSHIP", label: "Same as ownership" },
  { value: "EQUAL_SPLIT", label: "Equal split" },
  { value: "CUSTOM_PERCENTAGE", label: "Custom percentage split" },
  { value: "DISCRETIONARY", label: "No predetermined split / discretionary" },
  { value: "OTHER", label: "Other" },
];

function OwnerTargetCard({ ownerId, label }: { ownerId: string; label: string }) {
  const { getOwnerInput, updateOwnerInput } = useUltimately();
  const input = getOwnerInput(ownerId);
  const [error, setError] = useState<string | null>(null);

  function commit(raw: string) {
    if (raw.trim() === "") {
      updateOwnerInput(ownerId, { targetProfitDistribution: null });
      setError(null);
      return;
    }
    try {
      updateOwnerInput(ownerId, { targetProfitDistribution: { value: parseCurrencyInput(raw), confidence: "STRONG_ESTIMATE" } });
      setError(null);
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
    }
  }

  return (
    <div className="rounded-md border border-ink/15 p-3">
      <p className="text-sm font-medium">{label || "Unnamed owner"}</p>
      <p className="mt-1 text-xs text-ink/60">
        A specific profit-distribution target for this owner once mature (optional) — leave blank
        to let the distribution rule above determine it from whatever surplus the model produces.
      </p>
      <div className="mt-2 flex flex-col gap-1">
        <label className="text-xs text-ink/70">Targeted distribution</label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Let the rule decide"
          defaultValue={input.targetProfitDistribution?.value ?? ""}
          onBlur={(e) => commit(e.target.value)}
          className="w-32 rounded-md border border-ink/25 px-3 py-2"
        />
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export default function UltimatelyDistributionPage() {
  const { owners } = useLifeReality();
  const { distributionPolicy, setDistributionPolicy, distributionPercents, setDistributionPercent } = useUltimately();

  const ownershipStatus = useMemo(() => resolveOwnershipSplitStatus(owners), [owners]);
  const sameAsOwnershipDisabled = ownershipStatus !== "COMPLETE_VALID";

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Ownership Economics"
      title="How should profit be distributed once this mature model is running?"
      intro={
        <p>
          Pre-filled from NEXT&rsquo;s rule if one was set — change it if the mature business should
          distribute differently. Ownership percentage and profit-distribution percentage stay
          distinct; never assumed from one another.
        </p>
      }
      backHref="/ultimately/delegation"
      nextHref="/ultimately/retention"
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
                onClick={() => setDistributionPolicy({ scenarioId: "ultimately", rule: r.value })}
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
          <OwnerTargetCard key={owner.id} ownerId={owner.id} label={owner.label} />
        ))}
      </div>
    </WizardShell>
  );
}
