import { TradeProposal, ProposedTrade, RebalancingPolicy, TargetAllocation, PriceSnapshot, ProposedLotAllocation } from '../models/domain';
import { EvaluationState } from './quality';
import { toDecimal, roundQuantity, roundMoney, CALCULATION_EPSILON } from './numeric';
import Decimal from 'decimal.js';

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
      if (currentPrice === undefined || currentPrice <= 0 || Number.isNaN(currentPrice) || !Number.isFinite(currentPrice)) continue;

      let substitute: string | undefined;
      for (const group of policy.equivalencyGroups) {
        if (group.includes(holding.instrumentId)) {
          substitute = group.find(inst => inst !== holding.instrumentId);
          break;
        }
      }

      if (!substitute) continue;
      
      const substitutePrice = priceSnapshot.prices[substitute];
      if (substitutePrice === undefined || substitutePrice <= 0 || Number.isNaN(substitutePrice) || !Number.isFinite(substitutePrice)) continue;

      for (const lot of holding.taxLots) {
        if (lot.unitCost === undefined || lot.unitCost <= 0 || Number.isNaN(lot.unitCost) || !Number.isFinite(lot.unitCost)) continue;
        if (lot.quantity === undefined || lot.quantity <= 0 || Number.isNaN(lot.quantity) || !Number.isFinite(lot.quantity)) continue;
        if (lot.quantity > holding.quantity) continue;

        const lossPct = (lot.unitCost - currentPrice) / lot.unitCost;
        if (lossPct > lossThreshold) {
          const estimatedValue = lot.quantity * currentPrice;
          if (estimatedValue <= 0 || Number.isNaN(estimatedValue) || !Number.isFinite(estimatedValue)) continue;
          
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
            lotAllocations: [sellAllocation],
            metadata: { origin: 'OpportunisticLossHarvestingOverlay', reason: 'TLH_HARVEST' }
          });

          newTrades.push({
            instrumentId: substitute,
            direction: 'BUY',
            quantity: estimatedValue / substitutePrice,
            estimatedPrice: substitutePrice,
            estimatedValue: estimatedValue,
            metadata: { origin: 'OpportunisticLossHarvestingOverlay', reason: 'TLH_HARVEST' }
          });
          
          tlhInjectedSubstitutes.set(substitute, holding.instrumentId);
        }
      }
    }

    if (newTrades.length === 0) {
      return proposal;
    }

    const newProposal: TradeProposal = {
      ...proposal,
      trades: [...proposal.trades, ...newTrades],
      warnings: [...proposal.warnings, {
        code: 'TLH_HARVEST_GENERATED',
        message: 'Tax-loss harvesting opportunity identified and injected into the proposal.'
      }],
      temporaryEquivalencyMapping: proposal.temporaryEquivalencyMapping ? new Map(proposal.temporaryEquivalencyMapping) : new Map()
    };

    for (const [sub, pri] of tlhInjectedSubstitutes.entries()) {
      newProposal.temporaryEquivalencyMapping!.set(sub, pri);
    }

    return newProposal;
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
    const policy = state.policy;
    if (!policy.equivalencyGroups) {
      return proposal; // Cannot resolve wash sales without equivalency definitions
    }

    // A wash sale occurs if we BUY an asset in an equivalency group, and SELL an asset in that same group at a loss.
    // To prevent it, we suppress the TLH trades (both the SELL and the BUY of the substitute) if there's any BUY in that group.

    // 1. Map each instrument to its equivalency group
    const instrumentToGroup = new Map<string, string[]>();
    for (const group of policy.equivalencyGroups) {
      for (const inst of group) {
        instrumentToGroup.set(inst, group);
      }
    }

    // 2. Identify all groups that have a BUY trade (that is NOT a TLH buy). We prioritize drift buys.
    const groupsWithDriftBuy = new Set<string[]>();
    for (const trade of proposal.trades) {
      if (trade.direction === 'BUY' && trade.metadata?.origin !== 'OpportunisticLossHarvestingOverlay') {
        const group = instrumentToGroup.get(trade.instrumentId);
        if (group) {
          groupsWithDriftBuy.add(group);
        } else {
          // If the instrument is not in a group, we create a single-element group just for itself
          groupsWithDriftBuy.add([trade.instrumentId]);
        }
      }
    }

    // 3. Filter out TLH trades that fall into a group that has a drift buy.
    let hasWashSaleConflict = false;
    const finalTrades: ProposedTrade[] = [];
    const newWarnings = [...proposal.warnings];

    for (const trade of proposal.trades) {
      if (trade.metadata?.origin === 'OpportunisticLossHarvestingOverlay') {
        const group = instrumentToGroup.get(trade.instrumentId) || [trade.instrumentId];
        
        if (groupsWithDriftBuy.has(group)) {
          // This TLH trade conflicts with a drift buy in the same equivalency group!
          // We suppress it.
          hasWashSaleConflict = true;
          if (trade.direction === 'SELL') {
             newWarnings.push({
               code: 'WASH_SALE_LOCKOUT',
               message: 'Tax-loss harvesting opportunity bypassed due to overlapping drift buy order within the equivalency group (Wash Sale Prevention).',
               instrumentId: trade.instrumentId,
               estimatedValue: trade.estimatedValue
             });
          }
          continue; 
        }
      }
      finalTrades.push(trade);
    }

    if (hasWashSaleConflict) {
      return {
        ...proposal,
        trades: finalTrades,
        warnings: newWarnings
      };
    }

    return proposal;
  }
}

