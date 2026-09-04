"use client";

import { CategoryAmountRow } from "@/components/CategoryAmountRow";
import { WizardShell } from "@/components/WizardShell";
import { useLifeReality } from "@/lib/life-store";

export default function CurrentSecurityPage() {
  const { currentSecurity, setCurrentSecurity } = useLifeReality();

  return (
    <WizardShell
      eyebrow="Life Reality · Current"
      title="What are you currently protecting or building financially?"
      intro={<p>Emergency savings, retirement, investing, debt reduction, insurance/benefits, and anything else you&rsquo;re actively funding.</p>}
      backHref="/life/current"
      nextHref="/life/current/funding"
    >
      {currentSecurity.map((item) => (
        <CategoryAmountRow
          key={item.id}
          label={item.label}
          amount={item.currentAmount}
          cadence={item.cadence}
          onChange={(amount, cadence) =>
            setCurrentSecurity((prev) => prev.map((s) => (s.id === item.id ? { ...s, currentAmount: amount, cadence } : s)))
          }
        />
      ))}
    </WizardShell>
  );
}
