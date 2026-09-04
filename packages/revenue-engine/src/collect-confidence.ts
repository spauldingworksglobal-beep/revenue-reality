import type { ConfidenceFlag, ScenarioEngineInput } from "@revenue-reality/domain";

/** Walks the raw input for every ConfidenceValue-tagged field worth surfacing. */
export function collectInputConfidenceFlags(input: ScenarioEngineInput): ConfidenceFlag[] {
  const flags: ConfidenceFlag[] = [];

  flags.push({ field: "lifeAssumption.outsideFundingRetained", confidence: input.lifeAssumption.outsideFundingRetained.confidence });
  flags.push({ field: "timeAssumption.availableHoursWeek", confidence: input.timeAssumption.availableHoursWeek.confidence });
  flags.push({ field: "timeAssumption.businessHoursWeek", confidence: input.timeAssumption.businessHoursWeek.confidence });

  for (const stream of input.streams) {
    flags.push({ field: `stream.${stream.streamId}.price`, confidence: stream.priceOrAvgValue.confidence });
    if (stream.cogs.perUnit) {
      flags.push({ field: `stream.${stream.streamId}.cogs`, confidence: stream.cogs.perUnit.confidence });
    }
    for (const variableCost of stream.otherVariableCosts) {
      const confidence = variableCost.amountPerUnit?.confidence ?? variableCost.percentOfPrice?.confidence;
      if (confidence) flags.push({ field: `stream.${stream.streamId}.variableCost.${variableCost.label}`, confidence });
    }
  }

  for (const cost of input.operatingCosts) {
    flags.push({ field: `operatingCost.${cost.category}`, confidence: cost.confidence });
  }
  if (input.operatingCosts.some((c) => c.isPartialList)) {
    flags.push({ field: "operatingCosts", confidence: "INCOMPLETE" });
  }

  for (const item of input.capitalItems) {
    flags.push({ field: `capitalItem.${item.category}`, confidence: item.confidence });
  }

  for (const delegation of input.delegationItems) {
    flags.push({
      field: `delegation.${delegation.functionLabel}`,
      confidence: delegation.replacementCost?.confidence ?? "INCOMPLETE",
    });
  }

  for (const owner of input.ownerEconomics) {
    if (owner.cashReceived?.mode === "UNCLASSIFIED_TOTAL") {
      flags.push({
        field: `ownerEconomics.${owner.ownerId}.cashReceived`,
        confidence: owner.cashReceived.unclassifiedTotal?.confidence ?? "INCOMPLETE",
      });
    }
    if (owner.cashReceived?.mode === "CLASSIFIED") {
      if (owner.cashReceived.laborCompensation) {
        flags.push({ field: `ownerEconomics.${owner.ownerId}.laborCompensation`, confidence: owner.cashReceived.laborCompensation.confidence });
      }
      if (owner.cashReceived.profitDistribution) {
        flags.push({ field: `ownerEconomics.${owner.ownerId}.profitDistribution`, confidence: owner.cashReceived.profitDistribution.confidence });
      }
    }
    if (owner.targetLaborCompensation) {
      flags.push({ field: `ownerEconomics.${owner.ownerId}.targetLaborCompensation`, confidence: owner.targetLaborCompensation.confidence });
    }
  }

  return flags;
}
