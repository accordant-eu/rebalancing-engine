import { getDb } from '../sqlite';
import { PortfolioState, RebalancingPolicy, TargetAllocation, Holding } from '../../models/domain';

export class PortfolioRepository {
  public getSubscribedAccounts(modelId: string, subscriptionType: string = 'discretionary'): string[] {
    const db = getDb();
    const rows = db.prepare(`SELECT accountId FROM Portfolios WHERE modelId = ? AND subscriptionType = ?`).all(modelId, subscriptionType) as any[];
    return rows.map(r => r.accountId);
  }

  public updateTargetsAndCashBuffer(accountIds: string[], target: TargetAllocation): void {
    const db = getDb();
    const deleteTargets = db.prepare(`DELETE FROM TargetAllocations WHERE accountId = ?`);
    const insertTarget = db.prepare(`INSERT INTO TargetAllocations (accountId, instrumentId, weight) VALUES (?, ?, ?)`);
    const updateCashBuffer = db.prepare(`UPDATE Portfolios SET cashBuffer = ? WHERE accountId = ?`);

    for (const accountId of accountIds) {
      deleteTargets.run(accountId);
      for (const t of target.targets) {
        insertTarget.run(accountId, t.instrumentId, t.weight);
      }
      updateCashBuffer.run(target.cashBuffer || 0, accountId);
    }
  }

  public assignToModel(accountId: string, modelId: string | null, subscriptionType: string, policy?: RebalancingPolicy, cashBuffer?: number, targets?: any[]): void {
    const db = getDb();
    if (policy && cashBuffer !== undefined && targets) {
      db.prepare(`UPDATE Portfolios SET modelId = ?, subscriptionType = ?, policy = ?, cashBuffer = ? WHERE accountId = ?`)
        .run(modelId, subscriptionType, JSON.stringify(policy), cashBuffer, accountId);
        
      db.prepare(`DELETE FROM TargetAllocations WHERE accountId = ?`).run(accountId);
      const insertTarget = db.prepare(`INSERT INTO TargetAllocations (accountId, instrumentId, weight) VALUES (?, ?, ?)`);
      for (const t of targets) {
        insertTarget.run(accountId, t.instrumentId, t.weight);
      }
    } else {
      db.prepare(`UPDATE Portfolios SET modelId = ?, subscriptionType = ? WHERE accountId = ?`).run(modelId, subscriptionType, accountId);
    }
  }
}
