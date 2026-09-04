import type { CogsInput, VariableCostItem } from "@revenue-reality/domain";
import { guardSellableUnitsPositive } from "@revenue-reality/validation";
import { type Dec, add, dec, divide, parseMoney, parsePercent, multiply } from "./money";

/**
 * Resolves any of the four COGS entry paths (Build Spec §06/§08) down to a
 * single per-unit dollar figure. The operator never has to do this division
 * themselves — "batch cost ÷ sellable units" happens here, guarded against
 * divide-by-zero.
 */
export function resolveCogsPerUnit(cogs: CogsInput): Dec {
  switch (cogs.method) {
    case "PER_UNIT":
      if (!cogs.perUnit) throw new RangeError("CogsInput.perUnit is required when method is PER_UNIT");
      return parseMoney(cogs.perUnit.value);
    case "PER_BATCH": {
      if (!cogs.batch) throw new RangeError("CogsInput.batch is required when method is PER_BATCH");
      guardSellableUnitsPositive(cogs.batch.sellableUnits, "cogs.batch.sellableUnits");
      return divide(parseMoney(cogs.batch.batchCost), dec(cogs.batch.sellableUnits));
    }
    case "COMPONENT_BUILDUP": {
      const components = cogs.components ?? [];
      return add(...components.map((c) => parseMoney(c.amount)));
    }
    case "ESTIMATE":
      if (!cogs.perUnit) {
        throw new RangeError("CogsInput.perUnit carries the estimated figure when method is ESTIMATE");
      }
      return parseMoney(cogs.perUnit.value);
  }
}

/** Sums a stream's non-COGS variable costs (payment fees, shipping, commissions, ...) to a per-unit figure. */
export function resolveOtherVariableCostPerUnit(items: VariableCostItem[], priceOrAvg: Dec): Dec {
  return add(
    ...items.map((item) => {
      if (item.amountPerUnit) return parseMoney(item.amountPerUnit.value);
      if (item.percentOfPrice) return multiply(priceOrAvg, parsePercent(item.percentOfPrice.value));
      throw new RangeError(`VariableCostItem "${item.label}" has neither amountPerUnit nor percentOfPrice set`);
    }),
  );
}
