import { describe, expect, it } from "vitest";
import type { CogsInput } from "@revenue-reality/domain";
import { ValidationError } from "@revenue-reality/validation";
import { resolveCogsPerUnit, resolveOtherVariableCostPerUnit } from "./cogs";
import { dec, formatMoney } from "./money";

describe("resolveCogsPerUnit", () => {
  it("PER_BATCH: $1,000 batch cost / 400 sellable units = $2.50/unit", () => {
    const cogs: CogsInput = { method: "PER_BATCH", batch: { batchCost: "1000.00", sellableUnits: 400 } };
    expect(formatMoney(resolveCogsPerUnit(cogs))).toBe("2.50");
  });

  it("PER_BATCH: rejects zero sellable units (prevents divide-by-zero)", () => {
    const cogs: CogsInput = { method: "PER_BATCH", batch: { batchCost: "1000.00", sellableUnits: 0 } };
    expect(() => resolveCogsPerUnit(cogs)).toThrow(ValidationError);
  });

  it("PER_BATCH: rejects negative sellable units", () => {
    const cogs: CogsInput = { method: "PER_BATCH", batch: { batchCost: "1000.00", sellableUnits: -5 } };
    expect(() => resolveCogsPerUnit(cogs)).toThrow(ValidationError);
  });

  it("COMPONENT_BUILDUP: HCF's chocolate bar — $2.50 + $0.25 + $0.20 = $2.95", () => {
    const cogs: CogsInput = {
      method: "COMPONENT_BUILDUP",
      components: [
        { label: "co-packer", amount: "2.50" },
        { label: "plastic bag", amount: "0.25" },
        { label: "sticker", amount: "0.20" },
      ],
    };
    expect(formatMoney(resolveCogsPerUnit(cogs))).toBe("2.95");
  });

  it("PER_UNIT: uses the entered figure directly", () => {
    const cogs: CogsInput = { method: "PER_UNIT", perUnit: { value: "3.10", confidence: "EXACT" } };
    expect(formatMoney(resolveCogsPerUnit(cogs))).toBe("3.10");
  });

  it("ESTIMATE: uses perUnit as the transparent estimate", () => {
    const cogs: CogsInput = { method: "ESTIMATE", perUnit: { value: "3.00", confidence: "ROUGH_ESTIMATE" } };
    expect(formatMoney(resolveCogsPerUnit(cogs))).toBe("3.00");
  });
});

describe("resolveOtherVariableCostPerUnit", () => {
  it("sums a fixed amountPerUnit item", () => {
    const price = dec("5.50");
    const items = [{ id: "v1", label: "processing fee", amountPerUnit: { value: "0.30", confidence: "EXACT" as const } }];
    expect(formatMoney(resolveOtherVariableCostPerUnit(items, price))).toBe("0.30");
  });

  it("resolves a percentOfPrice item against the stream's price", () => {
    const price = dec("5.50");
    const items = [{ id: "v1", label: "commission", percentOfPrice: { value: "0.10", confidence: "EXACT" as const } }];
    expect(formatMoney(resolveOtherVariableCostPerUnit(items, price))).toBe("0.55");
  });

  it("returns zero for an empty list — HCF has no other variable costs", () => {
    expect(formatMoney(resolveOtherVariableCostPerUnit([], dec("5.50")))).toBe("0.00");
  });
});
