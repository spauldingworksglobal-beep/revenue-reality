import type { Money, Percent } from "@revenue-reality/domain";
import { ValidationError } from "./errors.js";

const CURRENCY_PATTERN = /^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^-?\d+(?:\.\d+)?$/;

/**
 * Accepts commas and decimals (e.g. "1,622.00", "1622", "1622.5"), normalizes
 * to a decimal string with exactly 2 fraction digits. Never returns a float.
 */
export function parseCurrencyInput(raw: string, field = "amount"): Money {
  const trimmed = raw.trim().replace(/^\$/, "");
  if (trimmed === "" || !CURRENCY_PATTERN.test(trimmed)) {
    throw new ValidationError(field, `"${raw}" is not a valid currency amount`);
  }
  const withoutCommas = trimmed.replace(/,/g, "");
  const negative = withoutCommas.startsWith("-");
  const unsigned = withoutCommas.replace(/^-/, "");
  const [wholeRaw = "", fractionRaw = ""] = unsigned.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  const fraction = (fractionRaw + "00").slice(0, 2);
  const isZero = /^0+$/.test(whole) && /^0*$/.test(fraction);
  return `${negative && !isZero ? "-" : ""}${whole}.${fraction}`;
}

const PERCENT_PATTERN = /^-?\d+(?:\.\d+)?%?$/;

/**
 * Accepts a human percent ("46.36" or "46.36%") and returns the 0–1 ratio
 * decimal string the domain's Percent type expects ("0.4636"). Divides by
 * 100 via string manipulation — no float ever touches the value.
 */
export function parsePercentInput(raw: string, field = "percent"): Percent {
  const trimmed = raw.trim();
  if (!PERCENT_PATTERN.test(trimmed)) {
    throw new ValidationError(field, `"${raw}" is not a valid percentage`);
  }
  const negative = trimmed.startsWith("-");
  const unsigned = trimmed.replace(/^-/, "").replace(/%$/, "");
  const [wholeRaw = "", fracRaw = ""] = unsigned.split(".");
  const digits = wholeRaw + fracRaw; // decimal point currently sits after wholeRaw.length digits
  const pointIndex = wholeRaw.length - 2; // shift left by 2 to divide by 100

  let result: string;
  if (pointIndex <= 0) {
    result = "0." + "0".repeat(-pointIndex) + digits;
  } else {
    const intPart = digits.slice(0, pointIndex) || "0";
    const fracPart = digits.slice(pointIndex);
    result = fracPart ? `${intPart}.${fracPart}` : intPart;
  }

  result = result.replace(/^0+(?=\d)/, "");
  if (result.includes(".")) {
    result = result.replace(/0+$/, "").replace(/\.$/, "");
  }
  if (result === "" || result === ".") result = "0";

  const isZero = result === "0";
  return negative && !isZero ? `-${result}` : result;
}
