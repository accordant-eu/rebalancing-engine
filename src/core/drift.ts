import { DriftMeasurement, TargetAllocation, RebalancingPolicy } from '../models/domain';
import { CALCULATION_EPSILON, formatFixed, toDecimal } from './numeric';
import { WeightResult } from './valuation';

/**
 * Validates that the target allocation sum is approximately 1.0 (100%).
 * Uses a small epsilon to account for minor floating point imprecision.
 */
export function validateTargetAllocation(target: TargetAllocation): void {
  const assetSum = target.targets.reduce((acc, t) => acc.plus(t.weight), toDecimal(0));
  const totalSum = assetSum.plus(target.cashBuffer || 0);
  if (totalSum.minus(1.0).abs().gt(0.0001)) {
    throw new Error(
      `Target allocation (assets + cash buffer) does not sum to 100%. Total: ${formatFixed(totalSum.mul(100).toNumber(), 2)}%`,
    );
  }
}

/**
 * Compares current weights to the target allocation to calculate drift.
 */
export function calculateDrift(
  currentWeights: WeightResult[],
  target: TargetAllocation,
  policy: RebalancingPolicy,
  temporaryEquivalencyMapping?: Map<string, string>
): DriftMeasurement[] {
  // Map targets for quick lookup
  const targetMap = new Map<string, number>();
  for (const t of target.targets) {
    targetMap.set(t.instrumentId, t.weight);
  }

  const measurements: DriftMeasurement[] = [];
  const processedInstruments = new Set<string>();

  // If there's an equivalency mapping, we aggregate the current weights of substitutes 
  // into their primary targets to prevent artificial drift during TLH.
  const effectiveCurrentWeights = new Map<string, number>();
  for (const cw of currentWeights) {
    const primaryId = temporaryEquivalencyMapping?.get(cw.instrumentId) || cw.instrumentId;
    const existing = effectiveCurrentWeights.get(primaryId) || 0;
    effectiveCurrentWeights.set(primaryId, existing + cw.weight);
  }

  // Calculate drift for all effectively held assets
  for (const [instrumentId, aggregatedWeight] of effectiveCurrentWeights.entries()) {
    processedInstruments.add(instrumentId);

    const targetWeight = targetMap.get(instrumentId) || 0;
    const absoluteDrift = toDecimal(aggregatedWeight).minus(targetWeight).toNumber();
    let relativeDrift = 0;
    if (targetWeight > 0) {
      relativeDrift = toDecimal(absoluteDrift).div(targetWeight).toNumber();
    } else if (aggregatedWeight > 0) {
      relativeDrift = 1;
    }

    const isAbsoluteBreach = toDecimal(absoluteDrift)
      .abs()
      .minus(policy.absoluteDriftTolerance)
      .gt(CALCULATION_EPSILON);
    const isRelativeBreach =
      policy.relativeDriftTolerance !== undefined &&
      toDecimal(relativeDrift).abs().minus(policy.relativeDriftTolerance).gt(CALCULATION_EPSILON);

    measurements.push({
      instrumentId,
      currentWeight: aggregatedWeight,
      targetWeight,
      absoluteDrift,
      relativeDrift,
      isOutOfBand: isAbsoluteBreach || isRelativeBreach,
    });
  }

  // Add drift for targets not currently held (weight = 0)
  for (const t of target.targets) {
    if (!processedInstruments.has(t.instrumentId)) {
      const currentWeight = 0;
      const targetWeight = t.weight;
      const absoluteDrift = currentWeight - targetWeight;
      const relativeDrift = -1; // -100% since we hold 0

      const isAbsoluteBreach = toDecimal(absoluteDrift)
        .abs()
        .minus(policy.absoluteDriftTolerance)
        .gt(CALCULATION_EPSILON);
      const isRelativeBreach =
        policy.relativeDriftTolerance !== undefined &&
        toDecimal(relativeDrift).abs().minus(policy.relativeDriftTolerance).gt(CALCULATION_EPSILON);

      measurements.push({
        instrumentId: t.instrumentId,
        currentWeight,
        targetWeight,
        absoluteDrift,
        relativeDrift,
        isOutOfBand: isAbsoluteBreach || isRelativeBreach,
      });
    }
  }

  // Sort deterministically by instrumentId
  measurements.sort((a, b) => a.instrumentId.localeCompare(b.instrumentId));

  return measurements;
}
