import { TradeOptimizerInterface, TradeOptimizerContext } from './trade-optimizer';
import { ProposedTrade, TradeProposal } from '../models/domain';
import { StandardRuleBasedTradeGenerator } from '../strategy/optimizers/standard-optimizer';
import { logger } from '../utils/logger';

export interface OracleAdapterConfig {
  serviceUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface OracleTarget {
  asset_class: string;
  target_weight: number;
  identifiers: string[];
}

export interface OracleTaxLot {
  tax_lot_id: string;
  identifier: string;
  quantity: number;
  cost_basis: number;
  date: string;
}

export interface OraclePrice {
  identifier: string;
  price: number;
}

export interface OracleOptimizationPayload {
  request_id?: string;
  targets: OracleTarget[];
  tax_lots: OracleTaxLot[];
  prices: OraclePrice[];
  cash: number;
  settings?: Record<string, any>;
}

export interface OracleTradeItem {
  identifier: string;
  direction: 'BUY' | 'SELL';
  quantity: number;
  estimated_price: number;
  lot_id?: string;
}

export interface OracleOptimizationResponse {
  request_id?: string;
  status: 'success' | 'error';
  error_message?: string;
  trades: OracleTradeItem[];
  metrics?: {
    estimated_realized_loss?: number;
    wash_sales_prevented?: number;
    execution_time_ms?: number;
  };
}

export class OracleTaxOptimizerAdapter implements TradeOptimizerInterface {
  readonly id = 'oracle_adapter';
  readonly name = 'Oracle External Tax Optimizer Adapter';
  readonly description = 'HTTP client adapter connecting to Double Finance Oracle optimization service for US tax-loss harvesting.';

  private fallbackGenerator = new StandardRuleBasedTradeGenerator();
  private serviceUrl: string;
  private apiKey?: string;
  private timeoutMs: number;

  // Circuit Breaker state variables
  private consecutiveFailures = 0;
  private circuitState: 'CLOSED' | 'OPEN' = 'CLOSED';
  private lastCircuitTripTime = 0;
  private readonly failureThreshold = 3;
  private readonly resetTimeoutMs = 30000;

  constructor(config?: OracleAdapterConfig) {
    this.serviceUrl = config?.serviceUrl ?? process.env.ORACLE_SERVICE_URL ?? 'http://localhost:8000/v1/optimize';
    this.apiKey = config?.apiKey ?? process.env.ORACLE_API_KEY;
    this.timeoutMs = config?.timeoutMs ?? 5000;
  }

  public getCircuitState(): 'CLOSED' | 'OPEN' {
    if (this.circuitState === 'OPEN' && Date.now() - this.lastCircuitTripTime > this.resetTimeoutMs) {
      return 'CLOSED';
    }
    return this.circuitState;
  }

  public async generateProposal(context: TradeOptimizerContext): Promise<TradeProposal> {
    const startTime = Date.now();

    // Check circuit breaker status
    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastCircuitTripTime > this.resetTimeoutMs) {
        logger.info('[OracleAdapter] Circuit breaker reset timeout expired. Transitioning to HALF-OPEN for retry.');
        this.circuitState = 'CLOSED';
      } else {
        logger.warn({ serviceUrl: this.serviceUrl }, '[OracleAdapter] Circuit breaker is OPEN due to consecutive failures. Short-circuiting to standard engine.');
        const fallbackProposal = await this.fallbackGenerator.generateProposal(context);
        return {
          ...fallbackProposal,
          warnings: [
            ...(fallbackProposal.warnings || []),
            {
              code: 'TAX_OPTIMIZER_UNREACHABLE_FALLBACK',
              message: `External US Tax Optimizer circuit breaker OPEN. Fell back to standard rule-based engine.`,
            },
          ],
        };
      }
    }

