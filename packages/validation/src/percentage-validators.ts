import type { OwnerEconomics, ScenarioDistributionPolicy } from "@revenue-reality/domain";
import { ValidationError } from "./errors";
import { sumDecimalStringsExact, decimalStringToScaled } from "./decimal-sum";

const ONE_HUNDRED_PERCENT = decimalStringToScaled("1");

/**
 * Ownership percentages must sum to exactly 100% only when the distribution
 * policy actually consumes them (SAME_AS_OWNERSHIP) — every other rule never
 * reads ownershipPercent (see resolveDistributionPercent), so unknown or
 * incomplete ownership never blocks a scenario unless "Same as ownership"
 * was actually chosen. Mirrors validateDistributionPercentagesSum100's
 * rule-conditional shape below.
 */
export function validateOwnershipPercentagesSum100(owners: OwnerEconomics[], policy: ScenarioDistributionPolicy): void {
  if (policy.rule !== "SAME_AS_OWNERSHIP") return;
  if (owners.length === 0) return;
  if (owners.some((o) => o.ownershipPercent === null)) {
    throw new ValidationError(
      "ownershipPercent",
      "Every owner must have a confirmed ownership percentage before profit can be distributed the same as ownership",
    );
  }
  const sum = sumDecimalStringsExact(owners.map((o) => o.ownershipPercent!));
  if (sum !== ONE_HUNDRED_PERCENT) {
    throw new ValidationError(
      "ownershipPercent",
      `Ownership percentages must sum to 100% across all owners (got ${formatRatio(sum)}%)`,
    );
  }
}

/**
 * Distribution percentages must sum to 100% only when the policy uses a
 * fixed rule that stores them explicitly (CUSTOM_PERCENTAGE). SAME_AS_OWNERSHIP
 * and EQUAL_SPLIT are engine-derived and can't drift by construction;
 * DISCRETIONARY/OTHER carry no percentage at all.
 */
export function validateDistributionPercentagesSum100(
  owners: OwnerEconomics[],
  policy: ScenarioDistributionPolicy,
): void {
  if (policy.rule !== "CUSTOM_PERCENTAGE") return;
  const percents = owners.map((o) => o.distributionPercent);
  if (percents.some((p) => p === null)) {
    throw new ValidationError(
      "distributionPercent",
      "Every owner must have a distributionPercent set when the distribution rule is CUSTOM_PERCENTAGE",
    );
  }
  const sum = sumDecimalStringsExact(percents as string[]);
  if (sum !== ONE_HUNDRED_PERCENT) {
    throw new ValidationError(
      "distributionPercent",
      `Custom distribution percentages must sum to 100% across all owners (got ${formatRatio(sum)}%)`,
    );
  }
}

function formatRatio(scaled: bigint): string {
  const asPercent = (Number(scaled) / 1e8) * 100;
  return asPercent.toFixed(2);
}
