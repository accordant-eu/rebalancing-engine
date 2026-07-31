import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { TargetAllocation, TargetWeight } from '../models/domain';
import { logger } from '../utils/logger';
import { SyntheticRiskModel } from './risk-model';
import { ProjectedGradientDescent } from './solver';

export class DynamicOptimizerService {
  private riskModel = new SyntheticRiskModel();
  private solver = new ProjectedGradientDescent();

  constructor(private stateManager: SqliteStateManager) {}

  /**
   * Runs the dynamic optimizer for all models that require advanced targeting.
   */
  public run(): void {
    const models = this.stateManager.getAllModels();
    
    for (const model of models) {
      if (model.archetype === 'StaticWeights') {
        continue;
      }

      const universe = model.universe && model.universe.length > 0 ? model.universe : ['US0378331005:XNAS:USD', 'US5949181045:XNAS:USD', 'US38259P5089:XNAS:USD', 'US88160R1014:XNAS:USD', 'SPY', 'BND'];
      
      const cov = this.riskModel.getCovarianceMatrix(universe);
      const mu = this.riskModel.getExpectedReturns(universe);
      
      const cashBuffer = model.targetAllocation.cashBuffer ?? 0.05;
      const targetSum = 1.0 - cashBuffer;

      let lambda = 0; // Minimum Variance
      if (model.archetype === 'EfficientFrontier') {
        lambda = 0.5; // Arbitrary risk aversion for demonstration
      }

      const weights = this.solver.solve(cov, mu, lambda, targetSum);

      const targets: TargetWeight[] = [];
      for (let i = 0; i < universe.length; i++) {
        // Round to 4 decimal places for cleanliness
        targets.push({
          instrumentId: universe[i],
          weight: Number(weights[i].toFixed(4))
        });
      }

      // Ensure exact sum due to rounding
      const sum = targets.reduce((acc, t) => acc + t.weight, 0);
      const diff = targetSum - sum;
      if (targets.length > 0) {
        targets[0].weight = Number((targets[0].weight + diff).toFixed(4));
      }

      const newTargetAllocation: TargetAllocation = {
        targets: targets.filter(t => t.weight > 0),
        cashBuffer,
      };

      logger.info({ newTargetAllocation }, `[Optimizer] Computed new targets for Model ${model.modelId} (${model.name}) via ${model.archetype}`);

      // Fan out to all portfolios
      this.stateManager.updateModel({ ...model, targetAllocation: newTargetAllocation });
    }
  }
}

