import type { ID } from "@revenue-reality/domain";
import type { StreamEconomics } from "./stream-economics";
import { type Dec, divide, multiply } from "./money";

export interface StreamVolume {
  streamId: ID;
  volume: number; // operational whole-unit round-up
}

/**
 * Allocates a revenue figure across streams via the defined sales mix, then
 * derives each stream's own unit count — the mixed-stream break-even /
 * required-volume fix. Never a flat average across dissimilar streams.
 */
export function allocateRevenueToStreamUnits(revenue: Dec, streams: StreamEconomics[]): StreamVolume[] {
  return streams.map((stream) => {
    const streamRevenue = multiply(revenue, stream.mixWeight);
    const units = divide(streamRevenue, stream.price);
    return { streamId: stream.streamId, volume: units.ceil().toNumber() };
  });
}

export function computeRequiredVolume(requiredRevenue: Dec, streams: StreamEconomics[]): StreamVolume[] {
  return allocateRevenueToStreamUnits(requiredRevenue, streams);
}

export interface BreakEvenFloor {
  revenue: Dec;
  volumeByStream: StreamVolume[];
}

/** known_opex ÷ weighted_contribution_margin — a floor, not the model's real requirement. */
export function computeBreakEvenFloor(
  knownOperatingCostMonthly: Dec,
  weightedContributionMargin: Dec,
  streams: StreamEconomics[],
): BreakEvenFloor {
  const revenue = divide(knownOperatingCostMonthly, weightedContributionMargin);
  return { revenue, volumeByStream: allocateRevenueToStreamUnits(revenue, streams) };
}
