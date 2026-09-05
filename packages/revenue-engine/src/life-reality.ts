import type {
  ConfidenceValue,
  DeferredNeed,
  ID,
  LifeCategory,
  LifeCategoryKind,
  Money,
  SecurityItem,
  SecurityItemKind,
} from "@revenue-reality/domain";
import { normalizeCadence } from "./cadence";
import { type Dec, ZERO, add, formatMoney, parseMoney } from "./money";

type Horizon = "CURRENT" | "NEXT" | "INTENDED";

function amountForHorizon(entry: { currentAmount: ConfidenceValue<Money> | null; nextAmount: ConfidenceValue<Money> | null; intendedAmount: ConfidenceValue<Money> | null }, horizon: Horizon): ConfidenceValue<Money> | null {
  if (horizon === "CURRENT") return entry.currentAmount;
  if (horizon === "NEXT") return entry.nextAmount;
  return entry.intendedAmount;
}

export interface LifeRequirementResult {
  monthly: Dec;
  /** True when any category is missing an amount for this horizon — the sum is a floor, not a complete total. */
  isPartial: boolean;
  missing: { kind: LifeCategoryKind; label: string }[];
}

/**
 * Sums entered category amounts for one horizon, normalized to monthly.
 * A category with no amount contributes nothing to the sum (there is no
 * other numeric contribution it could make) but is surfaced in `missing` —
 * the sum is reported as a floor, never silently presented as complete.
 */
export function computeLifeRequirement(categories: LifeCategory[], horizon: Horizon): LifeRequirementResult {
  const amounts: Dec[] = [];
  const missing: { kind: LifeCategoryKind; label: string }[] = [];

  for (const category of categories) {
    const entry = amountForHorizon(category, horizon);
    if (entry === null) {
      missing.push({ kind: category.kind, label: category.label });
      continue;
    }
    const { monthly } = normalizeCadence(parseMoney(entry.value), category.cadence);
    amounts.push(monthly);
  }

  return { monthly: add(...amounts), isPartial: missing.length > 0, missing };
}

export interface SecurityRequirementResult {
  monthly: Dec;
  isPartial: boolean;
  missing: { kind: SecurityItemKind; label: string }[];
}

export function computeSecurityRequirement(items: SecurityItem[], horizon: Horizon): SecurityRequirementResult {
  const amounts: Dec[] = [];
  const missing: { kind: SecurityItemKind; label: string }[] = [];

  for (const item of items) {
    const entry = amountForHorizon(item, horizon);
    if (entry === null) {
      missing.push({ kind: item.kind, label: item.label });
      continue;
    }
    const { monthly } = normalizeCadence(parseMoney(entry.value), item.cadence);
    amounts.push(monthly);
  }

  return { monthly: add(...amounts), isPartial: missing.length > 0, missing };
}

export function computeTotalPersonalEconomicRequirement(lifeRequirementMonthly: Dec, securityRequirementMonthly: Dec): Dec {
  return add(lifeRequirementMonthly, securityRequirementMonthly);
}

export interface DeferredNeedsResult {
  /** Only needs the owner explicitly chose to include — an active decision, never an implied default. */
  includedMonthly: Dec;
  included: { description: string; amount: Money | null }[];
  /** Explicitly excluded by the owner — still returned, never dropped from the record. */
  excluded: { description: string; amount: Money | null }[];
}

export function resolveDeferredNeedsContribution(needs: DeferredNeed[]): DeferredNeedsResult {
  const amounts: Dec[] = [];
  const included: { description: string; amount: Money | null }[] = [];
  const excluded: { description: string; amount: Money | null }[] = [];

  for (const need of needs) {
    const amount = need.estimatedAmount?.value ?? null;
    if (!need.includeInIntended) {
      excluded.push({ description: need.description, amount });
      continue;
    }
    included.push({ description: need.description, amount });
    if (need.estimatedAmount) {
      amounts.push(parseMoney(need.estimatedAmount.value));
    }
    // included with no estimate yet: contributes $0 to the sum but stays
    // visible in `included` — a known gap, not a silently completed total.
  }

  return { includedMonthly: add(...amounts), included, excluded };
}

// ---- building the intended life from the current one ----

export type LifeCategoryChange =
  | { currentCategoryId: ID; changeType: "KEEP" }
  | { currentCategoryId: ID; changeType: "REDUCE" | "INCREASE"; newAmount: ConfidenceValue<Money> }
  | { currentCategoryId: ID; changeType: "REMOVE" }
  | {
      changeType: "ADD";
      id: ID;
      kind: LifeCategoryKind;
      label: string;
      newAmount: ConfidenceValue<Money>;
      cadence: LifeCategory["cadence"];
    };

