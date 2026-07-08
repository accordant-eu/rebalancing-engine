import React from 'react';
import { Shield, Building, Link2, Activity } from 'lucide-react';
import { SharedWorkspaceLayout, NavItem } from './SharedWorkspaceLayout';

interface SuperadminLayoutProps {
  children: React.ReactNode;
  identityDisplay: string;
  onSignOut: () => void;
  activeTab: 'tenants' | 'broker' | 'sysops' | 'assets';
  onTabChange: (tab: 'tenants' | 'broker' | 'sysops' | 'assets') => void;
}

export const SuperadminLayout: React.FC<SuperadminLayoutProps> = ({ 
  children, 
  identityDisplay, 
  onSignOut,
  activeTab,
  onTabChange
}) => {
  
  const navItems: NavItem[] = [
    { id: 'tenants', label: 'Tenant Management', icon: Building },
    { id: 'broker', label: 'Broker Integrations', icon: Link2 },
    { id: 'sysops', label: 'Pulse & Telemetry', icon: Activity },
    { id: 'assets', label: 'Asset Universe', icon: Building }
  ];

  return (
    <SharedWorkspaceLayout
      title="Platform Pulse"
      titleIcon={Shield}
      roleDisplay="Superadministrator"
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

