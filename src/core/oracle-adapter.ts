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

  constructor(config?: OracleAdapterConfig) {
    this.serviceUrl = config?.serviceUrl ?? process.env.ORACLE_SERVICE_URL ?? 'http://localhost:8000/v1/optimize';
    this.apiKey = config?.apiKey ?? process.env.ORACLE_API_KEY;
    this.timeoutMs = config?.timeoutMs ?? 5000;
  }

  public async generateProposal(context: TradeOptimizerContext): Promise<TradeProposal> {
    const startTime = Date.now();

    try {
      const payload = this.buildPayload(context);
      const response = await this.callOracleService(payload);

      if (response.status === 'error' || !response.trades) {
        throw new Error(response.error_message ?? 'Oracle service returned error status');
      }

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
      logger.warn({ error: error.message, serviceUrl: this.serviceUrl }, '[OracleAdapter] Unreachable or error; falling back to standard engine');

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

    return {
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
