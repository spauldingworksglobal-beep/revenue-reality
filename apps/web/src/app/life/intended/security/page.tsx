"use client";

import { CategoryAmountRow } from "@/components/CategoryAmountRow";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";

export default function IntendedSecurityPage() {
  const { intendedSecurity, setIntendedSecurity } = useLifeReality();

  return (
    <WizardShell
      eyebrow="Life Reality · Intended"
      title="What financial security, benefits, or major goals should be included in that life?"
      intro={<p>Savings, emergency reserve, retirement, investing, healthcare/benefits, debt payoff, education/home/major goal, travel, giving/family support.</p>}
      backHref="/life/intended"
      nextHref="/life/intended/outcomes"
    >
      {intendedSecurity.map((item) => (
        <CategoryAmountRow
          key={item.id}
          label={item.label}
          amount={item.intendedAmount}
          cadence={item.cadence}
          onChange={(amount, cadence) =>
            setIntendedSecurity((prev) => prev.map((s) => (s.id === item.id ? { ...s, intendedAmount: amount, cadence } : s)))
          }
        />
      ))}
    </WizardShell>
  );
}
