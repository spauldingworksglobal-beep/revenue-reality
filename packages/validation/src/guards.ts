import type { Money } from "@revenue-reality/domain";
import { ValidationError } from "./errors.js";

export function guardPositiveAmount(amount: Money, field = "amount"): void {
  if (Number(amount) <= 0 || Number.isNaN(Number(amount))) {
    throw new ValidationError(field, `${field} must be greater than zero, got "${amount}"`);
  }
}

export function guardNonNegativeAmount(amount: Money, field = "amount"): void {
  if (Number(amount) < 0 || Number.isNaN(Number(amount))) {
    throw new ValidationError(field, `${field} must not be negative, got "${amount}"`);
  }
}

export function guardSellableUnitsPositive(units: number, field = "sellableUnits"): void {
  if (!Number.isFinite(units) || units <= 0) {
    throw new ValidationError(field, `${field} must be greater than zero, got ${units}`);
  }
}
