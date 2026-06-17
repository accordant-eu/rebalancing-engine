import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { TargetAllocation, TargetWeight } from '../models/domain';
import { logger } from '../utils/logger';

export class MockOptimizerService {
  constructor(private stateManager: SqliteStateManager) {}

  /**
   * Runs the mock optimizer for all models that require dynamic targeting.
   * This is a proof-of-concept that demonstrates the asynchronous architecture:
   * 1. Fetch models with archetype != 'StaticWeights'
   * 2. Generate a mock TargetAllocation based on the current date
   * 3. Persist the new targets and fan-out to subscribed portfolios
   */
  public run(): void {
    const models = this.stateManager.getAllModels();
    
    for (const model of models) {
      if (model.archetype === 'StaticWeights') {
        continue;
      }

      // Proof-of-Concept: Generate a mock TargetAllocation
      // We will just rotate weights between a predefined universe
      const universe = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'SPY', 'BND'];
      
      // Determine how many assets to pick (e.g. 3)
      const numAssets = 3;
      
      // Use the current day of the year to pseudo-randomly pick assets
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      
      const targets: TargetWeight[] = [];
      const cashBuffer = 0.05; // 5% cash buffer
      const weightPerAsset = (1.0 - cashBuffer) / numAssets;

      for (let i = 0; i < numAssets; i++) {
        const index = (dayOfYear + i + model.modelId.length) % universe.length;
        targets.push({
          instrumentId: universe[index] as string,
          weight: Number(weightPerAsset.toFixed(4)),
        });
      }

      // Ensure exact sum (math precision)
      const sum = targets.reduce((acc, t) => acc + t.weight, 0);
      const diff = (1.0 - cashBuffer) - sum;
      if (targets.length > 0) {
        targets[0].weight = Number((targets[0].weight + diff).toFixed(4));
      }

      const newTargetAllocation: TargetAllocation = {
        targets,
        cashBuffer,
      };

      logger.info({ newTargetAllocation }, `[Optimizer] Computed new targets for Model ${model.modelId} (${model.name})`);

      // Fan out to all portfolios
      this.stateManager.updateModelTargetAllocation(model.modelId, newTargetAllocation);
    }
  }
}
