import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, FileJson, FileSpreadsheet, TrendingUp, Users, ShoppingCart, Heart, Calendar, TrendingDown, Award } from 'lucide-react';
import { query } from '../../db/DatabaseService';
import { getSales } from '../../services/saleService';
import { getMoutons } from '../../services/moutonService';
import { getHealthRecords } from '../../services/healthService';
import { getExpenses } from '../../services/expenseService';
import { downloadJSON, downloadPDF, downloadCSV } from '../../utils/exportUtils';
import { TARGET_LABELS } from '../sales/SalesList';
import { SEX_LABELS, STATUS_LABELS, isAdult } from '../moutons/MoutonsList';
import { SkeletonList } from '../ui/Skeleton';
import { useApp } from '../../context/AppContext';
import { computeMoutonProfitability, MoutonProfitability } from '../../utils/profitability';
import { SPECIES_LABELS } from '../../utils/species';
import { Species } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MonthRow  { month: string; cnt: number; revenue: number }
interface TypeRow   { target_type: string; cnt: number; revenue: number }
interface PayRow    { payment_method: string; cnt: number; revenue: number }
interface StatusRow { status: string; count: number }
interface SexRow    { sex: string; count: number }
interface SpeciesRow { species: Species; count: number }
interface RaceRow   { race: string | null; count: number }
interface TypeCntRow { type: string; count: number }
interface AgeStats  { adultes: number; jeunes: number; inconnu: number }

