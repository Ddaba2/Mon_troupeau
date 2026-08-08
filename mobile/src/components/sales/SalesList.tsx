import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ShoppingCart, Search, ChevronDown, Receipt } from 'lucide-react';
import { Sale } from '../../types';
import { getSales, trashSale } from '../../services/saleService';
import { SaleForm } from './SaleForm';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { logActivity } from '../../services/activityService';
import { downloadSaleReceipt } from '../../utils/exportUtils';
import { speak } from '../../utils/voice';

export const TARGET_LABELS: Record<string, string> = {
  mouton: '🐾 Animal',
  fumier: '🌾 Fumier',
  autre:  '— Autre revenu',
};

export const PAYMENT_LABELS: Record<string, string> = {
  especes:      '💵 Espèces',
  mobile_money: '📱 Mobile Money',
  virement:     '🏦 Virement',
  cheque:       '📄 Chèque',
  credit:       '⏳ Crédit',
  autre:        '— Autre',
};

type DateRange = 'tout' | 'mois' | '3mois' | '6mois' | 'annee';

function getDateLimit(range: DateRange): string | null {
  if (range === 'tout') return null;
  const d = new Date();
  if (range === 'mois')  d.setMonth(d.getMonth() - 1);
  if (range === '3mois') d.setMonth(d.getMonth() - 3);
  if (range === '6mois') d.setMonth(d.getMonth() - 6);
  if (range === 'annee') d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}

