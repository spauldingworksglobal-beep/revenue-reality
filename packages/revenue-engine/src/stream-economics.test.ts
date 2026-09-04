import { describe, expect, it } from "vitest";
import type { ScenarioRevenueStream } from "@revenue-reality/domain";
import { resolveStreamEconomics, computeWeightedContributionMargin } from "./stream-economics";
import { formatMoney, formatPercent } from "./money";

function hcfBarStream(overrides: Partial<ScenarioRevenueStream> = {}): ScenarioRevenueStream {
  return {
    scenarioId: "s1",
    streamId: "bar",
    priceOrAvgValue: { value: "5.50", confidence: "EXACT" },
    volume: null,
    mixWeight: "1",
    cogs: {
      method: "COMPONENT_BUILDUP",
      components: [
        { label: "co-packer", amount: "2.50" },
        { label: "plastic bag", amount: "0.25" },
        { label: "sticker", amount: "0.20" },
      ],
    },
    cogsPerUnit: "2.95",
    otherVariableCosts: [],
    otherVariableCostPerUnit: "0.00",
    grossProfitPerUnit: "2.55",
    grossMargin: "0.463636",
    contributionPerUnit: "2.55",
    contributionMargin: "0.463636",
    ...overrides,
  };
}

describe("resolveStreamEconomics — HCF chocolate bar", () => {
  it("computes gross profit, gross margin, contribution, and contribution margin", () => {
    const econ = resolveStreamEconomics(hcfBarStream());
    expect(formatMoney(econ.grossProfitPerUnit)).toBe("2.55");
    expect(formatPercent(econ.grossMargin)).toBe("0.463636");
    expect(formatMoney(econ.contributionPerUnit)).toBe("2.55");
    expect(formatPercent(econ.contributionMargin)).toBe("0.463636");
  });

  it("gross margin and contribution margin diverge once a variable cost exists beyond COGS", () => {
    const stream = hcfBarStream({
      otherVariableCosts: [{ id: "v1", label: "processing fee", amountPerUnit: { value: "0.30", confidence: "EXACT" } }],
    });
    const econ = resolveStreamEconomics(stream);

    // gross margin is untouched — computed from COGS only
    expect(formatPercent(econ.grossMargin)).toBe("0.463636");

    // contribution drops by the $0.30 fee: 2.55 - 0.30 = 2.25 -> 2.25 / 5.50 = 0.409090...
    expect(formatMoney(econ.contributionPerUnit)).toBe("2.25");
    expect(formatPercent(econ.contributionMargin)).toBe("0.409091");

    expect(formatPercent(econ.grossMargin)).not.toBe(formatPercent(econ.contributionMargin));
  });
});

describe("computeWeightedContributionMargin", () => {
  it("a single stream at 100% mix weight equals that stream's own margin", () => {
    const econ = resolveStreamEconomics(hcfBarStream());
    const weighted = computeWeightedContributionMargin([econ]);
    expect(formatPercent(weighted)).toBe(formatPercent(econ.contributionMargin));
  });

  it("blends two streams by their revenue share, not a flat average", () => {
    const streamA = resolveStreamEconomics(
      hcfBarStream({ streamId: "a", mixWeight: "0.6", priceOrAvgValue: { value: "10.00", confidence: "EXACT" }, cogsPerUnit: "4.00", cogs: { method: "PER_UNIT", perUnit: { value: "4.00", confidence: "EXACT" } } }),
    );
    const streamB = resolveStreamEconomics(
      hcfBarStream({ streamId: "b", mixWeight: "0.4", priceOrAvgValue: { value: "20.00", confidence: "EXACT" }, cogsPerUnit: "16.00", cogs: { method: "PER_UNIT", perUnit: { value: "16.00", confidence: "EXACT" } } }),
    );
    // streamA margin = 6/10 = 0.6, streamB margin = 4/20 = 0.2
    // weighted = 0.6*0.6 + 0.4*0.2 = 0.36 + 0.08 = 0.44
    const weighted = computeWeightedContributionMargin([streamA, streamB]);
    expect(formatPercent(weighted)).toBe("0.44");
  });
});
