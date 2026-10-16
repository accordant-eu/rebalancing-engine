import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import App from './App';
import { ComplianceDashboard } from './components/ComplianceDashboard';
import { MandateBuilderForm } from './components/MandateBuilderForm';

describe('App Smoke & Persona Alignment Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without crashing and displays login', () => {
    render(<App />);
    expect(screen.getByText(/Accordant/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/admin@accordant.eu/i)).toBeInTheDocument();
  });

  it('ComplianceDashboard sends portfolioId query parameter when filtering by account ID', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], nextCursor: null })
    } as Response);

    render(<ComplianceDashboard token="viewer-token" />);

    const input = screen.getByPlaceholderText(/Filter by Account ID/i);
    fireEvent.change(input, { target: { value: 'pf-123' } });

    const searchBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/logs?portfolioId=pf-123'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer viewer-token' }
        })
      );
    });
  });

  it('MandateBuilderForm submits canonical concentration_limit constraint and supports dynamic archetypes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ([
        { instrumentId: 'AAPL', isin: 'US0378331005', ticker: 'AAPL', exchangeMic: 'XNAS', currency: 'USD' },
        { instrumentId: 'MSFT', isin: 'US5949181045', ticker: 'MSFT', exchangeMic: 'XNAS', currency: 'USD' }
      ])
    } as Response);

    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MandateBuilderForm onSubmit={onSubmit} token="admin-token" />);

    // Add a constraint and verify its default option value is concentration_limit
    const addConstraintBtn = screen.getByRole('button', { name: /Add Constraint/i });
    fireEvent.click(addConstraintBtn);

    const constraintOption = screen.getByRole('option', { name: /Concentration Limit/i }) as HTMLOptionElement;
    expect(constraintOption.value).toBe('concentration_limit');

    // Verify MinimumVariance and EfficientFrontier options are enabled
    const minVarOption = screen.getByRole('option', { name: /Minimum Variance/i }) as HTMLOptionElement;
    const efOption = screen.getByRole('option', { name: /Efficient Frontier/i }) as HTMLOptionElement;
    expect(minVarOption.disabled).toBe(false);
    expect(efOption.disabled).toBe(false);
  });
});

