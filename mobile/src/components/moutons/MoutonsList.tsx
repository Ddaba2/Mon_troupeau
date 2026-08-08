import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Users, Search, History } from 'lucide-react';
import { Mouton, Species } from '../../types';
import { getMoutons, trashMouton } from '../../services/moutonService';
import { MoutonForm } from './MoutonForm';
import { MoutonHistory } from './MoutonHistory';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { logActivity } from '../../services/activityService';
import { SkeletonList } from '../ui/Skeleton';
import { ConfirmModal } from '../ui/ConfirmModal';
import { SPECIES_LABELS, SPECIES_EMOJIS, SPECIES_ADULT_THRESHOLD_MONTHS } from '../../utils/species';

const PAGE_SIZE = 20;
const SPECIES_OPTIONS: Species[] = ['mouton', 'chevre', 'bovin', 'volaille', 'autre'];

// Seuil (par espèce) séparant un jeune d'un adulte — voir utils/species.ts
export function isAdult(m: Mouton): boolean | null {
  const months = getAgeMonths(m);
  if (months == null) return null;
  return months >= (SPECIES_ADULT_THRESHOLD_MONTHS[m.species] ?? SPECIES_ADULT_THRESHOLD_MONTHS.autre);
}

export const SEX_LABELS: Record<string, string> = { male: '♂ Mâle', femelle: '♀ Femelle', inconnu: '? Inconnu' };
export const ORIGIN_LABELS: Record<string, string> = { nee_ferme: 'Né(e) dans la ferme', achete: 'Acheté(e)' };
export const STATUS_LABELS: Record<string, string> = { vivant: 'Vivant', vendu: 'Vendu', decede: 'Décédé' };
export const STATUS_COLORS: Record<string, string> = {
  vivant: 'bg-green-100 text-green-700',
  vendu:  'bg-blue-100 text-blue-700',
  decede: 'bg-gray-100 text-gray-500',
};

// Âge en mois, calculé depuis birth_date si connue, sinon depuis estimated_age_months. null si inconnu.
export function getAgeMonths(m: Mouton): number | null {
  if (m.birth_date) {
    const birth = new Date(m.birth_date);
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  }
  if (m.estimated_age_months != null) return m.estimated_age_months;
  return null;
}