// ─── Composants graphiques ────────────────────────────────────────────────────
function BarRow({ label, value, max, color, unit = '' }: {
  label: string; value: number; max: number; color: string; unit?: string
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-300 truncate max-w-[65%]">{label}</span>
        <span className="font-semibold text-gray-800 dark:text-gray-100 ml-2">
          {value.toLocaleString('fr-FR')}{unit}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="card mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-primary-600 shrink-0" />
        <h3 className="font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
};

const PAYMENT_LABELS: Record<string, string> = {
  especes:      'Espèces',
  mobile_money: 'Mobile Money',
  cheque:       'Chèque',
  virement:     'Virement',
  credit:       'Crédit',
  autre:        'Autre',
};

// ─── Filtres date ─────────────────────────────────────────────────────────────
function thisYear(): { from: string; to: string } {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

// ─── Page principale ──────────────────────────────────────────────────────────
export function StatisticsPage() {
  const { stats } = useApp();
  const [loading, setLoading]         = useState(true);
  const [exporting, setExporting]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom]       = useState(thisYear().from);
  const [dateTo, setDateTo]           = useState(thisYear().to);

  const [monthlyData, setMonthly]         = useState<MonthRow[]>([]);
  const [salesByType, setSalesByType]     = useState<TypeRow[]>([]);
  const [salesByPay, setSalesByPay]       = useState<PayRow[]>([]);
  const [moutonStatus, setMoutonStatus]   = useState<StatusRow[]>([]);
  const [moutonSex, setMoutonSex]         = useState<SexRow[]>([]);
  const [moutonSpecies, setMoutonSpecies] = useState<SpeciesRow[]>([]);
  const [moutonRace, setMoutonRace]       = useState<RaceRow[]>([]);
  const [ageStats, setAgeStats]           = useState<AgeStats>({ adultes: 0, jeunes: 0, inconnu: 0 });
  const [healthByType, setHealthByType]   = useState<TypeCntRow[]>([]);
  const [periodRevenue, setPeriodRevenue] = useState(0);
  const [periodExpenses, setPeriodExp]    = useState(0);
  const [profitability, setProfitability] = useState<MoutonProfitability[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [monthly, byType, byPay, statusRows, sexRows, speciesRows, raceRows, healthT, revRow, expRow, moutonsForAge, allHealth, allSales] = await Promise.all([
      query<MonthRow>(
        `SELECT strftime('%Y-%m', date) as month,
                COUNT(*) as cnt,
                COALESCE(SUM(amount),0) as revenue
         FROM sales
         WHERE deleted_at IS NULL AND date >= ? AND date <= ?
         GROUP BY month ORDER BY month DESC`,
        [dateFrom, dateTo],
      ),
      query<TypeRow>(
        `SELECT target_type, COUNT(*) as cnt, COALESCE(SUM(amount),0) as revenue
         FROM sales WHERE deleted_at IS NULL AND date >= ? AND date <= ?
         GROUP BY target_type`,
        [dateFrom, dateTo],
      ),
      query<PayRow>(
        `SELECT payment_method, COUNT(*) as cnt, COALESCE(SUM(amount),0) as revenue
         FROM sales WHERE deleted_at IS NULL AND date >= ? AND date <= ?
         GROUP BY payment_method`,
        [dateFrom, dateTo],
      ),
      query<StatusRow>('SELECT status, COUNT(*) as count FROM moutons WHERE deleted_at IS NULL GROUP BY status'),
      query<SexRow>('SELECT sex, COUNT(*) as count FROM moutons WHERE deleted_at IS NULL GROUP BY sex'),
      query<SpeciesRow>('SELECT species, COUNT(*) as count FROM moutons WHERE deleted_at IS NULL GROUP BY species ORDER BY count DESC'),
      query<RaceRow>('SELECT race, COUNT(*) as count FROM moutons WHERE deleted_at IS NULL GROUP BY race ORDER BY count DESC'),
      query<TypeCntRow>('SELECT type, COUNT(*) as count FROM health_records WHERE deleted_at IS NULL GROUP BY type'),
      query<{ revenue: number }>(
        'SELECT COALESCE(SUM(amount),0) as revenue FROM sales WHERE deleted_at IS NULL AND date >= ? AND date <= ?',
        [dateFrom, dateTo],
      ),
      query<{ total: number }>(
        'SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE deleted_at IS NULL AND date >= ? AND date <= ?',
        [dateFrom, dateTo],
      ),
      getMoutons(),
      getHealthRecords(),
      getSales(),
    ]);

    setMonthly(monthly.reverse());
    setSalesByType(byType);
    setSalesByPay(byPay);
    setMoutonStatus(statusRows);
    setMoutonSex(sexRows);
    setMoutonSpecies(speciesRows);
    setMoutonRace(raceRows);
    setHealthByType(healthT);
    setPeriodRevenue(revRow[0]?.revenue ?? 0);
    setPeriodExp(expRow[0]?.total ?? 0);

    let adultes = 0, jeunes = 0, inconnu = 0;
    for (const m of moutonsForAge) {
      const adult = isAdult(m);
      if (adult == null) inconnu++;
      else if (adult) adultes++;
      else jeunes++;
    }
    setAgeStats({ adultes, jeunes, inconnu });

    const allProfitability = moutonsForAge
      .map(m => computeMoutonProfitability(m, allHealth, allSales))
      .filter(p => p.saleRevenue > 0 || p.purchaseCost > 0 || p.healthCost > 0)
      .sort((a, b) => b.margin - a.margin);
    setProfitability(allProfitability);

    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = async () => {
    setExporting(true);
    const [moutons, sales, health, expenses] = await Promise.all([
      getMoutons(), getSales(), getHealthRecords(), getExpenses(),
    ]);
    const date = new Date().toISOString().split('T')[0];

    await downloadCSV(`animaux-${date}.csv`,
      ['Numéro', 'Nom', 'Espèce', 'Race', 'Sexe', 'Statut', 'Naissance', 'Couleur', 'Origine'],
      moutons.map(m => [
        m.identification_number, m.name ?? '', SPECIES_LABELS[m.species] ?? m.species, m.race ?? '', SEX_LABELS[m.sex] ?? m.sex,
        STATUS_LABELS[m.status] ?? m.status, m.birth_date ?? '', m.color ?? '',
        m.origin === 'nee_ferme' ? 'Né(e) dans la ferme' : 'Acheté(e)',
      ]),
    );
    await downloadCSV(`ventes-${date}.csv`,
      ['Date', 'Type', 'Quantité', 'Prix unitaire (FCFA)', 'Total (FCFA)', 'Client', 'Mode de paiement'],
      sales.map(s => [
        s.date, TARGET_LABELS[s.target_type] ?? s.target_type, s.quantity,
        s.unit_price, s.amount, s.buyer_name ?? '', s.payment_method,
      ]),
    );
    await downloadCSV(`depenses-${date}.csv`,
      ['Date', 'Catégorie', 'Montant (FCFA)', 'Description', 'Mode de paiement'],
      expenses.map(e => [e.date, e.category, e.amount, e.description ?? '', e.payment_method]),
    );
    await downloadCSV(`sante-${date}.csv`,
      ['Date', 'Type', 'Produit', 'Quantité', 'Coût (FCFA)', 'Prochaine intervention'],
      health.map(h => [h.date, h.type, h.product ?? '', h.quantity ?? '', h.cost ?? '', h.next_due ?? '']),
    );
    setExporting(false);
  };

  const handleExportJSON = async () => {
    setExporting(true);
    const [moutons, sales, health, expenses] = await Promise.all([
      getMoutons(), getSales(), getHealthRecords(), getExpenses(),
    ]);
    downloadJSON(
      { exportedAt: new Date().toISOString(), moutons, sales, health, expenses },
      `mon-troupeau-${new Date().toISOString().split('T')[0]}.json`,
    );
    setExporting(false);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    const [moutons, sales, health, expenses] = await Promise.all([
      getMoutons(), getSales(), getHealthRecords(), getExpenses(),
    ]);
    const date = new Date().toLocaleDateString('fr-FR');
    const netProfit = periodRevenue - periodExpenses;

    downloadPDF(
      'Rapport Mon Troupeau Mali',
      [
        {
          title: 'Revenus par mois (période sélectionnée)',
          headers: ['Mois', 'Ventes', 'Revenus (FCFA)'],
          rows: monthlyData.map(m => {
            const [yr, mo] = m.month.split('-');
            return [`${MONTH_LABELS[mo] ?? mo} ${yr}`, m.cnt, m.revenue.toLocaleString('fr-FR')];
          }),
        },
        {
          title: 'Tout le troupeau',
          headers: ['N°', 'Nom', 'Espèce', 'Race', 'Sexe', 'Statut', 'Naissance'],
          rows: moutons.map(m => [
            m.identification_number, m.name ?? '—', SPECIES_LABELS[m.species] ?? m.species, m.race ?? '—',
            SEX_LABELS[m.sex] ?? m.sex, STATUS_LABELS[m.status] ?? m.status, m.birth_date ?? '—',
          ]),
        },
        {
          title: 'Ventes',
          headers: ['Date', 'Type', 'Qté', 'P.U (FCFA)', 'Total (FCFA)', 'Client'],
          rows: sales.map(s => [
            new Date(s.date).toLocaleDateString('fr-FR'),
            TARGET_LABELS[s.target_type] ?? s.target_type,
            s.quantity, s.unit_price.toLocaleString('fr-FR'),
            s.amount.toLocaleString('fr-FR'), s.buyer_name ?? '—',
          ]),
        },
        {
          title: 'Dépenses',
          headers: ['Date', 'Catégorie', 'Description', 'Montant (FCFA)'],
          rows: expenses.map(e => [
            new Date(e.date).toLocaleDateString('fr-FR'),
            e.category, e.description ?? '—',
            e.amount.toLocaleString('fr-FR'),
          ]),
        },
        {
          title: 'Suivi sanitaire',
          headers: ['Date', 'Type', 'Produit', 'Quantité', 'Coût (FCFA)', 'Prochain'],
          rows: health.map(h => [
            new Date(h.date).toLocaleDateString('fr-FR'),
            h.type, h.product ?? '—', h.quantity ?? '—',
            h.cost != null ? h.cost.toLocaleString('fr-FR') : '—', h.next_due ?? '—',
          ]),
        },
      ],
      `Généré le ${date} — Revenus : ${periodRevenue.toLocaleString('fr-FR')} FCFA | Dépenses : ${periodExpenses.toLocaleString('fr-FR')} FCFA | Bénéfice net : ${netProfit.toLocaleString('fr-FR')} FCFA`,
    );
    setExporting(false);
  };

  const maxMonthRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);
  const maxTypeRevenue  = Math.max(...salesByType.map(t => t.revenue), 1);
  const maxStatusCount  = Math.max(...moutonStatus.map(c => c.count), 1);
  const maxSexCount     = Math.max(...moutonSex.map(p => p.count), 1);
  const maxSpeciesCount = Math.max(...moutonSpecies.map(p => p.count), 1);
  const maxRaceCount    = Math.max(...moutonRace.map(r => r.count), 1);
  const maxHealthCount  = Math.max(...healthByType.map(h => h.count), 1);
  const maxAgeCount     = Math.max(ageStats.adultes, ageStats.jeunes, ageStats.inconnu, 1);

  const netProfit = periodRevenue - periodExpenses;

  const HEALTH_COLORS: Record<string, string> = {
    vaccination:  'bg-blue-400',
    vermifuge:    'bg-teal-400',
    injection:    'bg-indigo-400',
    vitamines:    'bg-yellow-400',
    consultation: 'bg-purple-400',
    traitement:   'bg-red-400',
    autre:        'bg-gray-400',
  };

  return (
    <div className="p-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={22} className="text-primary-600" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Statistiques</h2>
      </div>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium active:scale-95 transition-all ${showFilters ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
        >
          <Calendar size={14} /> Période
        </button>
        <button
          onClick={handleExportJSON}
          disabled={exporting}
          className="shrink-0 flex items-center gap-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-medium active:scale-95 transition-transform disabled:opacity-50"
        >
          <FileJson size={15} /> JSON
        </button>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="shrink-0 flex items-center gap-1 px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-xs font-medium active:scale-95 transition-transform disabled:opacity-50"
        >
          <FileSpreadsheet size={15} /> CSV
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="shrink-0 flex items-center gap-1 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-xs font-medium active:scale-95 transition-transform disabled:opacity-50"
        >
          <Download size={15} /> PDF
        </button>
      </div>

      {/* Filtres date */}
      {showFilters && (
        <div className="card mb-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Filtrer par période</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Du</label>
              <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Au</label>
              <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {[
              { label: 'Cette année',   from: thisYear().from, to: thisYear().to },
              { label: 'Ce mois',       from: new Date().toISOString().slice(0, 7) + '-01', to: new Date().toISOString().slice(0, 10) },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => { setDateFrom(preset.from); setDateTo(preset.to); }}
                className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 active:scale-95 transition-transform"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList count={5} lines={3} />
      ) : (
        <>
          {/* Synthèse financière */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card bg-primary-600 border-0">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp size={14} className="text-primary-200" />
                <p className="text-primary-100 text-xs">Revenus</p>
              </div>
              <p className="text-xl font-bold text-white">{periodRevenue.toLocaleString('fr-FR')}</p>
              <p className="text-primary-200 text-[10px]">FCFA</p>
            </div>
            <div className="card bg-red-600 border-0">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown size={14} className="text-red-200" />
                <p className="text-red-100 text-xs">Dépenses</p>
              </div>
              <p className="text-xl font-bold text-white">{periodExpenses.toLocaleString('fr-FR')}</p>
              <p className="text-red-200 text-[10px]">FCFA</p>
            </div>
          </div>
          <div className={`card mb-4 border-0 ${netProfit >= 0 ? 'bg-green-600' : 'bg-orange-600'}`}>
            <p className={`text-sm ${netProfit >= 0 ? 'text-green-100' : 'text-orange-100'}`}>Solde / Bénéfice net</p>
            <p className="text-3xl font-bold text-white">{netProfit.toLocaleString('fr-FR')} FCFA</p>
          </div>

          {/* Rentabilité par animal */}
          {profitability.length > 0 && (
            <SectionCard title="Rentabilité par animal" icon={Award}>
              <div className="space-y-2">
                {profitability.slice(0, 10).map(p => (
                  <div key={p.mouton.id} className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        #{p.mouton.identification_number}{p.mouton.name ? ` – ${p.mouton.name}` : ''}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Revenus {p.saleRevenue.toLocaleString('fr-FR')} · Coûts {p.totalCost.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <span className={`font-bold shrink-0 ml-2 ${p.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {p.margin.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                ))}
              </div>
              {profitability.length > 10 && (
                <p className="text-xs text-gray-400 mt-2 text-right">+{profitability.length - 10} autre(s) animal(aux)</p>
              )}
              <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                Ne compte que les ventes, achats et soins individuellement rattachés à chaque animal (les soins « tout le troupeau » ne sont pas répartis).
              </p>
            </SectionCard>
          )}

          {/* Revenus par mois */}
          {monthlyData.length > 0 && (
            <SectionCard title="Revenus par mois" icon={TrendingUp}>
              {monthlyData.map(m => {
                const [yr, mo] = m.month.split('-');
                return (
                  <BarRow
                    key={m.month}
                    label={`${MONTH_LABELS[mo] ?? mo} ${yr}`}
                    value={m.revenue}
                    max={maxMonthRevenue}
                    color="bg-primary-500"
                    unit=" FCFA"
                  />
                );
              })}
            </SectionCard>
          )}

          {/* Ventes par type */}
          {salesByType.length > 0 && (
            <SectionCard title="Ventes par type" icon={ShoppingCart}>
              {salesByType.map(t => (
                <BarRow
                  key={t.target_type}
                  label={TARGET_LABELS[t.target_type] ?? t.target_type}
                  value={t.revenue}
                  max={maxTypeRevenue}
                  color="bg-purple-400"
                  unit=" FCFA"
                />
              ))}
            </SectionCard>
          )}

          {/* Mode de paiement */}
          {salesByPay.length > 0 && (
            <SectionCard title="Modes de paiement" icon={TrendingUp}>
              {salesByPay.map(p => (
                <BarRow
                  key={p.payment_method}
                  label={PAYMENT_LABELS[p.payment_method] ?? p.payment_method}
                  value={p.cnt}
                  max={Math.max(...salesByPay.map(x => x.cnt), 1)}
                  color="bg-indigo-400"
                />
              ))}
            </SectionCard>
          )}

          {/* Répartition par espèce */}
          {moutonSpecies.length > 0 && (
            <SectionCard title="Répartition par espèce" icon={Users}>
              {moutonSpecies.map(s => (
                <BarRow
                  key={s.species}
                  label={SPECIES_LABELS[s.species] ?? SPECIES_LABELS.autre}
                  value={s.count}
                  max={maxSpeciesCount}
                  color="bg-teal-400"
                />
              ))}
            </SectionCard>
          )}

          {/* Répartition par statut */}
          <SectionCard title="Statut du troupeau" icon={Users}>
            {moutonStatus.map(s => (
              <BarRow
                key={s.status}
                label={STATUS_LABELS[s.status] ?? s.status}
                value={s.count}
                max={maxStatusCount}
                color={s.status === 'vivant' ? 'bg-green-400' : s.status === 'vendu' ? 'bg-blue-400' : 'bg-gray-300'}
              />
            ))}
            <div className="text-xs text-gray-400 mt-2 text-right">
              Total : {moutonStatus.reduce((s, r) => s + r.count, 0)} animaux
            </div>
          </SectionCard>

          {/* Répartition par sexe */}
          <SectionCard title="Répartition par sexe" icon={Users}>
            {moutonSex.map(s => (
              <BarRow
                key={s.sex}
                label={SEX_LABELS[s.sex] ?? s.sex}
                value={s.count}
                max={maxSexCount}
                color={s.sex === 'male' ? 'bg-blue-400' : s.sex === 'femelle' ? 'bg-pink-400' : 'bg-gray-300'}
              />
            ))}
          </SectionCard>

          {/* Répartition par âge */}
          <SectionCard title="Répartition par âge" icon={Users}>
            <BarRow label="Adultes" value={ageStats.adultes} max={maxAgeCount} color="bg-green-400" />
            <BarRow label="Jeunes"  value={ageStats.jeunes}  max={maxAgeCount} color="bg-yellow-400" />
            {ageStats.inconnu > 0 && (
              <BarRow label="Âge inconnu" value={ageStats.inconnu} max={maxAgeCount} color="bg-gray-300" />
            )}
          </SectionCard>

          {/* Répartition par race */}
          {moutonRace.length > 0 && (
            <SectionCard title="Répartition par race" icon={Users}>
              {moutonRace.map(r => (
                <BarRow
                  key={r.race ?? 'inconnue'}
                  label={r.race ?? 'Race inconnue'}
                  value={r.count}
                  max={maxRaceCount}
                  color="bg-amber-400"
                />
              ))}
            </SectionCard>
          )}

          {/* Santé */}
          {healthByType.length > 0 && (
            <SectionCard title="Soins sanitaires" icon={Heart}>
              {healthByType.map(h => (
                <BarRow
                  key={h.type}
                  label={h.type.charAt(0).toUpperCase() + h.type.slice(1)}
                  value={h.count}
                  max={maxHealthCount}
                  color={HEALTH_COLORS[h.type] ?? 'bg-gray-400'}
                />
              ))}
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
