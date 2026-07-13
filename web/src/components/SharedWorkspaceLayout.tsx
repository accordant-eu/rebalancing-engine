import React from 'react';
import { LogOut, ChevronRight } from 'lucide-react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

/**
 * SharedWorkspaceLayoutProps
 * 
 * Defines the contract for the unified workspace layout.
 * 
 * **Persona Overrides:**
 * - **Advisor**: Sets `title="Advisor Workspace"`, uses blue/indigo accent colors (in their specific components), and provides `roleDisplay="Advisor"`.
 * - **Tenant Admin**: Sets `title="Firm Admin"`, uses teal/emerald accents, and provides `roleDisplay="Firm Administrator"`.
 * - **Compliance**: Sets `title="Compliance Explorer"`, uses rose/orange accents, and provides `roleDisplay="Compliance Officer"`.
 * - **Superadmin**: Sets `title="System Pulse"`, uses purple/fuchsia accents, and provides `roleDisplay="System Superadmin"`.
 * 
 * Each persona injects its own tailored `navItems` list containing relevant tools and views.
 */
export interface SharedWorkspaceLayoutProps {
  children: React.ReactNode;
  identityDisplay: string;
  roleDisplay?: string;
  onSignOut: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  navItems: NavItem[];
  title: string;
  titleIcon: React.ElementType;
}

export const SharedWorkspaceLayout: React.FC<SharedWorkspaceLayoutProps> = ({
  children,
  identityDisplay,
  roleDisplay = 'User',
  onSignOut,
  activeTab,
  onTabChange,
  navItems,
  title,
  titleIcon: TitleIcon
}) => {
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex h-screen bg-slate-50/50 text-slate-800 font-sans overflow-hidden">
        {/* Sidebar with Glassmorphism */}
        <aside className="w-72 bg-white/70 backdrop-blur-2xl border-r border-slate-200/50 flex flex-col shadow-[4px_0_30px_rgba(0,0,0,0.03)] z-20 relative transition-all">
          {/* Workspace Title */}
          <div className="p-6 pt-8 pb-8 flex items-center gap-4 text-slate-900 font-extrabold text-xl tracking-tight">
            <div className="p-2.5 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl shadow-glow-teal border border-teal-300/30">
              <TitleIcon size={22} className="text-white" strokeWidth={2.5} />
            </div>
            {title}
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
                    isActive 
                      ? 'text-teal-800 bg-white shadow-soft border border-teal-100/50' 
                      : 'text-slate-500 hover:bg-slate-100/60 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {isActive && (
                    <m.div 
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-gradient-to-r from-teal-50 to-transparent opacity-50 pointer-events-none"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <item.icon 
                      size={18} 
                      strokeWidth={isActive ? 2.5 : 2}
                      className={`transition-colors ${isActive ? 'text-teal-600' : 'text-slate-500 group-hover:text-teal-500'}`} 
                    />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight size={16} className="text-teal-400 relative z-10" />}
                </button>
              );
            })}
          </nav>
          
          {/* User Profile Area */}
          <div className="p-5 mx-4 mb-4 mt-2 bg-white/60 rounded-3xl border border-slate-200/50 backdrop-blur-md shadow-sm">
            <div className="flex flex-col mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">
                {roleDisplay}
              </span>
              <span className="text-sm font-semibold text-slate-800 truncate">
                {identityDisplay}
              </span>
            </div>
            <button 
              onClick={onSignOut} 
              className="w-full px-4 py-2.5 text-sm text-slate-600 bg-slate-100/80 border border-slate-200/60 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all duration-300 flex items-center justify-center gap-2 font-semibold"
            >
              <LogOut size={16} strokeWidth={2.5} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative z-0 h-screen overflow-hidden bg-transparent">
          {/* Top Gradient Fade for elegant scrolling effect */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-50/80 to-transparent z-10 pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto p-8 relative">
            <AnimatePresence mode="wait">
              <m.div
                key={activeTab}
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="h-full max-w-7xl mx-auto"
              >
                {children}
              </m.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </LazyMotion>
  );
};
