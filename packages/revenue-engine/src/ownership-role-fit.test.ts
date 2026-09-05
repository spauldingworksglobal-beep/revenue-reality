import { describe, expect, it } from "vitest";
import { assessOwnershipRoleFit } from "./ownership-role-fit";

function exact(value: number) {
  return { value, confidence: "EXACT" as const };
}

describe("assessOwnershipRoleFit — MOSTLY_ME", () => {
  it("substantial continuing owner work is valid and never produces a false role mismatch", () => {
    const result = assessOwnershipRoleFit({
      intendedOwnershipModel: "MOSTLY_ME",
      ownerBusinessHoursWeek: exact(35),
      workOwnerContinuesToPerform: ["Sales", "Product/service delivery", "Operations", "Finances", "Strategy"],
      workOwnerSaidShouldNotDependOnThem: [],
    });
    expect(result.applies).toBe(false);
    expect(result.flags).toEqual([]);
  });
});

describe("assessOwnershipRoleFit — SMALL_TEAM / COMPANY_I_LEAD", () => {
  it("the owner retaining leadership/strategy while operational functions move elsewhere is not flagged", () => {
    for (const model of ["SMALL_TEAM", "COMPANY_I_LEAD"] as const) {
      const result = assessOwnershipRoleFit({
        intendedOwnershipModel: model,
        ownerBusinessHoursWeek: exact(15),
        workOwnerContinuesToPerform: ["Lead", "Strategy"],
        workOwnerSaidShouldNotDependOnThem: ["Selling", "Bookkeeping / admin"],
      });
      expect(result.applies).toBe(false);
      expect(result.flags).toEqual([]);
    }
  });
});

describe("assessOwnershipRoleFit — RUNS_WITHOUT_ME", () => {
  it("a mature model that still shows confirmed, non-zero owner hours surfaces a mismatch", () => {
    const result = assessOwnershipRoleFit({
      intendedOwnershipModel: "RUNS_WITHOUT_ME",
      ownerBusinessHoursWeek: exact(10),
      workOwnerContinuesToPerform: [],
      workOwnerSaidShouldNotDependOnThem: ["Selling"],
    });
    expect(result.applies).toBe(true);
    expect(result.flags).toContain("OWNER_HOURS_MAY_CONTRADICT_INTENDED_MODEL");
  });

  it("the owner still performing a function they themselves said should no longer depend on them surfaces a mismatch", () => {
    const result = assessOwnershipRoleFit({
      intendedOwnershipModel: "RUNS_WITHOUT_ME",
      ownerBusinessHoursWeek: exact(0),
      workOwnerContinuesToPerform: ["Selling"],
      workOwnerSaidShouldNotDependOnThem: ["Selling", "Bookkeeping / admin"],
    });
    expect(result.applies).toBe(true);
    expect(result.flags).toEqual(["OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE"]);
  });

  it("zero confirmed hours and no self-contradicting continued work is fully consistent", () => {
    const result = assessOwnershipRoleFit({
      intendedOwnershipModel: "RUNS_WITHOUT_ME",
      ownerBusinessHoursWeek: exact(0),
      workOwnerContinuesToPerform: ["Strategy"],
      workOwnerSaidShouldNotDependOnThem: ["Selling", "Bookkeeping / admin"],
    });
    expect(result.applies).toBe(true);
    expect(result.flags).toEqual([]);
  });

  it("never automatically resolves the contradiction — it only reports what was found, hours and work lists pass through unchanged", () => {
    const input = {
      intendedOwnershipModel: "RUNS_WITHOUT_ME" as const,
      ownerBusinessHoursWeek: exact(20),
      workOwnerContinuesToPerform: ["Selling"],
      workOwnerSaidShouldNotDependOnThem: ["Selling"],
    };
    const result = assessOwnershipRoleFit(input);
    // Both conditions present; nothing about the input is mutated or "fixed."
    expect(result.flags.sort()).toEqual(["OWNER_HOURS_MAY_CONTRADICT_INTENDED_MODEL", "OWNER_STILL_PERFORMS_WORK_THEY_SAID_TO_DELEGATE"].sort());
    expect(input.ownerBusinessHoursWeek.value).toBe(20);
    expect(input.workOwnerContinuesToPerform).toEqual(["Selling"]);
  });

  it("hours that are still INCOMPLETE (never confirmed) do not trigger a false hours-mismatch flag", () => {
    const result = assessOwnershipRoleFit({
      intendedOwnershipModel: "RUNS_WITHOUT_ME",
      ownerBusinessHoursWeek: { value: 0, confidence: "INCOMPLETE" },
      workOwnerContinuesToPerform: [],
      workOwnerSaidShouldNotDependOnThem: [],
    });
    expect(result.applies).toBe(true);
    expect(result.flags).toEqual([]);
  });
});

describe("assessOwnershipRoleFit — ASSET", () => {
  it("likewise flags significant ongoing owner operating labor unless the owner explicitly defines it as part of the model", () => {
    const dependsOnOwner = assessOwnershipRoleFit({
      intendedOwnershipModel: "ASSET",
      ownerBusinessHoursWeek: exact(12),
      workOwnerContinuesToPerform: [],
      workOwnerSaidShouldNotDependOnThem: [],
    });
    expect(dependsOnOwner.applies).toBe(true);
    expect(dependsOnOwner.flags).toContain("OWNER_HOURS_MAY_CONTRADICT_INTENDED_MODEL");

    // The owner can still explicitly define ongoing hours as part of the
    // asset model — assessOwnershipRoleFit never blocks that, it only
    // surfaces the fact for the owner to confirm is intentional.
    const explicitlyDefined = assessOwnershipRoleFit({
      intendedOwnershipModel: "ASSET",
      ownerBusinessHoursWeek: exact(0),
      workOwnerContinuesToPerform: [],
      workOwnerSaidShouldNotDependOnThem: [],
    });
    expect(explicitlyDefined.flags).toEqual([]);
  });
});

describe("assessOwnershipRoleFit — UNSURE or no ownership model recorded", () => {
  it("neither UNSURE nor a null ownership model ever produces a flag", () => {
    expect(assessOwnershipRoleFit({ intendedOwnershipModel: "UNSURE", ownerBusinessHoursWeek: exact(40), workOwnerContinuesToPerform: [], workOwnerSaidShouldNotDependOnThem: [] }).applies).toBe(false);
    expect(assessOwnershipRoleFit({ intendedOwnershipModel: null, ownerBusinessHoursWeek: exact(40), workOwnerContinuesToPerform: [], workOwnerSaidShouldNotDependOnThem: [] }).applies).toBe(false);
  });
});
