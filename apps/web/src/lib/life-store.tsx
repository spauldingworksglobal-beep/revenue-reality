"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  DeferredNeed,
  FundingSource,
  LifeCategory,
  OutsideFundingRetained,
  SecurityItem,
} from "@revenue-reality/domain";
import type { LifeCategoryChange } from "@revenue-reality/revenue-engine";
import { LIFE_CATEGORY_PRESETS, SECURITY_ITEM_PRESETS } from "./presets";
import { newId } from "./ids";

const SESSION_ID = "ephemeral-session";
const LIFE_PROFILE_ID = "ephemeral-life-profile";

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

  intendedSecurity: SecurityItem[];
  setIntendedSecurity: (updater: (prev: SecurityItem[]) => SecurityItem[]) => void;

  intendedLifeOutcomes: string[];
  setIntendedLifeOutcomes: (updater: (prev: string[]) => string[]) => void;

  intendedFundingSources: FundingSource[];
  setIntendedFundingSources: (updater: (prev: FundingSource[]) => FundingSource[]) => void;

  outsideFundingRetained: OutsideFundingRetained | null;
  setOutsideFundingRetained: (value: OutsideFundingRetained | null) => void;
}

const LifeRealityContext = createContext<LifeRealityContextValue | null>(null);

export function LifeRealityProvider({ children }: { children: ReactNode }) {
  const [currentCategories, setCurrentCategoriesState] = useState<LifeCategory[]>(seedCategories);
  const [currentSecurity, setCurrentSecurityState] = useState<SecurityItem[]>(seedSecurity);
  const [currentFundingSources, setCurrentFundingSourcesState] = useState<FundingSource[]>([]);
  const [deferredNeeds, setDeferredNeedsState] = useState<DeferredNeed[]>([]);
  const [lifeChanges, setLifeChangesState] = useState<LifeCategoryChange[]>([]);
  const [intendedSecurity, setIntendedSecurityState] = useState<SecurityItem[]>(seedSecurity);
  const [intendedLifeOutcomes, setIntendedLifeOutcomesState] = useState<string[]>([]);
  const [intendedFundingSources, setIntendedFundingSourcesState] = useState<FundingSource[]>([]);
  const [outsideFundingRetained, setOutsideFundingRetained] = useState<OutsideFundingRetained | null>(null);

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
      intendedSecurity,
      setIntendedSecurity: (updater) => setIntendedSecurityState(updater),
      intendedLifeOutcomes,
      setIntendedLifeOutcomes: (updater) => setIntendedLifeOutcomesState(updater),
      intendedFundingSources,
      setIntendedFundingSources: (updater) => setIntendedFundingSourcesState(updater),
      outsideFundingRetained,
      setOutsideFundingRetained,
    }),
    [
      currentCategories,
      currentSecurity,
      currentFundingSources,
      deferredNeeds,
      lifeChanges,
      intendedSecurity,
      intendedLifeOutcomes,
      intendedFundingSources,
      outsideFundingRetained,
    ],
  );

  return <LifeRealityContext.Provider value={value}>{children}</LifeRealityContext.Provider>;
}

export function useLifeReality(): LifeRealityContextValue {
  const ctx = useContext(LifeRealityContext);
  if (!ctx) throw new Error("useLifeReality must be used within a LifeRealityProvider");
  return ctx;
}
