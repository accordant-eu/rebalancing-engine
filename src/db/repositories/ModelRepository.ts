import { getDb } from '../sqlite';
import { ModelMandate, TargetAllocation } from '../../models/domain';

export class ModelRepository {
  public save(model: ModelMandate): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO Models 
      (modelId, tenantId, name, archetype, evaluationFrequency, targetAllocation, policy, constraints, universe) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(modelId) DO UPDATE SET
        tenantId = excluded.tenantId,
        name = excluded.name,
        archetype = excluded.archetype,
        evaluationFrequency = excluded.evaluationFrequency,
        targetAllocation = excluded.targetAllocation,
        policy = excluded.policy,
        constraints = excluded.constraints,
        universe = excluded.universe
    `).run(
      model.modelId,
      model.tenantId,
      model.name,
      model.archetype || 'StaticWeights',
      model.evaluationFrequency || 'realtime',
      JSON.stringify(model.targetAllocation || { targets: [] }),
      JSON.stringify(model.policy),
      model.constraints ? JSON.stringify(model.constraints) : null,
      model.universe ? JSON.stringify(model.universe) : null
    );
  }

  public updateTargetAllocation(modelId: string, newTarget: TargetAllocation): void {
    const db = getDb();
    db.prepare(`UPDATE Models SET targetAllocation = ? WHERE modelId = ?`)
      .run(JSON.stringify(newTarget), modelId);
  }

  public findByTenant(tenantId: string): ModelMandate[] {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM Models WHERE tenantId = ?`).all(tenantId) as any[];
    return this.mapRows(rows);
  }

  public findAll(): ModelMandate[] {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM Models`).all() as any[];
    return this.mapRows(rows);
  }

  public findById(modelId: string): ModelMandate | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM Models WHERE modelId = ?`).get(modelId) as any;
    if (!row) return null;
    return this.mapRows([row])[0];
  }

  private mapRows(rows: any[]): ModelMandate[] {
    return rows.map(r => ({
      modelId: r.modelId,
      tenantId: r.tenantId,
      name: r.name,
      archetype: r.archetype || 'StaticWeights',
      evaluationFrequency: r.evaluationFrequency || 'realtime',
      targetAllocation: JSON.parse(r.targetAllocation),
      policy: JSON.parse(r.policy),
      constraints: r.constraints ? JSON.parse(r.constraints) : undefined,
      universe: r.universe ? JSON.parse(r.universe) : undefined,
    }));
  }
}
