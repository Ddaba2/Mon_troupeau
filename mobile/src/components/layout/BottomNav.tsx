import React, { useState } from 'react';
import { Home, Users, Heart, BarChart3, Settings, Wallet, MoreHorizontal, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePermissions } from '../../hooks/usePermissions';

const MAX_VISIBLE = 5;

const ALL_TABS = [
  { id: 'dashboard', label: 'Accueil',   icon: Home,      always: true,  adminOnly: false },
  { id: 'moutons',   label: 'Troupeau',  icon: Users,     always: true,  adminOnly: false },
  { id: 'health',    label: 'Santé',     icon: Heart,     always: true,  adminOnly: false },
  { id: 'finances',  label: 'Finances',  icon: Wallet,    always: true,  adminOnly: false },
  { id: 'stats',     label: 'Stats',     icon: BarChart3, always: false, adminOnly: false },
  { id: 'settings',  label: 'Params',    icon: Settings,  always: true,  adminOnly: false },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useApp();
  const { canViewStats } = usePermissions();
  const [moreOpen, setMoreOpen] = useState(false);
  const currentMainTab = activeTab.split('/')[0];

  const visibleTabs = ALL_TABS.filter(t => {
    if (!t.always && !canViewStats) return false;
    return true;
  });

  // On garde MAX_VISIBLE dans la barre, le reste dans le menu Plus
  const mainTabs    = visibleTabs.slice(0, MAX_VISIBLE);
  const overflowTabs = visibleTabs.slice(MAX_VISIBLE);
  const showMore    = overflowTabs.length > 0;
  const isOverflowActive = overflowTabs.some(t => t.id === currentMainTab);

  const handleSelect = (id: string) => {
    setActiveTab(id);
    setMoreOpen(false);
  };

  return (
    <>
      {/* Menu déroulant Plus */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 rounded-t-3xl shadow-2xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Plus</span>
              <button onClick={() => setMoreOpen(false)} className="btn-icon text-gray-400 bg-gray-100 dark:bg-gray-800">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {overflowTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleSelect(id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-2xl transition-colors ${
                    currentMainTab === id
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                      : 'text-gray-500 dark:text-gray-400 active:bg-gray-50 dark:active:bg-gray-800'
                  }`}
                >
                  <Icon size={22} strokeWidth={currentMainTab === id ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 pb-safe">
        <div
          className="grid h-16"
          style={{ gridTemplateColumns: `repeat(${mainTabs.length + (showMore ? 1 : 0)}, 1fr)` }}
        >
          {mainTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                currentMainTab === id
                  ? 'text-primary-600'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon size={18} strokeWidth={currentMainTab === id ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium leading-none">{label}</span>
            </button>
          ))}

          {showMore && (
            <button
              onClick={() => setMoreOpen(p => !p)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isOverflowActive || moreOpen
                  ? 'text-primary-600'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <MoreHorizontal size={18} strokeWidth={1.5} />
              <span className="text-[9px] font-medium leading-none">Plus</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
