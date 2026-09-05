import { describe, expect, it } from "vitest";
import { assessOwnershipRoleFit, type OwnerInvolvementNature } from "./ownership-role-fit";

function hours(value: number, confidence: "EXACT" | "INCOMPLETE" = "EXACT") {
  return { value, confidence };
}

function baseInput(overrides: {
  intendedOwnershipModel: Parameters<typeof assessOwnershipRoleFit>[0]["intendedOwnershipModel"];
  ownerBusinessHoursWeek?: ReturnType<typeof hours>;
  workOwnerContinuesToPerform?: string[];
  workOwnerSaidShouldNotDependOnThem?: string[];
  ownerInvolvementNature?: OwnerInvolvementNature;
  requiredFunctionsWhenMixed?: string[];
}) {
  return {
    intendedOwnershipModel: overrides.intendedOwnershipModel,
    ownerBusinessHoursWeek: overrides.ownerBusinessHoursWeek ?? hours(0, "INCOMPLETE"),
    workOwnerContinuesToPerform: overrides.workOwnerContinuesToPerform ?? [],
    workOwnerSaidShouldNotDependOnThem: overrides.workOwnerSaidShouldNotDependOnThem ?? [],
    ownerInvolvementNature: overrides.ownerInvolvementNature ?? "UNKNOWN",
    requiredFunctionsWhenMixed: overrides.requiredFunctionsWhenMixed ?? [],
  };
}

describe("assessOwnershipRoleFit — MOSTLY_ME", () => {
  it("required owner work is valid — required owner involvement is explicitly compatible with this model", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "MOSTLY_ME",
        ownerBusinessHoursWeek: hours(35),
        workOwnerContinuesToPerform: ["Sales", "Delivery"],
        ownerInvolvementNature: "REQUIRED",
      }),
    );
    expect(result.status).toBe("CONSISTENT");
    expect(result.flags).toEqual([]);
  });

  it("an explicit should-delegate function still modeled as work the owner performs is a mismatch, even though the model is MOSTLY_ME", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "MOSTLY_ME",
        ownerBusinessHoursWeek: hours(35),
        workOwnerContinuesToPerform: ["Bookkeeping"],
        workOwnerSaidShouldNotDependOnThem: ["Bookkeeping"],
        ownerInvolvementNature: "REQUIRED",
      }),
    );
    expect(result.status).toBe("MISMATCH");
    expect(result.flags).toEqual(["OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE"]);
  });
});

describe("assessOwnershipRoleFit — SMALL_TEAM", () => {
  it("required owner work is valid", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "SMALL_TEAM",
        ownerBusinessHoursWeek: hours(20),
        workOwnerContinuesToPerform: ["Lead", "Strategy"],
        ownerInvolvementNature: "REQUIRED",
      }),
    );
    expect(result.status).toBe("CONSISTENT");
  });

  it("a should-delegate contradiction is a mismatch", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "SMALL_TEAM",
        ownerBusinessHoursWeek: hours(20),
        workOwnerContinuesToPerform: ["Selling"],
        workOwnerSaidShouldNotDependOnThem: ["Selling"],
        ownerInvolvementNature: "REQUIRED",
      }),
    );
    expect(result.status).toBe("MISMATCH");
    expect(result.flags).toEqual(["OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE"]);
  });
});

describe("assessOwnershipRoleFit — COMPANY_I_LEAD", () => {
  it("required owner involvement is valid where the owner confirms it — never inferred from a 'leadership' work-type label", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "COMPANY_I_LEAD",
        ownerBusinessHoursWeek: hours(12),
        // Deliberately NOT a "leadership-sounding" label — proves the
        // function never classifies work types itself, only the owner's
        // own REQUIRED/CHOSEN answer (set below) matters for this model,
        // and even that doesn't matter since COMPANY_I_LEAD never checks it.
        workOwnerContinuesToPerform: ["Whatever the owner says they still do"],
        ownerInvolvementNature: "REQUIRED",
      }),
    );
    expect(result.status).toBe("CONSISTENT");
  });

  it("a should-delegate contradiction still flags", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "COMPANY_I_LEAD",
        ownerBusinessHoursWeek: hours(12),
        workOwnerContinuesToPerform: ["Sales"],
        workOwnerSaidShouldNotDependOnThem: ["Sales"],
        ownerInvolvementNature: "REQUIRED",
      }),
    );
    expect(result.status).toBe("MISMATCH");
  });
});

