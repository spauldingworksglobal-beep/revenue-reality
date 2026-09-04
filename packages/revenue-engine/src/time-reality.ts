import type { ConfidenceValue } from "@revenue-reality/domain";

/**
 * availableHoursWeek is the amount of time the owner's actual life can
 * realistically make available for the business. It is never derived from
 * otherTimeClaims — those provide context only; the owner confirms the
 * realistic figure directly. This module never computes availableHoursWeek
 * from anything else, by construction — there is no formula for it here.
 */
export interface TimeHorizonSummary {
  businessHoursWeek: number;
  availableHoursWeek: number;
  /** businessHoursWeek − availableHoursWeek. Positive means the business asks for more than the life can sustainably give. */
  gapHoursWeek: number;
  fitsWithinAvailable: boolean;
  /** True when either figure's confidence is INCOMPLETE — never blocks the comparison, just flags it. */
  isPartial: boolean;
}

export function summarizeTimeHorizon(
  businessHours: ConfidenceValue<number>,
  availableHours: ConfidenceValue<number>,
): TimeHorizonSummary {
  const gapHoursWeek = businessHours.value - availableHours.value;
  return {
    businessHoursWeek: businessHours.value,
    availableHoursWeek: availableHours.value,
    gapHoursWeek,
    fitsWithinAvailable: gapHoursWeek <= 0,
    isPartial: businessHours.confidence === "INCOMPLETE" || availableHours.confidence === "INCOMPLETE",
  };
}

export interface TimeComparisonResult {
  current: TimeHorizonSummary;
  intended: TimeHorizonSummary;
  desiredWorkTypes: string[];
  workToEventuallyDelegate: string[];
  lifePriorityReservations: string[];
  /** Context only — deliberately not consumed by any calculation above. */
  otherTimeClaims: { label: string; hoursWeek?: number }[];
}

/** Current → Intended, before any Business Reality question is asked. */
export function compareTimeRequirements(input: {
  currentBusinessHoursWeek: ConfidenceValue<number>;
  currentAvailableHoursWeek: ConfidenceValue<number>;
  ultimateBusinessHoursWeek: ConfidenceValue<number>;
  intendedAvailableHoursWeek: ConfidenceValue<number>;
  desiredWorkTypes: string[];
  workToEventuallyDelegate: string[];
  lifePriorityReservations: string[];
  otherTimeClaims: { label: string; hoursWeek?: number }[];
}): TimeComparisonResult {
  return {
    current: summarizeTimeHorizon(input.currentBusinessHoursWeek, input.currentAvailableHoursWeek),
    intended: summarizeTimeHorizon(input.ultimateBusinessHoursWeek, input.intendedAvailableHoursWeek),
    desiredWorkTypes: input.desiredWorkTypes,
    workToEventuallyDelegate: input.workToEventuallyDelegate,
    lifePriorityReservations: input.lifePriorityReservations,
    otherTimeClaims: input.otherTimeClaims,
  };
}
