import React, { useState, useEffect, useRef } from 'react';
import { Settings, Moon, Sun, Download, FileJson, LogOut, Trash2, Users, ClipboardList, Info, ChevronRight, ChevronDown, Wifi, Bell, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { UserManagement } from '../admin/UserManagement';
import { ActivityLog } from '../admin/ActivityLog';
import { TrashPage } from './TrashPage';
import { getSales } from '../../services/saleService';
import { getMoutons } from '../../services/moutonService';
import { getHealthRecords } from '../../services/healthService';
import { getExpenses } from '../../services/expenseService';
import { downloadJSON, downloadPDF } from '../../utils/exportUtils';
import { restoreFromBackup, isValidBackup } from '../../services/backupService';
import { TARGET_LABELS } from '../sales/SalesList';
import { run, saveStore } from '../../db/DatabaseService';
import { setSetting } from '../../services/userService';
import { logActivity } from '../../services/activityService';
import { getSyncApiUrl, setSyncApiUrl, getSyncToken, setSyncToken } from '../../services/syncService';
import { areHealthRemindersEnabled, setHealthRemindersEnabled } from '../../services/notificationService';

type AdminSection = 'users' | 'activity' | 'trash' | null;

export function SettingsPage() {
  const { isDark, toggleDark, stats } = useApp();
  const { currentUser, farmMode, farmName, setFarmName, logout } = useAuth();
  const { isAdmin, isGerant, canExport, canManageUsers, canDelete } = usePermissions();
  const [adminSection, setAdminSection] = useState<AdminSection>(null);
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editFarmName, setEditFarmName] = useState(false);
  const [tmpFarmName, setTmpFarmName]   = useState(farmName);
  const [syncUrl, setSyncUrlState]      = useState(getSyncApiUrl);
  const [syncToken, setSyncTokenState]  = useState(getSyncToken);
  const [syncSaved, setSyncSaved]       = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [pendingBackup, setPendingBackup] = useState<ReturnType<typeof JSON.parse> | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    areHealthRemindersEnabled().then(setRemindersEnabled);
  }, []);

  const handleToggleReminders = async () => {
    const next = !remindersEnabled;
    setRemindersEnabled(next);
    await setHealthRemindersEnabled(next);
  };

  const handleExportJSON = async () => {
    setExporting(true);
    const [moutons, sales, health, expenses] = await Promise.all([
      getMoutons(), getSales(), getHealthRecords(), getExpenses(),
    ]);
    downloadJSON(
      { exportedAt: new Date().toISOString(), farmName, moutons, sales, health, expenses },
      `mon-troupeau-${new Date().toISOString().split('T')[0]}.json`
    );
    await logActivity(currentUser?.id, currentUser?.name ?? '', 'Export JSON');
    setExporting(false);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    const sales = await getSales();
    downloadPDF('Rapport Mon Troupeau', [
      {
        title: 'Toutes les ventes',
        headers: ['Date', 'Type', 'Qté', 'P.U (FCFA)', 'Total (FCFA)', 'Acheteur'],
        rows: sales.map(s => [
          new Date(s.date).toLocaleDateString('fr-FR'),
          TARGET_LABELS[s.target_type] ?? s.target_type,
          s.quantity, s.unit_price.toLocaleString('fr-FR'),
          s.amount.toLocaleString('fr-FR'), s.buyer_name ?? '—',
        ]),
      },
    ], `${stats.totalSales} ventes · ${stats.totalRevenue.toLocaleString('fr-FR')} FCFA`);
    await logActivity(currentUser?.id, currentUser?.name ?? '', 'Export PDF');
    setExporting(false);
  };

  const handleSaveFarmName = async () => {
    await setSetting('farm_name', tmpFarmName);
    setFarmName(tmpFarmName);
    setEditFarmName(false);
  };

  const handleReset = async () => {
    if (resetInput !== 'SUPPRIMER') return;
    setResetting(true);
    try {
      // Loguer AVANT de supprimer pour garder la trace dans l'historique
      await logActivity(currentUser?.id, currentUser?.name ?? '', '⚠️ RÉINITIALISATION COMPLÈTE DES DONNÉES');
      await Promise.all([
        run('DELETE FROM sales'),
        run('DELETE FROM health_records'),
        run('DELETE FROM expenses'),
        run('DELETE FROM moutons'),
      ]);
      await saveStore();
      setShowResetConfirm(false);
      setResetInput('');
      alert('Données supprimées. L\'application va redémarrer.');
      window.location.reload();
    } finally {
      setResetting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de resélectionner le même fichier plus tard
    if (!file) return;
    setRestoreError('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isValidBackup(parsed)) {
        setRestoreError("Fichier invalide : ce n'est pas une sauvegarde Mon Troupeau reconnue.");
        return;
      }
      setPendingBackup(parsed);
      setRestoreInput('');
    } catch {
      setRestoreError('Impossible de lire ce fichier (JSON invalide).');
    }
  };

  const handleConfirmRestore = async () => {
    if (restoreInput !== 'RESTAURER' || !pendingBackup) return;
    setRestoring(true);
    try {
      const counts = await restoreFromBackup(pendingBackup);
      await logActivity(
        currentUser?.id, currentUser?.name ?? '',
        `⚠️ RESTAURATION D'UNE SAUVEGARDE (${counts.moutons} moutons, ${counts.sales} ventes, ${counts.health} soins, ${counts.expenses} dépenses)`,
      );
      alert('Données restaurées. L\'application va redémarrer.');
      window.location.reload();
    } catch {
      setRestoreError('Échec de la restauration. Vos données actuelles sont conservées.');
      setRestoring(false);
    }
  };

  const handleSaveSync = () => {
    setSyncApiUrl(syncUrl.trim());
    setSyncToken(syncToken.trim());
    setSyncSaved(true);
    setTimeout(() => setSyncSaved(false), 2000);
  };

  const handleLogout = async () => {
    await logActivity(currentUser?.id, currentUser?.name ?? '', 'Déconnexion');
    logout();
  };

  // Si une section admin est ouverte, on la montre en plein écran
  if (adminSection === 'users') {
    return (
      <div className="p-4">
        <button onClick={() => setAdminSection(null)} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-4 text-sm">
          ← Retour aux paramètres
        </button>
        <UserManagement />
      </div>
    );
  }
  if (adminSection === 'activity') {
    return (
      <div className="p-4">
        <button onClick={() => setAdminSection(null)} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-4 text-sm">
          ← Retour aux paramètres
        </button>
        <ActivityLog />
      </div>
    );
  }
  if (adminSection === 'trash') {
    return (
      <div className="p-4">
        <button onClick={() => setAdminSection(null)} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-4 text-sm">
          ← Retour aux paramètres
        </button>
        <TrashPage />
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Settings size={22} className="text-primary-600" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Paramètres</h2>
      </div>

      {/* Profil courant */}
      <div className="card flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary-700 dark:text-primary-300">
            {(currentUser?.name ?? 'A').charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 dark:text-gray-100">{currentUser?.name ?? 'Admin'}</p>
          <p className="text-xs text-gray-400">
            {currentUser?.role === 'admin' ? '👑 Administrateur' : currentUser?.role === 'gerant' ? '🏭 Gérant' : '👷 Employé'}
            {farmMode === 'solo' && ' · Mode solo'}
          </p>
        </div>
        {farmMode === 'multi' && (
          <button onClick={handleLogout} className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/20" title="Déconnexion">
            <LogOut size={18} />
          </button>
        )}
      </div>

      {/* Nom de la ferme (admin uniquement) */}
      {isAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom de la ferme</p>
            <button onClick={() => { setEditFarmName(e => !e); setTmpFarmName(farmName); }} className="text-xs text-primary-600">
              {editFarmName ? 'Annuler' : 'Modifier'}
            </button>
          </div>
          {editFarmName ? (
            <div className="flex gap-2">
              <input className="input flex-1 py-2 text-sm" value={tmpFarmName} onChange={e => setTmpFarmName(e.target.value)} />
              <button onClick={handleSaveFarmName} className="bg-primary-600 text-white px-4 rounded-xl text-sm font-medium">OK</button>
            </div>
          ) : (
            <p className="text-gray-800 dark:text-gray-100 font-semibold">{farmName}</p>
          )}
        </div>
      )}

      {/* Apparence */}
      <div className="card">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Apparence</p>
        <button
          onClick={toggleDark}
          className="w-full flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-3">
            {isDark ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-yellow-500" />}
            <span className="text-sm text-gray-700 dark:text-gray-300">Mode sombre</span>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors relative ${isDark ? 'bg-primary-600' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
        </button>
      </div>

      {/* Notifications */}
      <div className="card">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notifications</p>
        <button
          onClick={handleToggleReminders}
          className="w-full flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-primary-600" />
            <div className="text-left">
              <span className="text-sm text-gray-700 dark:text-gray-300 block">Rappels sanitaires</span>
              <span className="text-xs text-gray-400">Vaccins et traitements à venir</span>
            </div>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${remindersEnabled ? 'bg-primary-600' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${remindersEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
        </button>
      </div>

      {/* Exportation (Admin + Gérant) */}
      {canExport && (
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Exportation</p>
          <div className="space-y-2">
            <button
              onClick={handleExportJSON}
              disabled={exporting}
              className="w-full flex items-center gap-3 py-2 text-left"
            >
              <FileJson size={18} className="text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Exporter en JSON</p>
                <p className="text-xs text-gray-400">Toutes les données de la ferme</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="w-full flex items-center gap-3 py-2 text-left"
            >
              <Download size={18} className="text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Exporter en PDF</p>
                <p className="text-xs text-gray-400">Rapport des ventes</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>
        </div>
      )}

      {/* Corbeille (Admin + Gérant) */}
      {canDelete && (
        <div className="card">
          <button
            onClick={() => setAdminSection('trash')}
            className="w-full flex items-center gap-3 text-left"
          >
            <Trash2 size={18} className="text-gray-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Corbeille</p>
              <p className="text-xs text-gray-400">Restaurer ou purger les éléments supprimés</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        </div>
      )}

      {/* Administration (Admin uniquement) */}
      {canManageUsers && (
        <div className="card border-yellow-200 dark:border-yellow-800">
          <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mb-3">
            👑 Administration
          </p>
          <div className="space-y-1">
            <button
              onClick={() => setAdminSection('users')}
              className="w-full flex items-center gap-3 py-2.5 text-left"
            >
              <Users size={18} className="text-primary-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Gestion des utilisateurs</p>
                <p className="text-xs text-gray-400">Ajouter, modifier, supprimer des accès</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button
              onClick={() => setAdminSection('activity')}
              className="w-full flex items-center gap-3 py-2.5 text-left"
            >
              <ClipboardList size={18} className="text-primary-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Journal d'activité</p>
                <p className="text-xs text-gray-400">Historique de toutes les actions</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>
        </div>
      )}

      {/* Synchronisation serveur (Admin uniquement) */}
      {isAdmin && (
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Synchronisation</p>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">URL du serveur</span>
              <input
                className="input mt-1 text-sm"
                value={syncUrl}
                onChange={e => setSyncUrlState(e.target.value)}
                placeholder="https://monserveur.com/api"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400">Token d'accès</span>
              <input
                className="input mt-1 text-sm"
                type="password"
                value={syncToken}
                onChange={e => setSyncTokenState(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <button
              onClick={handleSaveSync}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                syncSaved
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-primary-600 text-white'
              }`}
            >
              <Wifi size={15} />
              {syncSaved ? 'Enregistré ✓' : 'Enregistrer la config'}
            </button>
          </div>
        </div>
      )}

      {/* Zone dangereuse (Admin uniquement) */}
      {isAdmin && (
        <div className="card border-red-200 dark:border-red-800">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">⚠️ Zone dangereuse</p>

          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileSelected} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 py-2 text-left border-b border-red-100 dark:border-red-900/40"
          >
            <Upload size={18} className="text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Restaurer une sauvegarde</p>
              <p className="text-xs text-gray-400">Remplace toutes les données actuelles par un fichier JSON exporté</p>
            </div>
          </button>

          {restoreError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">{restoreError}</p>
          )}

          {pendingBackup && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl space-y-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                Ce fichier contient {pendingBackup.moutons?.length ?? 0} mouton(s), {pendingBackup.sales?.length ?? 0} vente(s),{' '}
                {pendingBackup.health?.length ?? 0} soin(s) et {pendingBackup.expenses?.length ?? 0} dépense(s).
                Toutes les données actuelles seront remplacées. Tapez <strong>RESTAURER</strong> pour confirmer.
              </p>
              <input
                className="input text-sm border-red-300"
                value={restoreInput}
                onChange={e => setRestoreInput(e.target.value)}
                placeholder="RESTAURER"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setPendingBackup(null); setRestoreInput(''); }}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmRestore}
                  disabled={restoreInput !== 'RESTAURER' || restoring}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40"
                >
                  {restoring ? 'Restauration…' : 'Restaurer'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowResetConfirm(s => !s)}
            className="w-full flex items-center gap-3 py-2 text-left"
          >
            <Trash2 size={18} className="text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Réinitialiser toutes les données</p>
              <p className="text-xs text-gray-400">Supprime moutons, ventes, dépenses, soins</p>
            </div>
            <ChevronDown size={16} className={`text-gray-300 transition-transform ${showResetConfirm ? 'rotate-180' : ''}`} />
          </button>

          {showResetConfirm && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl space-y-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                Tapez <strong>SUPPRIMER</strong> pour confirmer. Cette action est irréversible.
              </p>
              <input
                className="input text-sm border-red-300"
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                placeholder="SUPPRIMER"
              />
              <button
                onClick={handleReset}
                disabled={resetInput !== 'SUPPRIMER' || resetting}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40"
              >
                {resetting ? 'Suppression…' : 'Réinitialiser'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Infos app */}
      <div className="card">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">À propos</p>
        <div className="flex items-center gap-3">
          <Info size={18} className="text-gray-400 shrink-0" />
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Mon Troupeau Mobile</p>
            <p className="text-xs text-gray-400">
              Version 1.0 · {stats.totalMoutons} moutons · {stats.totalSales} ventes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
