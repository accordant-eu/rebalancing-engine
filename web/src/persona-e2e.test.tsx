import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

function makeMockJwt(userId: string, tenantId: string, role: string, isSuperadmin = false): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ userId, tenantId, role, isSuperadmin }));
  return `${header}.${payload}.mock-signature`;
}

describe('E2E Browser Persona Verification (Plan Scenarios 1-4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Default mock fetch for all common API calls
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      // Login endpoint
      if (url === '/api/auth/login' && method === 'POST') {
        const body = JSON.parse(init?.body as string || '{}');
        const email = body.email;

        if (email === 'advisor@tenant.com') {
          return {
            ok: true,
            json: async () => ({
              token: makeMockJwt('usr-advisor', 'tenant-1', 'Advisor'),
              role: 'Advisor',
              isSuperadmin: false
            })
          } as Response;
        }

        if (email === 'compliance@tenant.com') {
          return {
            ok: true,
            json: async () => ({
              token: makeMockJwt('usr-compliance', 'tenant-1', 'Viewer'),
              role: 'Viewer',
              isSuperadmin: false
            })
          } as Response;
        }

        if (email === 'admin@tenant.com') {
          return {
            ok: true,
            json: async () => ({
              token: makeMockJwt('usr-admin', 'tenant-1', 'Admin'),
              role: 'Admin',
              isSuperadmin: false
            })
          } as Response;
        }

        if (email === 'admin@localhost') {
          return {
            ok: true,
            json: async () => ({
              token: makeMockJwt('user-superadmin', 'tenant-baseline', 'Superadmin', true),
              role: 'Superadmin',
              isSuperadmin: true
            })
          } as Response;
        }

        return {
          ok: false,
          status: 401,
          text: async () => 'Invalid credentials'
        } as Response;
      }

      // Logs endpoint
      if (url.includes('/api/logs')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'log-1',
                timestamp: '2026-10-19T08:00:00Z',
                portfolioId: 'pf-100',
                eventType: 'THRESHOLD_BREACH',
                actionTaken: 'TRADES_GENERATED',
                description: 'Threshold breached on US0378331005:XNAS:USD',
                details: { drift: 0.08, tradesCount: 2 }
              }
            ],
            nextCursor: null
          })
        } as Response;
      }

      // State endpoint
      if (url === '/api/state') {
        return {
          ok: true,
          json: async () => ({
            portStates: [
              {
                portfolioState: {
                  accountId: 'pf-100',
                  tenantId: 'tenant-1',
                  cash: 5000,
                  holdings: [{ instrumentId: 'US0378331005:XNAS:USD', quantity: 50 }]
                },
                priceSnapshot: { prices: { 'US0378331005:XNAS:USD': 150 } },
                targetAllocation: { targets: [{ instrumentId: 'US0378331005:XNAS:USD', weight: 1.0 }] },
                policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 }
              }
            ],
            globalPrices: { 'US0378331005:XNAS:USD': 150 }
          })
        } as Response;
      }

      // Metrics endpoint
      if (url === '/api/metrics') {
        return {
          ok: true,
          json: async () => ({
            totalPortfolios: 1,
            breachedPortfolios: 0,
            pendingOrdersCount: 0,
            rateLimitStatus: 'HEALTHY'
          })
        } as Response;
      }

      // Models endpoint
      if (url === '/api/models') {
        return {
          ok: true,
          json: async () => ([
            {
              modelId: 'model-growth',
              tenantId: 'tenant-1',
              name: 'Growth Core',
              archetype: 'StaticWeights',
              targetAllocation: { targets: [{ instrumentId: 'US0378331005:XNAS:USD', weight: 1.0 }] },
              policy: { strategyType: 'threshold', absoluteDriftTolerance: 0.05, minimumTradeSize: 10 }
            }
          ])
        } as Response;
      }

      // Stream ticket endpoint
      if (url === '/api/stream/ticket') {
        return {
          ok: true,
          json: async () => ({ ticket: 'st_mock_ticket' })
        } as Response;
      }

      // Admin endpoints
      if (url.includes('/api/admin/tenants')) {
        return {
          ok: true,
          json: async () => ([
            { tenantId: 'tenant-1', name: 'Alpha Wealth', brokerType: 'ALPACA' },
            { tenantId: 'tenant-baseline', name: 'Baseline Tenant', brokerType: 'MOCK' }
          ])
        } as Response;
      }

      if (url.includes('/api/users') || url.includes('/api/admin/users')) {
        return {
          ok: true,
          json: async () => ([
            { userId: 'usr-advisor', email: 'advisor@tenant.com', role: 'Advisor', status: 'Active' },
            { userId: 'usr-admin', email: 'admin@tenant.com', role: 'Admin', status: 'Active' }
          ])
        } as Response;
      }

      if (url.includes('/api/assets')) {
        return {
          ok: true,
          json: async () => ([
            { instrumentId: 'US0378331005:XNAS:USD', isin: 'US0378331005', ticker: 'AAPL', exchangeMic: 'XNAS', currency: 'USD' }
          ])
        } as Response;
      }

      if (url.includes('/api/admin/scheduler/status')) {
        return {
          ok: true,
          json: async () => ({ isRunning: true, pendingJobs: 0 })
        } as Response;
      }

      if (url.includes('/api/queue/status')) {
        return {
          ok: true,
          json: async () => ({ pendingCount: 0, processingCount: 0 })
        } as Response;
      }

      // Default 200 empty array/object
      return {
        ok: true,
        json: async () => ({})
      } as Response;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function performLogin(email: string, pass: string) {
    const emailInput = screen.getByPlaceholderText(/admin@accordant.eu/i);
    const passInput = screen.getByPlaceholderText(/••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to Engine/i });

    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(passInput, { target: { value: pass } });
    fireEvent.click(submitBtn);
  }

  it('Scenario 1: Advisor Workflow (advisor@tenant.com)', async () => {
    render(<App />);

    await performLogin('advisor@tenant.com', 'changeme123');

    // 1. Verify AdvisorLayout is rendered with correct workspace title and role badge
    await waitFor(() => {
      expect(screen.getByText(/Advisor Workspace/i)).toBeInTheDocument();
      expect(screen.getByText(/Portfolio Manager/i)).toBeInTheDocument();
    });

    // 2. Verify expected navigation tabs are present
    expect(screen.getByRole('button', { name: /Action Inbox/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All Portfolios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Model Mandates/i })).toBeInTheDocument();

    // 3. Verify user identity is displayed
    expect(screen.getByText(/usr-advisor \(tenant-1\)/i)).toBeInTheDocument();

    // 4. Verify restricted administrative & superadmin views are STRICTLY NOT visible
    expect(screen.queryByText(/Tenant Management/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/System Ops/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pulse & Telemetry/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Broker Integrations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Firm Overview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/User Management/i)).not.toBeInTheDocument();
  });

  it('Scenario 2: Compliance/Viewer Workflow (compliance@tenant.com)', async () => {
    render(<App />);

    await performLogin('compliance@tenant.com', 'changeme123');

    // 1. Verify ComplianceLayout is rendered with role display
    await waitFor(() => {
      expect(screen.getByText(/Compliance & Audit/i)).toBeInTheDocument();
      expect(screen.getByText(/Compliance Officer/i)).toBeInTheDocument();
    });

    // 2. Verify Audit Explorer nav item is active
    expect(screen.getByRole('button', { name: /Audit Explorer/i })).toBeInTheDocument();

    // 3. Verify the compliance logs table and filters are rendered
    expect(screen.getByPlaceholderText(/Filter by Account ID/i)).toBeInTheDocument();

    // 4. Verify restricted operational and administrative tabs are STRICTLY NOT visible
    expect(screen.queryByText(/All Portfolios/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Firm Overview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Model Mandates/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rebalancing Models/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tenant Management/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/System Ops/i)).not.toBeInTheDocument();
  });

  it('Scenario 3: Tenant Admin Workflow (admin@tenant.com)', async () => {
    render(<App />);

    await performLogin('admin@tenant.com', 'changeme123');

    // 1. Verify TenantAdminLayout is rendered
    await waitFor(() => {
      expect(screen.getByText(/Firm Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Tenant Administrator/i)).toBeInTheDocument();
    });

    // 2. Verify expected navigation tabs are present
    expect(screen.getByRole('button', { name: /Firm Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /User Management/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rebalancing Models/i })).toBeInTheDocument();

    // 3. Verify cross-tab navigation
    const usersTab = screen.getByRole('button', { name: /User Management/i });
    fireEvent.click(usersTab);

    const modelsTab = screen.getByRole('button', { name: /Rebalancing Models/i });
    fireEvent.click(modelsTab);

    // 4. Verify superadmin-only sysops and broker integration controls are STRICTLY NOT visible
    expect(screen.queryByText(/Pulse & Telemetry/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Broker Integrations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Asset Universe/i)).not.toBeInTheDocument();
  });

  it('Scenario 4: Superadmin Pulse (admin@localhost)', async () => {
    render(<App />);

    await performLogin('admin@localhost', 'changeme123');

    // 1. Verify SuperadminLayout is rendered
    await waitFor(() => {
      expect(screen.getByText(/Platform Pulse/i)).toBeInTheDocument();
      expect(screen.getByText(/Superadministrator/i)).toBeInTheDocument();
    });

    // 2. Verify all Superadmin tabs are present
    expect(screen.getByRole('button', { name: /Pulse & Telemetry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tenant Management/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Broker Integrations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Asset Universe/i })).toBeInTheDocument();

    // 3. Verify tab switching to Tenant Management
    const tenantsTab = screen.getByRole('button', { name: /Tenant Management/i });
    fireEvent.click(tenantsTab);

    // 4. Verify Sign Out restores login screen
    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/admin@accordant.eu/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In to Engine/i })).toBeInTheDocument();
    });
  });
});
