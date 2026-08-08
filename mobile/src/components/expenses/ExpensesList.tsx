import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Wallet, TrendingDown } from 'lucide-react';
import { Expense, ExpenseCategory } from '../../types';
import { getExpenses, trashExpense, getTotalExpenses } from '../../services/expenseService';
import { ExpenseForm } from './ExpenseForm';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ConfirmModal } from '../ui/ConfirmModal';
import { logActivity } from '../../services/activityService';

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  achat_moutons: "Achat d'animaux",
  alimentation:  'Alimentation',
  medicaments:   'Médicaments',
  transport:     'Transport',
  main_oeuvre:   "Main-d'œuvre",
  construction:  'Construction',
  autre:         'Autre',
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  achat_moutons: 'bg-indigo-100 text-indigo-700',
  alimentation:  'bg-amber-100 text-amber-700',
  medicaments:   'bg-red-100 text-red-700',
  transport:     'bg-green-100 text-green-700',
  main_oeuvre:   'bg-blue-100 text-blue-700',
  construction:  'bg-purple-100 text-purple-700',
  autre:         'bg-gray-100 text-gray-600',
};

const PAYMENT_LABELS: Record<string, string> = {
  especes:      'Espèces',
  mobile_money: 'Mobile Money',
  virement:     'Virement',
  cheque:       'Chèque',
  credit:       'Crédit',
  autre:        'Autre',
};

const PAGE_SIZE = 20;

export function ExpensesList() {
  const [expenses, setExpenses]     = useState<Expense[]>([]);
  const [editing, setEditing]       = useState<Expense | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const [totalExpenses, setTotal]   = useState(0);
  const [page, setPage]             = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const { refreshStats }            = useApp();
  const { currentUser }             = useAuth();
  const { canEdit, canDelete }      = usePermissions();

  const load = useCallback(async () => {
    setLoading(true);
    const [all, total] = await Promise.all([getExpenses(), getTotalExpenses()]);
    setExpenses(all);
    setTotal(total);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await trashExpense(deleteTarget.id);
    await logActivity(
      currentUser?.id, currentUser?.name ?? '',
      `Dépense déplacée vers la corbeille : ${CATEGORY_LABELS[deleteTarget.category]} — ${deleteTarget.amount.toLocaleString('fr-FR')} FCFA`,
      'expense', deleteTarget.id,
    );
    setDeleteTarget(null);
    load();
    refreshStats();
  };

  const handleSaved = () => { setShowForm(false); setEditing(null); load(); refreshStats(); };

  if (showForm || editing) {
    return <ExpenseForm expense={editing ?? undefined} onSave={handleSaved} onCancel={() => { setShowForm(false); setEditing(null); }} />;
  }

  const paginated = expenses.slice(0, page * PAGE_SIZE);
  const hasMore   = expenses.length > paginated.length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Dépenses</h2>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="bg-red-600 text-white rounded-full p-3 shadow-lg active:scale-95 transition-transform">
            <Plus size={22} />
          </button>
        )}
      </div>

      {/* Résumé total */}
      <div className="card mb-4 bg-red-600 border-0">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown size={18} className="text-red-200" />
          <p className="text-red-100 text-sm">Total dépenses</p>
        </div>
        <p className="text-3xl font-bold text-white">{totalExpenses.toLocaleString('fr-FR')} FCFA</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16">
          <Wallet size={56} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 mb-6">Aucune dépense enregistrée</p>
          {canEdit && (
            <button onClick={() => setShowForm(true)} className="bg-red-600 text-white px-8 py-3 rounded-full font-semibold">
              Ajouter une dépense
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(exp => (
              <div key={exp.id} className="card">
                <div className="flex items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge text-xs ${CATEGORY_COLORS[exp.category]}`}>
                        {CATEGORY_LABELS[exp.category]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(exp.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">{exp.description}</p>
                    )}
                    <p className="text-lg font-bold text-red-600 mt-0.5">
                      {exp.amount.toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{PAYMENT_LABELS[exp.payment_method] ?? exp.payment_method}</p>
                    {exp.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{exp.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
                    {canEdit && (
                      <button onClick={() => setEditing(exp)} className="btn-icon text-blue-500 bg-blue-50 dark:bg-blue-900/30">
                        <Edit2 size={17} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteTarget(exp)} className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/30">
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="w-full mt-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium active:scale-95 transition-transform"
            >
              Afficher plus ({expenses.length - paginated.length} restants)
            </button>
          )}
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Déplacer vers la corbeille ?"
        message={deleteTarget ? `${CATEGORY_LABELS[deleteTarget.category]} — ${deleteTarget.amount.toLocaleString('fr-FR')} FCFA` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
