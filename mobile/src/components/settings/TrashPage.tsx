import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, Users, ShoppingCart, Heart, Wallet } from 'lucide-react';
import { Mouton, Sale, HealthRecord, Expense } from '../../types';
import { getTrashedMoutons, restoreMouton, permanentlyDeleteMouton } from '../../services/moutonService';
import { getTrashedSales, restoreSale, permanentlyDeleteSale } from '../../services/saleService';
import { getTrashedHealthRecords, restoreHealthRecord, permanentlyDeleteHealthRecord } from '../../services/healthService';
import { getTrashedExpenses, restoreExpense, permanentlyDeleteExpense } from '../../services/expenseService';
import { SEX_LABELS, STATUS_LABELS } from '../moutons/MoutonsList';
import { TARGET_LABELS } from '../sales/SalesList';
import { TYPE_LABELS } from '../health/HealthList';
import { CATEGORY_LABELS } from '../expenses/ExpensesList';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../services/activityService';

type Tab = 'moutons' | 'sales' | 'health' | 'expenses';

const TAB_LABELS: Record<Tab, string> = {
  moutons: 'moutons', sales: 'ventes', health: 'soins', expenses: 'dépenses',
};

export function TrashPage() {
  const { refreshStats } = useApp();
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>('moutons');
  const [moutons, setMoutons]   = useState<Mouton[]>([]);
  const [sales, setSales]       = useState<Sale[]>([]);
  const [health, setHealth]     = useState<HealthRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [purgeAll, setPurgeAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [m, s, h, e] = await Promise.all([
      getTrashedMoutons(), getTrashedSales(), getTrashedHealthRecords(), getTrashedExpenses(),
    ]);
    setMoutons(m); setSales(s); setHealth(h); setExpenses(e);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const TABS: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'moutons',  label: 'Moutons',  icon: Users,        count: moutons.length },
    { id: 'sales',    label: 'Ventes',   icon: ShoppingCart, count: sales.length },
    { id: 'health',   label: 'Santé',    icon: Heart,        count: health.length },
    { id: 'expenses', label: 'Dépenses', icon: Wallet,       count: expenses.length },
  ];

  const log = (action: string, entityType: string, entityId?: number) =>
    logActivity(currentUser?.id, currentUser?.name ?? '', action, entityType, entityId);

  const handleRestoreMouton = async (m: Mouton) => {
    await restoreMouton(m.id!);
    await log(`Mouton restauré : #${m.identification_number}${m.name ? ` – ${m.name}` : ''}`, 'mouton', m.id);
    load(); refreshStats();
  };
  const handlePurgeMouton = async (m: Mouton) => {
    if (!confirm('Supprimer définitivement ce mouton ? Cette action est irréversible.')) return;
    await permanentlyDeleteMouton(m.id!);
    await log(`Mouton supprimé définitivement : #${m.identification_number}${m.name ? ` – ${m.name}` : ''}`, 'mouton', m.id);
    load(); refreshStats();
  };

  const handleRestoreSale = async (s: Sale) => {
    await restoreSale(s.id!);
    await log(`Vente restaurée : ${TARGET_LABELS[s.target_type] ?? s.target_type} — ${s.amount.toLocaleString('fr-FR')} FCFA`, 'sale', s.id);
    load(); refreshStats();
  };
  const handlePurgeSale = async (s: Sale) => {
    if (!confirm('Supprimer définitivement cette vente ? Cette action est irréversible.')) return;
    await permanentlyDeleteSale(s.id!);
    await log(`Vente supprimée définitivement : ${TARGET_LABELS[s.target_type] ?? s.target_type} — ${s.amount.toLocaleString('fr-FR')} FCFA`, 'sale', s.id);
    load(); refreshStats();
  };

  const handleRestoreHealth = async (h: HealthRecord) => {
    await restoreHealthRecord(h.id!);
    await log(`Soin restauré : ${TYPE_LABELS[h.type] ?? h.type}`, 'health', h.id);
    load();
  };
  const handlePurgeHealth = async (h: HealthRecord) => {
    if (!confirm('Supprimer définitivement ce soin ? Cette action est irréversible.')) return;
    await permanentlyDeleteHealthRecord(h.id!);
    await log(`Soin supprimé définitivement : ${TYPE_LABELS[h.type] ?? h.type}`, 'health', h.id);
    load();
  };

  const handleRestoreExpense = async (e: Expense) => {
    await restoreExpense(e.id!);
    await log(`Dépense restaurée : ${CATEGORY_LABELS[e.category]} — ${e.amount.toLocaleString('fr-FR')} FCFA`, 'expense', e.id);
    load(); refreshStats();
  };
  const handlePurgeExpense = async (e: Expense) => {
    if (!confirm('Supprimer définitivement cette dépense ? Cette action est irréversible.')) return;
    await permanentlyDeleteExpense(e.id!);
    await log(`Dépense supprimée définitivement : ${CATEGORY_LABELS[e.category]} — ${e.amount.toLocaleString('fr-FR')} FCFA`, 'expense', e.id);
    load(); refreshStats();
  };

  const handleEmptyCurrentTab = async () => {
    const count = currentCount;
    if (tab === 'moutons')  for (const m of moutons)  await permanentlyDeleteMouton(m.id!);
    if (tab === 'sales')    for (const s of sales)    await permanentlyDeleteSale(s.id!);
    if (tab === 'health')   for (const h of health)   await permanentlyDeleteHealthRecord(h.id!);
    if (tab === 'expenses') for (const e of expenses) await permanentlyDeleteExpense(e.id!);
    await log(`⚠️ Corbeille des ${TAB_LABELS[tab]} vidée (${count} élément(s))`, tab);
    setPurgeAll(false);
    load();
    refreshStats();
  };

  const currentCount = TABS.find(t => t.id === tab)?.count ?? 0;

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Icon size={14} />
            {label}
            <span className={`text-xs rounded-full px-1.5 ${tab === id ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {currentCount > 0 && (
        <button
          onClick={() => setPurgeAll(true)}
          className="w-full mb-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium"
        >
          Vider cette corbeille ({currentCount})
        </button>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement…</div>
      ) : (
        <div className="space-y-3">
          {tab === 'moutons' && (
            moutons.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Corbeille vide</div>
            ) : moutons.map(m => (
              <div key={m.id} className="card">
                <div className="flex items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">
                      #{m.identification_number}{m.name ? ` – ${m.name}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {SEX_LABELS[m.sex]} · {STATUS_LABELS[m.status]}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Supprimé le {m.deleted_at ? new Date(m.deleted_at).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
                    <button onClick={() => handleRestoreMouton(m)} className="btn-icon text-green-600 bg-green-50 dark:bg-green-900/30" title="Restaurer"><RotateCcw size={17} /></button>
                    <button onClick={() => handlePurgeMouton(m)} className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/30" title="Supprimer définitivement"><Trash2 size={17} /></button>
                  </div>
                </div>
              </div>
            ))
          )}

          {tab === 'sales' && (
            sales.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Corbeille vide</div>
            ) : sales.map(s => (
              <div key={s.id} className="card">
                <div className="flex items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">
                      {TARGET_LABELS[s.target_type] ?? s.target_type} — {s.amount.toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(s.date).toLocaleDateString('fr-FR')}{s.buyer_name ? ` · ${s.buyer_name}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Supprimé le {s.deleted_at ? new Date(s.deleted_at).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
                    <button onClick={() => handleRestoreSale(s)} className="btn-icon text-green-600 bg-green-50 dark:bg-green-900/30" title="Restaurer"><RotateCcw size={17} /></button>
                    <button onClick={() => handlePurgeSale(s)} className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/30" title="Supprimer définitivement"><Trash2 size={17} /></button>
                  </div>
                </div>
              </div>
            ))
          )}

          {tab === 'health' && (
            health.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Corbeille vide</div>
            ) : health.map(h => (
              <div key={h.id} className="card">
                <div className="flex items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">
                      {TYPE_LABELS[h.type] ?? h.type}{h.product ? ` — ${h.product}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(h.date).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Supprimé le {h.deleted_at ? new Date(h.deleted_at).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
                    <button onClick={() => handleRestoreHealth(h)} className="btn-icon text-green-600 bg-green-50 dark:bg-green-900/30" title="Restaurer"><RotateCcw size={17} /></button>
                    <button onClick={() => handlePurgeHealth(h)} className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/30" title="Supprimer définitivement"><Trash2 size={17} /></button>
                  </div>
                </div>
              </div>
            ))
          )}

          {tab === 'expenses' && (
            expenses.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Corbeille vide</div>
            ) : expenses.map(e => (
              <div key={e.id} className="card">
                <div className="flex items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">
                      {CATEGORY_LABELS[e.category] ?? e.category} — {e.amount.toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(e.date).toLocaleDateString('fr-FR')}{e.description ? ` · ${e.description}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Supprimé le {e.deleted_at ? new Date(e.deleted_at).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
                    <button onClick={() => handleRestoreExpense(e)} className="btn-icon text-green-600 bg-green-50 dark:bg-green-900/30" title="Restaurer"><RotateCcw size={17} /></button>
                    <button onClick={() => handlePurgeExpense(e)} className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/30" title="Supprimer définitivement"><Trash2 size={17} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ConfirmModal
        open={purgeAll}
        title="Vider cette corbeille ?"
        message={`${currentCount} élément(s) seront supprimés définitivement. Cette action est irréversible.`}
        onConfirm={handleEmptyCurrentTab}
        onCancel={() => setPurgeAll(false)}
      />
    </div>
  );
}
