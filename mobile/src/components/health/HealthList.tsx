import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Heart, Search, AlertTriangle, ChevronDown } from 'lucide-react';
import { HealthRecord, Mouton } from '../../types';
import { getHealthRecords, trashHealthRecord, advanceOverdueRecurrences } from '../../services/healthService';
import { scheduleHealthReminders } from '../../services/notificationService';
import { HealthForm } from './HealthForm';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../services/activityService';
import { getMoutons } from '../../services/moutonService';
import { formatAnimalLabel } from '../../utils/species';
import { useApp } from '../../context/AppContext';
import { speak } from '../../utils/voice';

const TYPE_COLORS: Record<string, string> = {
  vaccination:  'bg-blue-100 text-blue-700',
  vermifuge:    'bg-teal-100 text-teal-700',
  injection:    'bg-indigo-100 text-indigo-700',
  vitamines:    'bg-yellow-100 text-yellow-700',
  consultation: 'bg-purple-100 text-purple-700',
  traitement:   'bg-red-100 text-red-700',
  autre:        'bg-gray-100 text-gray-600',
};

export const TYPE_LABELS: Record<string, string> = {
  vaccination:  '💉 Vaccination',
  vermifuge:    '🪱 Vermifuge',
  injection:    '💉 Injection',
  vitamines:    '💊 Vitamines',
  consultation: '🩺 Consultation',
  traitement:   '💊 Traitement',
  autre:        '📋 Autre',
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

export function HealthList() {
  const [records, setRecords]     = useState<HealthRecord[]>([]);
  const [moutons, setMoutons]     = useState<Mouton[]>([]);
  const [editing, setEditing]     = useState<HealthRecord | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<'tous' | HealthRecord['type']>('tous');
  const [dateRange, setDateRange] = useState<DateRange>('tout');
  const [showFilters, setShowFilters] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loading, setLoading]     = useState(true);
  const { currentUser }           = useAuth();
  const { canEdit, canDelete }    = usePermissions();
  const { simplified }            = useApp();

  const load = useCallback(async () => {
    setLoading(true);
    await advanceOverdueRecurrences().catch(() => {});
    const [health, animals] = await Promise.all([getHealthRecords(), getMoutons()]);
    setRecords(health);
    setMoutons(animals);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const animalLabels = new Map(moutons.map(m => [m.id, formatAnimalLabel(m)]));

  const today = new Date().toISOString().split('T')[0];
  const overdue = records.filter(r => r.next_due && r.next_due < today);
  const dateLimit = getDateLimit(dateRange);

  const filtered = records.filter(r => {
    if (filter !== 'tous' && r.type !== filter) return false;
    if (dateLimit && r.date < dateLimit) return false;
    if (overdueOnly && !(r.next_due && r.next_due < today)) return false;
    const q = search.toLowerCase();
    return !q ||
      (r.product ?? '').toLowerCase().includes(q) ||
      (r.notes ?? '').toLowerCase().includes(q) ||
      TYPE_LABELS[r.type]?.toLowerCase().includes(q);
  });

  const handleDelete = async (id: number) => {
    if (!confirm('Déplacer ce soin vers la corbeille ?')) return;
    const record = records.find(r => r.id === id);
    await trashHealthRecord(id);
    if (record) {
      await logActivity(
        currentUser?.id, currentUser?.name ?? '',
        `Soin déplacé vers la corbeille : ${TYPE_LABELS[record.type] ?? record.type}`,
        'health', id,
      );
    }
    scheduleHealthReminders().catch(() => {});
    load();
  };

  const handleSaved = () => { setShowForm(false); setEditing(null); load(); };

  const activeFilters = [dateRange !== 'tout', overdueOnly].filter(Boolean).length;

  if (showForm || editing) {
    return <HealthForm record={editing ?? undefined} onSave={handleSaved} onCancel={() => { setShowForm(false); setEditing(null); }} />;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Suivi sanitaire</h2>
        {canEdit && (
          <button
            onClick={() => { if (simplified) speak('Ajouter un soin'); setShowForm(true); }}
            className="bg-primary-600 text-white rounded-full p-3 simplified:p-4 shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={simplified ? 30 : 22} />
          </button>
        )}
      </div>

      {/* Alertes rappels dépassés */}
      {overdue.length > 0 && (
        <button
          onClick={() => { setOverdueOnly(true); setShowFilters(true); }}
          className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-3 mb-4 flex items-start gap-2 text-left"
        >
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
            {overdue.length} rappel(s) en retard — Voir uniquement
          </p>
        </button>
      )}

      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9 text-sm"
          placeholder="Rechercher produit, type…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filtres type */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {(['tous', 'vaccination', 'vermifuge', 'injection', 'vitamines', 'consultation', 'traitement', 'autre'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}>
            {f === 'tous' ? 'Tous' : TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Filtres avancés */}
      <button
        onClick={() => setShowFilters(f => !f)}
        className={`flex items-center gap-2 mb-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          activeFilters > 0
            ? 'bg-primary-100 text-primary-700'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
        }`}
      >
        Filtres avancés{activeFilters > 0 ? ` (${activeFilters})` : ''}
        <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
      </button>

      {showFilters && (
        <div className="card mb-3 space-y-3">
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

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="overdueOnly"
              checked={overdueOnly}
              onChange={e => setOverdueOnly(e.target.checked)}
              className="w-4 h-4 accent-primary-600"
            />
            <label htmlFor="overdueOnly" className="text-sm text-gray-700 dark:text-gray-300">
              Uniquement les rappels en retard
            </label>
          </div>

          {activeFilters > 0 && (
            <button
              onClick={() => { setDateRange('tout'); setOverdueOnly(false); }}
              className="text-xs text-red-500 underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={56} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 mb-6">{search || activeFilters > 0 ? 'Aucun résultat' : 'Aucun soin enregistré'}</p>
          {!search && !activeFilters && (
            <button
              onClick={() => { if (simplified) speak('Ajouter un soin'); setShowForm(true); }}
              className="bg-primary-600 text-white px-8 py-3 simplified:py-4 simplified:text-lg rounded-full font-semibold"
            >
              Enregistrer un soin
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const isOverdue = r.next_due && r.next_due < today;
            return (
              <div key={r.id} className={`card ${isOverdue ? 'border-red-200 dark:border-red-800' : ''}`}>
                <div className="flex items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge ${TYPE_COLORS[r.type]}`}>{TYPE_LABELS[r.type]}</span>
                      {r.product && <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{r.product}</span>}
                      {!r.synced && <span className="badge bg-orange-100 text-orange-600">Non sync.</span>}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span>{new Date(r.date).toLocaleDateString('fr-FR')}</span>
                      {r.quantity && <span>Qté : {r.quantity}</span>}
                      {r.cost != null && <span>Coût : {r.cost.toLocaleString('fr-FR')} FCFA</span>}
                      <span>Cible : {r.target_type === 'mouton' ? (animalLabels.get(r.target_id) ?? 'Animal') : 'Tout le troupeau'}</span>
                    </div>
                    {r.next_due && (
                      <p className={`text-xs mt-1 font-medium ${isOverdue ? 'text-red-600' : 'text-primary-600'}`}>
                        {isOverdue ? '⚠️ En retard — ' : '📅 Rappel : '}
                        {new Date(r.next_due).toLocaleDateString('fr-FR')}
                        {r.recurrence_months && ` · 🔁 tous les ${r.recurrence_months} mois`}
                      </p>
                    )}
                    {r.notes && <p className="text-xs text-gray-400 mt-1 truncate">{r.notes}</p>}
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="flex gap-1.5 ml-2 shrink-0">
                      {canEdit   && <button onClick={() => setEditing(r)} className="btn-icon text-blue-500 bg-blue-50 dark:bg-blue-900/30"><Edit2 size={17} /></button>}
                      {canDelete && <button onClick={() => r.id && handleDelete(r.id)} className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/30"><Trash2 size={17} /></button>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