/**
 * Constraint Overlay: Enforces UK HMRC 30-day Bed-and-Breakfasting matching rules.
 * Suppresses TLH loss-harvesting trades when a same-day or 30-day repurchase occurs in the same asset or equivalency group.
 */
export class UkBedAndBreakfastOverlay implements ExecutionOverlay {
  name = 'UkBedAndBreakfastOverlay';

  apply(
    proposal: TradeProposal,
    state: EvaluationState,
    _priceSnapshot: PriceSnapshot
  ): TradeProposal {
    const policy = state.policy;
    
    // Map instrument to its equivalency group if defined, otherwise group containing only itself
    const instrumentToGroup = new Map<string, string[]>();
    if (policy.equivalencyGroups) {
      for (const group of policy.equivalencyGroups) {
        for (const inst of group) {
          instrumentToGroup.set(inst, group);
        }
      }
    }

    // 1. Identify all groups that have a non-TLH BUY order in the current proposal
    const groupsWithBuy = new Set<string[]>();
    for (const trade of proposal.trades) {
      if (trade.direction === 'BUY' && trade.metadata?.origin !== 'OpportunisticLossHarvestingOverlay') {
        const group = instrumentToGroup.get(trade.instrumentId) || [trade.instrumentId];
        groupsWithBuy.add(group);
      }
    }

    // 2. Identify instruments that have recent acquisitions (within 30 days) from tax-lot history
    const evaluationDate = policy.evaluationDate || _priceSnapshot?.asOf;
    const instrumentsWithRecentAcquisition = new Set<string>();
    if (evaluationDate) {
      const evalMs = new Date(evaluationDate.slice(0, 10) + 'T00:00:00Z').getTime();
      for (const holding of state.valuation.holdings) {
        if (!holding.taxLots) continue;
        for (const lot of holding.taxLots) {
          if (!lot.acquisitionDate) continue;
          const acqMs = new Date(lot.acquisitionDate.slice(0, 10) + 'T00:00:00Z').getTime();
          const diffDays = Math.abs((evalMs - acqMs) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) {
            instrumentsWithRecentAcquisition.add(holding.instrumentId);
            const group = instrumentToGroup.get(holding.instrumentId);
            if (group) {
              groupsWithBuy.add(group);
            }
          }
        }
      }
    }

    // 3. Filter out TLH trades that conflict with 30-day repurchase / bed-and-breakfast matching
    let hasBnbConflict = false;
    const finalTrades: ProposedTrade[] = [];
    const newWarnings = [...proposal.warnings];

    for (const trade of proposal.trades) {
      if (trade.metadata?.origin === 'OpportunisticLossHarvestingOverlay') {
        const group = instrumentToGroup.get(trade.instrumentId) || [trade.instrumentId];
        const hasRecentAcq = instrumentsWithRecentAcquisition.has(trade.instrumentId);
        
        if (groupsWithBuy.has(group) || hasRecentAcq) {
          hasBnbConflict = true;
          if (trade.direction === 'SELL') {
            newWarnings.push({
              code: 'UK_BED_AND_BREAKFAST_LOCKOUT',
              message: 'Tax-loss harvesting trade suppressed under UK HMRC 30-day Bed-and-Breakfast matching rules.',
              instrumentId: trade.instrumentId,
              estimatedValue: trade.estimatedValue
            });
          }
          continue;
        }
      }
      finalTrades.push(trade);
    }

    if (hasBnbConflict) {
      return {
        ...proposal,
        trades: finalTrades,
        warnings: newWarnings
      };
    }

    return proposal;
  }
}

/**
 * Compliance Overlay: Prohibits BUY trades for restricted, sanctioned, or ESG-excluded instruments.
 * Allows SELL trades (divestment) to proceed unimpeded.
 */
export class ExclusionListOverlay implements ExecutionOverlay {
  name = 'ExclusionListOverlay';

