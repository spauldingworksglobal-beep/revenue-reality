import Decimal from "decimal.js";
import type { Money, Percent } from "@revenue-reality/domain";

/**
 * The engine's only boundary with strings. Every internal pipeline function
 * (see cogs.ts, distribution.ts, revenue.ts, ...) passes Decimal instances,
 * never Money/Percent strings — so nothing gets rounded until a result is
 * actually being assembled for output. "Never round intermediate math" only
 * holds if rounding happens in exactly one place: here, at the edges.
 */

const engineDecimal = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type Dec = InstanceType<typeof engineDecimal>;

export function dec(value: number | string): Dec {
  return new engineDecimal(value);
}

export const ZERO: Dec = dec(0);
export const ONE: Dec = dec(1);

export function parseMoney(value: Money): Dec {
  return dec(value);
}

export function parsePercent(value: Percent): Dec {
  return dec(value);
}

/** Rounds to 2 decimal places — the only place a dollar figure gets rounded. */
export function formatMoney(value: Dec): Money {
  const rounded = value.toDecimalPlaces(2, engineDecimal.ROUND_HALF_UP);
  // avoid emitting "-0.00"
  const normalized = rounded.isZero() ? rounded.abs() : rounded;
  return normalized.toFixed(2);
}

/** Rounds to 6 decimal places (0.0001% resolution) — plenty for a ratio used only for display/reporting. */
export function formatPercent(value: Dec): Percent {
  const rounded = value.toDecimalPlaces(6, engineDecimal.ROUND_HALF_UP);
  const normalized = rounded.isZero() ? rounded.abs() : rounded;
  return normalized.toFixed();
}

export function add(...values: Dec[]): Dec {
  return values.reduce((sum, v) => sum.plus(v), ZERO);
}

export function subtract(a: Dec, b: Dec): Dec {
  return a.minus(b);
}

export function multiply(a: Dec, b: Dec): Dec {
  return a.times(b);
}

export function divide(a: Dec, b: Dec): Dec {
  if (b.isZero()) {
    throw new RangeError("division by zero in revenue-engine — caller must guard denominators before calling");
  }
  return a.dividedBy(b);
}

export function max(a: Dec, b: Dec): Dec {
  return a.greaterThan(b) ? a : b;
}
