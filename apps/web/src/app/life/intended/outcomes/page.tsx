"use client";

import { useState } from "react";
import { INTENDED_LIFE_OUTCOME_OPTIONS } from "@/lib/presets";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";

export default function IntendedOutcomesPage() {
  const { intendedLifeOutcomes, setIntendedLifeOutcomes } = useLifeReality();
  const [custom, setCustom] = useState("");

  function toggle(option: string) {
    setIntendedLifeOutcomes((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  }

  function addCustom() {
    if (custom.trim() === "" || intendedLifeOutcomes.includes(custom.trim())) return;
    setIntendedLifeOutcomes((prev) => [...prev, custom.trim()]);
    setCustom("");
  }

  return (
    <WizardShell
      eyebrow="Life Reality · Intended"
      title="What do you want that life to make possible beyond the numbers?"
      backHref="/life/intended/security"
      nextHref="/life/intended/funding"
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Intended life outcomes">
        {INTENDED_LIFE_OUTCOME_OPTIONS.map((option) => {
          const selected = intendedLifeOutcomes.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option)}
              className={`rounded-full border px-4 py-2 text-sm ${selected ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
            >
              {option}
            </button>
          );
        })}
        {intendedLifeOutcomes
          .filter((o) => !(INTENDED_LIFE_OUTCOME_OPTIONS as readonly string[]).includes(o))
          .map((custom) => (
            <button
              key={custom}
              type="button"
              aria-pressed
              onClick={() => toggle(custom)}
              className="rounded-full border border-accent bg-accent/10 px-4 py-2 text-sm font-medium"
            >
              {custom}
            </button>
          ))}
      </div>

      <div className="flex items-end gap-2 rounded-lg border border-dashed border-ink/25 p-4">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="custom-outcome" className="text-xs text-ink/70">
            Something else
          </label>
          <input
            id="custom-outcome"
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="rounded-md border border-ink/25 px-3 py-2"
          />
        </div>
        <button type="button" onClick={addCustom} className="rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
          Add
        </button>
      </div>
    </WizardShell>
  );
}
