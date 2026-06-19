import { getDb } from '../db/sqlite';
import {
  MandateArchetype,
  ConstraintIndicator,
  PortfolioState,
  PriceSnapshot,
  RebalancingPolicy,
  TargetAllocation,
  Holding,
  Tenant,
  ModelMandate,
  TenantBrokerConfig,
} from '../models/domain';
import { randomBytes, createHash } from 'crypto';
import { LiveState, LiveStateManager } from './state';

import { ModelRepository } from '../db/repositories/ModelRepository';
import { PortfolioRepository } from '../db/repositories/PortfolioRepository';

export class SqliteStateManager implements LiveStateManager {
  // In-memory cache for lastTradeTimes to avoid writing frequent updates to DB
  // if it's purely for cooldown tracking. If persistence across restarts is needed,
  // we would add it to the Portfolios table.
  private lastTradeTimes: Map<string, number> = new Map();
  private modelRepo: ModelRepository = new ModelRepository();
  private portfolioRepo: PortfolioRepository = new PortfolioRepository();

  // Tenant & Model Management
  public createTenant(tenantId: string, name: string, brokerConfig?: TenantBrokerConfig): void {
    const db = getDb();
    const type = brokerConfig?.brokerType || 'MOCK';
    const key = brokerConfig?.brokerApiKey || null;
    const secret = brokerConfig?.brokerApiSecret || null;
    const baseUrl = brokerConfig?.brokerBaseUrl || null;
    
    db.prepare(`
      INSERT OR REPLACE INTO Tenants (tenantId, name, brokerType, brokerApiKey, brokerApiSecret, brokerBaseUrl) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tenantId, name, type, key, secret, baseUrl);
  }

  public getTenantBrokerConfig(tenantId: string): TenantBrokerConfig | null {
    const db = getDb();
    const row = db.prepare(`SELECT brokerType, brokerApiKey, brokerApiSecret, brokerBaseUrl FROM Tenants WHERE tenantId = ?`).get(tenantId) as any;
    if (!row) return null;
    return {
      brokerType: row.brokerType,
      brokerApiKey: row.brokerApiKey,
      brokerApiSecret: row.brokerApiSecret,
      brokerBaseUrl: row.brokerBaseUrl
    };
  }

  // --- Superadmin Operations ---
  public getAllTenants(): any[] {
    const db = getDb();
    const rows = db.prepare(`SELECT tenantId, name, brokerType, brokerBaseUrl FROM Tenants`).all() as any[];
    return rows;
  }

  public createUser(user: { userId: string; tenantId: string; email: string; password?: string; role?: string; status?: string }): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO Users (userId, tenantId, email, password, role, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.userId, user.tenantId, user.email, user.password || '', user.role || 'Viewer', user.status || 'Active');
  }

  public getUserByEmail(email: string): any | null {
    const db = getDb();
    return db.prepare(`SELECT * FROM Users WHERE email = ?`).get(email) || null;
  }

  public getUsersByTenant(tenantId: string): any[] {
    const db = getDb();
    return db.prepare(`SELECT userId, tenantId, email, role, status FROM Users WHERE tenantId = ?`).all(tenantId) as any[];
  }

  public getQueueDepth(): number {
    const db = getDb();
    const row = db.prepare(`SELECT COUNT(*) as count FROM EvaluationQueue`).get() as { count: number };
    return row.count;
  }

  // --- Tenant Settings & API Keys ---
  public updateTenant(tenantId: string, name: string, brokerConfig: TenantBrokerConfig): void {
    const db = getDb();
    db.prepare(`
      UPDATE Tenants 
      SET name = ?, brokerType = ?, brokerApiKey = ?, brokerApiSecret = ?, brokerBaseUrl = ?
      WHERE tenantId = ?
    `).run(name, brokerConfig.brokerType, brokerConfig.brokerApiKey, brokerConfig.brokerApiSecret, brokerConfig.brokerBaseUrl, tenantId);
  }

  public createTenantApiKey(tenantId: string): { keyPrefix: string; secret: string } {
    const db = getDb();
    // crypto imported at the top
    const secret = 'sk_live_' + randomBytes(24).toString('hex');
    const keyPrefix = secret.substring(0, 14) + '...';
    const keyHash = createHash('sha256').update(secret).digest('hex');
    const keyId = 'key_' + randomBytes(8).toString('hex');

    db.prepare(`
      INSERT INTO TenantApiKeys (keyId, tenantId, keyPrefix, keyHash, createdAt, status)
      VALUES (?, ?, ?, ?, ?, 'Active')
    `).run(keyId, tenantId, keyPrefix, keyHash, new Date().toISOString());

    return { keyPrefix, secret };
  }

  public revokeTenantApiKey(keyId: string): void {
    const db = getDb();
    db.prepare(`UPDATE TenantApiKeys SET status = 'Revoked' WHERE keyId = ?`).run(keyId);
  }

  public getTenantApiKeys(tenantId: string): any[] {
    const db = getDb();
    return db.prepare(`SELECT keyId, keyPrefix, createdAt, status FROM TenantApiKeys WHERE tenantId = ? ORDER BY createdAt DESC`).all(tenantId) as any[];
  }

  // --- Asset Universe ---
  public createAsset(asset: any): void {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO Assets (instrumentId, isin, ticker, exchangeMic, currency)
      VALUES (?, ?, ?, ?, ?)
    `).run(asset.instrumentId, asset.isin, asset.ticker, asset.exchangeMic, asset.currency);
  }

