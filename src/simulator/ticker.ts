import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { Orchestrator } from '../orchestrator';

export function startTickerSimulator(stateManager: SqliteStateManager, orchestrator: Orchestrator, intervalMs: number = 1000) {
  let timeoutId: NodeJS.Timeout;

  const tick = async () => {
    try {
      const currentPrices = stateManager.getGlobalPrices().prices;
      const newPrices = { ...currentPrices };

      // Artificially drift the prices
      const firstAsset = Object.keys(newPrices)[0];
      const secondAsset = Object.keys(newPrices)[1];
      if (firstAsset) {
        const factor = newPrices[firstAsset] > 200 ? 0.95 : 1.02;
        newPrices[firstAsset] = newPrices[firstAsset] * factor;
      }
      if (secondAsset) {
        const factor = newPrices[secondAsset] < 50 ? 1.05 : 0.985;
        newPrices[secondAsset] = newPrices[secondAsset] * factor;
      }

      stateManager.updateGlobalPrices(newPrices, new Date().toISOString());
      
      const now = Date.now();
      const affected1 = firstAsset ? stateManager.getPortfoliosAffectedByInstrument(firstAsset) : [];
      const affected2 = secondAsset ? stateManager.getPortfoliosAffectedByInstrument(secondAsset) : [];
      
      for (const id of new Set([...affected1, ...affected2])) {
        stateManager.enqueuePortfolio(id, now);
      }

      await orchestrator.onTick(now);
    } catch (err) {
      console.error('[Ticker Simulator] Tick failed:', err);
    } finally {
      timeoutId = setTimeout(tick, intervalMs);
    }
  };

  timeoutId = setTimeout(tick, intervalMs);
  return () => clearTimeout(timeoutId);
}