/**
 * Life 5 (Build Spec §04): "Pre-populate current categories. For each:
 * Keep / Reduce / Increase / Remove; Add new categories." The owner never
 * rebuilds their life from scratch — every current category not explicitly
 * addressed is carried over as an implicit KEEP. REMOVE is recorded as an
 * explicit, confident $0 (a real decision), never simply dropped from the list.
 */
export function buildIntendedLifeCategories(
  lifeProfileId: ID,
  current: LifeCategory[],
  changes: LifeCategoryChange[],
): LifeCategory[] {
  const referencedIds = new Set(
    changes.filter((c): c is Extract<LifeCategoryChange, { currentCategoryId: ID }> => c.changeType !== "ADD").map((c) => c.currentCategoryId),
  );
  const bySourceId = new Map(current.map((c) => [c.id, c]));
  const result: LifeCategory[] = [];

  for (const change of changes) {
    if (change.changeType === "ADD") {
      result.push({
        id: change.id,
        lifeProfileId,
        kind: change.kind,
        label: change.label,
        currentAmount: null,
        nextAmount: null,
        intendedAmount: change.newAmount,
        cadence: change.cadence,
        changeType: "ADD",
      });
      continue;
    }

    const source = bySourceId.get(change.currentCategoryId);
    if (!source) {
      throw new RangeError(`buildIntendedLifeCategories: no current category with id "${change.currentCategoryId}"`);
    }

    if (change.changeType === "KEEP") {
      result.push({ ...source, intendedAmount: source.currentAmount, changeType: "KEEP" });
    } else if (change.changeType === "REMOVE") {
      result.push({ ...source, intendedAmount: { value: "0.00", confidence: "EXACT" }, changeType: "REMOVE" });
    } else {
      result.push({ ...source, intendedAmount: change.newAmount, changeType: change.changeType });
    }
  }

  for (const source of current) {
    if (!referencedIds.has(source.id)) {
      result.push({ ...source, intendedAmount: source.currentAmount, changeType: "KEEP" });
    }
  }

  return result;
}

// ---- building intended security from current security ----

export type SecurityItemChange =
  | { currentSecurityId: ID; changeType: "KEEP" }
  | { currentSecurityId: ID; changeType: "REDUCE" | "INCREASE"; newAmount: ConfidenceValue<Money> }
  | { currentSecurityId: ID; changeType: "REMOVE" }
  | {
      changeType: "ADD";
      id: ID;
      kind: SecurityItemKind;
      label: string;
      newAmount: ConfidenceValue<Money>;
      cadence: SecurityItem["cadence"];
    };

/**
 * Intended Security must not begin as a blank reconstruction of Current
 * Security — every current item not explicitly addressed carries over as
 * an implicit KEEP, exactly like buildIntendedLifeCategories. `SecurityItem`
 * has no `changeType` field (unlike LifeCategory), so this works entirely
 * within the existing currentAmount/intendedAmount shape rather than adding
 * one — the change decision is transient input, not persisted taxonomy.
 *
 * An implicit or explicit KEEP carries `currentAmount` straight into
 * `intendedAmount` even when it's null — an incomplete current value stays
 * incomplete (still null) unless the owner's change supplies a real
 * `newAmount`. Nothing here converts "unknown" into "$0".
 */
export function buildIntendedSecurityItems(
  lifeProfileId: ID,
  current: SecurityItem[],
  changes: SecurityItemChange[],
): SecurityItem[] {
  const referencedIds = new Set(
    changes
      .filter((c): c is Extract<SecurityItemChange, { currentSecurityId: ID }> => c.changeType !== "ADD")
      .map((c) => c.currentSecurityId),
  );
  const bySourceId = new Map(current.map((c) => [c.id, c]));
  const result: SecurityItem[] = [];

  for (const change of changes) {
    if (change.changeType === "ADD") {
      result.push({
        id: change.id,
        lifeProfileId,
        kind: change.kind,
        label: change.label,
        currentAmount: null,
        nextAmount: null,
        intendedAmount: change.newAmount,
        cadence: change.cadence,
      });
      continue;
    }

    const source = bySourceId.get(change.currentSecurityId);
    if (!source) {
      throw new RangeError(`buildIntendedSecurityItems: no current security item with id "${change.currentSecurityId}"`);
    }

    if (change.changeType === "KEEP") {
      result.push({ ...source, intendedAmount: source.currentAmount });
    } else if (change.changeType === "REMOVE") {
      result.push({ ...source, intendedAmount: { value: "0.00", confidence: "EXACT" } });
    } else {
      result.push({ ...source, intendedAmount: change.newAmount });
    }
  }

  for (const source of current) {
    if (!referencedIds.has(source.id)) {
      result.push({ ...source, intendedAmount: source.currentAmount });
    }
  }

  return result;
}

// ---- building NEXT's intermediate life from Current + Intended ----

