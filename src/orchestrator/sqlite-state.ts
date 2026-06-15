import { getDb } from '../db/sqlite';
import {
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
  Holding,
  Tenant,
  ModelMandate,
} from '../models/domain';
import { LiveState, LiveStateManager } from './state';

export class SqliteStateManager implements LiveStateManager {
  // In-memory cache for lastTradeTimes to avoid writing frequent updates to DB
  // if it's purely for cooldown tracking. If persistence across restarts is needed,
  // we would add it to the Portfolios table.
  private lastTradeTimes: Map<string, number> = new Map();

  // Tenant & Model Management
  public createTenant(tenantId: string, name: string): void {
    const db = getDb();
    db.prepare(`INSERT OR IGNORE INTO Tenants (tenantId, name) VALUES (?, ?)`).run(tenantId, name);
  }

  public createModel(model: ModelMandate): string[] {
    const db = getDb();
    
    // Save model
    db.prepare(`INSERT OR REPLACE INTO Models (modelId, tenantId, name, archetype, evaluationFrequency, targetAllocation, policy, constraints) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      model.modelId, model.tenantId, model.name, model.archetype, model.evaluationFrequency, JSON.stringify(model.targetAllocation), JSON.stringify(model.policy), model.constraints ? JSON.stringify(model.constraints) : null
    );
    
    // Cascade to all subscribed portfolios
    const rows = db.prepare(`SELECT accountId FROM Portfolios WHERE modelId = ? AND subscriptionType = 'discretionary'`).all(model.modelId) as { accountId: string }[];
    const affectedAccounts = rows.map(r => r.accountId);
    
    if (affectedAccounts.length > 0) {
      const tx = db.transaction(() => {
        const updatePolicy = db.prepare(`UPDATE Portfolios SET policy = ? WHERE accountId = ?`);
        const delTargets = db.prepare(`DELETE FROM TargetAllocations WHERE accountId = ?`);
        const insertTarget = db.prepare(`INSERT INTO TargetAllocations (accountId, instrumentId, weight) VALUES (?, ?, ?)`);
        
        for (const accountId of affectedAccounts) {
          updatePolicy.run(JSON.stringify(model.policy), accountId);
          delTargets.run(accountId);
          for (const t of model.targetAllocation.targets) {
            insertTarget.run(accountId, t.instrumentId, t.weight);
          }
        }
      });
      tx();
    }
    
    return affectedAccounts;
  }

  public getModels(tenantId: string): ModelMandate[] {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM Models WHERE tenantId = ?`).all(tenantId) as any[];
    return rows.map(r => ({
      modelId: r.modelId,
      tenantId: r.tenantId,
      name: r.name,
      archetype: r.archetype || 'StaticWeights',
      evaluationFrequency: r.evaluationFrequency || 'realtime',
      targetAllocation: JSON.parse(r.targetAllocation),
      policy: JSON.parse(r.policy),
      constraints: r.constraints ? JSON.parse(r.constraints) : undefined
    }));
  }

  public assignPortfolioToModel(accountId: string, modelId: string | null, subscriptionType: 'bespoke' | 'discretionary'): void {
    const db = getDb();
    const tx = db.transaction(() => {
      if (subscriptionType === 'discretionary' && modelId) {
        const modelRow = db.prepare(`SELECT targetAllocation, policy FROM Models WHERE modelId = ?`).get(modelId) as any;
        if (modelRow) {
          db.prepare(`UPDATE Portfolios SET modelId = ?, subscriptionType = ?, policy = ? WHERE accountId = ?`)
            .run(modelId, subscriptionType, modelRow.policy, accountId);
            
          const targets = JSON.parse(modelRow.targetAllocation).targets;
          db.prepare(`DELETE FROM TargetAllocations WHERE accountId = ?`).run(accountId);
          const insertTarget = db.prepare(`INSERT INTO TargetAllocations (accountId, instrumentId, weight) VALUES (?, ?, ?)`);
          for (const t of targets) {
            insertTarget.run(accountId, t.instrumentId, t.weight);
          }
        } else {
          db.prepare(`UPDATE Portfolios SET modelId = ?, subscriptionType = ? WHERE accountId = ?`).run(modelId, subscriptionType, accountId);
        }
      } else {
        db.prepare(`UPDATE Portfolios SET modelId = ?, subscriptionType = ? WHERE accountId = ?`).run(modelId, subscriptionType, accountId);
      }
    });
    tx();
  }

