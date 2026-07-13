import React from 'react';
import { Home, Users, Layers, Activity } from 'lucide-react';
import { SharedWorkspaceLayout, type NavItem } from './SharedWorkspaceLayout';

interface TenantAdminLayoutProps {
  children: React.ReactNode;
  identityDisplay: string;
  onSignOut: () => void;
  activeTab: 'overview' | 'users' | 'models';
  onTabChange: (tab: 'overview' | 'users' | 'models') => void;
}

export const TenantAdminLayout: React.FC<TenantAdminLayoutProps> = ({ 
  children, 
  identityDisplay, 
  onSignOut,
  activeTab,
  onTabChange
}) => {
  
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Firm Overview', icon: Activity },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'models', label: 'Rebalancing Models', icon: Layers }
  ];

  return (
    <SharedWorkspaceLayout
      title="Firm Dashboard"
      titleIcon={Home}
      roleDisplay="Tenant Administrator"
      identityDisplay={identityDisplay}
      activeTab={activeTab}
      onTabChange={onTabChange as (tab: string) => void}
      onSignOut={onSignOut}
      navItems={navItems}
    >
      {children}
    </SharedWorkspaceLayout>
  );
};

