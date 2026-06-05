import { ProposalWarning } from '../models/domain';
import { CashFlowSummary } from '../core/valuation';
import { CashFlowScheduleSummary } from '../core/cash-flows';
import { formatFixed } from '../core/numeric';

export function buildCashFlowProposalWarnings(
  cashFlowSummary: CashFlowSummary | undefined,
): ProposalWarning[] {
  if (cashFlowSummary === undefined || !cashFlowSummary.hasPendingCashFlows) {
    return [];
  }

  return [
    {
      code: 'PENDING_CASH_FLOW_EXCLUDED',
      pendingCashFlowCount: cashFlowSummary.pendingCashFlowCount,
      pendingNetAmount: cashFlowSummary.netPendingCashFlow,
      message: `Excluded ${cashFlowSummary.pendingCashFlowCount} pending cash flow${cashFlowSummary.pendingCashFlowCount === 1 ? '' : 's'} from valuation and trade sizing. Pending net amount: ${formatFixed(cashFlowSummary.netPendingCashFlow, 2)}.`,
    },
  ];
}

export function buildCashFlowScheduleProposalWarnings(
  cashFlowScheduleSummary: CashFlowScheduleSummary | undefined,
): ProposalWarning[] {
  if (cashFlowScheduleSummary === undefined || cashFlowScheduleSummary.futureEventCount === 0) {
    return [];
  }

  return [
    {
      code: 'FUTURE_CASH_FLOW_SCHEDULED',
      futureScheduledCashFlowCount: cashFlowScheduleSummary.futureEventCount,
      futureScheduledNetAmount: cashFlowScheduleSummary.netFutureCashFlow,
      message: `Excluded ${cashFlowScheduleSummary.futureEventCount} future scheduled cash flow${cashFlowScheduleSummary.futureEventCount === 1 ? '' : 's'} after evaluation date ${cashFlowScheduleSummary.evaluationDate}. Future scheduled net amount: ${formatFixed(cashFlowScheduleSummary.netFutureCashFlow, 2)}.`,
    },
  ];
}
