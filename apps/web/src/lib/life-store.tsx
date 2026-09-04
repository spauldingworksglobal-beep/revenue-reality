"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  Business,
  BusinessModelType,
  BusinessStage,
  ConfidenceValue,
  DeferredNeed,
  FundingSource,
  ISODate,
  LifeCategory,
  Owner,
  OwnershipIntent,
  RevenueStream,
  SecurityItem,
} from "@revenue-reality/domain";
import type { BusinessFundedConfirmation, LifeCategoryChange, SecurityItemChange } from "@revenue-reality/revenue-engine";
import { LIFE_CATEGORY_PRESETS, SECURITY_ITEM_PRESETS } from "./presets";
import { newId } from "./ids";

const SESSION_ID = "ephemeral-session";
const LIFE_PROFILE_ID = "ephemeral-life-profile";
const BUSINESS_ID = "ephemeral-business";

function seedCategories(): LifeCategory[] {
  return LIFE_CATEGORY_PRESETS.map(({ kind, label }) => ({
    id: newId(),
    lifeProfileId: LIFE_PROFILE_ID,
    kind,
    label,
    currentAmount: null,
    intendedAmount: null,
    cadence: "MONTHLY" as const,
    changeType: "KEEP" as const,
  }));
}

function seedSecurity(): SecurityItem[] {
  return SECURITY_ITEM_PRESETS.map(({ kind, label }) => ({
    id: newId(),
    lifeProfileId: LIFE_PROFILE_ID,
    kind,
    label,
    currentAmount: null,
    intendedAmount: null,
    cadence: "MONTHLY" as const,
  }));
}

/** Unset hours default to INCOMPLETE confidence, not a claimed "0" — the owner hasn't answered yet. */
function unsetHours(): ConfidenceValue<number> {
  return { value: 0, confidence: "INCOMPLETE" };
}

/** Every business starts with exactly one owner: the respondent themself. */
function seedOwners(): Owner[] {
  return [{ id: newId(), businessId: BUSINESS_ID, label: "", isPrimaryRespondent: true, ownershipPercent: null }];
}

interface LifeRealityContextValue {
  sessionId: string;
  lifeProfileId: string;

  currentCategories: LifeCategory[];
  setCurrentCategories: (updater: (prev: LifeCategory[]) => LifeCategory[]) => void;

  currentSecurity: SecurityItem[];
  setCurrentSecurity: (updater: (prev: SecurityItem[]) => SecurityItem[]) => void;

  currentFundingSources: FundingSource[];
  setCurrentFundingSources: (updater: (prev: FundingSource[]) => FundingSource[]) => void;

  deferredNeeds: DeferredNeed[];
  setDeferredNeeds: (updater: (prev: DeferredNeed[]) => DeferredNeed[]) => void;

  lifeChanges: LifeCategoryChange[];
  setLifeChanges: (updater: (prev: LifeCategoryChange[]) => LifeCategoryChange[]) => void;

  /** Intended Security is DERIVED from currentSecurity + these changes (buildIntendedSecurityItems) — never stored as its own blank-seeded list. */
  securityChanges: SecurityItemChange[];
  setSecurityChanges: (updater: (prev: SecurityItemChange[]) => SecurityItemChange[]) => void;

  intendedLifeOutcomes: string[];
  setIntendedLifeOutcomes: (updater: (prev: string[]) => string[]) => void;

  intendedFundingSources: FundingSource[];
  setIntendedFundingSources: (updater: (prev: FundingSource[]) => FundingSource[]) => void;

  /** Owner-facing: what the business is confirmed to fund. The engine derives outsideFundingRetained from this — never the other way around. */
  businessFundedConfirmation: BusinessFundedConfirmation | null;
  setBusinessFundedConfirmation: (value: BusinessFundedConfirmation | null) => void;

  // ---- Time Reality ----
  currentAvailableHoursWeek: ConfidenceValue<number>;
  setCurrentAvailableHoursWeek: (value: ConfidenceValue<number>) => void;

  currentBusinessHoursWeek: ConfidenceValue<number>;
  setCurrentBusinessHoursWeek: (value: ConfidenceValue<number>) => void;

