import { describe, expect, it } from "vitest";
import type { Capacity, ScenarioTimeAssumption } from "@revenue-reality/domain";
import { computeCapacitySignal, computeOwnerSupportSignal, computeTimeSignal } from "./signals.js";
import { dec } from "./money.js";

describe("computeOwnerSupportSignal", () => {
  it("benefit meeting or exceeding requirement ⇒ BUSINESS_SUPPORTS_OWNER", () => {
    expect(computeOwnerSupportSignal(dec("3200"), dec("3200"))).toBe("BUSINESS_SUPPORTS_OWNER");
    expect(computeOwnerSupportSignal(dec("4000"), dec("3200"))).toBe("BUSINESS_SUPPORTS_OWNER");
  });

  it("benefit falling short of requirement ⇒ OWNER_SUPPORTS_BUSINESS", () => {
    expect(computeOwnerSupportSignal(dec("0"), dec("3200"))).toBe("OWNER_SUPPORTS_BUSINESS");
  });

  it("reads the owner-level benefit gap, not revenue — a fully-met revenue target with zero owner distribution still reports a shortfall", () => {
    // revenue requirement could be "met" elsewhere in the result, but this signal only ever sees the benefit vs requirement pair
    expect(computeOwnerSupportSignal(dec("0"), dec("3200"))).toBe("OWNER_SUPPORTS_BUSINESS");
  });
});

describe("computeCapacitySignal", () => {
  const base: Capacity = { scenarioId: "s1", demandState: "COMFORTABLE", constraints: [] };

  it("COMFORTABLE demand and no listed constraints ⇒ NEITHER", () => {
    expect(computeCapacitySignal(base)).toBe("NEITHER");
  });

  it("DIFFICULT demand ⇒ CAPACITY_CONSTRAINED", () => {
    expect(computeCapacitySignal({ ...base, demandState: "DIFFICULT" })).toBe("CAPACITY_CONSTRAINED");
  });

  it("a 'demand' constraint ⇒ DEMAND_CONSTRAINED", () => {
    expect(computeCapacitySignal({ ...base, constraints: ["demand"] })).toBe("DEMAND_CONSTRAINED");
  });

  it("both capacity- and demand-constrained ⇒ BOTH", () => {
    expect(computeCapacitySignal({ ...base, demandState: "CANNOT", constraints: ["demand"] })).toBe("BOTH");
  });

  it("UNSURE with nothing else known ⇒ INSUFFICIENT_DATA", () => {
    expect(computeCapacitySignal({ ...base, demandState: "UNSURE" })).toBe("INSUFFICIENT_DATA");
  });
});

describe("computeTimeSignal", () => {
  function time(overrides: Partial<ScenarioTimeAssumption> = {}): ScenarioTimeAssumption {
    return {
      scenarioId: "s1",
      source: "CURRENT",
      availableHoursWeek: { value: 20, confidence: "EXACT" },
      businessHoursWeek: { value: 10, confidence: "EXACT" },
      otherTimeClaims: [],
      lifePriorityReservations: [],
      ...overrides,
    };
  }

  it("business hours within available hours ⇒ FITS (matches HCF's ~10 of a wider week)", () => {
    expect(computeTimeSignal(time())).toBe("FITS");
  });

  it("business hours exceeding available hours ⇒ EXCEEDS_AVAILABLE", () => {
    expect(computeTimeSignal(time({ businessHoursWeek: { value: 25, confidence: "EXACT" } }))).toBe("EXCEEDS_AVAILABLE");
  });
});
