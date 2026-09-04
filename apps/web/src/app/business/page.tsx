"use client";

import { useState } from "react";
import { ValidationError, parsePercentInput } from "@revenue-reality/validation";
import { WizardShell, EphemeralNotice } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { newId } from "@/lib/ids";

export default function BusinessIdentityPage() {
  const { businessId, businessName, setBusinessName, owners, setOwners } = useLifeReality();
  const [percentErrors, setPercentErrors] = useState<Record<string, string>>({});

  function setOwnerLabel(id: string, label: string) {
    setOwners((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  }

  function setOwnerPercent(id: string, raw: string) {
    if (raw.trim() === "") {
      setOwners((prev) => prev.map((o) => (o.id === id ? { ...o, ownershipPercent: null } : o)));
      setPercentErrors((prev) => ({ ...prev, [id]: "" }));
      return;
    }
    try {
      const parsed = parsePercentInput(raw);
      setOwners((prev) => prev.map((o) => (o.id === id ? { ...o, ownershipPercent: { value: parsed, confidence: "STRONG_ESTIMATE" } } : o)));
      setPercentErrors((prev) => ({ ...prev, [id]: "" }));
    } catch (e) {
      if (e instanceof ValidationError) setPercentErrors((prev) => ({ ...prev, [id]: e.message }));
    }
  }

  function addOwner() {
    setOwners((prev) => [...prev, { id: newId(), businessId, label: "", isPrimaryRespondent: false, ownershipPercent: null }]);
  }

  function removeOwner(id: string) {
    setOwners((prev) => prev.filter((o) => o.id !== id || o.isPrimaryRespondent));
  }

  return (
    <WizardShell
      eyebrow="Business Profile"
      title="Now let's look at the business that has to support it."
      intro={
        <>
          <p>
            We now understand what your life needs and what your time can realistically give.
            This is where Revenue Reality starts applying that — not a generic business
            questionnaire.
          </p>
          <div className="mt-3">
            <EphemeralNotice />
          </div>
        </>
      }
      backHref="/life/time/compare"
      nextHref="/business/model"
    >
      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">What&rsquo;s the business called?</legend>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Business name"
          className="mt-2 w-full rounded-md border border-ink/25 px-3 py-2"
        />
      </fieldset>

      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Who owns it?</legend>
        <p className="mb-3 text-xs text-ink/60">
          Ownership percentage is optional here — &ldquo;I don&rsquo;t know yet&rdquo; is a valid
          answer. This is legal/economic ownership only; how profit actually gets distributed is a
          separate question Revenue Reality asks later.
        </p>
        <div className="flex flex-col gap-3">
          {owners.map((owner) => (
            <div key={owner.id} className="flex flex-wrap items-center gap-2 rounded-md border border-ink/15 p-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs text-ink/70">
                  {owner.isPrimaryRespondent ? "Your name (that's you)" : "Owner name"}
                </label>
                <input
                  type="text"
                  value={owner.label}
                  onChange={(e) => setOwnerLabel(owner.id, e.target.value)}
                  className="rounded-md border border-ink/25 px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink/70">Ownership %</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Unknown"
                  defaultValue={owner.ownershipPercent ? String(Number(owner.ownershipPercent.value) * 100) : ""}
                  onBlur={(e) => setOwnerPercent(owner.id, e.target.value)}
                  className="w-24 rounded-md border border-ink/25 px-3 py-2"
                />
              </div>
              {!owner.isPrimaryRespondent && (
                <button type="button" onClick={() => removeOwner(owner.id)} className="text-xs text-ink/60 underline hover:text-ink">
                  Remove
                </button>
              )}
              {percentErrors[owner.id] && (
                <p role="alert" className="w-full text-xs text-red-700">
                  {percentErrors[owner.id]}
                </p>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addOwner} className="mt-3 rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
          Add another owner
        </button>
      </fieldset>
    </WizardShell>
  );
}
