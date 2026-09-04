"use client";

import { useState } from "react";
import type { ConfidenceValue, Money } from "@revenue-reality/domain";
import { ValidationError, parseCurrencyInput } from "@revenue-reality/validation";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { newId } from "@/lib/ids";

export default function DeferredNeedsPage() {
  const { deferredNeeds, setDeferredNeeds } = useLifeReality();
  const [description, setDescription] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    if (description.trim() === "") return;
    let estimatedAmount: ConfidenceValue<Money> | null = null;
    if (amountRaw.trim() !== "") {
      try {
        const parsed = parseCurrencyInput(amountRaw);
        estimatedAmount = { value: parsed, confidence: "ROUGH_ESTIMATE" };
        setError(null);
      } catch (e) {
        if (e instanceof ValidationError) {
          setError(e.message);
          return;
        }
      }
    }
    setDeferredNeeds((prev) => [
      ...prev,
      { id: newId(), lifeProfileId: "ephemeral-life-profile", description: description.trim(), estimatedAmount, includeInIntended: false },
    ]);
    setDescription("");
    setAmountRaw("");
  }

  return (
    <WizardShell
      eyebrow="Life Reality · Current"
      title="Are there parts of your life you're currently going without, postponing, or underfunding?"
      intro={
        <p>
          Because the money isn&rsquo;t available right now — not because you don&rsquo;t want it.
          &ldquo;No&rdquo; is a complete answer. Anything you add here stays visible later; it is
          never quietly treated as $0 in your intended life.
        </p>
      }
      backHref="/life/current/funding"
      nextHref="/life/intended"
    >
      {deferredNeeds.length === 0 && <p className="text-sm text-ink/60">Nothing added yet.</p>}

      {deferredNeeds.map((need) => (
        <div key={need.id} className="flex items-center justify-between rounded-lg border border-ink/15 bg-white p-4">
          <div>
            <p className="font-medium">{need.description}</p>
            <p className="text-sm text-ink/60">{need.estimatedAmount ? `~$${need.estimatedAmount.value}/mo (estimate)` : "amount unknown"}</p>
          </div>
          <button
            type="button"
            onClick={() => setDeferredNeeds((prev) => prev.filter((n) => n.id !== need.id))}
            className="text-sm text-ink/60 underline hover:text-ink"
          >
            Remove
          </button>
        </div>
      ))}

      <div className="rounded-lg border border-dashed border-ink/25 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="deferred-desc" className="text-xs text-ink/70">
              What&rsquo;s being postponed?
            </label>
            <input
              id="deferred-desc"
              type="text"
              placeholder="e.g. Dental work"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="deferred-amount" className="text-xs text-ink/70">
              Rough amount (optional)
            </label>
            <input
              id="deferred-amount"
              type="text"
              inputMode="decimal"
              placeholder="I don't know"
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              className="w-32 rounded-md border border-ink/25 px-3 py-2"
            />
          </div>
          <button type="button" onClick={add} className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
            Add
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    </WizardShell>
  );
}
