import { PortfolioState, TaxLot, CashFlow } from '../models/domain';
import { toDecimal, roundQuantity, roundPrice, roundMoney } from './numeric';

export type CorporateActionType = 'SPLIT' | 'DIVIDEND' | 'CASH_DIVIDEND' | 'MERGER';

export interface BaseCorporateAction {
  instrumentId: string;
  exDate: string; // ISO date format YYYY-MM-DD
  type: CorporateActionType;
}

export interface SplitCorporateAction extends BaseCorporateAction {
  type: 'SPLIT';
  /**
   * Split multiplier ratio (e.g., 2.0 for a 2-for-1 forward split, 0.25 for a 1-for-4 reverse split).
   */
  ratio: number;
}

export interface DividendCorporateAction extends BaseCorporateAction {
  type: 'DIVIDEND' | 'CASH_DIVIDEND';
  /**
   * Cash dividend distributed per share held.
   */
  amountPerShare: number;
  payDate?: string;
}

export interface MergerCorporateAction extends BaseCorporateAction {
  type: 'MERGER';
  /**
   * Target instrument ID received in exchange for the acquired asset.
   */
  targetInstrumentId: string;
  /**
   * Conversion ratio (e.g., 1.5 new shares per 1 old share).
   */
  conversionRatio: number;
  /**
   * Optional cash received per old share in lieu of fractional shares or as part consideration.
   */
  cashInLieuPerShare?: number;
}

export type CorporateAction =
  | SplitCorporateAction
  | DividendCorporateAction
  | MergerCorporateAction;

export interface CorporateActionResult {
  portfolioState: PortfolioState;
  appliedActions: CorporateAction[];
  cashAdjustment: number;
  logs: string[];
}

/**
 * Applies a single corporate action to a portfolio state, adjusting share quantities,
 * recalculating tax lot unit costs to preserve total basis, or distributing dividends.
 */
