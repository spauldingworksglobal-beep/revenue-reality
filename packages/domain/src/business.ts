import type {
  BusinessModelType,
  BusinessStage,
  ID,
  ISODate,
  OwnershipIntent,
} from "./primitives.js";

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
  // Ownership percentage lives per-scenario on OwnerEconomics, not here —
  // ownership can shift between scenarios (e.g. ULTIMATELY brings on a partner).
}

export interface RevenueStream {
  id: ID;
  businessId: ID;
  name: string;
  unitLabel: string;
  channel?: string;
  active: boolean;
}
