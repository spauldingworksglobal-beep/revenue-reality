import { describe, expect, it } from "vitest";
import type { OutsideFundingRetained, VariableCostItem } from "@revenue-reality/domain";
import { validateFundingModeExclusivity, validateVariableCostModeExclusivity } from "./mode-exclusivity";
import { ValidationError } from "./errors";

describe("validateFundingModeExclusivity", () => {
  it("accepts AMOUNT mode with only amount set", () => {
    const retained: OutsideFundingRetained = { mode: "AMOUNT", amount: "2000.00", confidence: "EXACT" };
    expect(() => validateFundingModeExclusivity(retained)).not.toThrow();
  });

  it("accepts PERCENT_OF_TOTAL mode with only percentOfTotal set", () => {
    const retained: OutsideFundingRetained = { mode: "PERCENT_OF_TOTAL", percentOfTotal: "0.25", confidence: "EXACT" };
    expect(() => validateFundingModeExclusivity(retained)).not.toThrow();
  });

  it("rejects AMOUNT mode with both fields set", () => {
    const retained: OutsideFundingRetained = {
      mode: "AMOUNT",
      amount: "2000.00",
      percentOfTotal: "0.25",
      confidence: "EXACT",
    };
    expect(() => validateFundingModeExclusivity(retained)).toThrow(ValidationError);
  });

  it("rejects PERCENT_OF_TOTAL mode with amount missing percent", () => {
    const retained: OutsideFundingRetained = { mode: "PERCENT_OF_TOTAL", amount: "2000.00", confidence: "EXACT" };
    expect(() => validateFundingModeExclusivity(retained)).toThrow(ValidationError);
  });
});

describe("validateVariableCostModeExclusivity", () => {
  it("accepts amountPerUnit alone", () => {
    const item: VariableCostItem = { id: "v1", label: "processing fee", amountPerUnit: { value: "0.30", confidence: "EXACT" } };
    expect(() => validateVariableCostModeExclusivity(item)).not.toThrow();
  });

  it("rejects neither field set", () => {
    const item: VariableCostItem = { id: "v1", label: "processing fee" };
    expect(() => validateVariableCostModeExclusivity(item)).toThrow(ValidationError);
  });

  it("rejects both fields set", () => {
    const item: VariableCostItem = {
      id: "v1",
      label: "processing fee",
      amountPerUnit: { value: "0.30", confidence: "EXACT" },
      percentOfPrice: { value: "0.03", confidence: "EXACT" },
    };
    expect(() => validateVariableCostModeExclusivity(item)).toThrow(ValidationError);
  });
});
