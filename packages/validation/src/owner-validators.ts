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

/** "A short post-restructure operating period must never automatically become an annualized run rate" starts with actually capturing the date. */
export function validateRestructureDateRequiredForStage(business: { stage: BusinessStage; restructureDate: ISODate | null }): void {
  if ((business.stage === "RESTARTED" || business.stage === "RESTRUCTURED") && business.restructureDate === null) {
    throw new ValidationError(
      "restructureDate",
      `A ${business.stage.toLowerCase()} business must capture the restart/restructure date`,
    );
  }
}