export function formatAge(m: Mouton): string {
  const months = getAgeMonths(m);
  if (months == null) return 'Âge inconnu';
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} an(s) ${rem} mois` : `${years} an(s)`;
}

type AgeFilter = 'tous' | 'adultes' | 'jeunes';
type StatusFilter = 'tous' | 'vivant' | 'vendu' | 'decede';

export function MoutonsList() {
  const [moutons, setMoutons]         = useState<Mouton[]>([]);
  const [editing, setEditing]         = useState<Mouton | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [viewHistory, setViewHistory] = useState<Mouton | null>(null);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous');
  const [ageFilter, setAgeFilter]     = useState<AgeFilter>('tous');
  const [speciesFilter, setSpeciesFilter] = useState<Species | 'tous'>('tous');
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Mouton | null>(null);
  const { refreshStats, pendingMoutonId, setPendingMoutonId } = useApp();
  const { currentUser }               = useAuth();
  const { canEdit, canDelete }        = usePermissions();

  const load = useCallback(async () => {
    setLoading(true);
    setMoutons(await getMoutons());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Ouvre directement la fiche du mouton visé depuis la recherche globale.
  useEffect(() => {
    if (!pendingMoutonId || moutons.length === 0) return;
    const target = moutons.find(m => m.id === pendingMoutonId);
    if (target) setViewHistory(target);
    setPendingMoutonId(null);
  }, [pendingMoutonId, moutons, setPendingMoutonId]);

  const filtered = moutons.filter(m => {
    if (statusFilter !== 'tous' && m.status !== statusFilter) return false;
    if (speciesFilter !== 'tous' && m.species !== speciesFilter) return false;
    if (ageFilter !== 'tous') {
      const adult = isAdult(m);
      if (adult == null) return false;
      if (ageFilter === 'adultes' && !adult) return false;
      if (ageFilter === 'jeunes'  && adult)  return false;
    }
    const q = search.toLowerCase();
    const matchSearch = !search ||
      m.identification_number.toLowerCase().includes(q) ||
      (m.name ?? '').toLowerCase().includes(q) ||
      (m.race ?? '').toLowerCase().includes(q) ||
      SEX_LABELS[m.sex].toLowerCase().includes(q) ||
      SPECIES_LABELS[m.species].toLowerCase().includes(q);
    return matchSearch;
  });

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = filtered.length > paginated.length;

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await trashMouton(deleteTarget.id);
    await logActivity(
      currentUser?.id, currentUser?.name ?? '',
      `Animal déplacé vers la corbeille : #${deleteTarget.identification_number}${deleteTarget.name ? ` – ${deleteTarget.name}` : ''}`,
      'mouton', deleteTarget.id, deleteTarget.species,
    );
    setDeleteTarget(null);
    load();
    refreshStats();
  };

  const handleSaved = () => { setShowForm(false); setEditing(null); load(); refreshStats(); };

  if (viewHistory) {
    return <MoutonHistory mouton={viewHistory} onBack={() => setViewHistory(null)} />;
  }
  if (showForm || editing) {
    return <MoutonForm mouton={editing ?? undefined} onSave={handleSaved} onCancel={() => { setShowForm(false); setEditing(null); }} />;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mon troupeau</h2>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white rounded-full p-3 shadow-lg active:scale-95 transition-transform">
            <Plus size={22} />
          </button>
        )}
      </div>

      {/* Recherche */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9 text-sm"
          placeholder="Rechercher numéro, nom, race, espèce…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Filtre espèce */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
        {(['tous', ...SPECIES_OPTIONS] as const).map(sp => (
          <button key={sp} onClick={() => { setSpeciesFilter(sp); setPage(1); }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              speciesFilter === sp ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}>
            {sp === 'tous' ? 'Toutes espèces' : `${SPECIES_EMOJIS[sp]} ${SPECIES_LABELS[sp]}`}
          </button>
        ))}
      </div>

      {/* Filtre statut */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
        {(['tous', 'vivant', 'vendu', 'decede'] as const).map(f => (
          <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}>
            {f === 'tous' ? 'Tous' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Filtre âge */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {([
          { v: 'tous',    l: 'Tous âges' },
          { v: 'adultes', l: 'Adultes' },
          { v: 'jeunes',  l: 'Jeunes' },
        ] as const).map(({ v, l }) => (
          <button key={v} onClick={() => { setAgeFilter(v); setPage(1); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              ageFilter === v ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center shrink-0">{filtered.length} résultat(s)</span>
      </div>

      {loading ? (
        <SkeletonList count={4} lines={3} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users size={56} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 mb-6">{search ? 'Aucun résultat' : 'Aucun animal enregistré'}</p>
          {!search && canEdit && (
            <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-8 py-3 rounded-full font-semibold">
              Ajouter un animal
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(m => (
              <div key={m.id} className="card">
                <div className="flex items-start gap-3">
                  {m.photo ? (
                    <img src={m.photo} alt={m.name ?? m.identification_number} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-2xl">{SPECIES_EMOJIS[m.species] ?? SPECIES_EMOJIS.autre}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800 dark:text-gray-100">
                        #{m.identification_number}{m.name ? ` – ${m.name}` : ''}
                      </span>
                      <span className={`badge ${STATUS_COLORS[m.status]}`}>{STATUS_LABELS[m.status]}</span>
                      {!m.synced && <span className="badge bg-orange-100 text-orange-600">Non sync.</span>}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {SPECIES_LABELS[m.species] ?? SPECIES_LABELS.autre} • {SEX_LABELS[m.sex]}{m.race ? ` • ${m.race}` : ''} • {formatAge(m)}
                    </p>
                    {m.status === 'vendu' && m.sale_price && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Vendu {m.sale_price.toLocaleString('fr-FR')} FCFA{m.buyer_name ? ` à ${m.buyer_name}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
                    <button onClick={() => setViewHistory(m)} className="btn-icon text-purple-500 bg-purple-50 dark:bg-purple-900/30" title="Historique">
                      <History size={17} />
                    </button>
                    {canEdit && (
                      <button onClick={() => setEditing(m)} className="btn-icon text-blue-500 bg-blue-50 dark:bg-blue-900/30">
                        <Edit2 size={17} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteTarget(m)} className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/30">
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
              Afficher plus ({filtered.length - paginated.length} restants)
            </button>
          )}
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Supprimer cet animal ?"
        message="Il sera déplacé vers la corbeille — récupérable depuis Réglages tant qu'il n'est pas purgé définitivement."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
