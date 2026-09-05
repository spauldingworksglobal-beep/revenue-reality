"use client";

import { useEffect } from "react";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { OWNERSHIP_INTENT_OPTIONS } from "@/lib/presets";
import { useLifeReality } from "@/lib/life-store";
import { useUltimately } from "@/lib/ultimately-store";

export default function UltimatelyIntroPage() {
  const { businessName, intendedOwnershipModel } = useLifeReality();
  const { initializeFromNextOrNow, initializedFrom } = useUltimately();

  // Copies NEXT's (or, if NEXT was never visited, NOW's) business model into
  // ULTIMATELY's own independent state, exactly once. Also freezes the
  // owner's already-defined Intended Life/Time Reality at this same moment.
  useEffect(() => {
    initializeFromNextOrNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownershipLabel = OWNERSHIP_INTENT_OPTIONS.find((o) => o.value === intendedOwnershipModel)?.label ?? null;

  return (
    <WizardShell
      eyebrow="ULTIMATELY · The Mature Intended Business Model"
      title="What should this business look like when it is working the way you ultimately intend?"
      intro={
        <>
          <p>
            We know the life you want and how you want to spend your time. Now let&rsquo;s design the
            business that could actually support both. Revenue is still an output here, never a
            target you enter — Revenue Reality figures out what the mature business has to become.
          </p>
          {ownershipLabel && (
            <p className="mt-3 rounded-md border border-ink/15 bg-white p-3 text-sm">
              You said you ultimately want {businessName.trim() === "" ? "this business" : businessName} to be:{" "}
              <strong>{ownershipLabel}</strong>. That shapes what follows — but nothing here is forced to fit it;
              the numbers will say what the model actually requires.
            </p>
          )}
          {initializedFrom && (
            <p className="mt-3 text-xs text-ink/60">
              Started from your {initializedFrom} model so you don&rsquo;t have to re-enter everything — change
              whatever needs to change for the mature business.
            </p>
          )}
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref={initializedFrom === "NEXT" ? "/next/result" : "/now/result"}
      nextHref="/ultimately/life"
    >
      <></>
    </WizardShell>
  );
}
