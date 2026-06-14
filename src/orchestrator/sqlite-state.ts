import { getDb } from '../db/sqlite';
import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
  Holding,
} from '../models/domain';
import { LiveState, LiveStateManager } from './state';

export class SqliteStateManager implements LiveStateManager {
  // In-memory cache for lastTradeTimes to avoid writing frequent updates to DB
  // if it's purely for cooldown tracking. If persistence across restarts is needed,
  // we would add it to the Portfolios table.
  private lastTradeTimes: Map<string, number> = new Map();

  public registerPortfolio(accountId: string, state: LiveState): void {
    const db = getDb();
    
    const insertPortfolio = db.prepare(`
      INSERT OR REPLACE INTO Portfolios (accountId, cash, policy)
      VALUES (?, ?, ?)
    `);

    const insertHolding = db.prepare(`
      INSERT OR REPLACE INTO Holdings (accountId, instrumentId, quantity)
      VALUES (?, ?, ?)
    `);

    const insertTarget = db.prepare(`
      INSERT OR REPLACE INTO TargetAllocations (accountId, instrumentId, weight)
      VALUES (?, ?, ?)
    `);

    const deleteHoldings = db.prepare(`DELETE FROM Holdings WHERE accountId = ?`);
    const deleteTargets = db.prepare(`DELETE FROM TargetAllocations WHERE accountId = ?`);

    const tx = db.transaction(() => {
      insertPortfolio.run(accountId, state.portfolioState.cash, JSON.stringify(state.policy));
      
      deleteHoldings.run(accountId);
      for (const h of state.portfolioState.holdings) {
        insertHolding.run(accountId, h.instrumentId, h.quantity);
      }

      deleteTargets.run(accountId);
      for (const t of state.targetAllocation.targets) {
        insertTarget.run(accountId, t.instrumentId, t.weight);
      }
    });

    tx();
    this.lastTradeTimes.set(accountId, 0);
  }

