import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { query } from '../../db/DatabaseService';

type Period = 'jour' | 'semaine' | 'mois' | 'annee';

const PERIOD_LABELS: Record<Period, string> = {
  jour:    "Aujourd'hui",
  semaine: 'Cette semaine',
  mois:    'Ce mois',
  annee:   'Cette année',
};

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getPeriodRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = toISODate(now);

  if (period === 'jour') return { from: to, to };

  if (period === 'semaine') {
    const day = (now.getDay() + 6) % 7; // 0 = lundi
    const monday = new Date(now);
    monday.setDate(now.getDate() - day);
    return { from: toISODate(monday), to };
  }

  if (period === 'mois') {
    return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to };
  }

  // annee
  return { from: `${now.getFullYear()}-01-01`, to };
}

export function FinancialSummary() {
  const [period, setPeriod]     = useState<Period>('mois');
  const [revenue, setRevenue]   = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = getPeriodRange(period);
    const [salesRows, expenseRows] = await Promise.all([
      query<{ total: number }>('SELECT COALESCE(SUM(amount),0) as total FROM sales WHERE deleted_at IS NULL AND date >= ? AND date <= ?', [from, to]),
      query<{ total: number }>('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE deleted_at IS NULL AND date >= ? AND date <= ?', [from, to]),
    ]);
    setRevenue(salesRows[0]?.total ?? 0);
    setExpenses(expenseRows[0]?.total ?? 0);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const balance = revenue - expenses;

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              period === p ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement…</div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="card bg-primary-600 border-0">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp size={14} className="text-primary-200" />
                <p className="text-primary-100 text-xs">Recettes</p>
              </div>
              <p className="text-xl font-bold text-white">{revenue.toLocaleString('fr-FR')}</p>
              <p className="text-primary-200 text-[10px]">FCFA</p>
            </div>
            <div className="card bg-red-600 border-0">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown size={14} className="text-red-200" />
                <p className="text-red-100 text-xs">Dépenses</p>
              </div>
              <p className="text-xl font-bold text-white">{expenses.toLocaleString('fr-FR')}</p>
              <p className="text-red-200 text-[10px]">FCFA</p>
            </div>
          </div>

          <div className={`card border-0 ${balance >= 0 ? 'bg-green-600' : 'bg-orange-600'}`}>
            <div className="flex items-center gap-1 mb-1">
              <Scale size={14} className={balance >= 0 ? 'text-green-100' : 'text-orange-100'} />
              <p className={`text-xs ${balance >= 0 ? 'text-green-100' : 'text-orange-100'}`}>
                Solde / Bénéfice — {PERIOD_LABELS[period]}
              </p>
            </div>
            <p className="text-3xl font-bold text-white">{balance.toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>
      )}
    </div>
  );
}
