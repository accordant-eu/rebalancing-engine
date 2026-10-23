import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarketingSandboxModal } from './components/MarketingSandboxModal';
import { PartnerOnboardingModal } from './components/PartnerOnboardingModal';
import { SharedWorkspaceLayout } from './components/SharedWorkspaceLayout';
import App from './App';

describe('Slice 6: Commercial Funnel & White-Label Theming', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders marketing sandbox modal and calculates simulated rebalance outcomes', async () => {
    const mockSimulationResult = {
      initialValuation: { totalEquity: 76000 },
      summary: {
        totalTrades: 1,
        maxDriftBefore: 0.152,
        maxDriftAfter: 0.001,
        turnoverRate: 0.125,
        estimatedFrictionValue: 35.40,
        frictionBps: 4.65
      },
      proposal: {
        trades: [
          {
            instrumentId: 'US0378331005:XNAS:USD',
            direction: 'BUY',
            quantity: 25,
            estimatedValue: 7500
          }
        ]
      },
      explanation: {
        narrative: 'Rebalance reduces drift by 15.1% across 1 assets.'
      }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockSimulationResult
    } as Response);

    const onClose = vi.fn();
    render(<MarketingSandboxModal onClose={onClose} />);

    expect(screen.getByText(/Interactive Rebalancing Sandbox/i)).toBeInTheDocument();
    expect(screen.getByText(/Run Rebalance Simulation/i)).toBeInTheDocument();

    const simulateBtn = screen.getByText(/Run Rebalance Simulation/i);
    fireEvent.click(simulateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Deterministic Evaluation Metrics/i)).toBeInTheDocument();
      expect(screen.getByText(/12.5%/i)).toBeInTheDocument();
      expect(screen.getByText(/\$35.40/i)).toBeInTheDocument();
      expect(screen.getByText(/US0378331005:XNAS:USD/i)).toBeInTheDocument();
    });
  });

  it('renders zero-touch partner onboarding modal and performs self-serve registration', async () => {
    const mockOnboardingResponse = {
      message: 'Onboarding completed successfully',
      tenant: {
        tenantId: 'apex-capital',
        name: 'Apex Capital Partners',
        tier: 'partner',
        status: 'active'
      },
      user: {
        userId: 'usr-admin-apex',
        email: 'founder@apexcapital.io',
        role: 'Admin'
      },
      apiKey: {
        id: 'key-123',
        secret: 'sk_live_apex_test_secret_key_123',
        name: 'Default M2M Key'
      },
      defaultModel: {
        modelId: 'model-apex-capital-balanced-growth'
      }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockOnboardingResponse
    } as Response);

    const onClose = vi.fn();
    const onSuccessLogin = vi.fn();

    render(<PartnerOnboardingModal onClose={onClose} onSuccessLogin={onSuccessLogin} />);

    expect(screen.getByText(/Self-Serve Partner Onboarding/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero-Touch/i)).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Apex Wealth Management/i), { target: { value: 'Apex Capital Partners' } });
    fireEvent.change(screen.getByPlaceholderText(/admin@apexwealth.com/i), { target: { value: 'founder@apexcapital.io' } });
    fireEvent.change(screen.getByPlaceholderText(/Min 8 characters/i), { target: { value: 'SecurePassword123!' } });

    const submitBtn = screen.getByRole('button', { name: /Provision Tenant Workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tenant Provisioned Successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/sk_live_apex_test_secret_key_123/i)).toBeInTheDocument();
    });

    const proceedBtn = screen.getByText(/Sign In to Your Workspace/i);
    fireEvent.click(proceedBtn);

    expect(onSuccessLogin).toHaveBeenCalledWith('founder@apexcapital.io', 'SecurePassword123!');
  });

  it('displays commercial exploration options on unauthenticated App login view', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/public/branding') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            portalTitle: 'Accordant Wealth Platform',
            primaryColor: '#0ea5e9'
          })
        } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    });

    render(<App />);

    expect(screen.getByText(/Commercial Exploration/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Sandbox/i)).toBeInTheDocument();
    expect(screen.getByText(/Partner Sign-Up/i)).toBeInTheDocument();

    // Open sandbox modal
    fireEvent.click(screen.getByText(/Live Sandbox/i));
    expect(screen.getByText(/Interactive Rebalancing Sandbox/i)).toBeInTheDocument();
  });

  it('applies tenant primary color and portal title in SharedWorkspaceLayout', () => {
    const DummyIcon = () => <div>icon</div>;
    const { container } = render(
      <SharedWorkspaceLayout
        title="Custom Advisor Desk"
        titleIcon={DummyIcon}
        identityDisplay="advisor@apexcapital.io"
        brandName="Apex Capital Platform"
        primaryColor="#10b981"
        activeTab="fleet"
        onTabChange={() => {}}
        onSignOut={() => {}}
        navItems={[{ id: 'fleet', label: 'Portfolios', icon: DummyIcon }]}
      >
        <div>Custom Content</div>
      </SharedWorkspaceLayout>
    );

    expect(screen.getByText('Apex Capital Platform')).toBeInTheDocument();
    expect(container.querySelector('[style*="--tenant-primary: #10b981"]')).toBeInTheDocument();
  });
});
