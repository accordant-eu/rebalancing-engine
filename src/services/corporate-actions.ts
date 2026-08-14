import { LiveState } from '../orchestrator/state';
import { CorporateAction, applyCorporateActions, CorporateActionResult } from '../core/corporate-actions';
import { PortfolioState } from '../models/domain';

export { CorporateAction };

export class CorporateActionService {
  private knownActions: CorporateAction[] = [];

  public seedMockActions(actions: CorporateAction[]) {
    this.knownActions.push(...actions);
  }

  public getActionsForInstrumentOnDate(instrumentId: string, dateStr: string): CorporateAction[] {
    return this.knownActions.filter(
      a => a.instrumentId === instrumentId && a.exDate === dateStr
    );
  }

  public getActionsForDate(dateStr: string): CorporateAction[] {
    return this.knownActions.filter(a => a.exDate === dateStr);
  }

  public processActionsForPortfolio(portfolio: PortfolioState, dateStr: string): CorporateActionResult {
    return applyCorporateActions(portfolio, this.knownActions, dateStr);
  }
}

export class CorporateActionCircuitBreaker {
  private service: CorporateActionService;
  
  constructor(service: CorporateActionService) {
    this.service = service;
  }

  public evaluate(state: LiveState): { isValid: boolean; reason?: string } {
    // Determine the "current date" in YYYY-MM-DD. 
    // In live mode this is today. For tests it might be driven by policy.evaluationDate or just Date.now()
    const todayStr = state.policy.evaluationDate || new Date().toISOString().split('T')[0];

    // Check all holdings in the portfolio
    for (const holding of state.portfolioState.holdings) {
      const actions = this.service.getActionsForInstrumentOnDate(holding.instrumentId, todayStr);
      if (actions.length > 0) {
        return {
          isValid: false,
          reason: `Pending Corporate Action (${actions[0].type}) for ${holding.instrumentId} on ex-date ${todayStr}`
        };
      }
    }

    // Also check all target instruments
    for (const target of state.targetAllocation.targets) {
      const actions = this.service.getActionsForInstrumentOnDate(target.instrumentId, todayStr);
      if (actions.length > 0) {
        return {
          isValid: false,
          reason: `Pending Corporate Action (${actions[0].type}) for target ${target.instrumentId} on ex-date ${todayStr}`
        };
      }
    }

    return { isValid: true };
  }
}
