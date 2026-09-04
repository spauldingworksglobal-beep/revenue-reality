import { describe, expect, it } from "vitest";
import type { OwnerEconomics, ScenarioDistributionPolicy } from "@revenue-reality/domain";
import {
  validateDistributionPercentagesSum100,
  validateOwnershipPercentagesSum100,
} from "./percentage-validators";
import { ValidationError } from "./errors";

function owner(overrides: Partial<OwnerEconomics>): OwnerEconomics {
  return {
    scenarioId: "s1",
    ownerId: "o1",
    ownershipPercent: "0.5",
    distributionPercent: null,
    isPrimaryRespondent: false,
    ...overrides,
  };
}

describe("validateOwnershipPercentagesSum100", () => {
  it("accepts two owners at exactly 60/40", () => {
    const owners = [owner({ ownerId: "a", ownershipPercent: "0.6" }), owner({ ownerId: "b", ownershipPercent: "0.4" })];
    expect(() => validateOwnershipPercentagesSum100(owners)).not.toThrow();
  });

  it("accepts three owners at 33.33/33.33/33.34 (sums exactly to 100)", () => {
    const owners = [
      owner({ ownerId: "a", ownershipPercent: "0.3333" }),
      owner({ ownerId: "b", ownershipPercent: "0.3333" }),
      owner({ ownerId: "c", ownershipPercent: "0.3334" }),
    ];
    expect(() => validateOwnershipPercentagesSum100(owners)).not.toThrow();
  });

  it("rejects 60/50 (sums to 110)", () => {
    const owners = [owner({ ownerId: "a", ownershipPercent: "0.6" }), owner({ ownerId: "b", ownershipPercent: "0.5" })];
    expect(() => validateOwnershipPercentagesSum100(owners)).toThrow(ValidationError);
  });

  it("rejects three even thirds that fall a cent short (99.99)", () => {
    const owners = [
      owner({ ownerId: "a", ownershipPercent: "0.3333" }),
      owner({ ownerId: "b", ownershipPercent: "0.3333" }),
      owner({ ownerId: "c", ownershipPercent: "0.3333" }),
    ];
    expect(() => validateOwnershipPercentagesSum100(owners)).toThrow(ValidationError);
  });
});

describe("validateDistributionPercentagesSum100", () => {
  const customPolicy: ScenarioDistributionPolicy = { scenarioId: "s1", rule: "CUSTOM_PERCENTAGE" };
  const discretionaryPolicy: ScenarioDistributionPolicy = { scenarioId: "s1", rule: "DISCRETIONARY" };

  it("is skipped entirely for non-CUSTOM_PERCENTAGE rules", () => {
    const owners = [owner({ ownershipPercent: "1", distributionPercent: null })];
    expect(() => validateDistributionPercentagesSum100(owners, discretionaryPolicy)).not.toThrow();
  });

  it("requires every owner to have a distributionPercent under CUSTOM_PERCENTAGE", () => {
    const owners = [owner({ distributionPercent: "1" }), owner({ ownerId: "b", distributionPercent: null })];
    expect(() => validateDistributionPercentagesSum100(owners, customPolicy)).toThrow(ValidationError);
  });

  it("rejects custom percentages that do not sum to 100", () => {
    const owners = [
      owner({ ownerId: "a", distributionPercent: "0.6" }),
      owner({ ownerId: "b", distributionPercent: "0.3" }),
    ];
    expect(() => validateDistributionPercentagesSum100(owners, customPolicy)).toThrow(ValidationError);
  });

  it("accepts custom percentages that sum to exactly 100", () => {
    const owners = [
      owner({ ownerId: "a", distributionPercent: "0.7" }),
      owner({ ownerId: "b", distributionPercent: "0.3" }),
    ];
    expect(() => validateDistributionPercentagesSum100(owners, customPolicy)).not.toThrow();
  });
});
