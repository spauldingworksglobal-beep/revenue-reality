import { describe, expect, it } from "vitest";
import { guardNonNegativeAmount, guardPositiveAmount, guardSellableUnitsPositive } from "./guards.js";
import { ValidationError } from "./errors.js";

describe("guardSellableUnitsPositive", () => {
  it("accepts a positive count", () => {
    expect(() => guardSellableUnitsPositive(400)).not.toThrow();
  });

  it("rejects zero — prevents batch COGS divide-by-zero", () => {
    expect(() => guardSellableUnitsPositive(0)).toThrow(ValidationError);
  });

  it("rejects negative counts", () => {
    expect(() => guardSellableUnitsPositive(-1)).toThrow(ValidationError);
  });
});

describe("guardPositiveAmount", () => {
  it("rejects zero", () => {
    expect(() => guardPositiveAmount("0.00")).toThrow(ValidationError);
  });
  it("accepts a positive amount", () => {
    expect(() => guardPositiveAmount("5.50")).not.toThrow();
  });
});

describe("guardNonNegativeAmount", () => {
  it("accepts zero", () => {
    expect(() => guardNonNegativeAmount("0.00")).not.toThrow();
  });
  it("rejects negative", () => {
    expect(() => guardNonNegativeAmount("-1.00")).toThrow(ValidationError);
  });
});