  apply(
    proposal: TradeProposal,
    state: EvaluationState,
    _priceSnapshot: PriceSnapshot
  ): TradeProposal {
    const exclusionList = state.policy.exclusionList;
    if (!exclusionList || exclusionList.length === 0) {
      return proposal;
    }

    const excludedSet = new Set(exclusionList);
    const finalTrades: ProposedTrade[] = [];
    const newWarnings = [...proposal.warnings];
    let cashAdjusted = toDecimal(proposal.estimatedPostTradeCash);

    for (const trade of proposal.trades) {
      if (trade.direction === 'BUY' && excludedSet.has(trade.instrumentId)) {
        newWarnings.push({
          code: 'TRADE_SUPPRESSED_BY_OVERLAY',
          message: `BUY trade for ${trade.instrumentId} suppressed: instrument is on the mandate exclusion list.`,
          instrumentId: trade.instrumentId,
          estimatedValue: trade.estimatedValue,
        });
        cashAdjusted = cashAdjusted.plus(toDecimal(trade.estimatedValue));
        continue;
      }
      finalTrades.push(trade);
    }

    return {
      ...proposal,
      trades: finalTrades,
      estimatedPostTradeCash: cashAdjusted.toNumber(),
      warnings: newWarnings,
    };
  }
}

/**
 * Risk & Policy Constraint Overlay: Enforces a hard maximum concentration cap per instrument.
 * Resizes or suppresses proposed BUY trades that would push the asset's total portfolio weight
 * above policy.maxHoldingConcentration (e.g., 0.20 for 20%).
 */
export class HoldingConcentrationCapOverlay implements ExecutionOverlay {
  name = 'HoldingConcentrationCapOverlay';

  apply(
    proposal: TradeProposal,
    state: EvaluationState,
    priceSnapshot: PriceSnapshot
  ): TradeProposal {
    const maxConcentration = state.policy.maxHoldingConcentration;
    if (maxConcentration === undefined || maxConcentration <= 0 || maxConcentration >= 1) {
      return proposal;
    }

    const totalPortfolioValue = toDecimal(state.valuation.totalPortfolioValue);
    if (totalPortfolioValue.lte(0)) {
      return proposal;
    }

    const maxAllowedValue = totalPortfolioValue.mul(toDecimal(maxConcentration));
    const minTradeSize = toDecimal(state.policy.minimumTradeSize || 0);

    const currentHoldingsMap = new Map<string, Decimal>();
    for (const h of state.valuation.holdings) {
      currentHoldingsMap.set(h.instrumentId, toDecimal(h.marketValue));
    }

    const finalTrades: ProposedTrade[] = [];
    const newWarnings = [...proposal.warnings];
    let cashAdjusted = toDecimal(proposal.estimatedPostTradeCash);

    for (const trade of proposal.trades) {
      if (trade.direction !== 'BUY') {
        finalTrades.push(trade);
        continue;
      }

      const currentVal = currentHoldingsMap.get(trade.instrumentId) || toDecimal(0);
      const proposedBuyVal = toDecimal(trade.estimatedValue);
      const postTradeVal = currentVal.plus(proposedBuyVal);

      if (postTradeVal.gt(maxAllowedValue.plus(CALCULATION_EPSILON))) {
        const allowableBuyVal = maxAllowedValue.minus(currentVal);

        if (allowableBuyVal.lte(CALCULATION_EPSILON) || allowableBuyVal.lt(minTradeSize)) {
          // Already at or above cap, or allowable increment is below minimum trade size -> suppress
          newWarnings.push({
            code: 'TRADE_SUPPRESSED_BY_OVERLAY',
            message: `BUY trade for ${trade.instrumentId} suppressed: position exceeds maximum concentration cap of ${(maxConcentration * 100).toFixed(1)}%.`,
            instrumentId: trade.instrumentId,
            estimatedValue: trade.estimatedValue,
          });
          cashAdjusted = cashAdjusted.plus(proposedBuyVal);
          continue;
        }

        // Resize BUY trade down to allowable ceiling
        const price = priceSnapshot.prices[trade.instrumentId] || trade.estimatedPrice;
        const newQty = roundQuantity(allowableBuyVal.div(toDecimal(price)).toNumber());
        const newEstimatedVal = roundMoney(allowableBuyVal.toNumber());
        const cashRefund = proposedBuyVal.minus(toDecimal(newEstimatedVal));
        cashAdjusted = cashAdjusted.plus(cashRefund);

        newWarnings.push({
          code: 'TRADE_RESIZED_BY_OVERLAY',
          message: `BUY trade for ${trade.instrumentId} resized from $${proposedBuyVal.toFixed(2)} to $${newEstimatedVal.toFixed(2)} to respect ${(maxConcentration * 100).toFixed(1)}% concentration cap.`,
          instrumentId: trade.instrumentId,
          estimatedValue: newEstimatedVal,
        });

        finalTrades.push({
          ...trade,
          quantity: newQty,
          estimatedValue: newEstimatedVal,
          metadata: {
            ...trade.metadata,
            resizedByOverlay: true,
            originalEstimatedValue: trade.estimatedValue,
          },
        });
      } else {
        finalTrades.push(trade);
      }
    }

    return {
      ...proposal,
      trades: finalTrades,
      estimatedPostTradeCash: cashAdjusted.toNumber(),
      warnings: newWarnings,
    };
  }
}


