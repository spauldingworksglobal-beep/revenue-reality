"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  Capacity,
  CapitalRequirementItem,
  ConfidenceValue,
  DelegationItem,
  LifeCategory,
  Money,
  OperatingCost,
  Percent,
  ScenarioDistributionPolicy,
  SecurityItem,
} from "@revenue-reality/domain";
import {
  buildIntendedLifeCategories,
  buildIntendedSecurityItems,
  type BusinessFundedConfirmation,
  type NextLifeCategorySelection,
  type NextSecurityItemSelection,
  type NextStreamAssemblyInput,
} from "@revenue-reality/revenue-engine";
import { useNow, type NowOwnerInput } from "./now-store";
import { useLifeReality } from "./life-store";

/** Purely a display/framing concept — the engine never reads this, it only ever consumes the resolved business model that results from it. */
export type NextImprovementType =
  | "PAY_MYSELF_CONSISTENTLY"
  | "PAY_MYSELF_MORE"
  | "WORK_FEWER_HOURS"
  | "STOP_PERSONAL_MONEY_IN"
  | "REDUCE_OTHER_INCOME_DEPENDENCE"
  | "BUILD_RESERVE"
  | "HIRE_OR_DELEGATE"
  | "MORE_CONSISTENT_SALES"
  | "INCREASE_CAPACITY"
  | "STRENGTHEN_OPERATING_FOUNDATION"
  | "OTHER";

export interface NextOwnerInput {
  ownerId: string;
  hoursWeek: ConfidenceValue<number>;
  personalCashInvestment: Money;
  personallyPaidCosts: Money;
  functionConfidence: "KNOWN" | "ROLE_CHANGING" | "NOT_SURE";
  broadFunctions: string[];
  targetLaborCompensation: ConfidenceValue<Money> | null;
  targetProfitDistribution: ConfidenceValue<Money> | null;
}

function emptyStreamInput(streamId: string): NextStreamAssemblyInput {
  return { streamId, price: null, volume: null, mixWeightOverride: null, cogs: null, otherVariableCosts: [] };
}

function emptyOwnerInput(ownerId: string): NextOwnerInput {
  return {
    ownerId,
    hoursWeek: { value: 0, confidence: "INCOMPLETE" },
    personalCashInvestment: "0.00",
    personallyPaidCosts: "0.00",
    functionConfidence: "NOT_SURE",
    broadFunctions: [],
    targetLaborCompensation: null,
    targetProfitDistribution: null,
  };
}

interface NextContextValue {
  // ---- what should become possible ----
  primaryImprovement: NextImprovementType | null;
  setPrimaryImprovement: (value: NextImprovementType | null) => void;
  primaryImprovementOtherLabel: string;
  setPrimaryImprovementOtherLabel: (value: string) => void;
  supportingImprovements: NextImprovementType[];
  setSupportingImprovements: (updater: (prev: NextImprovementType[]) => NextImprovementType[]) => void;

  // ---- NOW -> NEXT snapshot ----
  /** True once the business-model fields below have been copied from NOW. A one-time copy — see initializeFromNow. */
  hasInitializedFromNow: boolean;
  /** Copies NOW's current business-model state into NEXT's own independent fields, exactly once. Calling it again is a no-op — editing NOW afterward never reaches back into NEXT. */
  initializeFromNow: () => void;

  // ---- NEXT Life Reality (intermediate, between Current and Intended) ----
  /**
   * Frozen at initializeFromNow() — the CURRENT/INTENDED life and security
   * data as they stood at that moment, materialized into NEXT's own state.
   * resolveNextLifeCategories/resolveNextSecurityItems and the reference
   * display on /next/life and /next/result must read from these, never from
   * live useLifeReality() data, so a later edit to CURRENT can never
   * silently change an already-initialized NEXT model.
   */
  snapshotCurrentCategories: LifeCategory[];
  snapshotIntendedCategories: LifeCategory[];
  snapshotCurrentSecurity: SecurityItem[];
  snapshotIntendedSecurity: SecurityItem[];
  nextLifeCategorySelections: NextLifeCategorySelection[];
  setNextLifeCategorySelection: (selection: NextLifeCategorySelection) => void;
  nextSecurityItemSelections: NextSecurityItemSelection[];
  setNextSecurityItemSelection: (selection: NextSecurityItemSelection) => void;
  nextFundingConfirmation: BusinessFundedConfirmation | null;
  setNextFundingConfirmation: (value: BusinessFundedConfirmation | null) => void;

