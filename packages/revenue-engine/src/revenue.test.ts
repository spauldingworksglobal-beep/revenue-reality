import { describe, expect, it } from "vitest";
import { allocateRevenueToStreamUnits, computeBreakEvenFloor } from "./revenue";
import type { StreamEconomics } from "./stream-economics";
import { dec } from "./money";

function stream(overrides: Partial<StreamEconomics>): StreamEconomics {
  return {
    streamId: "s",
    price: dec("5.50"),
    mixWeight: dec("1"),
    cogsPerUnit: dec("2.95"),
    otherVariableCostPerUnit: dec("0"),
    grossProfitPerUnit: dec("2.55"),
    grossMargin: dec("0.463636"),
    contributionPerUnit: dec("2.55"),
    contributionMargin: dec("0.463636"),
    ...overrides,
  };
}

describe("HCF break-even floor", () => {
  it("known OPEX ÷ weighted contribution margin = $3,498.43, rounding up to 637 bars", () => {
    const hcfStream = stream({});
    const floor = computeBreakEvenFloor(dec("1622"), dec("0.463636363636363636363636363636"), [hcfStream]);
    expect(floor.revenue.toDecimalPlaces(2).toFixed(2)).toBe("3498.43");
    expect(floor.volumeByStream).toEqual([{ streamId: "s", volume: 637 }]);
  });
});

describe("allocateRevenueToStreamUnits — mixed streams require a defined sales mix", () => {
  it("allocates revenue through each stream's own mix weight and price, not a flat average", () => {
    const streamA = stream({ streamId: "a", price: dec("10"), mixWeight: dec("0.6") });
    const streamB = stream({ streamId: "b", price: dec("20"), mixWeight: dec("0.4") });

    const volumes = allocateRevenueToStreamUnits(dec("1000"), [streamA, streamB]);

    // A gets 60% of revenue = $600 at $10/unit = 60 units
    // B gets 40% of revenue = $400 at $20/unit = 20 units
    expect(volumes).toEqual([
      { streamId: "a", volume: 60 },
      { streamId: "b", volume: 20 },
    ]);
  });

  it("rounds each stream's unit count up operationally, never down", () => {
    const streamA = stream({ streamId: "a", price: dec("7"), mixWeight: dec("1") });
    const volumes = allocateRevenueToStreamUnits(dec("100"), [streamA]);
    // 100 / 7 = 14.2857... -> ceil to 15
    expect(volumes).toEqual([{ streamId: "a", volume: 15 }]);
  });
});
