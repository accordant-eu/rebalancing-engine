import { Router } from 'express';
import { SqliteStateManager } from '../../orchestrator/sqlite-state';
import { getDb } from '../../db/sqlite';
import { systemEventBus } from '../../events/bus';
import { evaluateRebalance } from '../../core/evaluation';
import { DriftReductionIndicator, ConcentrationLimitIndicator, DriftUtilityTranslator } from '../../core/quality';
import { randomBytes } from 'crypto';

export function createPortfoliosRouter(
  stateManager: SqliteStateManager, 
  middlewares: {
    forbidViewer: any;
    requireAdmin: any;
    requireSuperadmin: any;
    sendError: any;
  }
) {
  const router = Router();
  const { forbidViewer, requireAdmin, requireSuperadmin, sendError } = middlewares;

  router.get('/summary', async (req, res) => {
    const tenantId = (req as any).tenantId;
    const targetTenant = (req as any).isSuperadmin ? null : tenantId;
    const portfolios = stateManager.getStatesFilteredByTenant(targetTenant);
    const prices = stateManager.getGlobalPrices();

    let totalAum = 0;
    let inBand = 0;
    let thresholdBreach = 0;
    let notEvaluated = 0;
    let openCircuitBreakers = 0;

    let lastEvaluatedAt: number | null = null;

    const portfolioList = Object.values(portfolios);
    const CHUNK_SIZE = 100;

    for (let i = 0; i < portfolioList.length; i += CHUNK_SIZE) {
      const chunk = portfolioList.slice(i, i + CHUNK_SIZE);
      chunk.forEach((state) => {
        // Aggregate AUM
        let portfolioValue = state.portfolioState.cash;
        state.portfolioState.holdings.forEach(h => {
          portfolioValue += h.quantity * (prices.prices[h.instrumentId] || 0);
        });
        totalAum += portfolioValue;

      // Circuit Breakers
      if (state.portfolioState.circuitBreakerStatus === 'open') {
        openCircuitBreakers++;
      }

      // Rebalance eval for drift (lightweight)
      try {
        let maxDrift = 0;
        const targets = state.targetAllocation?.targets || [];
        targets.forEach(t => {
          const value = (state.portfolioState.holdings?.find((h: any) => h.instrumentId === t.instrumentId)?.quantity || 0) * (prices.prices[t.instrumentId] || 0);
          const weight = portfolioValue > 0 ? value / portfolioValue : 0;
          const drift = Math.abs(weight - t.weight);
          if (drift > maxDrift) maxDrift = drift;
        });

        const tolerance = state.policy.absoluteDriftTolerance || 0.05;
        if (maxDrift > tolerance) {
          thresholdBreach++;
        } else {
          inBand++;
        }

        // Use current time to represent real-time HUD freshness
        lastEvaluatedAt = Date.now();
      } catch (e: any) {
        notEvaluated++;
      }
    });

    // Yield to event loop to prevent DoS
    await new Promise(resolve => setImmediate(resolve));
  }

  // Recent executions from Audit logs
  let executions24h = 0;
  let executions7d = 0;

    try {
      const db = getDb();
      const now = Date.now();
      const ms24h = 24 * 60 * 60 * 1000;
      const ms7d = 7 * 24 * 60 * 60 * 1000;
      const limit7d = now - ms7d;
      const limit24h = now - ms24h;

      let q7d = `SELECT count(*) as count FROM AuditTrails WHERE type = 'LIVE_EXECUTION' AND timestampMs >= ?`;
      const params7d: any[] = [limit7d];
      let q24h = `SELECT count(*) as count FROM AuditTrails WHERE type = 'LIVE_EXECUTION' AND timestampMs >= ?`;
      const params24h: any[] = [limit24h];

      if (!(req as any).isSuperadmin) {
        q7d += ` AND tenantId = ?`;
        params7d.push(tenantId);
        q24h += ` AND tenantId = ?`;
        params24h.push(tenantId);
      }

      const res7d = db.prepare(q7d).get(...params7d) as { count: number };
      executions7d = res7d?.count || 0;

      const res24h = db.prepare(q24h).get(...params24h) as { count: number };
      executions24h = res24h?.count || 0;
    } catch (e: any) { /* intentional empty catch */ }

    res.json({
      asOf: new Date().toISOString(),
      meta: {
        total: Object.keys(portfolios).length,
        lastEvaluatedAt: lastEvaluatedAt ? new Date(lastEvaluatedAt).toISOString() : null
      },
      driftSummary: {
        inBand,
        thresholdBreach,
        notEvaluated
      },
      totalAum,
      openCircuitBreakers,
      recentExecutions: {
        last24h: executions24h,
        last7d: executions7d
      }
    });
  });
  router.get('/', (req, res) => {
    const tenantId = (req as any).tenantId;
    const targetTenant = (req as any).isSuperadmin ? null : tenantId;
    const portfolios = stateManager.getStatesFilteredByTenant(targetTenant);
    const prices = stateManager.getGlobalPrices();
    
    const result = Object.values(portfolios).map((state) => {
      let driftStatus = 'not_evaluated';
      let driftMeasurements: any[] = [];
      let totalValue = state.portfolioState.cash;
      
      const models = stateManager.getModels(state.portfolioState.tenantId || '');
      const modelName = state.portfolioState.modelId ? models.find(m => m.modelId === state.portfolioState.modelId)?.name : 'Bespoke';
      
      try {
        const indicators: any[] = [];
        if (state.archetype === 'StaticWeights') {
          indicators.push(new DriftReductionIndicator(new DriftUtilityTranslator()));
          if (state.constraints) {
            for (const c of state.constraints) {
              if (c.type === 'concentration_limit' && c.parameters && c.parameters.maxWeight) {
                indicators.push(new ConcentrationLimitIndicator(c.parameters.maxWeight));
              }
            }
          }
        }
        
        const evalResult = evaluateRebalance({
          eventId: `api-eval-${Date.now()}`,
          portfolioState: state.portfolioState,
          targetAllocation: state.targetAllocation,
          priceSnapshot: prices,
          policy: state.policy,
          indicators,
          createdAt: new Date().toISOString()
        });
        driftStatus = evalResult.trigger.isTriggered ? 'threshold_breach' : 'in_band';
        driftMeasurements = evalResult.driftMeasurements;
      } catch (e: any) {
        // intentional empty catch
      }
      
      const holdings = state.portfolioState.holdings.map(h => {
        const driftObj = driftMeasurements.find(d => d.instrumentId === h.instrumentId);
        const price = prices.prices[h.instrumentId] || 0;
        const val = h.quantity * price;
        totalValue += val;
        return {
          instrumentId: h.instrumentId,
          quantity: h.quantity,
          currentWeight: driftObj?.currentWeight || 0,
          targetWeight: driftObj?.targetWeight || 0,
          driftPct: driftObj?.relativeDrift || 0
        };
      });

      return {
        accountId: state.portfolioState.accountId,
        tenantId: state.portfolioState.tenantId,
        modelId: state.portfolioState.modelId || null,
        modelName,
        subscriptionType: state.portfolioState.subscriptionType || 'bespoke',
        archetype: state.archetype,
        constraints: state.constraints,
        targetAllocation: state.targetAllocation,
        totalValue,
        cash: state.portfolioState.cash,
        lastEvaluatedAt: new Date().toISOString(),
        driftStatus,
        holdings
      };
    });
    
    res.json(result);
  });

  router.get('/:id', async (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const state = stateManager.getAccountState(accountId);
    
    if (!state || (!(req as any).isSuperadmin && state.portfolioState.tenantId !== tenantId)) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
    }

    const prices = stateManager.getGlobalPrices();
    let driftStatus = 'not_evaluated';
    let driftMeasurements: any[] = [];
    let totalValue = state.portfolioState.cash;
    let lastProposal = null;
    
    const models = stateManager.getModels(state.portfolioState.tenantId || '');
    const modelName = state.portfolioState.modelId ? models.find(m => m.modelId === state.portfolioState.modelId)?.name : 'Bespoke';

    try {
      const indicators: any[] = [];
      if (state.archetype === 'StaticWeights') {
        indicators.push(new DriftReductionIndicator(new DriftUtilityTranslator()));
        if (state.constraints) {
          for (const c of state.constraints) {
            if (c.type === 'concentration_limit' && c.parameters && c.parameters.maxWeight) {
              indicators.push(new ConcentrationLimitIndicator(c.parameters.maxWeight));
            }
          }
        }
      }

      const evalResult = evaluateRebalance({
        eventId: `api-eval-${Date.now()}`,
        portfolioState: state.portfolioState,
        targetAllocation: state.targetAllocation,
        priceSnapshot: prices,
        policy: state.policy,
        indicators,
        createdAt: new Date().toISOString()
      });
      driftStatus = evalResult.trigger.isTriggered ? 'threshold_breach' : 'in_band';
      driftMeasurements = evalResult.driftMeasurements;
    } catch (e: any) {
      // intentional empty catch
    }
    
    const holdings = state.portfolioState.holdings.map(h => {
      const driftObj = driftMeasurements.find(d => d.instrumentId === h.instrumentId);
      const price = prices.prices[h.instrumentId] || 0;
      const val = h.quantity * price;
      totalValue += val;
      return {
        instrumentId: h.instrumentId,
        quantity: h.quantity,
        currentWeight: driftObj?.currentWeight || 0,
        targetWeight: driftObj?.targetWeight || 0,
        driftPct: driftObj?.relativeDrift || 0
      };
    });

    try {
      const db = getDb();
      const row = db.prepare(`SELECT outputs FROM AuditTrails WHERE accountId = ? AND outputs LIKE '%tradeProposal%' ORDER BY timestampMs DESC LIMIT 1`).get(accountId) as any;
      if (row && row.outputs) {
        const parsedOutputs = JSON.parse(row.outputs);
        if (parsedOutputs && parsedOutputs.tradeProposal) {
          lastProposal = parsedOutputs.tradeProposal;
        }
      }
    } catch(e) {
      // intentional empty catch
    }

    res.json({
      accountId: state.portfolioState.accountId,
      tenantId: state.portfolioState.tenantId,
      modelId: state.portfolioState.modelId || null,
      modelName,
      subscriptionType: state.portfolioState.subscriptionType || 'bespoke',
      archetype: state.archetype,
      constraints: state.constraints,
      targetAllocation: state.targetAllocation,
      policy: state.policy,
      totalValue,
      cash: state.portfolioState.cash,
      lastEvaluatedAt: new Date().toISOString(),
      driftStatus,
      holdings,
      pendingCashFlows: state.portfolioState.cashFlows?.filter((c: any) => c.status === 'PENDING') || [],
      circuitBreakerStatus: state.portfolioState.circuitBreakerStatus || 'closed',
      lastProposal
    });
  });

  router.post('/:id/trigger-rebalance', forbidViewer, (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const { dryRun } = req.body;
    
    try {
      const state = stateManager.getAccountState(accountId);
      if (!state || (!(req as any).isSuperadmin && state.portfolioState.tenantId !== tenantId)) {
        return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
      }

      if (dryRun) {
        const prices = stateManager.getGlobalPrices();
        const indicators: any[] = [];
        if (state.archetype === 'StaticWeights') {
          indicators.push(new DriftReductionIndicator(new DriftUtilityTranslator()));
          if (state.constraints) {
            for (const c of state.constraints) {
              if (c.type === 'concentration_limit' && c.parameters && c.parameters.maxWeight) {
                indicators.push(new ConcentrationLimitIndicator(c.parameters.maxWeight));
              }
            }
          }
        }
        
        const evalResult = evaluateRebalance({
          eventId: `api-eval-dry-${Date.now()}`,
          portfolioState: state.portfolioState,
          targetAllocation: state.targetAllocation,
          priceSnapshot: prices,
          policy: state.policy,
          indicators,
          createdAt: new Date().toISOString()
        });
        
        return res.json({ dryRun: true, ...evalResult });
      } else {
        const db = getDb();
        db.prepare(`INSERT OR REPLACE INTO EvaluationQueue (accountId, queuedAtMs) VALUES (?, ?)`).run(accountId, Date.now());
        return res.json({ message: 'Portfolio enqueued for rebalancing', accountId });
      }
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  });

  router.post('/:id/circuit-breaker/reset', requireAdmin, (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    
    try {
      const state = stateManager.getAccountState(accountId);
      if (!state || (!(req as any).isSuperadmin && state.portfolioState.tenantId !== tenantId)) {
        return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
      }

      stateManager.updateCircuitBreakerStatus(accountId, 'closed');
      const db = getDb();
      db.prepare(`INSERT OR REPLACE INTO EvaluationQueue (accountId, queuedAtMs) VALUES (?, ?)`).run(accountId, Date.now());
      
      systemEventBus.emitEvent({
        type: 'CIRCUIT_BREAKER_RESET',
        accountId,
        tenantId: state.portfolioState.tenantId,
        timestamp: new Date().toISOString(),
        eventId: `reset-${Date.now()}`
      });

      res.json({ message: 'Circuit breaker reset and portfolio enqueued for re-evaluation', accountId });
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  });

  router.post('/:id/cashflows', forbidViewer, (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const { amount, direction, currency, expectedSettlementDate } = req.body;
    
    if (!amount || !direction) {
      return sendError(res, 400, 'BAD_REQUEST', 'amount and direction are required');
    }

    try {
      const state = stateManager.getAccountState(accountId);
      if (!state || (!(req as any).isSuperadmin && state.portfolioState.tenantId !== tenantId)) {
        return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
      }

      const cashflowId = 'cf_' + randomBytes(8).toString('hex');
      const cashflow = {
        cashFlowId: cashflowId,
        amount,
        direction,
        currency,
        expectedSettlementDate,
        status: 'PENDING'
      };
      
      stateManager.submitCashFlow(accountId, cashflow, (req as any).userId);
      res.json(cashflow);
    } catch (e: any) {
      return sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  });

  router.get('/:id/drift', (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const state = stateManager.getAccountState(accountId);
    
    if (!state || (!(req as any).isSuperadmin && state.portfolioState.tenantId !== tenantId)) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
    }

    const model = state.portfolioState.modelId ? stateManager.getModels(state.portfolioState.tenantId || '').find(m => m.modelId === state.portfolioState.modelId) : null;
    if (!model) {
      return sendError(res, 400, 'NO_MODEL', 'Portfolio is not assigned to a model');
    }

    const prices = stateManager.getGlobalPrices();
    try {
      const evalResult = evaluateRebalance({
        eventId: `api-eval-${Date.now()}`,
        portfolioState: state.portfolioState,
        targetAllocation: model.targetAllocation,
        priceSnapshot: prices,
        policy: model.policy,
        createdAt: new Date().toISOString()
      });
      
      res.json({
        accountId: state.portfolioState.accountId,
        evaluatedAt: new Date().toISOString(),
        strategyType: evalResult.trigger.strategyType,
        rebalanceDue: evalResult.trigger.isTriggered,
        reason: evalResult.trigger.reason,
        driftByInstrument: evalResult.driftMeasurements.map((d: any) => ({
          instrumentId: d.instrumentId,
          currentWeight: d.currentWeight,
          targetWeight: d.targetWeight,
          absoluteDrift: d.absoluteDrift,
          relativeDrift: d.relativeDrift,
          thresholdBreach: d.isOutOfBand
        }))
      });
    } catch (e: any) {
      sendError(res, 500, 'INTERNAL_ERROR', e.message);
    }
  });

  router.get('/:id/proposals', async (req, res) => {
    const tenantId = (req as any).tenantId;
    const accountId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const state = stateManager.getAccountState(accountId);
    if (!state || (!(req as any).isSuperadmin && state.portfolioState.tenantId !== tenantId)) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', `Portfolio '${accountId}' not found`);
    }

    const proposals: any[] = [];
    
    try {
      const db = getDb();
      const rows = db.prepare(`SELECT * FROM AuditTrails WHERE accountId = ? AND outputs LIKE '%tradeProposal%' ORDER BY timestampMs DESC LIMIT ?`).all(accountId, limit) as any[];
      for (const row of rows) {
        if (row.outputs) {
          const parsedOutputs = JSON.parse(row.outputs);
          if (parsedOutputs && parsedOutputs.tradeProposal) {
            proposals.push({
              proposedAt: row.createdAt,
              executionMode: parsedOutputs.executionTargetMode,
              executed: row.type === 'LIVE_EXECUTION',
              trades: parsedOutputs.tradeProposal.trades,
              warnings: parsedOutputs.tradeProposal.warnings.map((w: any) => w.message)
            });
          }
        }
      }
    } catch(e) {
      // intentional empty catch
    }

    res.json({
      accountId,
      proposals
    });
  });

  return router;
}
