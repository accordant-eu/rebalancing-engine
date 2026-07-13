import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SharedWorkspaceLayout } from './SharedWorkspaceLayout';
import { Activity } from 'lucide-react';

describe('SharedWorkspaceLayout', () => {
  const mockNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Activity }
  ];

  it('renders title, profile, and navigation items', () => {
    render(
      <SharedWorkspaceLayout
        identityDisplay="Johan Hellman"
        roleDisplay="Administrator"
        activeTab="dashboard"
        onTabChange={vi.fn()}
        onSignOut={vi.fn()}
        navItems={mockNavItems}
        title="Test Workspace"
        titleIcon={Activity}
      >
        <div>Test Child Content</div>
      </SharedWorkspaceLayout>
    );

    expect(screen.getByText('Test Workspace')).toBeDefined();
    expect(screen.getByText('Administrator')).toBeDefined();
    expect(screen.getByText('Johan Hellman')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('Test Child Content')).toBeDefined();
  });
});