    try {
      const payload = this.buildPayload(context);
      const rawResponse = await this.callOracleService(payload);
      const response = this.sanitizeAndValidateResponse(rawResponse, payload.request_id);

      // On successful valid response, reset failure counter
      this.consecutiveFailures = 0;
      this.circuitState = 'CLOSED';

      const executionTimeMs = Date.now() - startTime;
      const trades: ProposedTrade[] = response.trades.map((t) => ({
        instrumentId: t.identifier,
        direction: t.direction,
        quantity: t.quantity,
        estimatedPrice: t.estimated_price,
        estimatedValue: t.quantity * t.estimated_price,
        metadata: {
          origin: 'ORACLE_TAX_OPTIMIZER',
          ...(t.lot_id ? { taxLotId: t.lot_id } : {}),
        },
      }));

      const estimatedPostTradeCash = this.calculatePostTradeCash(context.valuation.cash, trades);

      return {
        trades,
        estimatedPostTradeCash,
        warnings: [
          {
            code: 'TAX_OPTIMIZER_SUCCESS',
            message: `Successfully generated tax-aware trade proposal via Oracle (${executionTimeMs}ms).`,
          },
        ],
        executionTargetMode: context.policy.executionTargetMode ?? 'full_reset',
        metadata: {
          oracleExecutionTimeMs: String(executionTimeMs),
          estimatedRealizedLoss: String(response.metrics?.estimated_realized_loss ?? 0),
          washSalesPrevented: String(response.metrics?.wash_sales_prevented ?? 0),
        },
      };
    } catch (error: any) {
      this.recordFailure();
      logger.warn({ error: error.message, serviceUrl: this.serviceUrl, consecutiveFailures: this.consecutiveFailures }, '[OracleAdapter] Unreachable or error; falling back to standard engine');

      const fallbackProposal = await this.fallbackGenerator.generateProposal(context);

      return {
        ...fallbackProposal,
        warnings: [
          ...(fallbackProposal.warnings || []),
          {
            code: 'TAX_OPTIMIZER_UNREACHABLE_FALLBACK',
            message: `External US Tax Optimizer unreachable (${error.message}). Fell back to standard rule-based engine.`,
          },
        ],
      };
    }
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.circuitState = 'OPEN';
      this.lastCircuitTripTime = Date.now();
      logger.error({ consecutiveFailures: this.consecutiveFailures }, '[OracleAdapter] Failure threshold reached. Tripping circuit breaker to OPEN state.');
    }
  }

  public buildPayload(context: TradeOptimizerContext): OracleOptimizationPayload {
    const targets: OracleTarget[] = context.targetAllocation.targets.map((t) => ({
      asset_class: t.instrumentId,
      target_weight: t.weight,
      identifiers: [t.instrumentId],
    }));

    const taxLots: OracleTaxLot[] = [];
    for (const holding of context.portfolioState.holdings) {
      if (holding.taxLots && holding.taxLots.length > 0) {
        for (const lot of holding.taxLots) {
          taxLots.push({
            tax_lot_id: lot.lotId,
            identifier: holding.instrumentId,
            quantity: lot.quantity,
            cost_basis: lot.unitCost ?? context.priceSnapshot.prices[holding.instrumentId] ?? 0,
            date: lot.acquisitionDate ?? '2024-01-01',
          });
        }
      } else {
        taxLots.push({
          tax_lot_id: `lot_${holding.instrumentId}_default`,
          identifier: holding.instrumentId,
          quantity: holding.quantity,
          cost_basis: context.priceSnapshot.prices[holding.instrumentId] ?? 0,
          date: '2024-01-01',
        });
      }
    }

    const prices: OraclePrice[] = Object.entries(context.priceSnapshot.prices).map(([identifier, price]) => ({
      identifier,
      price,
    }));

    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    return {
      request_id: requestId,
      targets,
      tax_lots: taxLots,
      prices,
      cash: context.valuation.cash,
      settings: {
        rebalance_threshold: context.policy.absoluteDriftTolerance,
        minimum_trade_size: context.policy.minimumTradeSize,
      },
    };
  }

  public sanitizeAndValidateResponse(raw: any, expectedRequestId?: string): OracleOptimizationResponse {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Oracle service returned non-object response');
    }

    if (raw.status === 'error') {
      throw new Error(raw.error_message ?? 'Oracle service returned error status');
    }

    if (raw.status !== 'success') {
      throw new Error(`Oracle service returned unrecognized status: ${raw.status}`);
    }

    if (expectedRequestId && raw.request_id && raw.request_id !== expectedRequestId) {
      throw new Error(`Replay or mismatched request_id (expected ${expectedRequestId}, got ${raw.request_id})`);
    }

    if (!Array.isArray(raw.trades)) {
      throw new Error('Oracle service response missing valid trades array');
    }

    const sanitizedTrades: OracleTradeItem[] = [];
    for (const trade of raw.trades) {
      if (!trade || typeof trade !== 'object') continue;

      const identifier = String(trade.identifier || '').trim();
      const lotId = trade.lot_id ? String(trade.lot_id).trim() : undefined;
      const direction = trade.direction;
      const quantity = Number(trade.quantity);
      const price = Number(trade.estimated_price);

      if (!identifier) continue;
      if (direction !== 'BUY' && direction !== 'SELL') continue;
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      if (!Number.isFinite(price) || price <= 0) continue;

      sanitizedTrades.push({
        identifier,
        direction,
        quantity,
        estimated_price: price,
        ...(lotId ? { lot_id: lotId } : {}),
      });
    }

    const rawLoss = Number(raw.metrics?.estimated_realized_loss);
    const rawWash = Number(raw.metrics?.wash_sales_prevented);

    const estimated_realized_loss = Number.isFinite(rawLoss) && rawLoss >= 0 ? rawLoss : 0;
    const wash_sales_prevented = Number.isFinite(rawWash) && rawWash >= 0 ? rawWash : 0;

    return {
      request_id: raw.request_id,
      status: 'success',
      trades: sanitizedTrades,
      metrics: {
        estimated_realized_loss,
        wash_sales_prevented,
        execution_time_ms: Number(raw.metrics?.execution_time_ms) || 0,
      },
    };
  }

  private async callOracleService(payload: OracleOptimizationPayload): Promise<OracleOptimizationResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const res = await fetch(this.serviceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as OracleOptimizationResponse;
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  private calculatePostTradeCash(initialCash: number, trades: ProposedTrade[]): number {
    let cash = initialCash;
    for (const trade of trades) {
      if (trade.direction === 'SELL') {
        cash += trade.estimatedValue;
      } else if (trade.direction === 'BUY') {
        cash -= trade.estimatedValue;
      }
    }
    return cash;
  }
}
