import React from 'react';
import { Briefcase, Inbox, LineChart, FileText } from 'lucide-react';
import { SharedWorkspaceLayout, NavItem } from './SharedWorkspaceLayout';

export const AdvisorLayout: React.FC<{ 
  children: React.ReactNode; 
  identityDisplay: string; 
  onSignOut: () => void;
  activeTab: 'inbox' | 'fleet' | 'models';
  onTabChange: (tab: 'inbox' | 'fleet' | 'models') => void;
}> = ({ children, identityDisplay, onSignOut, activeTab, onTabChange }) => {

  const navItems: NavItem[] = [
    { id: 'inbox', label: 'Action Inbox', icon: Inbox },
    { id: 'fleet', label: 'All Portfolios', icon: LineChart },
    { id: 'models', label: 'Model Mandates', icon: FileText }
  ];

  return (
    <SharedWorkspaceLayout
      title="Advisor Workspace"
      titleIcon={Briefcase}
      roleDisplay="Portfolio Manager"
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

