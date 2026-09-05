import type { DelegationItem } from "@revenue-reality/domain";
import { normalizeCadence } from "./cadence";
import { type Dec, add, parseMoney } from "./money";

export interface KnownDelegationCostResult {
  /** Σ known replacement costs, normalized to monthly. A genuine recurring cost of the model NEXT/ULTIMATELY describes — added to known operating cost wherever that figure drives the waterfall. */
  monthly: Dec;
  /** True when one or more delegation items have no replacement cost yet — the sum above is a floor, never a claim of completeness. */
  isPartial: boolean;
}

/**
 * "Your NEXT model requires additional labor whose cost is not yet known.
 * Required Revenue is therefore at least…" (Build Spec Milestone 6 §8) — an
 * item with a known replacementCost contributes a real recurring cost the
 * business must produce revenue to cover; an item with none contributes
 * nothing to the sum (never a guessed market rate) but is what makes the
 * result a floor rather than a complete figure.
 */
export function sumKnownDelegationCost(items: DelegationItem[]): KnownDelegationCostResult {
  const amounts: Dec[] = [];
  let isPartial = false;

  for (const item of items) {
    if (item.replacementCost === null) {
      isPartial = true;
      continue;
    }
    const { monthly } = normalizeCadence(parseMoney(item.replacementCost.value), item.cadence);
    amounts.push(monthly);
  }

  return { monthly: add(...amounts), isPartial };
}
