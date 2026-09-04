import type {
  BusinessModelType,
  BusinessStage,
  ConfidenceValue,
  ID,
  ISODate,
  OwnershipIntent,
  Percent,
} from "./primitives";

export interface Business {
  id: ID;
  sessionId: ID;
  name: string;
  modelType: BusinessModelType;
  stage: BusinessStage;
  restructureDate: ISODate | null; // gates the "do not annualize" rule
  ownershipCount: number;
  fundingJob: "SUPPLEMENT" | "REPLACE" | "PRIMARY" | "BUILD_WEALTH" | "ASSET" | "OTHER";
  intendedOwnershipModel: OwnershipIntent;
}

export interface Owner {
  id: ID;
  businessId: ID;
  label: string;
  /**
   * Links the Life/Time respondent to exactly one Owner record. Exactly one
   * owner per business must have this set — validated by
   * validateExactlyOnePrimaryRespondent (@revenue-reality/validation).
   */
  isPrimaryRespondent: boolean;
  /**
   * Legal/economic ownership as captured in Business Profile — "when known,"
   * null when genuinely unknown/incomplete. This is a DIFFERENT concept from
   * OwnerEconomics.ownershipPercent (scenario-level, can differ by scenario —
   * e.g. ULTIMATELY modeling a new partner) and from
   * OwnerEconomics.distributionPercent (profit-distribution economics,
   * captured later under Ownership Economics). Setting this never infers a
   * distribution percentage — see owner-economics.test.ts.
   */
  ownershipPercent: ConfidenceValue<Percent> | null;
}

export interface RevenueStream {
  id: ID;
  businessId: ID;
  name: string;
  /** What the customer is buying/paying for, in plain language — distinct from the short `name` label. */
  description: string;
  /** Unit or transaction label — "when meaningful," so optional (e.g. a service retainer may have none). */
  unitLabel?: string;
  channel?: string;
  active: boolean;
}