/**
 * NEXT does not get its own full Life Reality questionnaire (Build Spec
 * Milestone 6 §2). For each category the owner picks a point between what
 * they have now and what they're building toward — CURRENT as-is, INTENDED
 * as-is, or a CUSTOM intermediate amount — never an automatic interpolation.
 */
export type NextLifeCategorySelection =
  | { categoryId: ID; choice: "CURRENT" }
  | { categoryId: ID; choice: "INTENDED" }
  | { categoryId: ID; choice: "CUSTOM"; amount: ConfidenceValue<Money> };

/**
 * Resolves NEXT amounts from Current + Intended life categories, keyed by
 * category id (Intended is a superset of Current's ids plus any ADDed
 * categories — see buildIntendedLifeCategories). A category the owner
 * hasn't addressed in NEXT defaults to CURRENT — the same "carry forward
 * unless changed" rule already used for Current → Intended, never a blank
 * slate and never an automatic move toward Intended.
 */
export function resolveNextLifeCategories(
  current: LifeCategory[],
  intended: LifeCategory[],
  selections: NextLifeCategorySelection[],
): LifeCategory[] {
  const currentById = new Map(current.map((c) => [c.id, c]));
  const selectionById = new Map(selections.map((s) => [s.categoryId, s]));

  return intended.map((intendedCategory) => {
    const selection = selectionById.get(intendedCategory.id);
    const currentCategory = currentById.get(intendedCategory.id);
    let nextAmount: ConfidenceValue<Money> | null;
    if (!selection || selection.choice === "CURRENT") {
      nextAmount = currentCategory?.currentAmount ?? null;
    } else if (selection.choice === "INTENDED") {
      nextAmount = intendedCategory.intendedAmount;
    } else {
      nextAmount = selection.amount;
    }
    return { ...intendedCategory, nextAmount };
  });
}

/** Mirrors NextLifeCategorySelection for security items. */
export type NextSecurityItemSelection =
  | { itemId: ID; choice: "CURRENT" }
  | { itemId: ID; choice: "INTENDED" }
  | { itemId: ID; choice: "CUSTOM"; amount: ConfidenceValue<Money> };

/** Mirrors resolveNextLifeCategories for security items. */
export function resolveNextSecurityItems(
  current: SecurityItem[],
  intended: SecurityItem[],
  selections: NextSecurityItemSelection[],
): SecurityItem[] {
  const currentById = new Map(current.map((c) => [c.id, c]));
  const selectionById = new Map(selections.map((s) => [s.itemId, s]));

  return intended.map((intendedItem) => {
    const selection = selectionById.get(intendedItem.id);
    const currentItem = currentById.get(intendedItem.id);
    let nextAmount: ConfidenceValue<Money> | null;
    if (!selection || selection.choice === "CURRENT") {
      nextAmount = currentItem?.currentAmount ?? null;
    } else if (selection.choice === "INTENDED") {
      nextAmount = intendedItem.intendedAmount;
    } else {
      nextAmount = selection.amount;
    }
    return { ...intendedItem, nextAmount };
  });
}

// ---- current vs. intended comparison ----

export interface LifeHorizonSummary {
  livingRequirement: Money;
  securityRequirement: Money;
  totalPersonalEconomicRequirement: Money;
  isPartial: boolean;
}

export interface LifeComparisonResult {
  current: LifeHorizonSummary;
  intended: LifeHorizonSummary;
  deferredNeeds: DeferredNeedsResult;
}

function summarizeHorizon(
  categories: LifeCategory[],
  securityItems: SecurityItem[],
  horizon: Horizon,
  extraMonthly: Dec,
): LifeHorizonSummary {
  const life = computeLifeRequirement(categories, horizon);
  const security = computeSecurityRequirement(securityItems, horizon);
  const living = add(life.monthly, horizon === "INTENDED" ? extraMonthly : ZERO);
  const total = computeTotalPersonalEconomicRequirement(living, security.monthly);
  return {
    livingRequirement: formatMoney(living),
    securityRequirement: formatMoney(security.monthly),
    totalPersonalEconomicRequirement: formatMoney(total),
    isPartial: life.isPartial || security.isPartial,
  };
}

/** Current → Intended, before any business question is asked. */
export function compareLifeRequirements(input: {
  currentCategories: LifeCategory[];
  intendedCategories: LifeCategory[];
  currentSecurity: SecurityItem[];
  intendedSecurity: SecurityItem[];
  deferredNeeds: DeferredNeed[];
}): LifeComparisonResult {
  const deferred = resolveDeferredNeedsContribution(input.deferredNeeds);

  return {
    current: summarizeHorizon(input.currentCategories, input.currentSecurity, "CURRENT", parseMoney("0.00")),
    intended: summarizeHorizon(input.intendedCategories, input.intendedSecurity, "INTENDED", deferred.includedMonthly),
    deferredNeeds: deferred,
  };
}