  // ---- NEXT Time Reality (intermediate, between Current and Intended) ----
  nextAvailableHoursWeek: ConfidenceValue<number>;
  setNextAvailableHoursWeek: (value: ConfidenceValue<number>) => void;
  nextBusinessHoursWeek: ConfidenceValue<number>;
  setNextBusinessHoursWeek: (value: ConfidenceValue<number>) => void;
  /** Informational only — not consumed by the engine, same as Time Reality's own desiredWorkTypes. */
  nextWorkToContinue: string[];
  setNextWorkToContinue: (updater: (prev: string[]) => string[]) => void;
  nextLifePriorities: string[];
  setNextLifePriorities: (updater: (prev: string[]) => string[]) => void;

  // ---- NEXT business model (independent copy, seeded from NOW once) ----
  streamInputs: NextStreamAssemblyInput[];
  getStreamInput: (streamId: string) => NextStreamAssemblyInput;
  updateStreamInput: (streamId: string, patch: Partial<NextStreamAssemblyInput>) => void;

  operatingCosts: OperatingCost[];
  setOperatingCosts: (updater: (prev: OperatingCost[]) => OperatingCost[]) => void;
  opexListIsPartial: boolean;
  setOpexListIsPartial: (value: boolean) => void;

  ownerInputs: NextOwnerInput[];
  getOwnerInput: (ownerId: string) => NextOwnerInput;
  updateOwnerInput: (ownerId: string, patch: Partial<NextOwnerInput>) => void;

  distributionPolicy: ScenarioDistributionPolicy | null;
  setDistributionPolicy: (value: ScenarioDistributionPolicy | null) => void;
  distributionPercents: Record<string, Percent>;
  setDistributionPercent: (ownerId: string, percent: Percent) => void;

  capitalItems: CapitalRequirementItem[];
  setCapitalItems: (updater: (prev: CapitalRequirementItem[]) => CapitalRequirementItem[]) => void;

  delegationItems: DelegationItem[];
  setDelegationItems: (updater: (prev: DelegationItem[]) => DelegationItem[]) => void;

  capacity: Capacity | null;
  setCapacity: (value: Capacity | null) => void;
}

const NextContext = createContext<NextContextValue | null>(null);

