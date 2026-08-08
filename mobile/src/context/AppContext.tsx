import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppStats } from '../types';
import { query } from '../db/DatabaseService';
import { useDarkMode } from '../hooks/useDarkMode';
import { useSimplifiedMode } from '../hooks/useSimplifiedMode';

interface CountRow { count: number }
interface SalesRow { count: number; total: number }
interface TotalRow  { total: number }

interface AppContextType {
  stats: AppStats;
  refreshStats: () => Promise<void>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDark: boolean;
  toggleDark: () => void;
  simplified: boolean;
  toggleSimplified: () => void;
  // Permet à la recherche globale d'ouvrir directement la fiche d'un mouton
  // précis depuis n'importe quel écran.
  pendingMoutonId: number | null;
  setPendingMoutonId: (id: number | null) => void;
}

const defaultStats: AppStats = {
  totalMoutons: 0,
  moutonsVivants: 0,
  moutonsMales: 0,
  moutonsFemelles: 0,
  totalSales: 0,
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  pendingSync: 0,
};

const AppContext = createContext<AppContextType>({
  stats: defaultStats,
  refreshStats: async () => {},
  activeTab: 'dashboard',
  setActiveTab: () => {},
  isDark: false,
  toggleDark: () => {},
  simplified: false,
  toggleSimplified: () => {},
  pendingMoutonId: null,
  setPendingMoutonId: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<AppStats>(defaultStats);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingMoutonId, setPendingMoutonId] = useState<number | null>(null);
  const { isDark, toggleDark } = useDarkMode();
  const { simplified, toggleSimplified } = useSimplifiedMode();

  const refreshStats = useCallback(async () => {
    try {
      const [total, vivants, males, femelles, salesRows, expenseRows, p1, p2, p3] = await Promise.all([
        query<CountRow>('SELECT COUNT(*) as count FROM moutons WHERE deleted_at IS NULL'),
        query<CountRow>('SELECT COUNT(*) as count FROM moutons WHERE deleted_at IS NULL AND status = "vivant"'),
        query<CountRow>('SELECT COUNT(*) as count FROM moutons WHERE deleted_at IS NULL AND sex = "male"'),
        query<CountRow>('SELECT COUNT(*) as count FROM moutons WHERE deleted_at IS NULL AND sex = "femelle"'),
        query<SalesRow>('SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM sales WHERE deleted_at IS NULL'),
        query<TotalRow>('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE deleted_at IS NULL'),
        query<CountRow>('SELECT COUNT(*) as count FROM moutons WHERE synced = 0 AND deleted_at IS NULL'),
        query<CountRow>('SELECT COUNT(*) as count FROM health_records WHERE synced = 0 AND deleted_at IS NULL'),
        query<CountRow>('SELECT COUNT(*) as count FROM sales WHERE synced = 0 AND deleted_at IS NULL'),
      ]);

      const pendingSync = [p1, p2, p3].reduce((s, r) => s + (r[0]?.count ?? 0), 0);
      const totalRevenue   = salesRows[0]?.total   ?? 0;
      const totalExpenses  = expenseRows[0]?.total ?? 0;

      setStats({
        totalMoutons:    total[0]?.count    ?? 0,
        moutonsVivants:  vivants[0]?.count  ?? 0,
        moutonsMales:    males[0]?.count    ?? 0,
        moutonsFemelles: femelles[0]?.count ?? 0,
        totalSales:      salesRows[0]?.count ?? 0,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        pendingSync,
      });
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  return (
    <AppContext.Provider value={{ stats, refreshStats, activeTab, setActiveTab, isDark, toggleDark, simplified, toggleSimplified, pendingMoutonId, setPendingMoutonId }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