  public getAssets(): any[] {
    const db = getDb();
    return db.prepare(`SELECT instrumentId, isin, ticker, exchangeMic, currency FROM Assets`).all() as any[];
  }

  // -----------------------------

  public createModel(model: ModelMandate): string[] {
    return this.updateModel(model);
  }

  public getBrokerSymbol(instrumentId: string, brokerType: string): string {
    const db = getDb();
    const row = db.prepare(`SELECT brokerSymbol FROM BrokerSymbolMappings WHERE instrumentId = ? AND brokerType = ?`).get(instrumentId, brokerType) as { brokerSymbol: string } | undefined;
    return row ? row.brokerSymbol : instrumentId.split(':')[0]; // Fallback to ISIN or short ticker if no mapping exists
  }

  public getModels(tenantId: string): ModelMandate[] {
    return this.modelRepo.findByTenant(tenantId);
  }

  public getAllModels(): ModelMandate[] {
    return this.modelRepo.findAll();
  }

  public updateModel(model: ModelMandate): string[] {
    let subscribedAccounts: string[] = [];
    const db = getDb();
    const tx = db.transaction(() => {
      // 1. Update the Model row via repo
      this.modelRepo.save(model);

      // 2. Find all 'discretionary' portfolios subscribed to this model
      subscribedAccounts = this.portfolioRepo.getSubscribedAccounts(model.modelId, 'discretionary');

      if (subscribedAccounts.length > 0) {
        // 3. Update TargetAllocations and Policy for each portfolio
        this.portfolioRepo.updateTargetsAndCashBuffer(subscribedAccounts, model.targetAllocation);
        const updatePolicy = db.prepare(`UPDATE Portfolios SET policy = ? WHERE accountId = ?`);
        
        const now = Date.now();
        const insertQueue = db.prepare(`INSERT OR IGNORE INTO EvaluationQueue (accountId, queuedAtMs) VALUES (?, ?)`);

        for (const accountId of subscribedAccounts) {
          updatePolicy.run(JSON.stringify(model.policy), accountId);
          // Enqueue the portfolio for re-evaluation
          insertQueue.run(accountId, now);
        }
      }
    });
    tx();
    return subscribedAccounts;
  }

  public assignPortfolioToModel(accountId: string, modelId: string | null, subscriptionType: 'bespoke' | 'discretionary'): void {
    const db = getDb();
    const tx = db.transaction(() => {
      if (subscriptionType === 'discretionary' && modelId) {
        const modelRow = this.modelRepo.findById(modelId);
        if (modelRow) {
          const cashBuffer = modelRow.targetAllocation.cashBuffer || 0;
          this.portfolioRepo.assignToModel(accountId, modelId, subscriptionType, modelRow.policy, cashBuffer, modelRow.targetAllocation.targets);
        } else {
          this.portfolioRepo.assignToModel(accountId, modelId, subscriptionType);
        }
      } else {
        this.portfolioRepo.assignToModel(accountId, modelId, subscriptionType);
      }
    });
    tx();
  }