describe("assessOwnershipRoleFit — RUNS_WITHOUT_ME", () => {
  it("10 CHOSEN hours/week is valid — owner involvement and business dependency are not the same thing", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "RUNS_WITHOUT_ME",
        ownerBusinessHoursWeek: hours(10),
        ownerInvolvementNature: "CHOSEN",
      }),
    );
    expect(result.status).toBe("CONSISTENT");
    expect(result.flags).toEqual([]);
  });

  it("10 REQUIRED hours/week is a mismatch", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "RUNS_WITHOUT_ME",
        ownerBusinessHoursWeek: hours(10),
        ownerInvolvementNature: "REQUIRED",
      }),
    );
    expect(result.status).toBe("MISMATCH");
    expect(result.flags).toEqual(["REQUIRED_OWNER_HOURS_CONTRADICT_INTENDED_MODEL"]);
  });

  it("unknown dependency (never answered) is INCOMPLETE — never silently CONSISTENT nor MISMATCH", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "RUNS_WITHOUT_ME",
        ownerBusinessHoursWeek: hours(10),
        ownerInvolvementNature: "UNKNOWN",
      }),
    );
    expect(result.status).toBe("INCOMPLETE");
    expect(result.flags).toEqual(["OWNER_DEPENDENCY_NOT_YET_CLARIFIED"]);
  });

  it("MIXED with at least one required function is a mismatch", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "RUNS_WITHOUT_ME",
        ownerBusinessHoursWeek: hours(15),
        workOwnerContinuesToPerform: ["Quality review", "Vendor relationships"],
        ownerInvolvementNature: "MIXED",
        requiredFunctionsWhenMixed: ["Quality review"],
      }),
    );
    expect(result.status).toBe("MISMATCH");
    expect(result.flags).toEqual(["REQUIRED_OWNER_HOURS_CONTRADICT_INTENDED_MODEL"]);
  });

  it("MIXED with no functions identified as required stays INCOMPLETE, not silently CONSISTENT", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "RUNS_WITHOUT_ME",
        ownerBusinessHoursWeek: hours(15),
        workOwnerContinuesToPerform: ["Quality review", "Vendor relationships"],
        ownerInvolvementNature: "MIXED",
        requiredFunctionsWhenMixed: [],
      }),
    );
    expect(result.status).toBe("INCOMPLETE");
  });

  it("zero / unconfirmed hours never trigger the dependency check at all, regardless of nature", () => {
    const zeroHours = assessOwnershipRoleFit(baseInput({ intendedOwnershipModel: "RUNS_WITHOUT_ME", ownerBusinessHoursWeek: hours(0), ownerInvolvementNature: "REQUIRED" }));
    expect(zeroHours.status).toBe("CONSISTENT");
    const neverConfirmed = assessOwnershipRoleFit(baseInput({ intendedOwnershipModel: "RUNS_WITHOUT_ME", ownerBusinessHoursWeek: hours(0, "INCOMPLETE"), ownerInvolvementNature: "REQUIRED" }));
    expect(neverConfirmed.status).toBe("CONSISTENT");
  });

  it("both an explicit delegate contradiction AND unclarified dependency can be true at once — mismatch takes priority, but both flags are reported", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "RUNS_WITHOUT_ME",
        ownerBusinessHoursWeek: hours(10),
        workOwnerContinuesToPerform: ["Selling"],
        workOwnerSaidShouldNotDependOnThem: ["Selling"],
        ownerInvolvementNature: "UNKNOWN",
      }),
    );
    expect(result.status).toBe("MISMATCH");
    expect(result.flags.sort()).toEqual(["OWNER_DEPENDENCY_NOT_YET_CLARIFIED", "OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE"].sort());
  });
});

describe("assessOwnershipRoleFit — ASSET", () => {
  it("chosen governance/oversight involvement is valid", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "ASSET",
        ownerBusinessHoursWeek: hours(3),
        ownerInvolvementNature: "CHOSEN",
      }),
    );
    expect(result.status).toBe("CONSISTENT");
  });

  it("required ongoing operating dependency is a mismatch/review condition", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "ASSET",
        ownerBusinessHoursWeek: hours(8),
        ownerInvolvementNature: "REQUIRED",
      }),
    );
    expect(result.status).toBe("MISMATCH");
    expect(result.flags).toEqual(["REQUIRED_OWNER_HOURS_CONTRADICT_INTENDED_MODEL"]);
  });
});

describe("assessOwnershipRoleFit — UNSURE or no ownership model recorded", () => {
  it("neither UNSURE nor a null ownership model ever triggers the owner-dependency check", () => {
    expect(assessOwnershipRoleFit(baseInput({ intendedOwnershipModel: "UNSURE", ownerBusinessHoursWeek: hours(40), ownerInvolvementNature: "UNKNOWN" })).status).toBe("CONSISTENT");
    expect(assessOwnershipRoleFit(baseInput({ intendedOwnershipModel: null, ownerBusinessHoursWeek: hours(40), ownerInvolvementNature: "UNKNOWN" })).status).toBe("CONSISTENT");
  });

  it("but the explicit delegate contradiction still applies to UNSURE/null exactly like every other model", () => {
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "UNSURE",
        workOwnerContinuesToPerform: ["Selling"],
        workOwnerSaidShouldNotDependOnThem: ["Selling"],
      }),
    );
    expect(result.status).toBe("MISMATCH");
  });
});

describe("assessOwnershipRoleFit — independence from the Time-fit result", () => {
  it("has no availableHoursWeek parameter at all — Role and Time are structurally separate tests, computed independently", () => {
    // The Build Spec example: owner allows 15 hrs/week and the business
    // requires exactly 15 hrs/week (Time signal would read FITS), but the
    // owner selected RUNS_WITHOUT_ME and confirmed those hours as REQUIRED
    // — Role must still fail even though Time passes. Nothing about
    // "available hours" is or could be part of this input.
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "RUNS_WITHOUT_ME",
        ownerBusinessHoursWeek: hours(15),
        ownerInvolvementNature: "REQUIRED",
      }),
    );
    expect(result.status).toBe("MISMATCH");
  });

  it("a model can pass Role with non-zero hours that Time might separately flag as tight — Role only cares about required-vs-chosen, never about how much available time is left", () => {
    // 10 hrs/week chosen, regardless of how little available time Intended
    // Time Reality separately reports — that comparison belongs to the
    // Time signal alone.
    const result = assessOwnershipRoleFit(
      baseInput({
        intendedOwnershipModel: "RUNS_WITHOUT_ME",
        ownerBusinessHoursWeek: hours(10),
        ownerInvolvementNature: "CHOSEN",
      }),
    );
    expect(result.status).toBe("CONSISTENT");
  });
});
