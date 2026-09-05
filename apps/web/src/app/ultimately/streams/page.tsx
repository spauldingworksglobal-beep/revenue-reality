"use client";

import { ValidationError } from "@revenue-reality/validation";
import { CategoryAmountRow } from "@/components/CategoryAmountRow";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { useUltimately } from "@/lib/ultimately-store";
import { useState } from "react";

export default function UltimatelyStreamsPage() {
  const { revenueStreams } = useLifeReality();
  const { getStreamInput, updateStreamInput } = useUltimately();
  const [volumeErrors, setVolumeErrors] = useState<Record<string, string>>({});
  const [mixErrors, setMixErrors] = useState<Record<string, string>>({});

  const activeStreams = revenueStreams.filter((s) => s.active);

  function setVolume(streamId: string, raw: string) {
    if (raw.trim() === "") {
      updateStreamInput(streamId, { volume: null });
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) {
      setVolumeErrors((prev) => ({ ...prev, [streamId]: "Enter a number of 0 or more." }));
      return;
    }
    setVolumeErrors((prev) => ({ ...prev, [streamId]: "" }));
    updateStreamInput(streamId, { volume: { value: n, confidence: "STRONG_ESTIMATE" } });
  }

  function setMix(streamId: string, raw: string) {
    if (raw.trim() === "") {
      updateStreamInput(streamId, { mixWeightOverride: null });
      setMixErrors((prev) => ({ ...prev, [streamId]: "" }));
      return;
    }
    try {
      const pct = Number(raw);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) throw new ValidationError("mix", "Enter a percentage between 0 and 100.");
      updateStreamInput(streamId, { mixWeightOverride: String(pct / 100) });
      setMixErrors((prev) => ({ ...prev, [streamId]: "" }));
    } catch (e) {
      if (e instanceof ValidationError) setMixErrors((prev) => ({ ...prev, [streamId]: e.message }));
    }
  }

  if (activeStreams.length === 0) {
    return (
      <WizardShell
        eyebrow="ULTIMATELY · Revenue Streams"
        title="No revenue streams yet"
        intro={<p>Go back to the Business Profile to add at least one revenue stream before continuing.</p>}
        backHref="/ultimately/time"
        nextHref="/ultimately/cogs"
      >
        <p className="text-sm text-ink/60">You can still continue — the ULTIMATELY model will simply have no revenue economics yet.</p>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      eyebrow="ULTIMATELY · Revenue Streams"
      title="What does a typical sale look like in the mature business?"
      intro={
        <p>
          Pre-filled from your NEXT (or NOW) model — decide intentionally which streams remain,
          which disappear, which become more important, and what price/mix the mature model
          actually runs on. Never assume a stream survives just because it exists today.
        </p>
      }
      backHref="/ultimately/time"
      nextHref="/ultimately/cogs"
    >
      {activeStreams.map((stream) => {
        const input = getStreamInput(stream.id);
        return (
          <fieldset key={stream.id} className="rounded-lg border border-ink/15 bg-white p-4">
            <legend className="px-1 text-sm font-medium">{stream.name || "Unnamed stream"}</legend>
            <p className="mb-2 text-xs text-ink/60">{stream.description}</p>

            <CategoryAmountRow
              label={`Selling price ${stream.unitLabel ? `per ${stream.unitLabel}` : "/ average transaction"}`}
              amount={input.price}
              cadence="ONE_TIME"
              hideCadence
              onChange={(price) => updateStreamInput(stream.id, { price })}
            />

            <div className="mt-3 flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink/70">Expected sales / volume for the mature model (optional)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="I don't know"
                  defaultValue={input.volume?.value?.toString() ?? ""}
                  onBlur={(e) => setVolume(stream.id, e.target.value)}
                  className="w-32 rounded-md border border-ink/25 px-3 py-2"
                />
                {volumeErrors[stream.id] && <p role="alert" className="text-xs text-red-700">{volumeErrors[stream.id]}</p>}
              </div>

              {activeStreams.length > 1 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-ink/70">Share of total revenue % (optional)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Unknown"
                    defaultValue={input.mixWeightOverride ? String(Number(input.mixWeightOverride) * 100) : ""}
                    onBlur={(e) => setMix(stream.id, e.target.value)}
                    className="w-32 rounded-md border border-ink/25 px-3 py-2"
                  />
                  {mixErrors[stream.id] && <p role="alert" className="text-xs text-red-700">{mixErrors[stream.id]}</p>}
                </div>
              )}
            </div>
          </fieldset>
        );
      })}
    </WizardShell>
  );
}
