import React, { useState } from 'react';
import { Home, Users, Heart, BarChart3, Settings, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePermissions } from '../../hooks/usePermissions';
import { speak } from '../../utils/voice';

const MAX_VISIBLE = 5;

const ALL_TABS = [
  { id: 'dashboard', label: 'Accueil',   icon: Home,      always: true,  adminOnly: false },
  { id: 'moutons',   label: 'Troupeau',  icon: Users,     always: true,  adminOnly: false },
  { id: 'health',    label: 'Santé',     icon: Heart,     always: true,  adminOnly: false },
  { id: 'finances',  label: 'Finances',  icon: Wallet,    always: true,  adminOnly: false },
  { id: 'stats',     label: 'Stats',     icon: BarChart3, always: false, adminOnly: false },
  { id: 'settings',  label: 'Paramètres', icon: Settings, always: true,  adminOnly: false },
];

export function BottomNav() {
  const { activeTab, setActiveTab, simplified } = useApp();
  const { canViewStats } = usePermissions();
  const currentMainTab = activeTab.split('/')[0];

  const visibleTabs = ALL_TABS.filter(t => {
    if (!t.always && !canViewStats) return false;
    return true;
  });

  // On garde MAX_VISIBLE dans la barre, le reste est accessible depuis le dernier bouton.
  const mainTabs    = visibleTabs.slice(0, MAX_VISIBLE);
  const overflowTabs = visibleTabs.slice(MAX_VISIBLE);
  const showMore    = overflowTabs.length > 0;
  const isOverflowActive = overflowTabs.some(t => t.id === currentMainTab);
  const overflowTab = overflowTabs[0];

  const handleSelect = (id: string, label: string) => {
    if (simplified) speak(label);
    setActiveTab(id);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 pb-safe">
        <div
          className="grid h-16"
          style={{ gridTemplateColumns: `repeat(${mainTabs.length + (showMore ? 1 : 0)}, 1fr)` }}
        >
          {mainTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleSelect(id, label)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentMainTab === id
                  ? 'text-primary-600'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon size={simplified ? 26 : 18} strokeWidth={currentMainTab === id ? 2.5 : 1.5} />
              <span className="text-[9px] simplified:text-xs font-medium leading-none">{label}</span>
            </button>
          ))}

          {showMore && overflowTab && (
            <button
              onClick={() => handleSelect(overflowTab.id, overflowTab.label)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isOverflowActive
                  ? 'text-primary-600'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Settings size={simplified ? 26 : 18} strokeWidth={isOverflowActive ? 2.5 : 1.5} />
              <span className="text-[9px] simplified:text-xs font-medium leading-none">{overflowTab.label}</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
