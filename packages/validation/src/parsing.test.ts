import { describe, expect, it } from "vitest";
import { parseCurrencyInput, parsePercentInput } from "./parsing.js";
import { ValidationError } from "./errors.js";

describe("parseCurrencyInput", () => {
  it("normalizes a plain integer", () => {
    expect(parseCurrencyInput("1622")).toBe("1622.00");
  });

  it("strips thousands commas", () => {
    expect(parseCurrencyInput("1,622.00")).toBe("1622.00");
  });

  it("strips a leading dollar sign", () => {
    expect(parseCurrencyInput("$4,800")).toBe("4800.00");
  });

  it("preserves cents", () => {
    expect(parseCurrencyInput("5.5")).toBe("5.50");
  });

  it("handles negative amounts", () => {
    expect(parseCurrencyInput("-125.40")).toBe("-125.40");
  });

  it("treats -0 as 0.00", () => {
    expect(parseCurrencyInput("-0")).toBe("0.00");
  });

  it("rejects garbage input", () => {
    expect(() => parseCurrencyInput("not a number")).toThrow(ValidationError);
  });

  it("rejects malformed comma grouping", () => {
    expect(() => parseCurrencyInput("1,62,2")).toThrow(ValidationError);
  });
});

describe("parsePercentInput", () => {
  it("converts a human percent to a 0-1 ratio", () => {
    expect(parsePercentInput("46.36")).toBe("0.4636");
  });

  it("accepts a trailing % sign", () => {
    expect(parsePercentInput("46.36%")).toBe("0.4636");
  });

  it("converts 100 to 1", () => {
    expect(parsePercentInput("100")).toBe("1");
  });

  it("converts 0 to 0", () => {
    expect(parsePercentInput("0")).toBe("0");
  });

  it("converts a small percent below 1%", () => {
    expect(parsePercentInput("5")).toBe("0.05");
  });

  it("converts a percent above 100", () => {
    expect(parsePercentInput("233.5")).toBe("2.335");
  });

  it("handles thirds without losing precision", () => {
    expect(parsePercentInput("33.333333")).toBe("0.33333333");
  });

  it("rejects garbage input", () => {
    expect(() => parsePercentInput("abc")).toThrow(ValidationError);
  });
});
