import type { Capacity, CapacitySignal, OwnerSupportSignal, ScenarioTimeAssumption, TimeSignal } from "@revenue-reality/domain";
import { type Dec, subtract } from "./money";

/**
 * Derived from primaryOwnerBenefitVsRequirement, never from revenue or
 * company profit (Revision 3). BOTH is reserved for a later refinement once
 * owner cash investment (OwnerInput.personalCashInvestment) is folded in
 * alongside the benefit gap — not fabricated here.
 */
export function computeOwnerSupportSignal(totalOwnerEconomicBenefit: Dec, businessFundedRequirement: Dec): OwnerSupportSignal {
  const gap = subtract(totalOwnerEconomicBenefit, businessFundedRequirement);
  return gap.isNegative() ? "OWNER_SUPPORTS_BUSINESS" : "BUSINESS_SUPPORTS_OWNER";
}

export function computeCapacitySignal(capacity: Capacity): CapacitySignal {
  if (capacity.demandState === "UNSURE" && capacity.constraints.length === 0) return "INSUFFICIENT_DATA";
  const capacityConstrained = capacity.demandState === "DIFFICULT" || capacity.demandState === "CANNOT";
  const demandConstrained = capacity.constraints.some((c) => c.trim().toUpperCase() === "DEMAND");
  if (capacityConstrained && demandConstrained) return "BOTH";
  if (capacityConstrained) return "CAPACITY_CONSTRAINED";
  if (demandConstrained) return "DEMAND_CONSTRAINED";
  return "NEITHER";
}

/** "A business can be mathematically profitable and still be personally impossible" — Method v1.4 §03. */
export function computeTimeSignal(time: ScenarioTimeAssumption): TimeSignal {
  if (time.businessHoursWeek.confidence === "INCOMPLETE" || time.availableHoursWeek.confidence === "INCOMPLETE") {
    return "INSUFFICIENT_DATA";
  }
  return time.businessHoursWeek.value > time.availableHoursWeek.value ? "EXCEEDS_AVAILABLE" : "FITS";
}