export function NextProvider({ children }: { children: ReactNode }) {
  const now = useNow();
  const life = useLifeReality();

  const [primaryImprovement, setPrimaryImprovement] = useState<NextImprovementType | null>(null);
  const [primaryImprovementOtherLabel, setPrimaryImprovementOtherLabel] = useState("");
  const [supportingImprovements, setSupportingImprovements] = useState<NextImprovementType[]>([]);

  const [hasInitializedFromNow, setHasInitializedFromNow] = useState(false);

  const [snapshotCurrentCategories, setSnapshotCurrentCategories] = useState<LifeCategory[]>([]);
  const [snapshotIntendedCategories, setSnapshotIntendedCategories] = useState<LifeCategory[]>([]);
  const [snapshotCurrentSecurity, setSnapshotCurrentSecurity] = useState<SecurityItem[]>([]);
  const [snapshotIntendedSecurity, setSnapshotIntendedSecurity] = useState<SecurityItem[]>([]);

  const [nextLifeCategorySelections, setNextLifeCategorySelections] = useState<NextLifeCategorySelection[]>([]);
  const [nextSecurityItemSelections, setNextSecurityItemSelections] = useState<NextSecurityItemSelection[]>([]);
  const [nextFundingConfirmation, setNextFundingConfirmation] = useState<BusinessFundedConfirmation | null>(null);

  const [nextAvailableHoursWeek, setNextAvailableHoursWeek] = useState<ConfidenceValue<number>>({ value: 0, confidence: "INCOMPLETE" });
  const [nextBusinessHoursWeek, setNextBusinessHoursWeek] = useState<ConfidenceValue<number>>({ value: 0, confidence: "INCOMPLETE" });
  const [nextWorkToContinue, setNextWorkToContinue] = useState<string[]>([]);
  const [nextLifePriorities, setNextLifePriorities] = useState<string[]>([]);

  const [streamInputs, setStreamInputs] = useState<NextStreamAssemblyInput[]>([]);
  const [operatingCosts, setOperatingCostsState] = useState<OperatingCost[]>([]);
  const [opexListIsPartial, setOpexListIsPartial] = useState(false);
  const [ownerInputs, setOwnerInputs] = useState<NextOwnerInput[]>([]);
  const [distributionPolicy, setDistributionPolicy] = useState<ScenarioDistributionPolicy | null>(null);
  const [distributionPercents, setDistributionPercents] = useState<Record<string, Percent>>({});
  const [capitalItems, setCapitalItemsState] = useState<CapitalRequirementItem[]>([]);
  const [delegationItems, setDelegationItemsState] = useState<DelegationItem[]>([]);
  const [capacity, setCapacity] = useState<Capacity | null>(null);

  function initializeFromNow() {
    if (hasInitializedFromNow) return;
    // Value copies only — new arrays/objects, never a reference back into
    // `now`'s own state. Editing NOW after this point cannot reach NEXT.
    // Life/Security are materialized here too: CURRENT/INTENDED are computed
    // once, right now, and frozen into NEXT's own state, so a category the
    // owner never customizes in NEXT resolves against this snapshot forever
    // — not against whatever CURRENT happens to be the next time it renders.
    setSnapshotCurrentCategories(life.currentCategories.map((c) => ({ ...c })));
    setSnapshotIntendedCategories(buildIntendedLifeCategories(life.lifeProfileId, life.currentCategories, life.lifeChanges));
    setSnapshotCurrentSecurity(life.currentSecurity.map((s) => ({ ...s })));
    setSnapshotIntendedSecurity(buildIntendedSecurityItems(life.lifeProfileId, life.currentSecurity, life.securityChanges));
    setStreamInputs(now.streamInputs.map((s) => ({ ...s })));
    setOperatingCostsState(now.operatingCosts.map((c) => ({ ...c })));
    setOpexListIsPartial(now.opexListIsPartial);
    setOwnerInputs(
      now.ownerInputs.map((o: NowOwnerInput) => ({
        ownerId: o.ownerId,
        hoursWeek: o.hoursWeek,
        personalCashInvestment: o.personalCashInvestment,
        personallyPaidCosts: o.personallyPaidCosts,
        functionConfidence: o.functionConfidence,
        broadFunctions: [...o.broadFunctions],
        // NOW's cashReceived is a measurement of what already happened — NEXT
        // hasn't happened yet, so it starts with no target rather than
        // reinterpreting a measured figure as a future goal.
        targetLaborCompensation: null,
        targetProfitDistribution: null,
      })),
    );
    setDistributionPolicy(now.distributionPolicy);
    setDistributionPercents({ ...now.distributionPercents });
    setCapitalItemsState(now.capitalItems.map((c) => ({ ...c })));
    setNextFundingConfirmation(now.currentFundingConfirmation);
    setNextAvailableHoursWeek(life.currentAvailableHoursWeek);
    setNextBusinessHoursWeek(life.currentBusinessHoursWeek);
    setHasInitializedFromNow(true);
  }

  const value = useMemo<NextContextValue>(
    () => ({
      primaryImprovement,
      setPrimaryImprovement,
      primaryImprovementOtherLabel,
      setPrimaryImprovementOtherLabel,
      supportingImprovements,
      setSupportingImprovements: (updater) => setSupportingImprovements(updater),

      hasInitializedFromNow,
      initializeFromNow,

      snapshotCurrentCategories,
      snapshotIntendedCategories,
      snapshotCurrentSecurity,
      snapshotIntendedSecurity,

      nextLifeCategorySelections,
      setNextLifeCategorySelection: (selection) =>
        setNextLifeCategorySelections((prev) => [...prev.filter((s) => s.categoryId !== selection.categoryId), selection]),
      nextSecurityItemSelections,
      setNextSecurityItemSelection: (selection) =>
        setNextSecurityItemSelections((prev) => [...prev.filter((s) => s.itemId !== selection.itemId), selection]),
      nextFundingConfirmation,
      setNextFundingConfirmation,

      nextAvailableHoursWeek,
      setNextAvailableHoursWeek,
      nextBusinessHoursWeek,
      setNextBusinessHoursWeek,
      nextWorkToContinue,
      setNextWorkToContinue: (updater) => setNextWorkToContinue(updater),
      nextLifePriorities,
      setNextLifePriorities: (updater) => setNextLifePriorities(updater),

      streamInputs,
      getStreamInput: (streamId) => streamInputs.find((s) => s.streamId === streamId) ?? emptyStreamInput(streamId),
      updateStreamInput: (streamId, patch) =>
        setStreamInputs((prev) => {
          const existing = prev.find((s) => s.streamId === streamId);
          if (existing) return prev.map((s) => (s.streamId === streamId ? { ...s, ...patch } : s));
          return [...prev, { ...emptyStreamInput(streamId), ...patch }];
        }),

      operatingCosts,
      setOperatingCosts: (updater) => setOperatingCostsState(updater),
      opexListIsPartial,
      setOpexListIsPartial,

      ownerInputs,
      getOwnerInput: (ownerId) => ownerInputs.find((o) => o.ownerId === ownerId) ?? emptyOwnerInput(ownerId),
      updateOwnerInput: (ownerId, patch) =>
        setOwnerInputs((prev) => {
          const existing = prev.find((o) => o.ownerId === ownerId);
          if (existing) return prev.map((o) => (o.ownerId === ownerId ? { ...o, ...patch } : o));
          return [...prev, { ...emptyOwnerInput(ownerId), ...patch }];
        }),

      distributionPolicy,
      setDistributionPolicy,
      distributionPercents,
      setDistributionPercent: (ownerId, percent) => setDistributionPercents((prev) => ({ ...prev, [ownerId]: percent })),

      capitalItems,
      setCapitalItems: (updater) => setCapitalItemsState(updater),

      delegationItems,
      setDelegationItems: (updater) => setDelegationItemsState(updater),

      capacity,
      setCapacity,
    }),
    [
      primaryImprovement,
      primaryImprovementOtherLabel,
      supportingImprovements,
      hasInitializedFromNow,
      snapshotCurrentCategories,
      snapshotIntendedCategories,
      snapshotCurrentSecurity,
      snapshotIntendedSecurity,
      nextLifeCategorySelections,
      nextSecurityItemSelections,
      nextFundingConfirmation,
      nextAvailableHoursWeek,
      nextBusinessHoursWeek,
      nextWorkToContinue,
      nextLifePriorities,
      streamInputs,
      operatingCosts,
      opexListIsPartial,
      ownerInputs,
      distributionPolicy,
      distributionPercents,
      capitalItems,
      delegationItems,
      capacity,
      now,
      life,
    ],
  );

  return <NextContext.Provider value={value}>{children}</NextContext.Provider>;
}

export function useNext(): NextContextValue {
  const ctx = useContext(NextContext);
  if (!ctx) throw new Error("useNext must be used within a NextProvider");
  return ctx;
}
