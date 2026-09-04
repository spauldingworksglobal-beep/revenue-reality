"use client";

import { useState } from "react";
import { CategoryAmountRow } from "@/components/CategoryAmountRow";
import { EphemeralNotice, WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { newId } from "@/lib/ids";

export default function CurrentLifePage() {
  const { currentCategories, setCurrentCategories } = useLifeReality();
  const [newLabel, setNewLabel] = useState("");

  function addCustomCategory() {
    if (newLabel.trim() === "") return;
    setCurrentCategories((prev) => [
      ...prev,
      {
        id: newId(),
        lifeProfileId: "ephemeral-life-profile",
        kind: "OTHER",
        label: newLabel.trim(),
        currentAmount: null,
        intendedAmount: null,
        cadence: "MONTHLY",
        changeType: "KEEP",
      },
    ]);
    setNewLabel("");
  }

  return (
    <WizardShell
      eyebrow="Life Reality · Current"
      title="What does your life cost right now?"
      intro={
        <>
          <p>
            Recurring costs and the annual or irregular ones — enter each the way you know it.
            Exact, a solid estimate, or &ldquo;I don&rsquo;t know&rdquo; are all valid answers.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/"
      nextHref="/life/current/security"
    >
      {currentCategories.map((category) => (
        <CategoryAmountRow
          key={category.id}
          label={category.label}
          amount={category.currentAmount}
          cadence={category.cadence}
          onChange={(amount, cadence) =>
            setCurrentCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, currentAmount: amount, cadence } : c)))
          }
        />
      ))}

      <div className="flex items-end gap-2 rounded-lg border border-dashed border-ink/25 p-4">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="new-category" className="text-xs text-ink/70">
            Something else real, not listed above?
          </label>
          <input
            id="new-category"
            type="text"
            placeholder="e.g. Pet care"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="rounded-md border border-ink/25 px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={addCustomCategory}
          className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5"
        >
          Add
        </button>
      </div>
    </WizardShell>
  );
}
