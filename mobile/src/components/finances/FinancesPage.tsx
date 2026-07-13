import React, { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Table2 } from 'lucide-react';
import { SalesList } from '../sales/SalesList';
import { ExpensesList } from '../expenses/ExpensesList';
import { FinancialSummary } from './FinancialSummary';

type FinanceTab = 'recettes' | 'depenses' | 'tableau';

interface Props { initialTab?: FinanceTab }

export function FinancesPage({ initialTab }: Props) {
  const [tab, setTab] = useState<FinanceTab>(initialTab ?? 'recettes');

  const TABS: { id: FinanceTab; label: string; icon: React.ElementType }[] = [
    { id: 'recettes', label: 'Recettes', icon: TrendingUp },
    { id: 'depenses', label: 'Dépenses', icon: TrendingDown },
    { id: 'tableau',  label: 'Tableau',  icon: Table2 },
  ];

  return (
    <div>
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={22} className="text-primary-600" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Finances</h2>
        </div>

        <div className="flex gap-2 mb-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'recettes' && <SalesList />}
      {tab === 'depenses' && <ExpensesList />}
      {tab === 'tableau'  && <div className="p-4 pt-0"><FinancialSummary /></div>}
    </div>
  );
}
