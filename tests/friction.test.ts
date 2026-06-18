import { FixedFeeModel, PercentageSlippageModel } from '../src/core/friction';
import { applyFrictionPenalties } from '../src/core/trades';
import { TradeProposal, ProposalWarningCode } from '../src/models/domain';

describe('Friction Models', () => {
  it('FixedFeeModel calculates constant fee', () => {
    const model = new FixedFeeModel(1.00);
    expect(model.estimateCost(10, 'US0378331005:XNAS:USD')).toBe(1.00);
    expect(model.estimateCost(1000, 'US0378331005:XNAS:USD')).toBe(1.00);
  });

  it('PercentageSlippageModel calculates bps slippage', () => {
    const model = new PercentageSlippageModel(5); // 5 bps = 0.05%
    expect(model.estimateCost(1000, 'US0378331005:XNAS:USD')).toBe(0.50);
    expect(model.estimateCost(10000, 'US0378331005:XNAS:USD')).toBe(5.00);
  });
});

describe('applyFrictionPenalties', () => {
  const proposal: TradeProposal = {
    trades: [
      { instrumentId: 'A', direction: 'BUY', quantity: 1, estimatedPrice: 10, estimatedValue: 10 },
      { instrumentId: 'B', direction: 'SELL', quantity: 1, estimatedPrice: 1000, estimatedValue: 1000 },
    ],
    estimatedPostTradeCash: 100,
    warnings: [],
    executionTargetMode: 'full_reset',
  };

  it('ignores penalty if maxFrictionBps is undefined', () => {
    const result = applyFrictionPenalties(proposal, 100, new FixedFeeModel(1.00), undefined);
    expect(result.trades.length).toBe(2);
  });

  it('suppresses trades whose fixed fee exceeds max friction', () => {
    // 50 bps max friction = 0.50%. 
    // Trade A (value 10): max acceptable cost = 10 * 0.005 = 0.05. Fixed fee 1.00 > 0.05. SUPPRESSED.
    // Trade B (value 1000): max acceptable cost = 1000 * 0.005 = 5.00. Fixed fee 1.00 < 5.00. ACCEPTED.
    const result = applyFrictionPenalties(proposal, 100, new FixedFeeModel(1.00), 50);
    
    expect(result.trades.length).toBe(1);
    expect(result.trades[0].instrumentId).toBe('B');
    
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].code).toBe('FRICTION_COST_EXCEEDED');
    expect(result.warnings[0].instrumentId).toBe('A');
  });

  it('recalculates post trade cash when trades are suppressed', () => {
    // Both trades suppressed (max friction 1 bps = 0.01%)
    // Trade B (value 1000): max cost = 0.10. Fixed fee 1.00 > 0.10. SUPPRESSED.
    const result = applyFrictionPenalties(proposal, 100, new FixedFeeModel(1.00), 1);
    
    expect(result.trades.length).toBe(0);
    expect(result.warnings.length).toBe(2);
    expect(result.estimatedPostTradeCash).toBe(100); // Back to starting cash since no trades
  });
});
