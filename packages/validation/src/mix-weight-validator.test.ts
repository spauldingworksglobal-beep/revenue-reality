import { describe, expect, it } from "vitest";
import type { ScenarioRevenueStream } from "@revenue-reality/domain";
import { validateMixWeightsSum100 } from "./mix-weight-validator.js";
import { ValidationError } from "./errors.js";

function stream(mixWeight: string): ScenarioRevenueStream {
  return {
    scenarioId: "s1",
    streamId: `stream-${mixWeight}`,
    priceOrAvgValue: { value: "5.50", confidence: "EXACT" },
    volume: null,
    mixWeight,
    cogs: { method: "ESTIMATE" },
    cogsPerUnit: "2.95",
    otherVariableCosts: [],
    otherVariableCostPerUnit: "0.00",
    grossProfitPerUnit: "2.55",
    grossMargin: "0.4636",
    contributionPerUnit: "2.55",
    contributionMargin: "0.4636",
  };
}

describe("validateMixWeightsSum100", () => {
  it("accepts a single stream at 100%", () => {
    expect(() => validateMixWeightsSum100([stream("1")])).not.toThrow();
  });

  it("accepts a 60/40 split", () => {
    expect(() => validateMixWeightsSum100([stream("0.6"), stream("0.4")])).not.toThrow();
  });

  it("rejects weights that do not sum to 100%", () => {
    expect(() => validateMixWeightsSum100([stream("0.6"), stream("0.3")])).toThrow(ValidationError);
  });
});
