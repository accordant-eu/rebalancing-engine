import { TradeProposal, ProposedTrade, RebalancingPolicy, TargetAllocation, PriceSnapshot, ProposedLotAllocation } from '../models/domain';
import { EvaluationState } from './quality';

/**
 * An Execution Overlay intercepts a TradeProposal before the Quality Pipeline
 * and can mutate it by generating new trades or suppressing illegal trades.
 */
export interface ExecutionOverlay {
  name: string;
  apply(
    proposal: TradeProposal,
    state: EvaluationState,
    priceSnapshot: PriceSnapshot
  ): TradeProposal;
}

/**
 * Generative Overlay: Identifies tax lots with losses exceeding a threshold
 * and substitutes them for highly correlated assets based on mandate equivalency groups.
 */
export class OpportunisticLossHarvestingOverlay implements ExecutionOverlay {
  name = 'OpportunisticLossHarvestingOverlay';

  apply(
    proposal: TradeProposal,
    state: EvaluationState,
    priceSnapshot: PriceSnapshot
  ): TradeProposal {
    const policy = state.policy;
    if (!policy.tlhLossThresholdBps || !policy.equivalencyGroups) {
      return proposal;
    }

    const lossThreshold = policy.tlhLossThresholdBps / 10000;
    const newTrades: ProposedTrade[] = [];
    const tlhInjectedSubstitutes = new Map<string, string>(); // substitute -> primary

    for (const holding of state.valuation.holdings) {
      if (!holding.taxLots) continue;
      
      const currentPrice = priceSnapshot.prices[holding.instrumentId];
      if (!currentPrice || currentPrice <= 0) continue;

      // Find the equivalency group for this holding to locate a substitute
      let substitute: string | undefined;
      for (const group of policy.equivalencyGroups) {
        if (group.includes(holding.instrumentId)) {
          substitute = group.find(inst => inst !== holding.instrumentId);
          break;
        }
      }

      if (!substitute) continue; // No substitute available

      for (const lot of holding.taxLots) {
        if (!lot.unitCost) continue;

        const lossPct = (lot.unitCost - currentPrice) / lot.unitCost;
        if (lossPct > lossThreshold) {
          // Opportunistically harvest this loss
          const estimatedValue = lot.quantity * currentPrice;
          
          const sellAllocation: ProposedLotAllocation = {
            lotId: lot.lotId,
            quantity: lot.quantity,
            estimatedValue: estimatedValue,
            unitCost: lot.unitCost,
            acquisitionDate: lot.acquisitionDate
          };

          newTrades.push({
            instrumentId: holding.instrumentId,
            direction: 'SELL',
            quantity: lot.quantity,
            estimatedPrice: currentPrice,
            estimatedValue: estimatedValue,
            lotAllocations: [sellAllocation]
          });

          // Buy the substitute
          const substitutePrice = priceSnapshot.prices[substitute];
          if (substitutePrice && substitutePrice > 0) {
            newTrades.push({
              instrumentId: substitute,
              direction: 'BUY',
              quantity: estimatedValue / substitutePrice,
              estimatedPrice: substitutePrice,
              estimatedValue: estimatedValue
            });
            tlhInjectedSubstitutes.set(substitute, holding.instrumentId);
          }
        }
      }
    }

    if (newTrades.length > 0) {
      // Inject the Equivalency Mappings into the EvaluationState so the 
      // QualityPipeline/Drift Calculator doesn't reject it as tracking error.
      if (!state.temporaryEquivalencyMapping) {
        state.temporaryEquivalencyMapping = new Map<string, string>();
      }
      for (const [sub, pri] of tlhInjectedSubstitutes.entries()) {
        state.temporaryEquivalencyMapping.set(sub, pri);
      }
      
      // Mutate proposal
      proposal.trades.push(...newTrades);
      
      // Warn about TLH overrides
      proposal.warnings.push({
        code: 'TLH_HARVEST_GENERATED' as any,
        message: 'Tax-loss harvesting opportunity identified and injected into the proposal.'
      });
    }

    return proposal;
  }
}

/**
 * Constraint Overlay: Enforces MVP Wash Sale rules (Intra-proposal overlapping Buy/Sell).
 */
export class WashSaleLockoutOverlay implements ExecutionOverlay {
  name = 'WashSaleLockoutOverlay';

  apply(
    proposal: TradeProposal,
    state: EvaluationState,
    priceSnapshot: PriceSnapshot
  ): TradeProposal {
    const buyInstruments = new Set<string>();
    
    // Pass 1: Identify all buys
    for (const trade of proposal.trades) {
      if (trade.direction === 'BUY') {
        buyInstruments.add(trade.instrumentId);
      }
    }

    // Pass 2: Filter out sells for assets that are being bought, ONLY if they are at a loss.
    // Actually, any wash sale is illegal. We suppress the SELL trade.
    // Wait, if it's a drift sell, suppressing it might break the target. 
    // Usually, we only suppress the TLH sell. But how do we know which sell is TLH vs Drift?
    // In our pipeline, we can just block the trade if it has lotAllocations that are at a loss.
    
    let hasWashSale = false;
    const finalTrades: ProposedTrade[] = [];

    for (const trade of proposal.trades) {
      if (trade.direction === 'SELL' && buyInstruments.has(trade.instrumentId)) {
        // Is it a loss sell?
        let isLoss = false;
        if (trade.lotAllocations) {
           for (const lot of trade.lotAllocations) {
             if (lot.unitCost && trade.estimatedPrice < lot.unitCost) {
               isLoss = true;
               break;
             }
           }
        }
        
        if (isLoss) {
          hasWashSale = true;
          // Suppress this SELL trade by NOT adding it to finalTrades
          continue; 
        }
      }
      finalTrades.push(trade);
    }

    if (hasWashSale) {
      proposal.trades = finalTrades;
      proposal.warnings.push({
        code: 'WASH_SALE_LOCKOUT' as any,
        message: 'Tax-loss harvesting opportunity bypassed due to overlapping buy order (Wash Sale Prevention).'
      });
    }

    return proposal;
  }
}
