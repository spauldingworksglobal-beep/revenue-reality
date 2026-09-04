import type { ConfidenceFlag, ConfidenceLevel } from "@revenue-reality/domain";

const SEVERITY: Record<ConfidenceLevel, number> = {
  INCOMPLETE: 0,
  ROUGH_ESTIMATE: 1,
  STRONG_ESTIMATE: 2,
  EXACT: 3,
};

/**
 * Never a blended numeric score (Build Spec §15). Filters out EXACT (nothing
 * to flag) and sorts worst-first so the UI can lead with what most needs
 * attention.
 */
export function assembleConfidenceFlags(flags: ConfidenceFlag[]): ConfidenceFlag[] {
  return flags
    .filter((f) => f.confidence !== "EXACT")
    .sort((a, b) => SEVERITY[a.confidence] - SEVERITY[b.confidence]);
}