  public assignPortfolioToTenant(accountId: string, tenantId: string): void {
    const db = getDb();
    db.prepare(`UPDATE Portfolios SET tenantId = ? WHERE accountId = ?`).run(tenantId, accountId);
  }

  public registerPortfolio(accountId: string, state: LiveState): void {
    const db = getDb();
    
    const insertPortfolio = db.prepare(`
      INSERT OR REPLACE INTO Portfolios (accountId, tenantId, modelId, subscriptionType, cash, policy)
      VALUES (?, ?, ?, ?, ?, ?)
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
      insertPortfolio.run(
        accountId, 
        state.portfolioState.tenantId || null, 
        state.portfolioState.modelId || null, 
        state.portfolioState.subscriptionType || 'bespoke',
        state.portfolioState.cash, 
        JSON.stringify(state.policy)
      );
      
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
    
    const portRow = db.prepare(`SELECT cash, policy, tenantId, modelId, subscriptionType FROM Portfolios WHERE accountId = ?`).get(accountId) as any;
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
        tenantId: portRow.tenantId,
        modelId: portRow.modelId,
        subscriptionType: portRow.subscriptionType,
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
    return this.getStatesFilteredByTenant(null);
  }

  public getStatesFilteredByTenant(tenantId: string | null): Record<string, LiveState> {
    const db = getDb();
    // For efficiency, we load everything in a few queries instead of N queries
    let portfolios: any[];
    if (tenantId) {
      portfolios = db.prepare(`SELECT accountId, cash, policy, tenantId, modelId, subscriptionType FROM Portfolios WHERE tenantId = ?`).all(tenantId) as any[];
    } else {
      portfolios = db.prepare(`SELECT accountId, cash, policy, tenantId, modelId, subscriptionType FROM Portfolios`).all() as any[];
    }
    
    const accountIds = portfolios.map(p => p.accountId);
    if (accountIds.length === 0) return {};
    
    // Fallback: we should technically parameterize the IN clause, but for mock simplicity if there are many we just pull all and filter in memory, 
    // or since this is SQLite and we can use a simpler query:
    const holdings = tenantId 
      ? db.prepare(`SELECT h.accountId, h.instrumentId, h.quantity FROM Holdings h JOIN Portfolios p ON h.accountId = p.accountId WHERE p.tenantId = ?`).all(tenantId) as any[]
      : db.prepare(`SELECT accountId, instrumentId, quantity FROM Holdings`).all() as any[];
      
    const targets = tenantId
      ? db.prepare(`SELECT t.accountId, t.instrumentId, t.weight FROM TargetAllocations t JOIN Portfolios p ON t.accountId = p.accountId WHERE p.tenantId = ?`).all(tenantId) as any[]
      : db.prepare(`SELECT accountId, instrumentId, weight FROM TargetAllocations`).all() as any[];
    
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
          tenantId: p.tenantId,
          modelId: p.modelId,
          subscriptionType: p.subscriptionType,
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
    // For MVP, assume the DB has been fully seeded if a row exists.
    const db = getDb();
    const row = db.prepare(`SELECT 1 FROM Portfolios WHERE accountId = ?`).get(accountId);
    return !!row;
  }

  // Event-Driven Queueing
  public enqueuePortfolio(accountId: string, timestampMs: number): void {
    const db = getDb();
    db.prepare(`INSERT OR IGNORE INTO EvaluationQueue (accountId, queuedAtMs) VALUES (?, ?)`).run(accountId, timestampMs);
  }

  public dequeuePortfolios(limit: number): string[] {
    const db = getDb();
    const tx = db.transaction(() => {
      const rows = db.prepare(`SELECT accountId FROM EvaluationQueue ORDER BY queuedAtMs ASC LIMIT ?`).all(limit) as { accountId: string }[];
      const ids = rows.map(r => r.accountId);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`DELETE FROM EvaluationQueue WHERE accountId IN (${placeholders})`).run(...ids);
      }
      return ids;
    });
    return tx();
  }

  public getPortfoliosAffectedByInstrument(instrumentId: string): string[] {
    const db = getDb();
    // A portfolio is affected if it holds the instrument OR if it targets the instrument.
    const rows = db.prepare(`
      SELECT DISTINCT p.accountId 
      FROM Portfolios p
      LEFT JOIN Holdings h ON p.accountId = h.accountId
      LEFT JOIN TargetAllocations t ON p.accountId = t.accountId
      WHERE h.instrumentId = ? OR t.instrumentId = ?
    `).all(instrumentId, instrumentId) as { accountId: string }[];
    return rows.map(r => r.accountId);
  }
}
