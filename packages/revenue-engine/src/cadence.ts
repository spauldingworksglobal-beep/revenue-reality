import type { Cadence } from "@revenue-reality/domain";
import { type Dec, ZERO, dec, divide, multiply, parseMoney } from "./money.js";

const WEEKS_PER_MONTH = divide(dec(52), dec(12));

/**
 * Converts an amount at a given cadence into both a monthly and an annual
 * view. ONE_TIME amounts are never smeared into the monthly recurring
 * figure — a one-time cost is not a recurring cost, even approximately — so
 * callers that need to track it use `annual` (the raw amount) explicitly
 * and keep it out of any monthly sum, mirroring how capital_requirement_item
 * separates ONE_TIME from RECURRING.
 */
export function normalizeCadence(amount: Dec, cadence: Cadence): { monthly: Dec; annual: Dec } {
  switch (cadence) {
    case "WEEKLY":
      return { monthly: multiply(amount, WEEKS_PER_MONTH), annual: multiply(amount, dec(52)) };
    case "MONTHLY":
      return { monthly: amount, annual: multiply(amount, dec(12)) };
    case "QUARTERLY":
      return { monthly: divide(amount, dec(3)), annual: multiply(amount, dec(4)) };
    case "ANNUALLY":
      return { monthly: divide(amount, dec(12)), annual: amount };
    case "ONE_TIME":
      return { monthly: ZERO, annual: amount };
  }
}

export function parseMoneyAtCadence(amount: string, cadence: Cadence): { monthly: Dec; annual: Dec } {
  return normalizeCadence(parseMoney(amount), cadence);
}
