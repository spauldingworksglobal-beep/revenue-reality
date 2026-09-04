import type { OutsideFundingRetained, VariableCostItem } from "@revenue-reality/domain";
import { ValidationError } from "./errors.js";

/** Mirrors the scenario_life_assumption CHECK constraint: amount/percent are alternate modes, never both. */
export function validateFundingModeExclusivity(retained: OutsideFundingRetained): void {
  if (retained.mode === "AMOUNT") {
    if (retained.amount === undefined || retained.percentOfTotal !== undefined) {
      throw new ValidationError(
        "outsideFundingRetained",
        "mode AMOUNT requires `amount` and forbids `percentOfTotal`",
      );
    }
  } else {
    if (retained.percentOfTotal === undefined || retained.amount !== undefined) {
      throw new ValidationError(
        "outsideFundingRetained",
        "mode PERCENT_OF_TOTAL requires `percentOfTotal` and forbids `amount`",
      );
    }
  }
}

/** Mirrors the variable_cost_item CHECK constraint: exactly one of amountPerUnit / percentOfPrice. */
export function validateVariableCostModeExclusivity(item: VariableCostItem): void {
  const hasAmount = item.amountPerUnit !== undefined;
  const hasPercent = item.percentOfPrice !== undefined;
  if (hasAmount === hasPercent) {
    throw new ValidationError(
      `variableCostItem:${item.label}`,
      "exactly one of amountPerUnit or percentOfPrice must be set",
    );
  }
}
