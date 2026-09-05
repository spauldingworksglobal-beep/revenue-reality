import type { CogsInput, ConfidenceValue, ID, Money, Percent, ScenarioRevenueStream, VariableCostItem } from "@revenue-reality/domain";
import { validateMixWeightsSum100 } from "@revenue-reality/validation";
import { formatMoney, formatPercent } from "./money";
import { computeEqualMixWeights, resolveStreamEconomics } from "./stream-economics";

/**
 * Shared by NOW and NEXT (and, later, ULTIMATELY) scenario assembly — the
 * same per-stream intake shape and the same rules for resolving it into a
 * ScenarioRevenueStream: a stream needs both a price and a Cost of Delivery
 * to be usable, and an unresolved sales mix across multiple streams falls
 * back to an equal-weight modeling ASSUMPTION rather than blocking, flagged
 * for the caller to surface (never silently written back as fact).
 */
export interface ScenarioStreamAssemblyInput {
  streamId: ID;
  price: ConfidenceValue<Money> | null;
  volume: ConfidenceValue<number> | null;
  mixWeightOverride: Percent | null;
  cogs: CogsInput | null;
  otherVariableCosts: VariableCostItem[];
}

export interface ScenarioStreamAssemblyResult {
  streams: ScenarioRevenueStream[];
  mixWeightFallbackApplied: boolean;
  /** Candidate stream ids excluded because price and/or Cost of Delivery haven't been entered yet. */
  excludedStreamIds: ID[];
}

function buildScenarioRevenueStream(
  scenarioId: ID,
  input: ScenarioStreamAssemblyInput,
  mixWeight: Percent,
): ScenarioRevenueStream | null {
  if (input.price === null || input.cogs === null) return null;
  try {
    const resolved = resolveStreamEconomics({
      scenarioId,
      streamId: input.streamId,
      priceOrAvgValue: input.price,
      volume: input.volume,
      mixWeight,
      cogs: input.cogs,
      cogsPerUnit: "0.00",
      otherVariableCosts: input.otherVariableCosts,
      otherVariableCostPerUnit: "0.00",
      grossProfitPerUnit: "0.00",
      grossMargin: "0",
      contributionPerUnit: "0.00",
      contributionMargin: "0",
    });
    return {
      scenarioId,
      streamId: input.streamId,
      priceOrAvgValue: input.price,
      volume: input.volume,
      mixWeight,
      cogs: input.cogs,
      cogsPerUnit: formatMoney(resolved.cogsPerUnit),
      otherVariableCosts: input.otherVariableCosts,
      otherVariableCostPerUnit: formatMoney(resolved.otherVariableCostPerUnit),
      grossProfitPerUnit: formatMoney(resolved.grossProfitPerUnit),
      grossMargin: formatPercent(resolved.grossMargin),
      contributionPerUnit: formatMoney(resolved.contributionPerUnit),
      contributionMargin: formatPercent(resolved.contributionMargin),
    };
  } catch {
    return null;
  }
}

/**
 * Resolves candidate stream inputs (by id) into the ScenarioRevenueStream[]
 * a scenario engine input needs. `candidateStreamIds` should be every
 * Business-Profile stream the scenario might use — a stream becomes usable
 * simply by having both a price and a Cost of Delivery entered for this
 * scenario, independent of any other scenario's own activation state.
 */
export function resolveScenarioStreams(
  scenarioId: ID,
  candidateStreamIds: ID[],
  streamInputsById: Map<ID, ScenarioStreamAssemblyInput>,
): ScenarioStreamAssemblyResult {
  const usableInputs = candidateStreamIds
    .map((id) => streamInputsById.get(id))
    .filter((s): s is ScenarioStreamAssemblyInput => s !== undefined && s.price !== null && s.cogs !== null);
  const excludedStreamIds = candidateStreamIds.filter((id) => !usableInputs.some((s) => s.streamId === id));

  if (usableInputs.length === 0) return { streams: [], mixWeightFallbackApplied: false, excludedStreamIds };

  let mixWeights: Percent[];
  let mixWeightFallbackApplied = false;
  if (usableInputs.length === 1) {
    mixWeights = ["1"];
  } else if (usableInputs.every((s) => s.mixWeightOverride !== null)) {
    const candidateWeights = usableInputs.map((s) => s.mixWeightOverride!);
    try {
      validateMixWeightsSum100(usableInputs.map((s, i) => ({ mixWeight: candidateWeights[i]! }) as ScenarioRevenueStream));
      mixWeights = candidateWeights;
    } catch {
      mixWeights = computeEqualMixWeights(usableInputs.length);
      mixWeightFallbackApplied = true;
    }
  } else {
    mixWeights = computeEqualMixWeights(usableInputs.length);
    mixWeightFallbackApplied = true;
  }

  const streams: ScenarioRevenueStream[] = [];
  usableInputs.forEach((streamInput, i) => {
    const built = buildScenarioRevenueStream(scenarioId, streamInput, mixWeights[i]!);
    if (built) streams.push(built);
  });

  return { streams, mixWeightFallbackApplied, excludedStreamIds };
}
