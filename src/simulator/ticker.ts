import { SqliteStateManager } from '../orchestrator/sqlite-state';
import { Orchestrator } from '../orchestrator';

export function startTickerSimulator(stateManager: SqliteStateManager, orchestrator: Orchestrator, intervalMs: number = 1000) {
  let timeoutId: NodeJS.Timeout;

  const tick = async () => {
    try {
      const currentPrices = stateManager.getGlobalPrices().prices;
      const newPrices = { ...currentPrices };

      // Artificially drift the prices within realistic bounds
      const firstAsset = Object.keys(newPrices)[0];
      const secondAsset = Object.keys(newPrices)[1];
      if (firstAsset) {
        const current = Number(newPrices[firstAsset]);
        if (!isFinite(current) || current <= 0) {
          newPrices[firstAsset] = 180;
        } else {
          const factor = current > 220 ? 0.96 : 1.02;
          newPrices[firstAsset] = Math.max(50, Math.min(500, current * factor));
        }
      }
      if (secondAsset) {
        const current = Number(newPrices[secondAsset]);
        if (!isFinite(current) || current <= 0) {
          newPrices[secondAsset] = 400;
        } else {
          const factor = current < 350 ? 1.04 : 0.985;
          newPrices[secondAsset] = Math.max(50, Math.min(800, current * factor));
        }
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
