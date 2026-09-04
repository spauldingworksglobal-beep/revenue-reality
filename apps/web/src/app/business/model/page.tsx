"use client";

import { BUSINESS_MODEL_OPTIONS } from "@/lib/presets";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";
import { newId } from "@/lib/ids";

export default function BusinessModelPage() {
  const { businessId, businessModelType, setBusinessModelType, revenueStreams, setRevenueStreams } = useLifeReality();

  function addStream() {
    setRevenueStreams((prev) => [
      ...prev,
      { id: newId(), businessId, name: "", description: "", unitLabel: "", channel: "", active: true },
    ]);
  }

  function updateStream(id: string, patch: Partial<(typeof revenueStreams)[number]>) {
    setRevenueStreams((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeStream(id: string) {
    setRevenueStreams((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <WizardShell
      eyebrow="Business Profile"
      title="How does the business make money?"
      intro={<p>Answer in plain language — Revenue Reality will teach you the term as you go.</p>}
      backHref="/business"
      nextHref="/business/stage"
    >
      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="sr-only">Business model</legend>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Business model">
          {BUSINESS_MODEL_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 ${
                businessModelType === opt.value ? "border-accent bg-accent/10" : "border-ink/15"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="business-model"
                  checked={businessModelType === opt.value}
                  onChange={() => setBusinessModelType(opt.value)}
                  className="h-4 w-4"
                />
                <span className="font-medium">{opt.label}</span>
              </span>
              <span className="pl-6 text-xs text-ink/60">{opt.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-medium">What are the main ways it makes money?</legend>
        <p className="mb-3 text-xs text-ink/60">
          Revenue Reality calls each of these a <strong>Revenue Stream</strong>. No numbers yet —
          price, volume, and cost come later, once we build the current model.
        </p>
        <div className="flex flex-col gap-3">
          {revenueStreams.map((stream) => (
            <div key={stream.id} className="flex flex-col gap-2 rounded-md border border-ink/15 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-ink/70">Stream name</label>
                  <input
                    type="text"
                    placeholder="e.g. Wholesale"
                    value={stream.name}
                    onChange={(e) => updateStream(stream.id, { name: e.target.value })}
                    className="rounded-md border border-ink/25 px-3 py-2"
                  />
                </div>
                <button type="button" onClick={() => removeStream(stream.id)} className="mt-5 text-xs text-ink/60 underline hover:text-ink">
                  Remove
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-ink/70">What is the customer actually buying or paying for?</label>
                <input
                  type="text"
                  placeholder="e.g. Cases of packaged chocolate bars sold to retail accounts"
                  value={stream.description}
                  onChange={(e) => updateStream(stream.id, { description: e.target.value })}
                  className="rounded-md border border-ink/25 px-3 py-2"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-ink/70">Unit or transaction label (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. case, project, seat"
                    value={stream.unitLabel ?? ""}
                    onChange={(e) => updateStream(stream.id, { unitLabel: e.target.value })}
                    className="w-40 rounded-md border border-ink/25 px-3 py-2"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-ink/70">Channel (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. direct, wholesale, online"
                    value={stream.channel ?? ""}
                    onChange={(e) => updateStream(stream.id, { channel: e.target.value })}
                    className="w-40 rounded-md border border-ink/25 px-3 py-2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addStream} className="mt-3 rounded-md border border-ink/25 px-4 py-2 text-sm font-medium hover:bg-ink/5">
          Add a revenue stream
        </button>
      </fieldset>
    </WizardShell>
  );
}
