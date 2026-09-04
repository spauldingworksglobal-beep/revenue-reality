"use client";

import { useState } from "react";

export interface ChipMultiSelectProps {
  label: string;
  hint?: string;
  options: readonly string[];
  selected: string[];
  onChange: (updater: (prev: string[]) => string[]) => void;
}

/** A lightweight multi-select — presets plus a free-text "something else," never a form the owner must exhaustively complete. */
export function ChipMultiSelect({ label, hint, options, selected, onChange }: ChipMultiSelectProps) {
  const [custom, setCustom] = useState("");

  function toggle(option: string) {
    onChange((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (trimmed === "" || selected.includes(trimmed)) return;
    onChange((prev) => [...prev, trimmed]);
    setCustom("");
  }

  const customSelections = selected.filter((s) => !options.includes(s));

  return (
    <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      {hint && <p className="mb-2 text-xs text-ink/60">{hint}</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(option)}
              className={`rounded-full border px-3 py-1.5 text-sm ${isSelected ? "border-accent bg-accent/10 font-medium" : "border-ink/25"}`}
            >
              {option}
            </button>
          );
        })}
        {customSelections.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed
            onClick={() => toggle(option)}
            className="rounded-full border border-accent bg-accent/10 px-3 py-1.5 text-sm font-medium"
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-ink/70">Something else</label>
          <input
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
    </fieldset>
  );
}
