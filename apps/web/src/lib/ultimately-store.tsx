"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  Capacity,
  CapitalRequirementItem,
  ConfidenceValue,
  DeferredNeed,
  DelegationItem,
  LifeCategory,
  Money,
  OperatingCost,
  OwnershipIntent,
  Percent,
  ScenarioDistributionPolicy,
  SecurityItem,
} from "@revenue-reality/domain";
import { buildIntendedLifeCategories, buildIntendedSecurityItems, type BusinessFundedConfirmation, type UltimatelyStreamAssemblyInput } from "@revenue-reality/revenue-engine";
import { useNext, type NextOwnerInput } from "./next-store";
import { useNow, type NowOwnerInput } from "./now-store";
import { useLifeReality } from "./life-store";
import { newId } from "./ids";

export interface UltimatelyOwnerInput {
  ownerId: string;
  hoursWeek: ConfidenceValue<number>;
  personalCashInvestment: Money;
  personallyPaidCosts: Money;
  functionConfidence: "KNOWN" | "ROLE_CHANGING" | "NOT_SURE";
  broadFunctions: string[];
  targetLaborCompensation: ConfidenceValue<Money> | null;
  targetProfitDistribution: ConfidenceValue<Money> | null;
}

function emptyStreamInput(streamId: string): UltimatelyStreamAssemblyInput {
  return { streamId, price: null, volume: null, mixWeightOverride: null, cogs: null, otherVariableCosts: [] };
}

