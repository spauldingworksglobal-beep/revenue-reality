/**
 * A minimal, exact decimal summation for validation-layer checks (percentage
 * sums) that must never be tripped up by float rounding. Not a general
 * arithmetic library — @revenue-reality/revenue-engine owns real calculation
 * via decimal.js. This just needs exact equality checks on scaled integers.
 */

const SCALE_DECIMALS = 8;

function toScaledBigInt(decimalStr: string, decimals: number): bigint {
  const negative = decimalStr.trim().startsWith("-");
  const unsigned = decimalStr.trim().replace(/^-/, "");
  const [whole = "0", frac = ""] = unsigned.split(".");
  const paddedFrac = (frac + "0".repeat(decimals)).slice(0, decimals);
  const combinedRaw = `${whole}${paddedFrac}`.replace(/^0+(?=\d)/, "");
  const combined = combinedRaw === "" ? "0" : combinedRaw;
  const value = BigInt(combined);
  return negative ? -value : value;
}

export function sumDecimalStringsExact(values: string[]): bigint {
  return values.reduce((sum, v) => sum + toScaledBigInt(v, SCALE_DECIMALS), 0n);
}

export function decimalStringToScaled(value: string): bigint {
  return toScaledBigInt(value, SCALE_DECIMALS);
}
