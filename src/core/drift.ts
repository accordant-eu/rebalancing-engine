import { DriftMeasurement, TargetAllocation, RebalancingPolicy } from '../models/domain';
import { WeightResult } from './valuation';

/**
 * Validates that the target allocation sum is approximately 1.0 (100%).
 * Uses a small epsilon to account for minor floating point imprecision.
 */
export function validateTargetAllocation(target: TargetAllocation): void {
  const sum = target.targets.reduce((acc, t) => acc + t.weight, 0);
  if (Math.abs(sum - 1.0) > 0.0001) {
    throw new Error(`Target allocation does not sum to 100%. Total: ${(sum * 100).toFixed(2)}%`);
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
    const absoluteDrift = cw.weight - targetWeight;
    let relativeDrift = 0;
    if (targetWeight > 0) {
      relativeDrift = absoluteDrift / targetWeight;
    } else if (cw.weight > 0) {
      // If target is 0 but we hold it, relative drift is undefined or functionally infinite.
      // We set it to 1 (100%) as a fallback indicator of total drift away from target.
      relativeDrift = 1;
    }

    const EPSILON = 1e-6;
    const isAbsoluteBreach = Math.abs(absoluteDrift) - policy.absoluteDriftTolerance > EPSILON;
    const isRelativeBreach =
      policy.relativeDriftTolerance !== undefined &&
      Math.abs(relativeDrift) - policy.relativeDriftTolerance > EPSILON;

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

      const EPSILON = 1e-6;
      const isAbsoluteBreach = Math.abs(absoluteDrift) - policy.absoluteDriftTolerance > EPSILON;
      const isRelativeBreach =
        policy.relativeDriftTolerance !== undefined &&
        Math.abs(relativeDrift) - policy.relativeDriftTolerance > EPSILON;

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