function emptyOwnerInput(ownerId: string): UltimatelyOwnerInput {
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

interface UltimatelyContextValue {
  // ---- NEXT (or NOW) -> ULTIMATELY snapshot ----
  /** True once the business-model fields below have been copied. A one-time copy — see initializeFromNextOrNow. */
  hasInitialized: boolean;
  /** Which prior scenario ULTIMATELY was seeded from — display only, never re-derived. */
  initializedFrom: "NEXT" | "NOW" | null;
  /**
   * Copies business-model state from NEXT (if the owner has been through
   * it) or otherwise from NOW into ULTIMATELY's own independent fields,
   * exactly once. Also freezes the owner's already-defined Intended
   * Life/Time Reality into ULTIMATELY's own snapshot fields at the same
   * moment — editing NEXT, NOW, or Intended Life/Time afterward never
   * reaches back into an already-initialized ULTIMATELY.
   */
  initializeFromNextOrNow: () => void;

  // ---- ULTIMATELY Life Reality (already defined — loaded, never re-asked) ----
  snapshotIntendedCategories: LifeCategory[];
  snapshotIntendedSecurity: SecurityItem[];
  snapshotDeferredNeeds: DeferredNeed[];
  ultimatelyFundingConfirmation: BusinessFundedConfirmation | null;
  setUltimatelyFundingConfirmation: (value: BusinessFundedConfirmation | null) => void;

  // ---- ULTIMATELY Time Reality (already defined — loaded, never re-asked) ----
  snapshotUltimateBusinessHoursWeek: ConfidenceValue<number>;
  snapshotIntendedAvailableHoursWeek: ConfidenceValue<number>;
  snapshotOtherTimeClaims: { label: string; hoursWeek?: number }[];
  snapshotLifePriorityReservations: string[];
  snapshotIntendedOwnershipModel: OwnershipIntent | null;

  // ---- ULTIMATELY owner role (confirmation/refinement of already-captured intent) ----
  ultimatelyWorkToContinue: string[];
  setUltimatelyWorkToContinue: (updater: (prev: string[]) => string[]) => void;

  // ---- ULTIMATELY business model (independent copy, seeded from NEXT/NOW once) ----
  streamInputs: UltimatelyStreamAssemblyInput[];
  getStreamInput: (streamId: string) => UltimatelyStreamAssemblyInput;
  updateStreamInput: (streamId: string, patch: Partial<UltimatelyStreamAssemblyInput>) => void;

  operatingCosts: OperatingCost[];
  setOperatingCosts: (updater: (prev: OperatingCost[]) => OperatingCost[]) => void;
  opexListIsPartial: boolean;
  setOpexListIsPartial: (value: boolean) => void;

  /**
   * Costs needed only to move from NEXT to the mature model — display/
   * reference only. Never fed into the engine's operatingCosts, so a
   * transition-only cost can never silently become permanent mature OPEX.
   */
  transitionOnlyCosts: OperatingCost[];
  setTransitionOnlyCosts: (updater: (prev: OperatingCost[]) => OperatingCost[]) => void;

  ownerInputs: UltimatelyOwnerInput[];
  getOwnerInput: (ownerId: string) => UltimatelyOwnerInput;
  updateOwnerInput: (ownerId: string, patch: Partial<UltimatelyOwnerInput>) => void;

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

const UltimatelyContext = createContext<UltimatelyContextValue | null>(null);

export function UltimatelyProvider({ children }: { children: ReactNode }) {
  const next = useNext();
  const now = useNow();
  const life = useLifeReality();

  const [hasInitialized, setHasInitialized] = useState(false);
  const [initializedFrom, setInitializedFrom] = useState<"NEXT" | "NOW" | null>(null);

  const [snapshotIntendedCategories, setSnapshotIntendedCategories] = useState<LifeCategory[]>([]);
  const [snapshotIntendedSecurity, setSnapshotIntendedSecurity] = useState<SecurityItem[]>([]);
  const [snapshotDeferredNeeds, setSnapshotDeferredNeeds] = useState<DeferredNeed[]>([]);
  const [ultimatelyFundingConfirmation, setUltimatelyFundingConfirmation] = useState<BusinessFundedConfirmation | null>(null);

  const [snapshotUltimateBusinessHoursWeek, setSnapshotUltimateBusinessHoursWeek] = useState<ConfidenceValue<number>>({ value: 0, confidence: "INCOMPLETE" });
  const [snapshotIntendedAvailableHoursWeek, setSnapshotIntendedAvailableHoursWeek] = useState<ConfidenceValue<number>>({ value: 0, confidence: "INCOMPLETE" });
  const [snapshotOtherTimeClaims, setSnapshotOtherTimeClaims] = useState<{ label: string; hoursWeek?: number }[]>([]);
  const [snapshotLifePriorityReservations, setSnapshotLifePriorityReservations] = useState<string[]>([]);
  const [snapshotIntendedOwnershipModel, setSnapshotIntendedOwnershipModel] = useState<OwnershipIntent | null>(null);

  const [ultimatelyWorkToContinue, setUltimatelyWorkToContinue] = useState<string[]>([]);

  const [streamInputs, setStreamInputs] = useState<UltimatelyStreamAssemblyInput[]>([]);
  const [operatingCosts, setOperatingCostsState] = useState<OperatingCost[]>([]);
  const [opexListIsPartial, setOpexListIsPartial] = useState(false);
  const [transitionOnlyCosts, setTransitionOnlyCostsState] = useState<OperatingCost[]>([]);
  const [ownerInputs, setOwnerInputs] = useState<UltimatelyOwnerInput[]>([]);
  const [distributionPolicy, setDistributionPolicy] = useState<ScenarioDistributionPolicy | null>(null);
  const [distributionPercents, setDistributionPercents] = useState<Record<string, Percent>>({});
  const [capitalItems, setCapitalItemsState] = useState<CapitalRequirementItem[]>([]);
  const [delegationItems, setDelegationItemsState] = useState<DelegationItem[]>([]);
  const [capacity, setCapacity] = useState<Capacity | null>(null);

  function initializeFromNextOrNow() {
    if (hasInitialized) return;

    // Life/Time anchors: always the owner's already-defined Intended Life
    // and Intended Time Reality, materialized once — never NEXT's or NOW's,
    // and never live thereafter (see the NEXT snapshot-safety fix this
    // exact pattern is copied from).
    setSnapshotIntendedCategories(buildIntendedLifeCategories(life.lifeProfileId, life.currentCategories, life.lifeChanges));
    setSnapshotIntendedSecurity(buildIntendedSecurityItems(life.lifeProfileId, life.currentSecurity, life.securityChanges));
    setSnapshotDeferredNeeds(life.deferredNeeds.map((d) => ({ ...d })));
    setUltimatelyFundingConfirmation(life.businessFundedConfirmation);
    setSnapshotUltimateBusinessHoursWeek(life.ultimateBusinessHoursWeek);
    setSnapshotIntendedAvailableHoursWeek(life.intendedAvailableHoursWeek);
    setSnapshotOtherTimeClaims(life.otherTimeClaims.map((c) => ({ ...c })));
    setSnapshotLifePriorityReservations([...life.lifePriorityReservations]);
    setSnapshotIntendedOwnershipModel(life.intendedOwnershipModel);
    setUltimatelyWorkToContinue([...life.desiredWorkTypes]);

    // Business model: convenience-initialize from NEXT if the owner has
    // been through it, otherwise from NOW directly — either way a value
    // copy into ULTIMATELY's own state, never a live reference back.
    if (next.hasInitializedFromNow) {
      setStreamInputs(next.streamInputs.map((s) => ({ ...s })));
      setOperatingCostsState(next.operatingCosts.map((c) => ({ ...c })));
      setOpexListIsPartial(next.opexListIsPartial);
      setOwnerInputs(
        next.ownerInputs.map((o: NextOwnerInput) => ({
          ownerId: o.ownerId,
          hoursWeek: o.hoursWeek,
          personalCashInvestment: o.personalCashInvestment,
          personallyPaidCosts: o.personallyPaidCosts,
          functionConfidence: o.functionConfidence,
          broadFunctions: [...o.broadFunctions],
          targetLaborCompensation: o.targetLaborCompensation,
          targetProfitDistribution: o.targetProfitDistribution,
        })),
      );
      setDistributionPolicy(next.distributionPolicy);
      setDistributionPercents({ ...next.distributionPercents });
      setCapitalItemsState(next.capitalItems.map((c) => ({ ...c })));
      setDelegationItemsState(next.delegationItems.map((d) => ({ ...d })));
      setInitializedFrom("NEXT");
    } else {
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
          // NOW's cashReceived is a measurement of what already happened —
          // ULTIMATELY hasn't happened yet, so it starts with no target
          // rather than reinterpreting a measured figure as a future goal.
          targetLaborCompensation: null,
          targetProfitDistribution: null,
        })),
      );
      setDistributionPolicy(now.distributionPolicy);
      setDistributionPercents({ ...now.distributionPercents });
      setCapitalItemsState(now.capitalItems.map((c) => ({ ...c })));
      setDelegationItemsState([]);
      setInitializedFrom("NOW");
    }

    // Pre-populate delegation candidates from the owner's already-expressed
    // "work I ultimately don't want dependent on me" (Milestone 3) — merged
    // with whatever delegation items were already carried over above.
    // Purely a starting list: function labels only, cost/type left for the
    // owner to fill in on the delegation screen, never invented here.
    setDelegationItemsState((prev) => {
      const existingLabels = new Set(prev.map((d) => d.functionLabel));
      const fromIntent = life.workToEventuallyDelegate
        .filter((label) => !existingLabels.has(label))
        .map((label) => ({ id: newId(), scenarioId: "ultimately", functionLabel: label, delegationType: "UNSURE" as const, replacementCost: null, cadence: "MONTHLY" as const }));
      return [...prev, ...fromIntent];
    });

    setHasInitialized(true);
  }

  const value = useMemo<UltimatelyContextValue>(
    () => ({
      hasInitialized,
      initializedFrom,
      initializeFromNextOrNow,

      snapshotIntendedCategories,
      snapshotIntendedSecurity,
      snapshotDeferredNeeds,
      ultimatelyFundingConfirmation,
      setUltimatelyFundingConfirmation,

      snapshotUltimateBusinessHoursWeek,
      snapshotIntendedAvailableHoursWeek,
      snapshotOtherTimeClaims,
      snapshotLifePriorityReservations,
      snapshotIntendedOwnershipModel,

      ultimatelyWorkToContinue,
      setUltimatelyWorkToContinue: (updater) => setUltimatelyWorkToContinue(updater),

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

      transitionOnlyCosts,
      setTransitionOnlyCosts: (updater) => setTransitionOnlyCostsState(updater),

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
      hasInitialized,
      initializedFrom,
      snapshotIntendedCategories,
      snapshotIntendedSecurity,
      snapshotDeferredNeeds,
      ultimatelyFundingConfirmation,
      snapshotUltimateBusinessHoursWeek,
      snapshotIntendedAvailableHoursWeek,
      snapshotOtherTimeClaims,
      snapshotLifePriorityReservations,
      snapshotIntendedOwnershipModel,
      ultimatelyWorkToContinue,
      streamInputs,
      operatingCosts,
      opexListIsPartial,
      transitionOnlyCosts,
      ownerInputs,
      distributionPolicy,
      distributionPercents,
      capitalItems,
      delegationItems,
      capacity,
      next,
      now,
      life,
    ],
  );

  return <UltimatelyContext.Provider value={value}>{children}</UltimatelyContext.Provider>;
}

export function useUltimately(): UltimatelyContextValue {
  const ctx = useContext(UltimatelyContext);
  if (!ctx) throw new Error("useUltimately must be used within an UltimatelyProvider");
  return ctx;
}
