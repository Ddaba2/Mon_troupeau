import React, { useState, useEffect } from 'react';
import { ArrowLeft, Info, Heart, Wallet, ListTree } from 'lucide-react';
import { Mouton, HealthRecord, Sale } from '../../types';
import { getHealthRecords } from '../../services/healthService';
import { getSales } from '../../services/saleService';
import { SEX_LABELS, ORIGIN_LABELS, STATUS_LABELS, STATUS_COLORS, formatAge } from './MoutonsList';
import { computeMoutonProfitability } from '../../utils/profitability';
import { SPECIES_LABELS, SPECIES_EMOJIS } from '../../utils/species';

interface Props { mouton: Mouton; onBack: () => void }

type Tab = 'infos' | 'sante' | 'finances' | 'historique';

const TYPE_LABELS: Record<string, string> = {
  vaccination:  '💉 Vaccination',
  vermifuge:    '🪱 Vermifuge',
  injection:    '💉 Injection',
  vitamines:    '💊 Vitamines',
  consultation: '🩺 Consultation',
  traitement:   '💊 Traitement',
  autre:        '📋 Autre',
};

export function MoutonHistory({ mouton, onBack }: Props) {
  const [tab, setTab]         = useState<Tab>('infos');
  const [health, setHealth]   = useState<HealthRecord[]>([]);
  const [sales, setSales]     = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [allHealth, allSales] = await Promise.all([getHealthRecords(), getSales()]);
      const mid = mouton.id!;
      setHealth(allHealth.filter(h => h.target_type === 'tous' || (h.target_type === 'mouton' && h.target_id === mid)));
      setSales(allSales.filter(s => s.target_type === 'mouton' && s.target_id === mid));
      setLoading(false);
    })();
  }, [mouton.id]);

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'infos',      label: 'Infos',      icon: Info },
    { id: 'sante',      label: 'Santé',      icon: Heart,    count: health.length },
    { id: 'finances',   label: 'Finances',   icon: Wallet,   count: sales.length },
    { id: 'historique', label: 'Historique', icon: ListTree, count: health.length + sales.length },
  ];

  type TimelineEntry = { date: string; kind: 'sante' | 'vente'; render: () => React.ReactNode };
  const timeline: TimelineEntry[] = [
    ...health.map(h => ({
      date: h.date,
      kind: 'sante' as const,
      render: () => (
        <div key={`h${h.id}`} className="card">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="badge bg-blue-100 text-blue-700">{TYPE_LABELS[h.type] ?? h.type}</span>
            {h.product && <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{h.product}</span>}
          </div>
          <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
            <span>{new Date(h.date).toLocaleDateString('fr-FR')}</span>
            {h.quantity && <span>Qté : {h.quantity}</span>}
            {h.cost != null && <span>Coût : {h.cost.toLocaleString('fr-FR')} FCFA</span>}
          </div>
          {h.next_due && <p className="text-xs text-primary-600 mt-1">Rappel : {new Date(h.next_due).toLocaleDateString('fr-FR')}</p>}
          {h.notes && <p className="text-xs text-gray-400 mt-1 italic">{h.notes}</p>}
        </div>
      ),
    })),
    ...sales.map(s => ({
      date: s.date,
      kind: 'vente' as const,
      render: () => (
        <div key={`s${s.id}`} className="card">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="badge bg-primary-100 text-primary-700">Vente</span>
            <span className="font-bold text-gray-800 dark:text-gray-100">{s.amount.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{s.quantity} × {s.unit_price.toLocaleString('fr-FR')} FCFA</p>
          <div className="flex gap-3 text-xs text-gray-400 mt-1">
            <span>{new Date(s.date).toLocaleDateString('fr-FR')}</span>
            {s.buyer_name && <span>Acheteur : {s.buyer_name}</span>}
          </div>
        </div>
      ),
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 dark:text-gray-300">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {SPECIES_EMOJIS[mouton.species] ?? SPECIES_EMOJIS.autre} #{mouton.identification_number}{mouton.name ? ` – ${mouton.name}` : ''}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {SPECIES_LABELS[mouton.species] ?? SPECIES_LABELS.autre}{mouton.race ? ` • ${mouton.race}` : ''}
          </p>
        </div>
        <span className={`ml-auto badge ${STATUS_COLORS[mouton.status]}`}>{STATUS_LABELS[mouton.status]}</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Icon size={14} />
            {label}
            {count !== undefined && (
              <span className={`text-xs rounded-full px-1.5 ${tab === id ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement…</div>
      ) : (
        <>
          {/* INFOS */}
          {tab === 'infos' && (
            <div className="space-y-3">
              {mouton.photo && (
                <img src={mouton.photo} alt={mouton.name ?? mouton.identification_number} className="w-full max-w-xs mx-auto rounded-2xl object-cover" />
              )}
              <div className="card">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-400">Espèce</span><p className="font-medium text-gray-800 dark:text-gray-100">{SPECIES_LABELS[mouton.species] ?? SPECIES_LABELS.autre}</p></div>
                  <div><span className="text-gray-400">Sexe</span><p className="font-medium text-gray-800 dark:text-gray-100">{SEX_LABELS[mouton.sex]}</p></div>
                  <div><span className="text-gray-400">Âge</span><p className="font-medium text-gray-800 dark:text-gray-100">{formatAge(mouton)}</p></div>
                  {mouton.race && <div><span className="text-gray-400">Race</span><p className="font-medium text-gray-800 dark:text-gray-100">{mouton.race}</p></div>}
                  {mouton.color && <div><span className="text-gray-400">Couleur</span><p className="font-medium text-gray-800 dark:text-gray-100">{mouton.color}</p></div>}
                  <div><span className="text-gray-400">Origine</span><p className="font-medium text-gray-800 dark:text-gray-100">{ORIGIN_LABELS[mouton.origin]}</p></div>
                  {mouton.birth_date && (
                    <div><span className="text-gray-400">Naissance</span><p className="font-medium text-gray-800 dark:text-gray-100">{new Date(mouton.birth_date).toLocaleDateString('fr-FR')}</p></div>
                  )}
                </div>
                {mouton.status === 'vendu' && mouton.sale_price && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-sm">
                    <p className="text-blue-600">
                      Vendu {mouton.sale_price.toLocaleString('fr-FR')} FCFA
                      {mouton.buyer_name ? ` à ${mouton.buyer_name}` : ''}
                      {mouton.sale_date ? ` le ${new Date(mouton.sale_date).toLocaleDateString('fr-FR')}` : ''}
                    </p>
                  </div>
                )}
                {mouton.observations && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 italic">{mouton.observations}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SANTÉ */}
          {tab === 'sante' && (
            health.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Aucun soin enregistré</div>
            ) : (
              <div className="space-y-3">
                {health.map(h => (
                  <div key={h.id} className="card">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="badge bg-blue-100 text-blue-700">{TYPE_LABELS[h.type] ?? h.type}</span>
                      {h.product && <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{h.product}</span>}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span>{new Date(h.date).toLocaleDateString('fr-FR')}</span>
                      {h.quantity && <span>Qté : {h.quantity}</span>}
                      {h.cost != null && <span>Coût : {h.cost.toLocaleString('fr-FR')} FCFA</span>}
                    </div>
                    {h.next_due && <p className="text-xs text-primary-600 mt-1">Rappel : {new Date(h.next_due).toLocaleDateString('fr-FR')}</p>}
                    {h.notes && <p className="text-xs text-gray-400 mt-1 italic truncate">{h.notes}</p>}
                  </div>
                ))}
              </div>
            )
          )}

          {/* FINANCES */}
          {tab === 'finances' && (() => {
            const profit = computeMoutonProfitability(mouton, health, sales);
            return (
              <div className="space-y-3">
                <div className="card">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Rentabilité</p>
                  <div className="space-y-2 text-sm">
                    {profit.purchaseCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Prix d'achat</span>
                        <span className="text-gray-800 dark:text-gray-100">− {profit.purchaseCost.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Coûts sanitaires (individuels)</span>
                      <span className="text-gray-800 dark:text-gray-100">− {profit.healthCost.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Revenus des ventes</span>
                      <span className="text-gray-800 dark:text-gray-100">+ {profit.saleRevenue.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                  <div className={`mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center`}>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Marge nette</span>
                    <span className={`text-lg font-bold ${profit.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profit.margin.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  {profit.healthCost > 0 && health.some(h => h.target_type === 'tous') && (
                    <p className="text-[11px] text-gray-400 mt-2">
                      N'inclut pas les soins « tout le troupeau », non répartis par animal.
                    </p>
                  )}
                </div>

                {sales.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">Aucune vente liée à cet animal</div>
                ) : (
                  sales.map(s => (
                    <div key={s.id} className="card">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-gray-800 dark:text-gray-100">{s.amount.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{s.quantity} × {s.unit_price.toLocaleString('fr-FR')} FCFA</p>
                      <div className="flex gap-3 text-xs text-gray-400 mt-1">
                        <span>{new Date(s.date).toLocaleDateString('fr-FR')}</span>
                        {s.buyer_name && <span>Acheteur : {s.buyer_name}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })()}

          {/* HISTORIQUE COMPLET */}
          {tab === 'historique' && (
            timeline.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Aucun événement enregistré</div>
            ) : (
              <div className="space-y-3">{timeline.map(e => e.render())}</div>
            )
          )}
        </>
      )}
    </div>
  );
}
