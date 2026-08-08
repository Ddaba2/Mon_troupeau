import React, { useState, useEffect, useMemo } from 'react';
import { Search, Users, ShoppingCart, Heart, Wallet } from 'lucide-react';
import { Mouton, Sale, HealthRecord, Expense } from '../../types';
import { getMoutons } from '../../services/moutonService';
import { getSales } from '../../services/saleService';
import { getHealthRecords } from '../../services/healthService';
import { getExpenses } from '../../services/expenseService';
import { SEX_LABELS, STATUS_LABELS } from '../moutons/MoutonsList';
import { TARGET_LABELS } from '../sales/SalesList';
import { TYPE_LABELS } from '../health/HealthList';
import { CATEGORY_LABELS } from '../expenses/ExpensesList';
import { useApp } from '../../context/AppContext';
import { SPECIES_LABELS, SPECIES_EMOJIS } from '../../utils/species';

export function GlobalSearch() {
  const { setActiveTab, setPendingMoutonId } = useApp();
  const [query, setQuery]         = useState('');
  const [moutons, setMoutons]     = useState<Mouton[]>([]);
  const [sales, setSales]         = useState<Sale[]>([]);
  const [health, setHealth]       = useState<HealthRecord[]>([]);
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [m, s, h, e] = await Promise.all([getMoutons(), getSales(), getHealthRecords(), getExpenses()]);
      setMoutons(m); setSales(s); setHealth(h); setExpenses(e);
      setLoading(false);
    })();
  }, []);

  const q = query.trim().toLowerCase();

  const matchedMoutons = useMemo(() => {
    if (!q) return [];
    return moutons.filter(m =>
      m.identification_number.toLowerCase().includes(q) ||
      (m.name ?? '').toLowerCase().includes(q) ||
      (m.race ?? '').toLowerCase().includes(q) ||
      SPECIES_LABELS[m.species].toLowerCase().includes(q),
    ).slice(0, 20);
  }, [q, moutons]);

  const matchedSales = useMemo(() => {
    if (!q) return [];
    return sales.filter(s =>
      (s.buyer_name ?? '').toLowerCase().includes(q) ||
      (s.target_label ?? '').toLowerCase().includes(q),
    ).slice(0, 20);
  }, [q, sales]);

  const matchedHealth = useMemo(() => {
    if (!q) return [];
    return health.filter(h => (h.product ?? '').toLowerCase().includes(q)).slice(0, 20);
  }, [q, health]);

  const matchedExpenses = useMemo(() => {
    if (!q) return [];
    return expenses.filter(e => (e.description ?? '').toLowerCase().includes(q)).slice(0, 20);
  }, [q, expenses]);

  const totalResults = matchedMoutons.length + matchedSales.length + matchedHealth.length + matchedExpenses.length;

  const openMouton = (m: Mouton) => {
    setPendingMoutonId(m.id!);
    setActiveTab('moutons');
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Search size={22} className="text-primary-600" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Recherche</h2>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          className="input pl-9 text-sm"
          placeholder="Numéro, nom, race, espèce, client, produit…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement…</div>
      ) : !q ? (
        <div className="text-center py-16 text-gray-400">
          <Search size={56} className="mx-auto text-gray-200 mb-4" />
          <p>Cherchez un animal, une vente, un soin ou une dépense</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="text-center py-16 text-gray-400">Aucun résultat pour « {query} »</div>
      ) : (
        <div className="space-y-4">
          {matchedMoutons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Users size={13} /> Animaux
              </p>
              <div className="space-y-2">
                {matchedMoutons.map(m => (
                  <button key={m.id} onClick={() => openMouton(m)} className="card w-full text-left flex items-center gap-3">
                    {m.photo ? (
                      <img src={m.photo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-lg">{SPECIES_EMOJIS[m.species] ?? SPECIES_EMOJIS.autre}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        #{m.identification_number}{m.name ? ` – ${m.name}` : ''}
                      </p>
                      <p className="text-xs text-gray-400">{SPECIES_LABELS[m.species] ?? SPECIES_LABELS.autre} · {SEX_LABELS[m.sex]} · {STATUS_LABELS[m.status]}{m.race ? ` · ${m.race}` : ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedSales.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ShoppingCart size={13} /> Ventes
              </p>
              <div className="space-y-2">
                {matchedSales.map(s => (
                  <button key={s.id} onClick={() => setActiveTab('finances/recettes')} className="card w-full text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {TARGET_LABELS[s.target_type] ?? s.target_type}{s.buyer_name ? ` — ${s.buyer_name}` : ''}
                      </span>
                      <span className="font-bold text-primary-700 dark:text-primary-400">{s.amount.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(s.date).toLocaleDateString('fr-FR')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedHealth.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Heart size={13} /> Santé
              </p>
              <div className="space-y-2">
                {matchedHealth.map(h => (
                  <button key={h.id} onClick={() => setActiveTab('health')} className="card w-full text-left">
                    <div className="flex items-center gap-2">
                      <span className="badge bg-blue-100 text-blue-700">{TYPE_LABELS[h.type] ?? h.type}</span>
                      <span className="text-sm text-gray-800 dark:text-gray-100">{h.product}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(h.date).toLocaleDateString('fr-FR')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedExpenses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Wallet size={13} /> Dépenses
              </p>
              <div className="space-y-2">
                {matchedExpenses.map(e => (
                  <button key={e.id} onClick={() => setActiveTab('finances/depenses')} className="card w-full text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {CATEGORY_LABELS[e.category]} — {e.description}
                      </span>
                      <span className="font-bold text-red-600">{e.amount.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(e.date).toLocaleDateString('fr-FR')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
