import { describe, expect, it } from "vitest";
import type { Owner } from "@revenue-reality/domain";
import {
  resolveOwnershipSplitStatus,
  validateExactlyOnePrimaryRespondent,
  validateOwnershipPercentagesIfComplete,
  validateRestructureDateRequiredForStage,
} from "./owner-validators";
import { ValidationError } from "./errors";

function owner(overrides: Partial<Owner>): Owner {
  return {
    id: "o1",
    businessId: "b1",
    label: "Owner",
    isPrimaryRespondent: false,
    ownershipPercent: null,
    ...overrides,
  };
}

describe("validateExactlyOnePrimaryRespondent", () => {
  it("passes for a single-owner business where that owner is the respondent", () => {
    const owners = [owner({ id: "a", isPrimaryRespondent: true })];
    expect(() => validateExactlyOnePrimaryRespondent(owners)).not.toThrow();
  });

  it("passes for multiple owners with exactly one marked as respondent", () => {
    const owners = [
      owner({ id: "a", isPrimaryRespondent: true }),
      owner({ id: "b", isPrimaryRespondent: false }),
      owner({ id: "c", isPrimaryRespondent: false }),
    ];
    expect(() => validateExactlyOnePrimaryRespondent(owners)).not.toThrow();
  });

  it("rejects zero primary respondents", () => {
    const owners = [owner({ id: "a" }), owner({ id: "b" })];
    expect(() => validateExactlyOnePrimaryRespondent(owners)).toThrow(ValidationError);
  });

  it("rejects more than one primary respondent", () => {
    const owners = [owner({ id: "a", isPrimaryRespondent: true }), owner({ id: "b", isPrimaryRespondent: true })];
    expect(() => validateExactlyOnePrimaryRespondent(owners)).toThrow(ValidationError);
  });
});

describe("validateOwnershipPercentagesIfComplete", () => {
  it("a known, complete ownership split summing to 100% passes", () => {
    const owners = [
      owner({ id: "a", ownershipPercent: { value: "0.6", confidence: "EXACT" } }),
      owner({ id: "b", ownershipPercent: { value: "0.4", confidence: "EXACT" } }),
    ];
    expect(() => validateOwnershipPercentagesIfComplete(owners)).not.toThrow();
  });

  it("incomplete/unknown ownership percentages skip validation entirely — not an error", () => {
    const owners = [
      owner({ id: "a", ownershipPercent: { value: "0.6", confidence: "EXACT" } }),
      owner({ id: "b", ownershipPercent: null }),
    ];
    expect(() => validateOwnershipPercentagesIfComplete(owners)).not.toThrow();
  });

  it("rejects a complete split that does not sum to 100%", () => {
    const owners = [
      owner({ id: "a", ownershipPercent: { value: "0.6", confidence: "EXACT" } }),
      owner({ id: "b", ownershipPercent: { value: "0.6", confidence: "EXACT" } }),
    ];
    expect(() => validateOwnershipPercentagesIfComplete(owners)).toThrow(ValidationError);
  });
});

describe("resolveOwnershipSplitStatus", () => {
  it("COMPLETE_VALID: known percentages summing to exactly 100%", () => {
    const owners = [
      owner({ id: "a", ownershipPercent: { value: "0.6", confidence: "EXACT" } }),
      owner({ id: "b", ownershipPercent: { value: "0.4", confidence: "EXACT" } }),
    ];
    expect(resolveOwnershipSplitStatus(owners)).toBe("COMPLETE_VALID");
  });

  it("INCOMPLETE_UNKNOWN: at least one owner's percentage is unset", () => {
    const owners = [
      owner({ id: "a", ownershipPercent: { value: "0.6", confidence: "EXACT" } }),
      owner({ id: "b", ownershipPercent: null }),
    ];
    expect(resolveOwnershipSplitStatus(owners)).toBe("INCOMPLETE_UNKNOWN");
  });

  it("COMPLETE_INVALID: every owner has a percentage, but they do not sum to 100% — distinct from unknown", () => {
    const owners = [
      owner({ id: "a", ownershipPercent: { value: "0.6", confidence: "EXACT" } }),
      owner({ id: "b", ownershipPercent: { value: "0.5", confidence: "EXACT" } }),
    ];
    expect(resolveOwnershipSplitStatus(owners)).toBe("COMPLETE_INVALID");
  });

  it("no owners at all is treated as unknown, not invalid", () => {
    expect(resolveOwnershipSplitStatus([])).toBe("INCOMPLETE_UNKNOWN");
  });
});

describe("validateRestructureDateRequiredForStage", () => {
  it("restarted business requires a date", () => {
    expect(() => validateRestructureDateRequiredForStage({ stage: "RESTARTED", restructureDate: null })).toThrow(ValidationError);
  });

  it("restructured business requires a date", () => {
    expect(() => validateRestructureDateRequiredForStage({ stage: "RESTRUCTURED", restructureDate: null })).toThrow(ValidationError);
  });

  it("restarted business with a date passes", () => {
    expect(() => validateRestructureDateRequiredForStage({ stage: "RESTARTED", restructureDate: "2026-08-01" })).not.toThrow();
  });

  it("established business needs no restructure date", () => {
    expect(() => validateRestructureDateRequiredForStage({ stage: "ESTABLISHED", restructureDate: null })).not.toThrow();
  });
});