  public assignPortfolioToTenant(accountId: string, tenantId: string, brokerAccountId?: string): void {
    const db = getDb();
    if (brokerAccountId) {
      db.prepare(`UPDATE Portfolios SET tenantId = ?, brokerAccountId = ? WHERE accountId = ?`).run(tenantId, brokerAccountId, accountId);
    } else {
      db.prepare(`UPDATE Portfolios SET tenantId = ? WHERE accountId = ?`).run(tenantId, accountId);
    }
  }

  public registerPortfolio(accountId: string, state: LiveState): void {
    const db = getDb();
    
    const insertPortfolio = db.prepare(`
      INSERT OR REPLACE INTO Portfolios (accountId, tenantId, modelId, subscriptionType, cash, policy, cashBuffer, brokerAccountId, archetype, constraints)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        JSON.stringify(state.policy),
        state.targetAllocation.cashBuffer || 0,
        state.portfolioState.brokerAccountId || null,
        state.archetype || 'StaticWeights',
        state.constraints ? JSON.stringify(state.constraints) : null
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

  public updatePortfolioMandate(accountId: string, payload: { targetAllocation: TargetAllocation, policy: RebalancingPolicy, archetype: MandateArchetype, constraints?: ConstraintIndicator[] }): void {
    const db = getDb();
    const tx = db.transaction(() => {
      // 1. Update Portfolio Table (policy, cashBuffer, archetype, constraints, subscriptionType)
      db.prepare(`
        UPDATE Portfolios 
        SET policy = ?, 
            cashBuffer = ?, 
            archetype = ?, 
            constraints = ?,
            subscriptionType = 'bespoke'
        WHERE accountId = ?
      `).run(
        JSON.stringify(payload.policy),
        payload.targetAllocation.cashBuffer || 0,
        payload.archetype,
        payload.constraints ? JSON.stringify(payload.constraints) : null,
        accountId
      );

      // 2. Update TargetAllocations
      db.prepare(`DELETE FROM TargetAllocations WHERE accountId = ?`).run(accountId);
      const insertTarget = db.prepare(`
        INSERT INTO TargetAllocations (accountId, instrumentId, weight)
        VALUES (?, ?, ?)
      `);
      for (const t of payload.targetAllocation.targets) {
        insertTarget.run(accountId, t.instrumentId, t.weight);
      }
    });
    tx();
  }

  public markTradeExecution(accountId: string, timestampMs: number): void {
    this.lastTradeTimes.set(accountId, timestampMs);
  }

  public getLastTradeTimeMs(accountId: string): number {
    return this.lastTradeTimes.get(accountId) ?? 0;
  }

  public getAccountState(accountId: string): LiveState {
    const db = getDb();
    
    const portRow = db.prepare(`SELECT cash, policy, tenantId, modelId, subscriptionType, cashBuffer, brokerAccountId, archetype, constraints FROM Portfolios WHERE accountId = ?`).get(accountId) as any;
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
      targetAllocation: { targets, cashBuffer: portRow.cashBuffer || 0 },
      policy: JSON.parse(portRow.policy),
      archetype: portRow.archetype || 'StaticWeights',
      constraints: portRow.constraints ? JSON.parse(portRow.constraints) : undefined
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
      portfolios = db.prepare(`SELECT accountId, cash, policy, tenantId, modelId, subscriptionType, brokerAccountId, archetype, constraints FROM Portfolios WHERE tenantId = ?`).all(tenantId) as any[];
    } else {
      portfolios = db.prepare(`SELECT accountId, cash, policy, tenantId, modelId, subscriptionType, brokerAccountId, archetype, constraints FROM Portfolios`).all() as any[];
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
          brokerAccountId: p.brokerAccountId,
          cash: p.cash,
          holdings: holdingsByAcc[p.accountId] || [],
        },
        priceSnapshot: globalPrices,
        targetAllocation: { targets: targetsByAcc[p.accountId] || [] },
        policy: JSON.parse(p.policy),
        archetype: p.archetype || 'StaticWeights',
        constraints: p.constraints ? JSON.parse(p.constraints) : undefined
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
