import type { BusinessStage, ISODate, Owner } from "@revenue-reality/domain";
import { ValidationError } from "./errors";
import { decimalStringToScaled, sumDecimalStringsExact } from "./decimal-sum";

const ONE_HUNDRED_PERCENT = decimalStringToScaled("1");

/** The primary respondent must remain unambiguously linked to exactly one Owner record. */
export function validateExactlyOnePrimaryRespondent(owners: Owner[]): void {
  const count = owners.filter((o) => o.isPrimaryRespondent).length;
  if (count !== 1) {
    throw new ValidationError(
      "isPrimaryRespondent",
      `Exactly one owner must be marked as the primary respondent — found ${count}`,
    );
  }
}

/**
 * Ownership percentages may be unknown/incomplete — that's valid and skips
 * validation entirely. Only once EVERY owner has a confirmed percentage does
 * a complete fixed split exist, and only then must it sum to exactly 100%.
 */
export function validateOwnershipPercentagesIfComplete(owners: Owner[]): void {
  if (owners.length === 0) return;
  if (owners.some((o) => o.ownershipPercent === null)) return; // incomplete — not yet validatable, not an error

  const sum = sumDecimalStringsExact(owners.map((o) => o.ownershipPercent!.value));
  if (sum !== ONE_HUNDRED_PERCENT) {
    const asPercent = ((Number(sum) / 1e8) * 100).toFixed(2);
    throw new ValidationError(
      "ownershipPercent",
      `A complete ownership split must sum to 100% (got ${asPercent}%)`,
    );
  }
}

export type OwnershipSplitStatus = "COMPLETE_VALID" | "INCOMPLETE_UNKNOWN" | "COMPLETE_INVALID";

/**
 * A non-throwing status read, for callers that need to gate behavior rather
 * than reject input outright (e.g. NOW must not offer "same as ownership"
 * distribution when the split is COMPLETE_INVALID, but should keep working).
 * A complete split that fails to sum to 100% is INVALID, not merely
 * "unconfirmed" — it must never be treated the same as genuinely unknown.
 */
export function resolveOwnershipSplitStatus(owners: Owner[]): OwnershipSplitStatus {
  if (owners.length === 0) return "INCOMPLETE_UNKNOWN";
  if (owners.some((o) => o.ownershipPercent === null)) return "INCOMPLETE_UNKNOWN";
  const sum = sumDecimalStringsExact(owners.map((o) => o.ownershipPercent!.value));
  return sum === ONE_HUNDRED_PERCENT ? "COMPLETE_VALID" : "COMPLETE_INVALID";
}

/** "A short post-restructure operating period must never automatically become an annualized run rate" starts with actually capturing the date. */
export function validateRestructureDateRequiredForStage(business: { stage: BusinessStage; restructureDate: ISODate | null }): void {
  if ((business.stage === "RESTARTED" || business.stage === "RESTRUCTURED") && business.restructureDate === null) {
    throw new ValidationError(
      "restructureDate",
      `A ${business.stage.toLowerCase()} business must capture the restart/restructure date`,
    );
  }
}
