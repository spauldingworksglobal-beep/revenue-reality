import type { ConfidenceValue, OwnershipIntent } from "@revenue-reality/domain";

/**
 * MOSTLY_ME, SMALL_TEAM, COMPANY_I_LEAD, and UNSURE (or no ownership model
 * recorded at all) never carry an owner-independence expectation — a
 * mature model that still relies heavily on the owner, or one where the
 * owner keeps leadership/strategy while operational work moves elsewhere,
 * is exactly what those models describe. Only RUNS_WITHOUT_ME and ASSET
 * describe an intent for the business to no longer depend on the owner's
 * ongoing labor, so only those two are ever checked here.
 */
const MODELS_EXPECTING_OWNER_INDEPENDENCE: OwnershipIntent[] = ["RUNS_WITHOUT_ME", "ASSET"];

export type OwnershipRoleFitFlag =
  /** The mature model still shows confirmed, non-zero owner hours — worth the owner's explicit confirmation against an intent that describes the business running without them. */
  | "OWNER_HOURS_MAY_CONTRADICT_INTENDED_MODEL"
  /** The owner listed a function as something they still perform in ULTIMATELY that they themselves earlier said should no longer depend on them — a direct, checkable self-contradiction. */
  | "OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE";

export interface OwnershipRoleFitInput {
  intendedOwnershipModel: OwnershipIntent | null;
  /** ULTIMATELY's fixed primary-owner business hours (from Intended Time Reality). */
  ownerBusinessHoursWeek: ConfidenceValue<number>;
  /** Functions the owner has confirmed/refined they still intend to perform in the mature model. */
  workOwnerContinuesToPerform: string[];
  /** The owner's own earlier, qualitative "work I eventually don't want dependent on me" (Time Reality). */
  workOwnerSaidShouldNotDependOnThem: string[];
}

export interface OwnershipRoleFitResult {
  /** False for ownership models with no owner-independence expectation — MOSTLY_ME/SMALL_TEAM/COMPANY_I_LEAD/UNSURE/null never produce a flag, by design (Build Spec Milestone 7 §3). */
  applies: boolean;
  flags: OwnershipRoleFitFlag[];
}

/**
 * Diagnoses a contradiction between the owner's stated intended ownership
 * model and the mature model as actually built — never resolves it.
 * Revenue Reality does not auto-reduce owner hours or invent a delegation
 * resource to make RUNS_WITHOUT_ME/ASSET "work"; it only surfaces that the
 * two disagree, so the owner can reconcile them deliberately (change the
 * ownership model, change the hours at Intended Time Reality, or change
 * what they say they still do here).
 */
export function assessOwnershipRoleFit(input: OwnershipRoleFitInput): OwnershipRoleFitResult {
  if (input.intendedOwnershipModel === null || !MODELS_EXPECTING_OWNER_INDEPENDENCE.includes(input.intendedOwnershipModel)) {
    return { applies: false, flags: [] };
  }

  const flags: OwnershipRoleFitFlag[] = [];

  if (input.ownerBusinessHoursWeek.confidence !== "INCOMPLETE" && input.ownerBusinessHoursWeek.value > 0) {
    flags.push("OWNER_HOURS_MAY_CONTRADICT_INTENDED_MODEL");
  }

  const stillPerformsDelegatedWork = input.workOwnerContinuesToPerform.some((w) => input.workOwnerSaidShouldNotDependOnThem.includes(w));
  if (stillPerformsDelegatedWork) {
    flags.push("OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE");
  }

  return { applies: true, flags };
}
