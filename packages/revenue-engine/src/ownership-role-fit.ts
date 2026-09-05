import type { OwnershipIntent, ConfidenceValue } from "@revenue-reality/domain";

/**
 * Only RUNS_WITHOUT_ME and ASSET describe an intent for the mature
 * business to no longer depend on the owner's ongoing labor. MOSTLY_ME,
 * SMALL_TEAM, COMPANY_I_LEAD, UNSURE, and no ownership model recorded at
 * all are all explicitly compatible with substantial REQUIRED owner
 * involvement — Build Spec Milestone 7 follow-up §3.
 */
const MODELS_EXPECTING_OWNER_INDEPENDENCE: OwnershipIntent[] = ["RUNS_WITHOUT_ME", "ASSET"];

/**
 * Owner involvement and owner dependency are not the same thing. Non-zero
 * ULTIMATELY owner hours never by themselves mean the business depends on
 * the owner — an owner can choose to stay involved in a business that
 * would run without them. This is a genuinely separate fact from hours,
 * never inferred from a work-type label (e.g. "Strategy" is not assumed
 * "required" or "chosen" — only the owner's own answer here decides it).
 */
export type OwnerInvolvementNature = "REQUIRED" | "CHOSEN" | "MIXED" | "UNKNOWN";

export type OwnershipRoleFitFlag =
  /** Applies regardless of ownership model — the owner's own earlier answer says this function should no longer depend on them, and it still does here. */
  | "OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE"
  /** Only for RUNS_WITHOUT_ME/ASSET — confirmed hours are REQUIRED (or MIXED with at least one required function), contradicting the intended model. */
  | "REQUIRED_OWNER_HOURS_CONTRADICT_INTENDED_MODEL"
  /** Only for RUNS_WITHOUT_ME/ASSET with confirmed non-zero hours — required-vs-chosen was never answered (or MIXED was chosen with no functions identified), so Role can't be resolved either way. */
  | "OWNER_DEPENDENCY_NOT_YET_CLARIFIED";

export type OwnershipRoleFitStatus = "CONSISTENT" | "MISMATCH" | "INCOMPLETE";

export interface OwnershipRoleFitInput {
  intendedOwnershipModel: OwnershipIntent | null;
  /** ULTIMATELY's fixed primary-owner business hours (from Intended Time Reality). */
  ownerBusinessHoursWeek: ConfidenceValue<number>;
  /** Functions the owner has confirmed/refined they still intend to perform in the mature model. */
  workOwnerContinuesToPerform: string[];
  /** The owner's own earlier, qualitative "work I eventually don't want dependent on me" (Time Reality). */
  workOwnerSaidShouldNotDependOnThem: string[];
  /** The owner's own answer to whether their ULTIMATELY hours are required for the business to operate or chosen involvement — never inferred. */
  ownerInvolvementNature: OwnerInvolvementNature;
  /** Only meaningful when ownerInvolvementNature is "MIXED" — which of workOwnerContinuesToPerform the owner identified as required; everything else in that list is chosen. */
  requiredFunctionsWhenMixed: string[];
}

export interface OwnershipRoleFitResult {
  status: OwnershipRoleFitStatus;
  flags: OwnershipRoleFitFlag[];
}

/**
 * Diagnoses a contradiction between the owner's stated intended ownership
 * model and the mature model as actually built — never resolves it. No
 * auto-reducing hours, no invented delegation resource, and no guessing
 * required-vs-chosen from a work-type label. Two independent checks:
 *
 * 1. Explicit delegate contradiction (Build Spec Milestone 7 follow-up
 *    §1) — applies to every ownership model. If the owner already said a
 *    function should stop depending on them and this model still lists it
 *    as work they continue to perform, that's a real self-contradiction
 *    regardless of what ownership model they picked.
 *
 * 2. Required-owner-dependency (§2–3) — only meaningful for
 *    RUNS_WITHOUT_ME/ASSET, whose whole premise is that the business
 *    doesn't need the owner's ongoing labor. Confirmed non-zero hours are
 *    only a problem when the owner says those hours are REQUIRED for the
 *    business to operate; CHOSEN involvement is exactly what "the owner
 *    can still choose to stay involved" means and is fully compatible.
 *    Never known ("UNKNOWN", or "MIXED" with no functions identified)
 *    stays INCOMPLETE — never silently resolved either way (§4).
 *
 * Deliberately independent of Time Reality fit (§5): this function never
 * takes available hours as input, so the same hours can pass Time and
 * fail Role, or fail Time and pass Role — they are two different tests.
 */
export function assessOwnershipRoleFit(input: OwnershipRoleFitInput): OwnershipRoleFitResult {
  const flags: OwnershipRoleFitFlag[] = [];

  const stillPerformsDelegatedWork = input.workOwnerContinuesToPerform.some((w) => input.workOwnerSaidShouldNotDependOnThem.includes(w));
  if (stillPerformsDelegatedWork) {
    flags.push("OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE");
  }

  const expectsOwnerIndependence = input.intendedOwnershipModel !== null && MODELS_EXPECTING_OWNER_INDEPENDENCE.includes(input.intendedOwnershipModel);
  const hasConfirmedNonZeroHours = input.ownerBusinessHoursWeek.confidence !== "INCOMPLETE" && input.ownerBusinessHoursWeek.value > 0;

  if (expectsOwnerIndependence && hasConfirmedNonZeroHours) {
    if (input.ownerInvolvementNature === "REQUIRED") {
      flags.push("REQUIRED_OWNER_HOURS_CONTRADICT_INTENDED_MODEL");
    } else if (input.ownerInvolvementNature === "MIXED") {
      if (input.requiredFunctionsWhenMixed.length > 0) {
        flags.push("REQUIRED_OWNER_HOURS_CONTRADICT_INTENDED_MODEL");
      } else {
        flags.push("OWNER_DEPENDENCY_NOT_YET_CLARIFIED");
      }
    } else if (input.ownerInvolvementNature === "UNKNOWN") {
      flags.push("OWNER_DEPENDENCY_NOT_YET_CLARIFIED");
    }
    // CHOSEN: fully compatible with either model — no flag.
  }

  const hasMismatch = flags.includes("OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE") || flags.includes("REQUIRED_OWNER_HOURS_CONTRADICT_INTENDED_MODEL");
  const hasIncomplete = flags.includes("OWNER_DEPENDENCY_NOT_YET_CLARIFIED");
  const status: OwnershipRoleFitStatus = hasMismatch ? "MISMATCH" : hasIncomplete ? "INCOMPLETE" : "CONSISTENT";

  return { status, flags };
}
