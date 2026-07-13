import React, { useState, useEffect } from 'react';
import { initDatabase } from './db/DatabaseService';
import { scheduleHealthReminders, initHealthReminderTapListener } from './services/notificationService';
import { advanceOverdueRecurrences } from './services/healthService';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BottomNav } from './components/layout/BottomNav';
import { SyncBanner } from './components/layout/SyncBanner';
import { SetupScreen } from './components/auth/SetupScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { MoutonsList } from './components/moutons/MoutonsList';
import { HealthList } from './components/health/HealthList';
import { StatisticsPage } from './components/statistics/StatisticsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { FinancesPage } from './components/finances/FinancesPage';
import { GlobalSearch } from './components/search/GlobalSearch';
import { useApp } from './context/AppContext';
import { usePermissions } from './hooks/usePermissions';

function Screen() {
  const { activeTab } = useApp();
  const { canViewStats } = usePermissions();
  const [mainTab, financeSubTab] = activeTab.split('/');

  return (
    <>
      {mainTab === 'dashboard'   && <Dashboard />}
      {mainTab === 'moutons'     && <MoutonsList />}
      {mainTab === 'health'      && <HealthList />}
      {mainTab === 'recherche'   && <GlobalSearch />}
      {mainTab === 'finances'    && <FinancesPage initialTab={financeSubTab as 'recettes' | 'depenses' | 'tableau' | undefined} />}
      {mainTab === 'stats'       && (
        canViewStats
          ? <StatisticsPage />
          : <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
              <p className="text-4xl mb-4">🔒</p>
              <p className="text-gray-500 dark:text-gray-400">Accès réservé aux Gérants et Administrateurs</p>
            </div>
      )}
      {mainTab === 'settings'    && <SettingsPage />}
    </>
  );
}

function NotificationBridge() {
  const { setActiveTab } = useApp();

  useEffect(() => {
    initHealthReminderTapListener(() => setActiveTab('health'));
  }, [setActiveTab]);

  return null;
}

function AuthGate() {
  const { isSetupDone, isAuthenticated, farmMode } = useAuth();

  if (!isSetupDone) return <SetupScreen />;
  if (farmMode === 'multi' && !isAuthenticated) return <LoginScreen />;

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <NotificationBridge />
        <SyncBanner />
        <main className="flex-1 overflow-auto pb-16">
          <Screen />
        </main>
        <BottomNav />
      </div>
    </AppProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-primary-600 flex flex-col items-center justify-center gap-4">
      <img src="/logo.png" alt="Mon Troupeau" className="w-36 h-36 object-contain drop-shadow-xl" />
      <h1 className="text-3xl font-bold text-white">Mon Troupeau</h1>
      <p className="text-primary-100 text-sm">Initialisation…</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl">⚠️</p>
      <h2 className="text-lg font-semibold text-gray-800">Erreur de démarrage</h2>
      <p className="text-sm text-gray-500 break-words max-w-xs">{message}</p>
      <button onClick={() => window.location.reload()} className="bg-primary-600 text-white px-6 py-3 rounded-full font-semibold">
        Réessayer
      </button>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initDatabase()
      .then(async () => {
        setReady(true);
        // Fait d'abord avancer les rappels récurrents dépassés, puis programme
        // les notifications (best-effort, silencieux si refus).
        await advanceOverdueRecurrences().catch(() => {});
        scheduleHealthReminders().catch(() => {});
      })
      .catch(e => setError(e?.message ?? 'Erreur inconnue'));
  }, []);

  if (error)  return <ErrorScreen message={error} />;
  if (!ready) return <LoadingScreen />;

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