export function applyCorporateActionToPortfolio(
  portfolio: PortfolioState,
  action: CorporateAction
): { updatedPortfolio: PortfolioState; log: string } {
  const currentHoldings = [...portfolio.holdings];
  const holdingIndex = currentHoldings.findIndex(h => h.instrumentId === action.instrumentId);

  if (holdingIndex === -1) {
    return {
      updatedPortfolio: portfolio,
      log: `No holding found for ${action.instrumentId}; skipping ${action.type}`,
    };
  }

  const holding = currentHoldings[holdingIndex];

  switch (action.type) {
    case 'SPLIT': {
      if (action.ratio <= 0 || !Number.isFinite(action.ratio)) {
        throw new Error(`Invalid split ratio: ${action.ratio}`);
      }

      const ratioDec = toDecimal(action.ratio);
      const newHoldingQuantity = roundQuantity(toDecimal(holding.quantity).mul(ratioDec).toNumber());

      const newTaxLots: TaxLot[] | undefined = holding.taxLots?.map(lot => {
        const lotQty = roundQuantity(toDecimal(lot.quantity).mul(ratioDec).toNumber());
        const unitCost = lot.unitCost !== undefined
          ? roundPrice(toDecimal(lot.unitCost).div(ratioDec).toNumber())
          : undefined;

        return {
          ...lot,
          quantity: lotQty,
          unitCost,
        };
      });

      currentHoldings[holdingIndex] = {
        ...holding,
        quantity: newHoldingQuantity,
        taxLots: newTaxLots,
      };

      return {
        updatedPortfolio: {
          ...portfolio,
          holdings: currentHoldings,
        },
        log: `Applied ${action.ratio}:1 split on ${action.instrumentId}: quantity adjusted from ${holding.quantity} to ${newHoldingQuantity}`,
      };
    }

    case 'DIVIDEND':
    case 'CASH_DIVIDEND': {
      if (action.amountPerShare <= 0 || !Number.isFinite(action.amountPerShare)) {
        throw new Error(`Invalid dividend amount per share: ${action.amountPerShare}`);
      }

      const dividendTotal = roundMoney(toDecimal(holding.quantity).mul(toDecimal(action.amountPerShare)).toNumber());
      const newCash = roundMoney(toDecimal(portfolio.cash).plus(toDecimal(dividendTotal)).toNumber());

      const newCashFlow: CashFlow = {
        cashFlowId: `div-${action.instrumentId}-${action.exDate}`,
        direction: 'DEPOSIT',
        status: 'SETTLED',
        amount: dividendTotal,
        effectiveDate: action.payDate || action.exDate,
        description: `Cash Dividend: ${action.instrumentId} ($${action.amountPerShare}/sh on ${holding.quantity} shs)`,
      };

      const existingCashFlows = portfolio.cashFlows || [];

      return {
        updatedPortfolio: {
          ...portfolio,
          cash: newCash,
          cashFlows: [...existingCashFlows, newCashFlow],
        },
        log: `Distributed $${dividendTotal} dividend for ${action.instrumentId} on ${holding.quantity} shares`,
      };
    }

    case 'MERGER': {
      if (action.conversionRatio <= 0 || !Number.isFinite(action.conversionRatio)) {
        throw new Error(`Invalid merger conversion ratio: ${action.conversionRatio}`);
      }

      const convRatio = toDecimal(action.conversionRatio);
      const convertedQuantity = roundQuantity(toDecimal(holding.quantity).mul(convRatio).toNumber());

      const cashInLieu = action.cashInLieuPerShare
        ? roundMoney(toDecimal(holding.quantity).mul(toDecimal(action.cashInLieuPerShare)).toNumber())
        : 0;

      const convertedTaxLots: TaxLot[] | undefined = holding.taxLots?.map(lot => {
        const lotQty = roundQuantity(toDecimal(lot.quantity).mul(convRatio).toNumber());
        const unitCost = lot.unitCost !== undefined
          ? roundPrice(toDecimal(lot.unitCost).div(convRatio).toNumber())
          : undefined;

        return {
          ...lot,
          quantity: lotQty,
          unitCost,
        };
      });

      // Remove old holding and insert/merge new holding
      currentHoldings.splice(holdingIndex, 1);
      const existingTargetIndex = currentHoldings.findIndex(h => h.instrumentId === action.targetInstrumentId);

      if (existingTargetIndex !== -1) {
        const targetHolding = currentHoldings[existingTargetIndex];
        currentHoldings[existingTargetIndex] = {
          ...targetHolding,
          quantity: toDecimal(targetHolding.quantity).plus(toDecimal(convertedQuantity)).toNumber(),
          taxLots: [...(targetHolding.taxLots || []), ...(convertedTaxLots || [])],
        };
      } else {
        currentHoldings.push({
          instrumentId: action.targetInstrumentId,
          quantity: convertedQuantity,
          taxLots: convertedTaxLots,
        });
      }

      const newCash = toDecimal(portfolio.cash).plus(toDecimal(cashInLieu)).toNumber();

      return {
        updatedPortfolio: {
          ...portfolio,
          cash: newCash,
          holdings: currentHoldings,
        },
        log: `Applied merger of ${action.instrumentId} into ${action.targetInstrumentId} (${convertedQuantity} shares, $${cashInLieu} cash in lieu)`,
      };
    }
  }
}

/**
 * Applies a batch of corporate actions matching an evaluation date to a portfolio.
 */
export function applyCorporateActions(
  portfolio: PortfolioState,
  actions: CorporateAction[],
  evaluationDate?: string
): CorporateActionResult {
  let currentPortfolio = { ...portfolio };
  const appliedActions: CorporateAction[] = [];
  const logs: string[] = [];
  const startingCash = toDecimal(portfolio.cash);

  for (const action of actions) {
    if (evaluationDate && action.exDate !== evaluationDate.slice(0, 10)) {
      continue;
    }

    const { updatedPortfolio, log } = applyCorporateActionToPortfolio(currentPortfolio, action);
    currentPortfolio = updatedPortfolio;
    appliedActions.push(action);
    logs.push(log);
  }

  const cashAdjustment = toDecimal(currentPortfolio.cash).minus(startingCash).toNumber();

  return {
    portfolioState: currentPortfolio,
    appliedActions,
    cashAdjustment,
    logs,
  };
}
