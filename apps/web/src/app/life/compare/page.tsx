"use client";

import { useMemo } from "react";
import {
  buildIntendedLifeCategories,
  buildIntendedSecurityItems,
  compareLifeRequirements,
  formatMoney,
  parseMoney,
  resolveConfirmedBusinessFundedAmount,
} from "@revenue-reality/revenue-engine";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";

function RequirementRow({ label, current, intended }: { label: string; current: string; intended: string }) {
  return (
    <tr className="border-b border-ink/10">
      <th scope="row" className="py-2 pr-4 text-left font-medium">
        {label}
      </th>
      <td className="py-2 pr-4 text-right tabular-nums">${current}</td>
      <td className="py-2 text-right tabular-nums">${intended}</td>
    </tr>
  );
}

export default function LifeComparePage() {
  const {
    currentCategories,
    lifeChanges,
    currentSecurity,
    securityChanges,
    deferredNeeds,
    intendedLifeOutcomes,
    businessFundedConfirmation,
  } = useLifeReality();

  const intendedCategories = useMemo(
    () => buildIntendedLifeCategories("ephemeral-life-profile", currentCategories, lifeChanges),
    [currentCategories, lifeChanges],
  );
  const intendedSecurity = useMemo(
    () => buildIntendedSecurityItems("ephemeral-life-profile", currentSecurity, securityChanges),
    [currentSecurity, securityChanges],
  );

  const comparison = useMemo(
    () => compareLifeRequirements({ currentCategories, intendedCategories, currentSecurity, intendedSecurity, deferredNeeds }),
    [currentCategories, intendedCategories, currentSecurity, intendedSecurity, deferredNeeds],
  );

  const totalIntended = parseMoney(comparison.intended.totalPersonalEconomicRequirement);
  const businessFunded = businessFundedConfirmation
    ? formatMoney(resolveConfirmedBusinessFundedAmount(totalIntended, businessFundedConfirmation))
    : null;

  return (
    <WizardShell
      eyebrow="Life Reality · Comparison"
      title="Here is the life you described. Does this reflect where you are now and what you're building toward?"
      backHref="/life/intended/funding"
      nextHref={undefined}
    >
      <div className="overflow-x-auto rounded-lg border border-ink/15 bg-white p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/20 text-xs uppercase tracking-wide text-ink/60">
              <th scope="col" className="pb-2 text-left">
                Monthly
              </th>
              <th scope="col" className="pb-2 text-right">
                Current
              </th>
              <th scope="col" className="pb-2 text-right">
                Intended
              </th>
            </tr>
          </thead>
          <tbody>
            <RequirementRow label="Living requirement" current={comparison.current.livingRequirement} intended={comparison.intended.livingRequirement} />
            <RequirementRow label="Security requirement" current={comparison.current.securityRequirement} intended={comparison.intended.securityRequirement} />
            <tr>
              <th scope="row" className="py-2 pr-4 text-left font-semibold">
                Total personal economic requirement
              </th>
              <td className="py-2 pr-4 text-right font-semibold tabular-nums">${comparison.current.totalPersonalEconomicRequirement}</td>
              <td className="py-2 text-right font-semibold tabular-nums">${comparison.intended.totalPersonalEconomicRequirement}</td>
            </tr>
          </tbody>
        </table>

        {(comparison.current.isPartial || comparison.intended.isPartial) && (
          <p className="mt-3 text-xs text-amber-800" role="status">
            One or more categories are marked incomplete — the totals above are a floor, not a
            complete picture.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Deferred / underfunded needs</h2>
        {comparison.deferredNeeds.included.length === 0 && comparison.deferredNeeds.excluded.length === 0 && (
          <p className="mt-1 text-sm text-ink/60">None recorded.</p>
        )}
        {comparison.deferredNeeds.included.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Included in intended life</p>
            <ul className="mt-1 list-inside list-disc text-sm">
              {comparison.deferredNeeds.included.map((n) => (
                <li key={n.description}>
                  {n.description}
                  {n.amount ? ` — ~$${n.amount}/mo` : " — amount not yet known"}
                </li>
              ))}
            </ul>
          </div>
        )}
        {comparison.deferredNeeds.excluded.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Not included yet (still tracked, not forgotten)</p>
            <ul className="mt-1 list-inside list-disc text-sm text-ink/70">
              {comparison.deferredNeeds.excluded.map((n) => (
                <li key={n.description}>
                  {n.description}
                  {n.amount ? ` — ~$${n.amount}/mo` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-ink/15 bg-white p-4">
        <h2 className="text-sm font-semibold">Business funding responsibility</h2>
        {businessFunded ? (
          <p className="mt-1 text-sm">
            This business is intended to fund <strong>${businessFunded}/mo</strong> of the ${comparison.intended.totalPersonalEconomicRequirement}/mo intended requirement.
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink/60">Not yet confirmed.</p>
        )}
      </div>

      {intendedLifeOutcomes.length > 0 && (
        <div className="rounded-lg border border-ink/15 bg-white p-4">
          <h2 className="text-sm font-semibold">What this life should make possible</h2>
          <p className="mt-1 text-sm text-ink/70">{intendedLifeOutcomes.join(", ")}</p>
        </div>
      )}

      <p className="rounded-md bg-ink/5 px-4 py-3 text-sm text-ink/70">
        Milestone 2 ends here. Next, Revenue Reality asks about your time — and only after that,
        the business.
      </p>
    </WizardShell>
  );
}
