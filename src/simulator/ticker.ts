import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { Orchestrator } from '../orchestrator';

export function startTickerSimulator(stateManager: SqliteStateManager, orchestrator: Orchestrator, intervalMs: number = 1000) {
  return setInterval(() => {
    const currentPrices = stateManager.getGlobalPrices().prices;
    const newPrices = { ...currentPrices };

    // Artificially drift the prices
    const firstAsset = Object.keys(newPrices)[0];
    const secondAsset = Object.keys(newPrices)[1];
    if (firstAsset) {
      newPrices[firstAsset] = newPrices[firstAsset] * 1.02; // Up 2%
    }
    if (secondAsset) {
      newPrices[secondAsset] = newPrices[secondAsset] * 0.985; // Down 1.5%
    }

    stateManager.updateGlobalPrices(newPrices, new Date().toISOString());
    
    const now = Date.now();
    const affected1 = firstAsset ? stateManager.getPortfoliosAffectedByInstrument(firstAsset) : [];
    const affected2 = secondAsset ? stateManager.getPortfoliosAffectedByInstrument(secondAsset) : [];
    
    for (const id of new Set([...affected1, ...affected2])) {
      stateManager.enqueuePortfolio(id, now);
    }

    orchestrator.onTick(now);
  }, intervalMs);
}
