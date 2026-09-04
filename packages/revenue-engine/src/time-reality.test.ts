import { describe, expect, it } from "vitest";
import type { ConfidenceValue } from "@revenue-reality/domain";
import { compareTimeRequirements, summarizeTimeHorizon } from "./time-reality";

function hours(value: number, confidence: ConfidenceValue<number>["confidence"] = "EXACT"): ConfidenceValue<number> {
  return { value, confidence };
}

describe("summarizeTimeHorizon", () => {
  it("current business hours below available hours — fits, negative gap", () => {
    const summary = summarizeTimeHorizon(hours(20), hours(30));
    expect(summary.fitsWithinAvailable).toBe(true);
    expect(summary.gapHoursWeek).toBe(-10);
  });

  it("current business hours equal to available hours — fits, zero gap", () => {
    const summary = summarizeTimeHorizon(hours(30), hours(30));
    expect(summary.fitsWithinAvailable).toBe(true);
    expect(summary.gapHoursWeek).toBe(0);
  });

  it("current business hours above available hours — does not fit, positive gap", () => {
    // "Your business currently uses about 38 hours/week. Your life realistically has
    // about 24 hours/week available for it." — the milestone's own example.
    const summary = summarizeTimeHorizon(hours(38), hours(24));
    expect(summary.fitsWithinAvailable).toBe(false);
    expect(summary.gapHoursWeek).toBe(14);
  });

  it("incomplete available-hours value — still computes a real result, flagged as partial", () => {
    const summary = summarizeTimeHorizon(hours(20), hours(30, "INCOMPLETE"));
    expect(summary.isPartial).toBe(true);
    expect(summary.fitsWithinAvailable).toBe(true); // never blocks — still a usable comparison
    expect(summary.gapHoursWeek).toBe(-10);
  });

  it("incomplete business-hours value — still computes a real result, flagged as partial", () => {
    const summary = summarizeTimeHorizon(hours(38, "INCOMPLETE"), hours(24));
    expect(summary.isPartial).toBe(true);
    expect(summary.fitsWithinAvailable).toBe(false);
    expect(summary.gapHoursWeek).toBe(14);
  });

  it("a rough or strong estimate is not treated as partial — only INCOMPLETE is", () => {
    expect(summarizeTimeHorizon(hours(20, "ROUGH_ESTIMATE"), hours(30, "STRONG_ESTIMATE")).isPartial).toBe(false);
  });
});

describe("compareTimeRequirements", () => {
  const base = {
    currentBusinessHoursWeek: hours(38),
    currentAvailableHoursWeek: hours(24),
    ultimateBusinessHoursWeek: hours(20),
    intendedAvailableHoursWeek: hours(25),
    desiredWorkTypes: ["Sell", "Lead"],
    workToEventuallyDelegate: ["Day-to-day production"],
    lifePriorityReservations: ["Family time", "Health"],
    otherTimeClaims: [{ label: "Day job", hoursWeek: 40 }],
  };

  it("intended business hours are distinct from current hours", () => {
    const result = compareTimeRequirements(base);
    expect(result.current.businessHoursWeek).toBe(38);
    expect(result.intended.businessHoursWeek).toBe(20);
    expect(result.current.businessHoursWeek).not.toBe(result.intended.businessHoursWeek);
  });

  it("intended available hours are distinct from current available hours", () => {
    const result = compareTimeRequirements(base);
    expect(result.current.availableHoursWeek).toBe(24);
    expect(result.intended.availableHoursWeek).toBe(25);
    expect(result.current.availableHoursWeek).not.toBe(result.intended.availableHoursWeek);
  });

  it("competing time claims do not automatically recalculate available hours", () => {
    const withoutClaims = compareTimeRequirements({ ...base, otherTimeClaims: [] });
    const withManyClaims = compareTimeRequirements({
      ...base,
      otherTimeClaims: [
        { label: "Day job", hoursWeek: 40 },
        { label: "Caregiving", hoursWeek: 15 },
        { label: "Commuting" }, // no hours given at all — still valid, never required
      ],
    });
    // availableHoursWeek is exactly what was confirmed, regardless of how many claims are listed or quantified
    expect(withoutClaims.current.availableHoursWeek).toBe(withManyClaims.current.availableHoursWeek);
    expect(withoutClaims.intended.availableHoursWeek).toBe(withManyClaims.intended.availableHoursWeek);
    expect(withManyClaims.otherTimeClaims).toHaveLength(3);
  });

  it("intended desired-work selections pass through", () => {
    expect(compareTimeRequirements(base).desiredWorkTypes).toEqual(["Sell", "Lead"]);
  });

  it("intended life-priority reservations pass through", () => {
    expect(compareTimeRequirements(base).lifePriorityReservations).toEqual(["Family time", "Health"]);
  });

  it("Current → Intended comparison surfaces both horizons and the qualitative fields together", () => {
    const result = compareTimeRequirements(base);
    expect(result.current).toEqual({
      businessHoursWeek: 38,
      availableHoursWeek: 24,
      gapHoursWeek: 14,
      fitsWithinAvailable: false,
      isPartial: false,
    });
    expect(result.intended).toEqual({
      businessHoursWeek: 20,
      availableHoursWeek: 25,
      gapHoursWeek: -5,
      fitsWithinAvailable: true,
      isPartial: false,
    });
    expect(result.workToEventuallyDelegate).toEqual(["Day-to-day production"]);
  });
});