  intendedAvailableHoursWeek: ConfidenceValue<number>;
  setIntendedAvailableHoursWeek: (value: ConfidenceValue<number>) => void;

  ultimateBusinessHoursWeek: ConfidenceValue<number>;
  setUltimateBusinessHoursWeek: (value: ConfidenceValue<number>) => void;

  /** Context only — never used to derive availableHoursWeek. */
  otherTimeClaims: { label: string; hoursWeek?: number }[];
  setOtherTimeClaims: (updater: (prev: { label: string; hoursWeek?: number }[]) => { label: string; hoursWeek?: number }[]) => void;

  desiredWorkTypes: string[];
  setDesiredWorkTypes: (updater: (prev: string[]) => string[]) => void;

  /** Qualitative only — no cost modeling at this milestone. */
  workToEventuallyDelegate: string[];
  setWorkToEventuallyDelegate: (updater: (prev: string[]) => string[]) => void;

  lifePriorityReservations: string[];
  setLifePriorityReservations: (updater: (prev: string[]) => string[]) => void;

  // ---- Business Profile ----
  businessId: string;

  businessName: string;
  setBusinessName: (value: string) => void;

  owners: Owner[];
  setOwners: (updater: (prev: Owner[]) => Owner[]) => void;

  revenueStreams: RevenueStream[];
  setRevenueStreams: (updater: (prev: RevenueStream[]) => RevenueStream[]) => void;

  businessModelType: BusinessModelType | null;
  setBusinessModelType: (value: BusinessModelType | null) => void;

  businessStage: BusinessStage | null;
  setBusinessStage: (value: BusinessStage | null) => void;

  restructureDate: ISODate | null;
  setRestructureDate: (value: ISODate | null) => void;

  fundingJob: Business["fundingJob"] | null;
  setFundingJob: (value: Business["fundingJob"] | null) => void;

  intendedOwnershipModel: OwnershipIntent | null;
  setIntendedOwnershipModel: (value: OwnershipIntent | null) => void;
}

const LifeRealityContext = createContext<LifeRealityContextValue | null>(null);