export function SalesList() {
  const [sales, setSales]             = useState<Sale[]>([]);
  const [editing, setEditing]         = useState<Sale | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch]           = useState('');
  const [dateRange, setDateRange]     = useState<DateRange>('tout');
  const [filterType, setFilterType]   = useState<string>('tout');
  const [filterPay, setFilterPay]     = useState<string>('tout');
  const [loading, setLoading]         = useState(true);
  const { refreshStats, simplified }  = useApp();
  const { currentUser }               = useAuth();
  const { canSell, canDelete }        = usePermissions();

  const load = useCallback(async () => {
    setLoading(true);
    setSales(await getSales());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const dateLimit = getDateLimit(dateRange);

  const filtered = sales.filter(s => {
    if (dateLimit && s.date < dateLimit) return false;
    if (filterType !== 'tout' && s.target_type !== filterType) return false;
    if (filterPay  !== 'tout' && s.payment_method !== filterPay) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (s.buyer_name ?? '').toLowerCase().includes(q) ||
      TARGET_LABELS[s.target_type]?.toLowerCase().includes(q) ||
      (s.target_label ?? '').toLowerCase().includes(q)
    );
  });

  const totalRevenue = filtered.reduce((sum, s) => sum + s.amount, 0);

  const handleDelete = async (id: number) => {
    if (!confirm('Déplacer cette vente vers la corbeille ?')) return;
    const sale = sales.find(s => s.id === id);
    await trashSale(id);
    if (sale) {
      await logActivity(
        currentUser?.id, currentUser?.name ?? '',
        `Vente déplacée vers la corbeille : ${TARGET_LABELS[sale.target_type] ?? sale.target_type} — ${sale.amount.toLocaleString('fr-FR')} FCFA`,
        'sale', id,
      );
    }
    load(); refreshStats();
  };

  const handleSaved = () => { setShowForm(false); setEditing(null); load(); refreshStats(); };

  const resolveDescription = (s: Sale): string => {
    const label = TARGET_LABELS[s.target_type] ?? s.target_type;
    return s.target_label ? `${label} — #${s.target_label}` : label;
  };

  const handleReceipt = (s: Sale) => {
    downloadSaleReceipt({
      id: s.id,
      date: s.date,
      description: resolveDescription(s),
      quantity: s.quantity,
      unitPrice: s.unit_price,
      amount: s.amount,
      buyerName: s.buyer_name,
      paymentMethodLabel: PAYMENT_LABELS[s.payment_method] ?? s.payment_method,
      notes: s.notes,
    });
  };

  const activeFilters = [
    dateRange !== 'tout',
    filterType !== 'tout',
    filterPay  !== 'tout',
  ].filter(Boolean).length;

  if ((showForm || editing) && canSell) {
    return <SaleForm sale={editing ?? undefined} onSave={handleSaved} onCancel={() => { setShowForm(false); setEditing(null); }} />;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Ventes</h2>
        {canSell && (
          <button
            onClick={() => { if (simplified) speak('Enregistrer une vente'); setShowForm(true); }}
            className="bg-primary-600 text-white rounded-full p-3 simplified:p-4 shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={simplified ? 30 : 22} />
          </button>
        )}
      </div>

      {/* Recherche */}
      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9 text-sm"
          placeholder="Rechercher client, type…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Bouton filtres */}
      <button
        onClick={() => setShowFilters(f => !f)}
        className={`flex items-center gap-2 mb-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          activeFilters > 0
            ? 'bg-primary-100 text-primary-700'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
        }`}
      >
        Filtres{activeFilters > 0 ? ` (${activeFilters})` : ''}
        <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
      </button>

      {/* Panneau filtres */}
      {showFilters && (
        <div className="card mb-3 space-y-3">
          {/* Période */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Période</p>
            <div className="flex gap-2 flex-wrap">
              {([
                { v: 'tout',  l: 'Tout' },
                { v: 'mois',  l: 'Ce mois' },
                { v: '3mois', l: '3 mois' },
                { v: '6mois', l: '6 mois' },
                { v: 'annee', l: 'Cette année' },
              ] as const).map(({ v, l }) => (
                <button key={v} onClick={() => setDateRange(v)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    dateRange === v ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Type vendu</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterType('tout')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterType === 'tout' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                Tous
              </button>
              {Object.entries(TARGET_LABELS).map(([v, l]) => (
                <button key={v} onClick={() => setFilterType(v)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterType === v ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Paiement */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Paiement</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterPay('tout')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterPay === 'tout' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                Tous
              </button>
              {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                <button key={v} onClick={() => setFilterPay(v)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterPay === v ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {activeFilters > 0 && (
            <button
              onClick={() => { setDateRange('tout'); setFilterType('tout'); setFilterPay('tout'); }}
              className="text-xs text-red-500 underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {sales.length > 0 && (
        <div className="card mb-4 bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800">
          <p className="text-sm text-primary-700 dark:text-primary-300">Total (résultats filtrés)</p>
          <p className="text-3xl font-bold text-primary-800 dark:text-primary-200 mt-0.5">
            {totalRevenue.toLocaleString('fr-FR')} FCFA
          </p>
          <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">{filtered.length} vente(s)</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart size={56} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 mb-6">{search || activeFilters > 0 ? 'Aucun résultat' : 'Aucune vente enregistrée'}</p>
          {!search && !activeFilters && (
            <button
              onClick={() => { if (simplified) speak('Enregistrer une vente'); setShowForm(true); }}
              className="bg-primary-600 text-white px-8 py-3 simplified:py-4 simplified:text-lg rounded-full font-semibold"
            >
              Enregistrer une vente
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="card">
              <div className="flex items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge bg-primary-100 text-primary-700 font-medium">
                      {TARGET_LABELS[s.target_type] ?? s.target_type}
                    </span>
                    {s.target_label && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">#{s.target_label}</span>
                    )}
                    {!s.synced && <span className="badge bg-orange-100 text-orange-600">Non sync.</span>}
                  </div>
                  <p className="font-bold text-gray-800 dark:text-gray-100 text-lg mt-1">
                    {s.amount.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {s.quantity} × {s.unit_price.toLocaleString('fr-FR')} FCFA
                  </p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                    <span>{new Date(s.date).toLocaleDateString('fr-FR')}</span>
                    <span>{PAYMENT_LABELS[s.payment_method] ?? s.payment_method}</span>
                    {s.buyer_name && <span>Client : {s.buyer_name}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 ml-2 shrink-0">
                  <button onClick={() => handleReceipt(s)} className="btn-icon text-green-600 bg-green-50 dark:bg-green-900/30" title="Reçu PDF"><Receipt size={17} /></button>
                  {canSell   && <button onClick={() => setEditing(s)} className="btn-icon text-blue-500 bg-blue-50 dark:bg-blue-900/30"><Edit2 size={17} /></button>}
                  {canDelete && <button onClick={() => s.id && handleDelete(s.id)} className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/30"><Trash2 size={17} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
