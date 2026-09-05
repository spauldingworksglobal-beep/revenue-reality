"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  ActualRevenuePeriod,
  CapitalRequirementItem,
  CogsInput,
  ConfidenceValue,
  DelegationItem,
  Money,
  OperatingCost,
  OwnerCashReceived,
  Percent,
  ScenarioDistributionPolicy,
  VariableCostItem,
} from "@revenue-reality/domain";
import type { BusinessFundedConfirmation } from "@revenue-reality/revenue-engine";

export interface NowStreamInput {
  streamId: string;
  price: ConfidenceValue<Money> | null;
  volume: ConfidenceValue<number> | null;
  /** Owner-entered; null = unknown, an equal split is used as a placeholder — see computeEqualMixWeights. */
  mixWeightOverride: Percent | null;
  cogs: CogsInput | null;
  otherVariableCosts: VariableCostItem[];
}

export interface NowOwnerInput {
  ownerId: string;
  hoursWeek: ConfidenceValue<number>;
  personalCashInvestment: Money;
  personallyPaidCosts: Money;
  functionConfidence: "KNOWN" | "ROLE_CHANGING" | "NOT_SURE";
  broadFunctions: string[];
  cashReceived: OwnerCashReceived | null;
}

function emptyStreamInput(streamId: string): NowStreamInput {
  return { streamId, price: null, volume: null, mixWeightOverride: null, cogs: null, otherVariableCosts: [] };
}

function emptyOwnerInput(ownerId: string): NowOwnerInput {
  return {
    ownerId,
    hoursWeek: { value: 0, confidence: "INCOMPLETE" },
    personalCashInvestment: "0.00",
    personallyPaidCosts: "0.00",
    functionConfidence: "NOT_SURE",
    broadFunctions: [],
    cashReceived: null,
  };
}

interface NowContextValue {
  actualRevenue: ConfidenceValue<Money> | null;
  setActualRevenue: (value: ConfidenceValue<Money> | null) => void;

  revenuePeriod: ActualRevenuePeriod;
  setRevenuePeriod: (value: ActualRevenuePeriod) => void;

  cashCollected: ConfidenceValue<Money> | null;
  setCashCollected: (value: ConfidenceValue<Money> | null) => void;

  hasAccountsReceivable: "YES" | "NO" | "UNSURE" | null;
  setHasAccountsReceivable: (value: "YES" | "NO" | "UNSURE" | null) => void;

  accountsReceivableAmount: ConfidenceValue<Money> | null;
  setAccountsReceivableAmount: (value: ConfidenceValue<Money> | null) => void;

  /** The CURRENT-horizon analog of Life-8's businessFundedConfirmation — how much of today's life the business is currently responsible for. */
  currentFundingConfirmation: BusinessFundedConfirmation | null;
  setCurrentFundingConfirmation: (value: BusinessFundedConfirmation | null) => void;

  streamInputs: NowStreamInput[];
  getStreamInput: (streamId: string) => NowStreamInput;
  updateStreamInput: (streamId: string, patch: Partial<NowStreamInput>) => void;

  operatingCosts: OperatingCost[];
  setOperatingCosts: (updater: (prev: OperatingCost[]) => OperatingCost[]) => void;
  opexListIsPartial: boolean;
  setOpexListIsPartial: (value: boolean) => void;

  ownerInputs: NowOwnerInput[];
  getOwnerInput: (ownerId: string) => NowOwnerInput;
  updateOwnerInput: (ownerId: string, patch: Partial<NowOwnerInput>) => void;

  distributionPolicy: ScenarioDistributionPolicy | null;
  setDistributionPolicy: (value: ScenarioDistributionPolicy | null) => void;

  distributionPercents: Record<string, Percent>; // ownerId -> percent, CUSTOM_PERCENTAGE mode only
  setDistributionPercent: (ownerId: string, percent: Percent) => void;

  capitalItems: CapitalRequirementItem[];
  setCapitalItems: (updater: (prev: CapitalRequirementItem[]) => CapitalRequirementItem[]) => void;

  delegationItems: DelegationItem[]; // always empty in NOW — no delegation this milestone
}

const NowContext = createContext<NowContextValue | null>(null);

export function NowProvider({ children }: { children: ReactNode }) {
  const [actualRevenue, setActualRevenue] = useState<ConfidenceValue<Money> | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<ActualRevenuePeriod>({ periodStart: null, periodEnd: null, periodType: "MONTH" });
  const [cashCollected, setCashCollected] = useState<ConfidenceValue<Money> | null>(null);
  const [hasAccountsReceivable, setHasAccountsReceivable] = useState<"YES" | "NO" | "UNSURE" | null>(null);
  const [accountsReceivableAmount, setAccountsReceivableAmount] = useState<ConfidenceValue<Money> | null>(null);
  const [currentFundingConfirmation, setCurrentFundingConfirmation] = useState<BusinessFundedConfirmation | null>(null);

  const [streamInputs, setStreamInputs] = useState<NowStreamInput[]>([]);
  const [operatingCosts, setOperatingCostsState] = useState<OperatingCost[]>([]);
  const [opexListIsPartial, setOpexListIsPartial] = useState(false);
  const [ownerInputs, setOwnerInputs] = useState<NowOwnerInput[]>([]);
  const [distributionPolicy, setDistributionPolicy] = useState<ScenarioDistributionPolicy | null>(null);
  const [distributionPercents, setDistributionPercents] = useState<Record<string, Percent>>({});
  const [capitalItems, setCapitalItemsState] = useState<CapitalRequirementItem[]>([]);

  const value = useMemo<NowContextValue>(
    () => ({
      actualRevenue,
      setActualRevenue,
      revenuePeriod,
      setRevenuePeriod,
      cashCollected,
      setCashCollected,
      hasAccountsReceivable,
      setHasAccountsReceivable,
      accountsReceivableAmount,
      setAccountsReceivableAmount,
      currentFundingConfirmation,
      setCurrentFundingConfirmation,
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
      delegationItems: [],
    }),
    [
      actualRevenue,
      revenuePeriod,
      cashCollected,
      hasAccountsReceivable,
      accountsReceivableAmount,
      currentFundingConfirmation,
      streamInputs,
      operatingCosts,
      opexListIsPartial,
      ownerInputs,
      distributionPolicy,
      distributionPercents,
      capitalItems,
    ],
  );

  return <NowContext.Provider value={value}>{children}</NowContext.Provider>;
}

export function useNow(): NowContextValue {
  const ctx = useContext(NowContext);
  if (!ctx) throw new Error("useNow must be used within a NowProvider");
  return ctx;
}