export function LifeRealityProvider({ children }: { children: ReactNode }) {
  const [currentCategories, setCurrentCategoriesState] = useState<LifeCategory[]>(seedCategories);
  const [currentSecurity, setCurrentSecurityState] = useState<SecurityItem[]>(seedSecurity);
  const [currentFundingSources, setCurrentFundingSourcesState] = useState<FundingSource[]>([]);
  const [deferredNeeds, setDeferredNeedsState] = useState<DeferredNeed[]>([]);
  const [lifeChanges, setLifeChangesState] = useState<LifeCategoryChange[]>([]);
  const [securityChanges, setSecurityChangesState] = useState<SecurityItemChange[]>([]);
  const [intendedLifeOutcomes, setIntendedLifeOutcomesState] = useState<string[]>([]);
  const [intendedFundingSources, setIntendedFundingSourcesState] = useState<FundingSource[]>([]);
  const [businessFundedConfirmation, setBusinessFundedConfirmation] = useState<BusinessFundedConfirmation | null>(null);

  const [currentAvailableHoursWeek, setCurrentAvailableHoursWeek] = useState<ConfidenceValue<number>>(unsetHours);
  const [currentBusinessHoursWeek, setCurrentBusinessHoursWeek] = useState<ConfidenceValue<number>>(unsetHours);
  const [intendedAvailableHoursWeek, setIntendedAvailableHoursWeek] = useState<ConfidenceValue<number>>(unsetHours);
  const [ultimateBusinessHoursWeek, setUltimateBusinessHoursWeek] = useState<ConfidenceValue<number>>(unsetHours);
  const [otherTimeClaims, setOtherTimeClaimsState] = useState<{ label: string; hoursWeek?: number }[]>([]);
  const [desiredWorkTypes, setDesiredWorkTypesState] = useState<string[]>([]);
  const [workToEventuallyDelegate, setWorkToEventuallyDelegateState] = useState<string[]>([]);
  const [lifePriorityReservations, setLifePriorityReservationsState] = useState<string[]>([]);

  const [businessName, setBusinessName] = useState("");
  const [owners, setOwnersState] = useState<Owner[]>(seedOwners);
  const [revenueStreams, setRevenueStreamsState] = useState<RevenueStream[]>([]);
  const [businessModelType, setBusinessModelType] = useState<BusinessModelType | null>(null);
  const [businessStage, setBusinessStage] = useState<BusinessStage | null>(null);
  const [restructureDate, setRestructureDate] = useState<ISODate | null>(null);
  const [fundingJob, setFundingJob] = useState<Business["fundingJob"] | null>(null);
  const [intendedOwnershipModel, setIntendedOwnershipModel] = useState<OwnershipIntent | null>(null);

  const value = useMemo<LifeRealityContextValue>(
    () => ({
      sessionId: SESSION_ID,
      lifeProfileId: LIFE_PROFILE_ID,
      currentCategories,
      setCurrentCategories: (updater) => setCurrentCategoriesState(updater),
      currentSecurity,
      setCurrentSecurity: (updater) => setCurrentSecurityState(updater),
      currentFundingSources,
      setCurrentFundingSources: (updater) => setCurrentFundingSourcesState(updater),
      deferredNeeds,
      setDeferredNeeds: (updater) => setDeferredNeedsState(updater),
      lifeChanges,
      setLifeChanges: (updater) => setLifeChangesState(updater),
      securityChanges,
      setSecurityChanges: (updater) => setSecurityChangesState(updater),
      intendedLifeOutcomes,
      setIntendedLifeOutcomes: (updater) => setIntendedLifeOutcomesState(updater),
      intendedFundingSources,
      setIntendedFundingSources: (updater) => setIntendedFundingSourcesState(updater),
      businessFundedConfirmation,
      setBusinessFundedConfirmation,
      currentAvailableHoursWeek,
      setCurrentAvailableHoursWeek,
      currentBusinessHoursWeek,
      setCurrentBusinessHoursWeek,
      intendedAvailableHoursWeek,
      setIntendedAvailableHoursWeek,
      ultimateBusinessHoursWeek,
      setUltimateBusinessHoursWeek,
      otherTimeClaims,
      setOtherTimeClaims: (updater) => setOtherTimeClaimsState(updater),
      desiredWorkTypes,
      setDesiredWorkTypes: (updater) => setDesiredWorkTypesState(updater),
      workToEventuallyDelegate,
      setWorkToEventuallyDelegate: (updater) => setWorkToEventuallyDelegateState(updater),
      lifePriorityReservations,
      setLifePriorityReservations: (updater) => setLifePriorityReservationsState(updater),
      businessId: BUSINESS_ID,
      businessName,
      setBusinessName,
      owners,
      setOwners: (updater) => setOwnersState(updater),
      revenueStreams,
      setRevenueStreams: (updater) => setRevenueStreamsState(updater),
      businessModelType,
      setBusinessModelType,
      businessStage,
      setBusinessStage,
      restructureDate,
      setRestructureDate,
      fundingJob,
      setFundingJob,
      intendedOwnershipModel,
      setIntendedOwnershipModel,
    }),
    [
      currentCategories,
      currentSecurity,
      currentFundingSources,
      deferredNeeds,
      lifeChanges,
      securityChanges,
      intendedLifeOutcomes,
      intendedFundingSources,
      businessFundedConfirmation,
      currentAvailableHoursWeek,
      currentBusinessHoursWeek,
      intendedAvailableHoursWeek,
      ultimateBusinessHoursWeek,
      otherTimeClaims,
      desiredWorkTypes,
      workToEventuallyDelegate,
      lifePriorityReservations,
      businessName,
      owners,
      revenueStreams,
      businessModelType,
      businessStage,
      restructureDate,
      fundingJob,
      intendedOwnershipModel,
    ],
  );

  return <LifeRealityContext.Provider value={value}>{children}</LifeRealityContext.Provider>;
}

export function useLifeReality(): LifeRealityContextValue {
  const ctx = useContext(LifeRealityContext);
  if (!ctx) throw new Error("useLifeReality must be used within a LifeRealityProvider");
  return ctx;
}