  public updateGlobalPrices(prices: Record<string, number>, asOf?: string): void {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO GlobalPrices (instrumentId, price, asOf)
      VALUES (?, ?, ?)
    `);

    const tx = db.transaction(() => {
      for (const [symbol, price] of Object.entries(prices)) {
        stmt.run(symbol, price, asOf || null);
      }
    });

    tx();
  }

  public updatePortfolio(accountId: string, portfolioUpdate: Partial<PortfolioState>): void {
    const db = getDb();
    
    const tx = db.transaction(() => {
      if (portfolioUpdate.cash !== undefined) {
        db.prepare(`UPDATE Portfolios SET cash = ? WHERE accountId = ?`).run(portfolioUpdate.cash, accountId);
      }

      if (portfolioUpdate.holdings !== undefined) {
        db.prepare(`DELETE FROM Holdings WHERE accountId = ?`).run(accountId);
        const insertHolding = db.prepare(`
          INSERT INTO Holdings (accountId, instrumentId, quantity)
          VALUES (?, ?, ?)
        `);
        for (const h of portfolioUpdate.holdings) {
          insertHolding.run(accountId, h.instrumentId, h.quantity);
        }
      }
    });

    tx();
  }

  public updateTarget(accountId: string, target: TargetAllocation): void {
    const db = getDb();
    const tx = db.transaction(() => {
      db.prepare(`DELETE FROM TargetAllocations WHERE accountId = ?`).run(accountId);
      const insertTarget = db.prepare(`
        INSERT INTO TargetAllocations (accountId, instrumentId, weight)
        VALUES (?, ?, ?)
      `);
      for (const t of target.targets) {
        insertTarget.run(accountId, t.instrumentId, t.weight);
      }
    });
    tx();
  }

  public updatePolicy(accountId: string, policy: RebalancingPolicy): void {
    const db = getDb();
    db.prepare(`UPDATE Portfolios SET policy = ? WHERE accountId = ?`).run(JSON.stringify(policy), accountId);
  }

  public markTradeExecution(accountId: string, timestampMs: number): void {
    this.lastTradeTimes.set(accountId, timestampMs);
  }

  public getLastTradeTimeMs(accountId: string): number {
    return this.lastTradeTimes.get(accountId) ?? 0;
  }

  public getAccountState(accountId: string): LiveState {
    const db = getDb();
    
    const portRow = db.prepare(`SELECT cash, policy FROM Portfolios WHERE accountId = ?`).get(accountId) as any;
    if (!portRow) {
      throw new Error(`SqliteStateManager is not initialized for account ${accountId}`);
    }

    const holdingsRows = db.prepare(`SELECT instrumentId, quantity FROM Holdings WHERE accountId = ?`).all(accountId) as any[];
    const targetsRows = db.prepare(`SELECT instrumentId, weight FROM TargetAllocations WHERE accountId = ?`).all(accountId) as any[];

    const holdings: Holding[] = holdingsRows.map(r => ({
      instrumentId: r.instrumentId,
      quantity: r.quantity,
    }));

    const targets = targetsRows.map(r => ({
      instrumentId: r.instrumentId,
      weight: r.weight,
    }));

    const globalPrices = this.getGlobalPrices();

    return {
      portfolioState: {
        accountId,
        cash: portRow.cash,
        holdings,
      },
      priceSnapshot: globalPrices,
      targetAllocation: { targets },
      policy: JSON.parse(portRow.policy),
    };
  }

  public getAllAccountIds(): string[] {
    const db = getDb();
    const rows = db.prepare(`SELECT accountId FROM Portfolios`).all() as any[];
    return rows.map(r => r.accountId);
  }

  public getAllStates(): Record<string, LiveState> {
    const db = getDb();
    // For efficiency, we load everything in a few queries instead of N queries
    const portfolios = db.prepare(`SELECT accountId, cash, policy FROM Portfolios`).all() as any[];
    const holdings = db.prepare(`SELECT accountId, instrumentId, quantity FROM Holdings`).all() as any[];
    const targets = db.prepare(`SELECT accountId, instrumentId, weight FROM TargetAllocations`).all() as any[];
    
    const holdingsByAcc: Record<string, Holding[]> = {};
    for (const h of holdings) {
      if (!holdingsByAcc[h.accountId]) holdingsByAcc[h.accountId] = [];
      holdingsByAcc[h.accountId].push({ instrumentId: h.instrumentId, quantity: h.quantity });
    }

    const targetsByAcc: Record<string, any[]> = {};
    for (const t of targets) {
      if (!targetsByAcc[t.accountId]) targetsByAcc[t.accountId] = [];
      targetsByAcc[t.accountId].push({ instrumentId: t.instrumentId, weight: t.weight });
    }

    const globalPrices = this.getGlobalPrices();
    const result: Record<string, LiveState> = {};

    for (const p of portfolios) {
      result[p.accountId] = {
        portfolioState: {
          accountId: p.accountId,
          cash: p.cash,
          holdings: holdingsByAcc[p.accountId] || [],
        },
        priceSnapshot: globalPrices,
        targetAllocation: { targets: targetsByAcc[p.accountId] || [] },
        policy: JSON.parse(p.policy),
      };
    }

    return result;
  }

  public getGlobalPrices(): PriceSnapshot {
    const db = getDb();
    const rows = db.prepare(`SELECT instrumentId, price, asOf FROM GlobalPrices`).all() as any[];
    
    const snapshot: PriceSnapshot = { prices: {} };
    let latestAsOf: string | undefined = undefined;

    for (const row of rows) {
      snapshot.prices[row.instrumentId] = row.price;
      if (row.asOf && (!latestAsOf || row.asOf > latestAsOf)) {
        latestAsOf = row.asOf;
      }
    }

    if (latestAsOf) snapshot.asOf = latestAsOf;
    return snapshot;
  }

  public isReady(accountId: string): boolean {
    const db = getDb();
    const count = db.prepare(`SELECT COUNT(*) as c FROM Portfolios WHERE accountId = ?`).get(accountId) as any;
    return count.c > 0;
  }
}
