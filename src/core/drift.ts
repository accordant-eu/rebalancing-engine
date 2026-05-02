import { DriftMeasurement, TargetAllocation, RebalancingPolicy } from '../models/domain';
import { CALCULATION_EPSILON, formatFixed, toDecimal } from './numeric';
import { WeightResult } from './valuation';

/**
 * Validates that the target allocation sum is approximately 1.0 (100%).
 * Uses a small epsilon to account for minor floating point imprecision.
 */
export function validateTargetAllocation(target: TargetAllocation): void {
  const sum = target.targets.reduce((acc, t) => acc.plus(t.weight), toDecimal(0));
  if (sum.minus(1.0).abs().gt(0.0001)) {
    throw new Error(
      `Target allocation does not sum to 100%. Total: ${formatFixed(sum.mul(100).toNumber(), 2)}%`,
    );
  }
}

/**
 * Compares current weights to the target allocation to calculate drift.
 * Detects assets in the current portfolio that are not in the target allocation (out of universe).
 * Assumes out of universe assets have a target weight of 0.
 */
export function calculateDrift(
  currentWeights: WeightResult[],
  target: TargetAllocation,
  policy: RebalancingPolicy,
): DriftMeasurement[] {
  // Map targets for quick lookup
  const targetMap = new Map<string, number>();
  for (const t of target.targets) {
    targetMap.set(t.instrumentId, t.weight);
  }

  const measurements: DriftMeasurement[] = [];
  const processedInstruments = new Set<string>();

  // Calculate drift for all currently held assets
  for (const cw of currentWeights) {
    const instrumentId = cw.instrumentId;
    processedInstruments.add(instrumentId);

    const targetWeight = targetMap.get(instrumentId) || 0;
    const absoluteDrift = toDecimal(cw.weight).minus(targetWeight).toNumber();
    let relativeDrift = 0;
    if (targetWeight > 0) {
      relativeDrift = toDecimal(absoluteDrift).div(targetWeight).toNumber();
    } else if (cw.weight > 0) {
      // If target is 0 but we hold it, relative drift is undefined or functionally infinite.
      // We set it to 1 (100%) as a fallback indicator of total drift away from target.
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
      currentWeight: cw.weight,
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
