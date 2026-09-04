"use client";

import { useMemo } from "react";
import { ValidationError, validateOwnershipPercentagesIfComplete } from "@revenue-reality/validation";
import { BUSINESS_MODEL_OPTIONS, BUSINESS_STAGE_OPTIONS, FUNDING_JOB_OPTIONS, OWNERSHIP_INTENT_OPTIONS } from "@/lib/presets";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";

export default function BusinessSummaryPage() {
  const {
    businessName,
    owners,
    revenueStreams,
    businessModelType,
    businessStage,
    restructureDate,
    fundingJob,
    intendedOwnershipModel,
  } = useLifeReality();

  const ownershipError = useMemo(() => {
    try {
      validateOwnershipPercentagesIfComplete(owners);
      return null;
    } catch (e) {
      return e instanceof ValidationError ? e.message : "Ownership percentages need a second look.";
    }
  }, [owners]);

  const modelLabel = BUSINESS_MODEL_OPTIONS.find((o) => o.value === businessModelType)?.label ?? "Not yet chosen";
  const stageLabel = BUSINESS_STAGE_OPTIONS.find((o) => o.value === businessStage)?.label ?? "Not yet chosen";
  const fundingJobLabel = FUNDING_JOB_OPTIONS.find((o) => o.value === fundingJob)?.label ?? "Not yet chosen";
  const ownershipIntentLabel = OWNERSHIP_INTENT_OPTIONS.find((o) => o.value === intendedOwnershipModel)?.label ?? "Not yet chosen";

  return (
    <WizardShell
      eyebrow="Business Profile · Summary"
      title="Here is the business as you've described it so far."
      backHref="/business/intent"
      nextHref={undefined}
    >
      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Identity</h2>
        <p className="mt-1 text-sm">{businessName.trim() === "" ? "Unnamed business" : businessName}</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-ink/80">
          {owners.map((owner) => (
            <li key={owner.id}>
              {owner.label.trim() === "" ? "Unnamed owner" : owner.label}
              {owner.isPrimaryRespondent && " (you)"}
              {owner.ownershipPercent ? ` — ${(Number(owner.ownershipPercent.value) * 100).toFixed(1)}%` : " — ownership unknown"}
            </li>
          ))}
        </ul>
        {ownershipError && (
          <p className="mt-2 text-xs text-amber-800" role="status">
            {ownershipError} You can adjust this on the identity screen — it won&rsquo;t block moving forward.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Business model</h2>
        <p className="mt-1 text-sm">{modelLabel}</p>
        {revenueStreams.length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-sm text-ink/80">
            {revenueStreams.map((s) => (
              <li key={s.id}>
                {s.name.trim() === "" ? "Unnamed stream" : s.name}
                {s.description.trim() !== "" ? ` — ${s.description}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-ink/60">No revenue streams added yet.</p>
        )}
      </div>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Stage</h2>
        <p className="mt-1 text-sm">
          {stageLabel}
          {restructureDate ? ` — since ${restructureDate}` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Intent</h2>
        <p className="mt-1 text-sm">
          <span className="text-ink/60">Financial job:</span> {fundingJobLabel}
        </p>
        <p className="mt-1 text-sm">
          <span className="text-ink/60">Intended ownership model:</span> {ownershipIntentLabel}
        </p>
      </div>

      <p className="rounded-md bg-ink/5 px-4 py-3 text-sm text-ink/70">
        Business Profile is complete. Next, Revenue Reality builds the NOW model from what
        actually exists today — revenue, cost, and capacity.
      </p>
    </WizardShell>
  );
}
