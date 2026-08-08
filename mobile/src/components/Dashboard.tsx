import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, TrendingDown, Scale, AlertTriangle, Heart, ShoppingCart, Wallet, Stethoscope, CalendarClock, Syringe, ClipboardList, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { getUpcomingDue } from '../services/healthService';
import { getSales } from '../services/saleService';
import { getMoutons } from '../services/moutonService';
import { getActivityLog } from '../services/activityService';
import { query } from '../db/DatabaseService';
import { HealthRecord, Sale, ActivityLog as ActivityLogEntry, Species } from '../types';
import { isAdult } from './moutons/MoutonsList';
import { SPECIES_LABELS, getEntityIcon } from '../utils/species';
import { speak } from '../utils/voice';

function MiniStat({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`rounded-lg p-2 ${color} shrink-0`}><Icon size={16} className="text-white" /></div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-none">{value}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{label}</p>
      </div>
    </div>
  );
}

function BlocCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-primary-600" />
        <h3 className="font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function Dashboard() {
  const { stats, refreshStats, setActiveTab, simplified } = useApp();
  const { canSell, canAdd } = usePermissions();

  const [alerts, setAlerts]               = useState<HealthRecord[]>([]);
  const [allSales, setAllSales]           = useState<Sale[]>([]);
  const [raceBreakdown, setRaceBreakdown] = useState<{ race: string; count: number }[]>([]);
  const [speciesBreakdown, setSpeciesBreakdown] = useState<{ species: Species; count: number }[]>([]);
  const [ageStats, setAgeStats]           = useState({ adultes: 0, jeunes: 0 });
  const [todayTreatments, setTodayTreatments] = useState(0);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    refreshStats();
    getUpcomingDue().then(setAlerts);
    getSales().then(setAllSales);
    getActivityLog(6).then(setRecentActivity);

    getMoutons().then(moutons => {
      const races: Record<string, number> = {};
      const species: Partial<Record<Species, number>> = {};
      let adultes = 0, jeunes = 0;
      for (const m of moutons) {
        const raceKey = m.race?.trim() || 'Race inconnue';
        races[raceKey] = (races[raceKey] ?? 0) + 1;
        species[m.species] = (species[m.species] ?? 0) + 1;
        const adult = isAdult(m);
        if (adult != null) {
          if (adult) adultes++; else jeunes++;
        }
      }
      setRaceBreakdown(Object.entries(races).map(([race, count]) => ({ race, count })).sort((a, b) => b.count - a.count));
      setSpeciesBreakdown(
        (Object.entries(species) as [Species, number][])
          .map(([sp, count]) => ({ species: sp, count }))
          .sort((a, b) => b.count - a.count),
      );
      setAgeStats({ adultes, jeunes });
    });

    const today = new Date().toISOString().split('T')[0];
    query<{ count: number }>('SELECT COUNT(*) as count FROM health_records WHERE deleted_at IS NULL AND date = ?', [today])
      .then(rows => setTodayTreatments(rows[0]?.count ?? 0));

    const monthStart = new Date().toISOString().slice(0, 7) + '-01';
    query<{ total: number }>('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE deleted_at IS NULL AND date >= ?', [monthStart])
      .then(rows => setMonthExpenses(rows[0]?.total ?? 0));
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRevenue = allSales
    .filter(s => (s.date ?? '').startsWith(thisMonth))
    .reduce((sum, s) => sum + s.amount, 0);

  // Moutons nécessitant une intervention : ceux visés individuellement par un rappel,
  // + tout le troupeau vivant si un rappel « tout le troupeau » est en attente.
  const moutonIdsNeedingCare = new Set(alerts.filter(a => a.target_type === 'mouton' && a.target_id != null).map(a => a.target_id));
  const hasFlockWideAlert = alerts.some(a => a.target_type === 'tous');
  const moutonsNeedingCare = hasFlockWideAlert ? stats.moutonsVivants : moutonIdsNeedingCare.size;

  const balance = stats.totalRevenue - stats.totalExpenses;

  const quickActions = [
    { label: 'Nouvel animal',     tab: 'moutons',            icon: Users,        color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',   show: canAdd },
    { label: 'Enregistrer vente', tab: 'finances/recettes',  icon: ShoppingCart, color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', show: canSell },
    { label: 'Soin / Vaccin',     tab: 'health',             icon: Heart,        color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',        show: canAdd },
    { label: 'Nouvelle dépense',  tab: 'finances/depenses',  icon: Wallet,       color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', show: canAdd },
  ].filter(a => a.show);

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="logo" className="w-12 h-12 object-contain" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mon Troupeau</h1>
          <p className="text-sm text-gray-400 capitalize">{today}</p>
        </div>
        <button
          onClick={() => setActiveTab('recherche')}
          className="btn-icon text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 shrink-0"
          title="Recherche"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Alertes rappels sanitaires */}
      {alerts.length > 0 && (
        <button
          onClick={() => setActiveTab('health')}
          className="w-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 text-left active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-orange-600 dark:text-orange-400 shrink-0" />
            <h3 className="font-semibold text-orange-800 dark:text-orange-200">{alerts.length} rappel(s) sanitaire(s)</h3>
          </div>
          {alerts.slice(0, 2).map(a => (
            <div key={a.id} className="flex justify-between items-center py-0.5">
              <span className="text-sm text-orange-700 dark:text-orange-300">{a.product || a.type}</span>
              <span className="badge bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200">
                {a.next_due ? new Date(a.next_due).toLocaleDateString('fr-FR') : '—'}
              </span>
            </div>
          ))}
          {alerts.length > 2 && <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">+{alerts.length - 2} autres…</p>}
        </button>
      )}

      {/* Bloc Troupeau */}
      <BlocCard title="Troupeau" icon={Users}>
        <div className="grid grid-cols-2 gap-y-3 mb-3">
          <MiniStat label="Total animaux" value={stats.totalMoutons}   icon={Users} color="bg-primary-600" />
          <MiniStat label="Mâles"         value={stats.moutonsMales}   icon={Users} color="bg-blue-500" />
          <MiniStat label="Femelles"      value={stats.moutonsFemelles} icon={Users} color="bg-pink-500" />
          <MiniStat label="Adultes"       value={ageStats.adultes}     icon={Users} color="bg-green-500" />
          <MiniStat label="Jeunes"        value={ageStats.jeunes}      icon={Users} color="bg-yellow-500" />
        </div>
        {speciesBreakdown.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
            <p className="text-xs font-medium text-gray-400 mb-2">Répartition par espèce</p>
            <div className="flex flex-wrap gap-2">
              {speciesBreakdown.map(s => (
                <span key={s.species} className="badge bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300">
                  {SPECIES_LABELS[s.species] ?? SPECIES_LABELS.autre} : {s.count}
                </span>
              ))}
            </div>
          </div>
        )}
        {raceBreakdown.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
            <p className="text-xs font-medium text-gray-400 mb-2">Répartition par race</p>
            <div className="flex flex-wrap gap-2">
              {raceBreakdown.map(r => (
                <span key={r.race} className="badge bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                  {r.race} : {r.count}
                </span>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => setActiveTab('moutons')} className="w-full mt-3 text-xs text-primary-600 dark:text-primary-400 font-medium text-center">
          Voir le troupeau
        </button>
      </BlocCard>

      {/* Bloc Santé */}
      <BlocCard title="Santé" icon={Stethoscope}>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Traitements aujourd'hui" value={todayTreatments}    icon={Syringe}      color="bg-blue-500" />
          <MiniStat label="Rappels prévus"           value={alerts.length}     icon={CalendarClock} color="bg-orange-500" />
          <MiniStat label="Animaux à traiter"        value={moutonsNeedingCare} icon={AlertTriangle} color="bg-red-500" />
        </div>
        <button onClick={() => setActiveTab('health')} className="w-full mt-3 text-xs text-primary-600 dark:text-primary-400 font-medium text-center">
          Voir le suivi sanitaire
        </button>
      </BlocCard>

      {/* Bloc Finances */}
      <BlocCard title="Finances" icon={Wallet}>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Recettes du mois" value={`${monthRevenue.toLocaleString('fr-FR')}`}  icon={TrendingUp}   color="bg-primary-600" />
          <MiniStat label="Dépenses du mois" value={`${monthExpenses.toLocaleString('fr-FR')}`} icon={TrendingDown} color="bg-red-500" />
          <MiniStat label="Solde actuel"     value={`${balance.toLocaleString('fr-FR')}`}       icon={Scale}        color={balance >= 0 ? 'bg-green-600' : 'bg-orange-600'} />
        </div>
        <button onClick={() => setActiveTab('finances/tableau')} className="w-full mt-3 text-xs text-primary-600 dark:text-primary-400 font-medium text-center">
          Voir le tableau financier
        </button>
      </BlocCard>

      {/* Activités récentes */}
      {recentActivity.length > 0 && (
        <BlocCard title="Activités récentes" icon={ClipboardList}>
          <div className="space-y-2">
            {recentActivity.map(log => (
              <div key={log.id} className="flex items-start gap-2.5 py-1 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <span className="text-lg shrink-0">{getEntityIcon(log.entity_type, log.details)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{log.action}</p>
                  {log.created_at && (
                    <p className="text-[11px] text-gray-400">
                      {new Date(log.created_at).toLocaleDateString('fr-FR')} {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </BlocCard>
      )}

      {/* Actions rapides (filtrées par rôle) */}
      {quickActions.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ label, tab, icon: Icon, color }) => (
              <button
                key={tab}
                onClick={() => { if (simplified) speak(label); setActiveTab(tab); }}
                className={`flex items-center gap-2 p-3 simplified:p-5 rounded-xl ${color} active:scale-95 transition-transform`}
              >
                <Icon size={simplified ? 24 : 16} />
                <span className="text-xs simplified:text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
