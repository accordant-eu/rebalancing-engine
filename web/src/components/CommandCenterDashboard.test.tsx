import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CommandCenterDashboard, formatCompactCurrency } from './CommandCenterDashboard';
import type { StatePayload } from '../types';

describe('CommandCenterDashboard & formatCompactCurrency', () => {
  it('formats currency compactly across billions, millions, and standard values', () => {
    expect(formatCompactCurrency(70049448488.50)).toBe('$70.05B');
    expect(formatCompactCurrency(1500000000000)).toBe('$1.50T');
    expect(formatCompactCurrency(25400000)).toBe('$25.40M');
    expect(formatCompactCurrency(12500)).toBe('$12,500.00');
  });

  it('renders compact AUM and fires onBatchRebalance when clicked', () => {
    const mockState: StatePayload = {
      portfolios: {
        'acc-1': {
          portfolioState: {
            accountId: 'acc-1',
            tenantId: 'tenant-1',
            cash: 1000,
            holdings: [{ instrumentId: 'AAPL', quantity: 10 }],
            cashFlows: [],
            circuitBreakerStatus: 'closed',
          },
          targetAllocation: {
            targets: [{ instrumentId: 'AAPL', weight: 0.2 }],
          },
          policy: {
            absoluteDriftTolerance: 0.05,
          },
        },
      },
      globalPrices: {
        prices: { AAPL: 100000000 }, // equity = 1,000,000,000+
      },
    };

    const handleBatch = vi.fn();
    const handleSelect = vi.fn();

    render(
      <CommandCenterDashboard
        state={mockState}
        setSelectedAccountId={handleSelect}
        logs={[]}
        onBatchRebalance={handleBatch}
      />
    );

    // Should display formatted compact AUM
    expect(screen.getByText('$1.00B')).toBeDefined();

    // Should have Batch Rebalance button
    const batchBtn = screen.getByRole('button', { name: /Batch Rebalance \(1\)/i });
    expect(batchBtn).toBeDefined();

    fireEvent.click(batchBtn);
    expect(handleBatch).toHaveBeenCalledWith(['acc-1']);
  });
});
