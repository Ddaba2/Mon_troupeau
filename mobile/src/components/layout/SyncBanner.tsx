import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, ArrowDownUp } from 'lucide-react';
import { useNetwork } from '../../hooks/useNetwork';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { syncBidirectional } from '../../services/syncService';
import { logActivity } from '../../services/activityService';

export function SyncBanner() {
  const isOnline                    = useNetwork();
  const { stats, refreshStats }     = useApp();
  const { currentUser }             = useAuth();
  const [syncing, setSyncing]       = useState(false);
  const [message, setMessage]       = useState('');
  const prevOnlineRef               = useRef(isOnline);

  // Auto-sync au retour de la connexion si des données sont en attente
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (isOnline && wasOffline && stats.pendingSync > 0) {
      handleSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const show = !isOnline || stats.pendingSync > 0 || !!message;
  if (!show) return null;

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    setMessage('');
    try {
      const result = await syncBidirectional();
      const total  = result.pushed + result.pulled;
      const msg = result.errors.length === 0
        ? `${result.pushed} envoyés, ${result.pulled} reçus`
        : `${total} ok, ${result.errors.length} erreur(s)`;
      setMessage(msg);
      await logActivity(
        currentUser?.id,
        currentUser?.name ?? 'Système',
        `Synchronisation : ${msg}`,
        'sync',
      );
      await refreshStats();
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-sm ${
      isOnline
        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200'
        : 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200'
    }`}>
      {isOnline
        ? <Wifi size={15} className="shrink-0" />
        : <WifiOff size={15} className="shrink-0" />
      }
      <span className="flex-1 text-xs">
        {!isOnline && 'Hors connexion — données sauvegardées localement'}
        {isOnline && stats.pendingSync > 0 && !message && `${stats.pendingSync} enregistrement(s) à synchroniser`}
        {message && <strong>{message}</strong>}
      </span>
      {isOnline && (stats.pendingSync > 0 || syncing) && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold shrink-0"
        >
          {syncing
            ? <RefreshCw size={11} className="animate-spin" />
            : <ArrowDownUp size={11} />
          }
          {syncing ? '...' : 'Sync'}
        </button>
      )}
    </div>
  );
}
