import type { ScenarioRevenueStream } from "@revenue-reality/domain";
import { ValidationError } from "./errors";
import { sumDecimalStringsExact, decimalStringToScaled } from "./decimal-sum";

const ONE_HUNDRED_PERCENT = decimalStringToScaled("1");

/** A scenario's active revenue streams must have mix weights summing to exactly 100%. */
export function validateMixWeightsSum100(streams: ScenarioRevenueStream[]): void {
  if (streams.length === 0) return;
  const sum = sumDecimalStringsExact(streams.map((s) => s.mixWeight));
  if (sum !== ONE_HUNDRED_PERCENT) {
    const asPercent = ((Number(sum) / 1e8) * 100).toFixed(2);
    throw new ValidationError("mixWeight", `Revenue stream mix weights must sum to 100% (got ${asPercent}%)`);
  }
}
