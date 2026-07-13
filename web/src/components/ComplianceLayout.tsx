import React, { useState } from 'react';
import { ShieldCheck, Search, FileBarChart } from 'lucide-react';
import { SharedWorkspaceLayout, type NavItem } from './SharedWorkspaceLayout';

export const ComplianceLayout: React.FC<{ 
  children: React.ReactNode; 
  identityDisplay: string; 
  onSignOut: () => void;
}> = ({ children, identityDisplay, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('explorer');

  const navItems: NavItem[] = [
    { id: 'explorer', label: 'Audit Explorer', icon: Search },
    { id: 'reports', label: 'Saved Reports', icon: FileBarChart }
  ];

  return (
    <SharedWorkspaceLayout
      title="Compliance & Audit"
      titleIcon={ShieldCheck}
      roleDisplay="Compliance Officer"
      identityDisplay={identityDisplay}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSignOut={onSignOut}
      navItems={navItems}
    >
      {children}
    </SharedWorkspaceLayout>
  );
};

