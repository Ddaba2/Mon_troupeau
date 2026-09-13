import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bird, ChevronRight, Plus, Save } from 'lucide-react';
import { EggProduction, EggSale, PoultryLot, PoultryLotSummary, PoultryMovement, PoultryMovementType } from '../../types';
import {
  addEggProduction,
  addEggSale,
  addPoultryMovement,
  createPoultryLot,
  getEggProductions,
  getPoultryLot,
  getPoultryLots,
  getPoultryMovements,
} from '../../services/poultryService';
import { useAuth } from '../../context/AuthContext';

interface Props { initialKind?: 'chair' | 'pondeuse'; onBack: () => void }
const today = () => new Date().toISOString().split('T')[0];
const movementLabels: Record<PoultryMovementType, string> = {
  entree: 'Entrée', mort: 'Mortalité', vente: 'Vente', sortie: 'Sortie', transfert: 'Transfert', correction: 'Correction',
};

export function PoultryPage({ initialKind, onBack }: Props) {
  const { currentUser } = useAuth();
  const [lots, setLots] = useState<PoultryLotSummary[]>([]);
  const [selected, setSelected] = useState<PoultryLotSummary | null>(null);
  const [filter, setFilter] = useState<'tous' | 'chair' | 'pondeuse'>('tous');
  const [statusFilter, setStatusFilter] = useState<'tous' | PoultryLot['status']>('tous');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(!!initialKind);
  const [lotForm, setLotForm] = useState({ name: '', kind: (initialKind ?? 'chair') as 'chair' | 'pondeuse', entry_date: today(), initial_count: '', origin: '', purchase_total: '', building: '', notes: '' });
  const [movement, setMovement] = useState({ type: 'mort' as PoultryMovementType, date: today(), quantity: '', unit_price: '', reason: '', comment: '', buyer_name: '', payment_method: 'especes' as PoultryMovement['payment_method'] });
  const [production, setProduction] = useState({ date: today(), produced: '', broken: '0', consumed: '0', sold: '0', comment: '' });
  const [eggSale, setEggSale] = useState({ date: today(), unit: 'oeuf' as EggSale['unit'], quantity: '', unit_price: '', buyer_name: '', payment_method: 'especes' as EggSale['payment_method'] });
  const [movements, setMovements] = useState<PoultryMovement[]>([]);
  const [productions, setProductions] = useState<EggProduction[]>([]);
  const [error, setError] = useState('');

  const load = async () => setLots(await getPoultryLots());
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!selected?.id) return;
    Promise.all([getPoultryMovements(selected.id), getEggProductions(selected.id)]).then(([nextMovements, nextProductions]) => {
      setMovements(nextMovements);
      setProductions(nextProductions);
    });
  }, [selected]);

  const refreshSelected = async () => {
    await load();
    if (selected?.id) setSelected(await getPoultryLot(selected.id));
  };

  const saveLot = async () => {
    try {
      if (!lotForm.name.trim() || !lotForm.initial_count) throw new Error('Nom et nombre initial obligatoires');
      await createPoultryLot({ ...lotForm, name: lotForm.name.trim(), initial_count: Number(lotForm.initial_count), purchase_total: lotForm.purchase_total ? Number(lotForm.purchase_total) : undefined });
      setShowCreate(false); setError(''); setLotForm({ name: '', kind: 'chair', entry_date: today(), initial_count: '', origin: '', purchase_total: '', building: '', notes: '' }); await load();
    } catch (e: any) { setError(e.message); }
  };

  const saveMovement = async () => {
    if (!selected?.id) return;
    try {
      await addPoultryMovement({ ...movement, lot_id: selected.id, quantity: Number(movement.quantity), unit_price: movement.type === 'vente' ? Number(movement.unit_price) : undefined, user_id: currentUser?.id });
      setMovement({ type: 'mort', date: today(), quantity: '', unit_price: '', reason: '', comment: '', buyer_name: '', payment_method: 'especes' }); setError(''); await refreshSelected();
    } catch (e: any) { setError(e.message); }
  };

  const saveProduction = async () => {
    if (!selected?.id) return;
    try {
      await addEggProduction({ lot_id: selected.id, date: production.date, produced: Number(production.produced), broken: Number(production.broken), consumed: Number(production.consumed), sold: Number(production.sold), comment: production.comment });
      setProduction({ date: today(), produced: '', broken: '0', consumed: '0', sold: '0', comment: '' }); setError(''); await refreshSelected();
    } catch (e: any) { setError(e.message); }
  };

  const saveEggSale = async () => {
    if (!selected?.id) return;
    try {
      await addEggSale({ ...eggSale, lot_id: selected.id, quantity: Number(eggSale.quantity), unit_price: Number(eggSale.unit_price) });
      setEggSale({ date: today(), unit: 'oeuf', quantity: '', unit_price: '', buyer_name: '', payment_method: 'especes' }); setError(''); await refreshSelected();
    } catch (e: any) { setError(e.message); }
  };

  if (selected) return <LotDetail lot={selected} movements={movements} productions={productions} movement={movement} setMovement={setMovement} production={production} setProduction={setProduction} eggSale={eggSale} setEggSale={setEggSale} onMovement={saveMovement} onProduction={saveProduction} onEggSale={saveEggSale} error={error} onBack={() => setSelected(null)} />;

  const filtered = lots.filter(lot => (filter === 'tous' || lot.kind === filter) && (statusFilter === 'tous' || lot.status === statusFilter) && lot.name.toLowerCase().includes(search.toLowerCase()));
  return <div className="p-4">
    <div className="flex items-center gap-3 mb-4"><button onClick={onBack} className="p-2 -ml-2 text-gray-500"><ArrowLeft size={24} /></button><div><h2 className="text-xl font-bold">Volailles</h2><p className="text-xs text-gray-500">Lots de chair et pondeuses</p></div><button onClick={() => setShowCreate(true)} className="ml-auto bg-primary-600 text-white rounded-full p-3"><Plus size={20} /></button></div>
    <div className="flex gap-2 mb-2 overflow-x-auto">{(['tous', 'chair', 'pondeuse'] as const).map(value => <button key={value} onClick={() => setFilter(value)} className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${filter === value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{value === 'tous' ? 'Tous' : value === 'chair' ? 'Poulets de chair' : 'Poules pondeuses'}</button>)}</div>
    <input className="input mb-2" placeholder="Rechercher un lot" value={search} onChange={e => setSearch(e.target.value)} />
    <div className="flex gap-2 mb-4 overflow-x-auto">{(['tous', 'actif', 'termine', 'vendu', 'archive'] as const).map(value => <button key={value} onClick={() => setStatusFilter(value)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${statusFilter === value ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{value === 'tous' ? 'Tous statuts' : value[0].toUpperCase() + value.slice(1)}</button>)}</div>
    {showCreate && <div className="card mb-4 space-y-3"><h3 className="font-semibold">Créer un nouveau lot</h3><input className="input" placeholder="Nom du lot" value={lotForm.name} onChange={e => setLotForm({ ...lotForm, name: e.target.value })} /><div className="grid grid-cols-2 gap-2"><select className="input" value={lotForm.kind} onChange={e => setLotForm({ ...lotForm, kind: e.target.value as 'chair' | 'pondeuse' })}><option value="chair">Poulet de chair</option><option value="pondeuse">Poule pondeuse</option></select><input className="input" type="date" value={lotForm.entry_date} onChange={e => setLotForm({ ...lotForm, entry_date: e.target.value })} /></div><div className="grid grid-cols-2 gap-2"><input className="input" type="number" min="1" placeholder="Nombre initial" value={lotForm.initial_count} onChange={e => setLotForm({ ...lotForm, initial_count: e.target.value })} /><input className="input" type="number" min="0" placeholder="Prix total FCFA" value={lotForm.purchase_total} onChange={e => setLotForm({ ...lotForm, purchase_total: e.target.value })} /></div><div className="grid grid-cols-2 gap-2"><input className="input" placeholder="Provenance" value={lotForm.origin} onChange={e => setLotForm({ ...lotForm, origin: e.target.value })} /><input className="input" placeholder="Bâtiment / poulailler" value={lotForm.building} onChange={e => setLotForm({ ...lotForm, building: e.target.value })} /></div><textarea className="input" rows={2} placeholder="Notes" value={lotForm.notes} onChange={e => setLotForm({ ...lotForm, notes: e.target.value })} /><button onClick={saveLot} className="btn-primary"><Save size={18} /> Enregistrer le lot</button></div>}
    {error && <p className="mb-3 rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</p>}
    {filtered.length === 0 ? <div className="text-center py-12 text-gray-400"><Bird size={48} className="mx-auto mb-3 text-gray-200" />Aucun lot enregistré</div> : <div className="space-y-3">{filtered.map(lot => <button key={lot.id} onClick={() => setSelected(lot)} className="card w-full text-left"><div className="flex items-center gap-3"><span className="text-3xl">{lot.kind === 'chair' ? '🍗' : '🥚'}</span><div className="flex-1"><p className="font-bold">{lot.name}</p><p className="text-xs text-gray-500">{lot.kind === 'chair' ? 'Poulet de chair' : 'Poule pondeuse'} • {lot.status}</p></div><div className="text-right"><p className="text-xl font-bold text-primary-600">{lot.current_count}</p><p className="text-xs text-gray-500">restants</p></div><ChevronRight size={18} className="text-gray-400" /></div><div className="flex gap-4 mt-3 text-xs text-gray-500"><span>Initial : {lot.initial_count}</span><span>Morts : {lot.deaths}</span><span>Vendus : {lot.sold}</span>{lot.kind === 'pondeuse' && <span>Œufs : {lot.egg_stock}</span>}</div></button>)}</div>}
  </div>;
}

function LotDetail({ lot, movements, productions, movement, setMovement, production, setProduction, eggSale, setEggSale, onMovement, onProduction, onEggSale, error, onBack }: any) {
  const age = Math.max(0, Math.floor((Date.now() - new Date(lot.entry_date).getTime()) / 86400000));
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
  const producedSince = (start: Date) => productions.filter((item: EggProduction) => new Date(`${item.date}T00:00:00`) >= start).reduce((sum: number, item: EggProduction) => sum + item.produced, 0);
  const salesRevenue = movements.filter((item: PoultryMovement) => item.type === 'vente').reduce((sum: number, item: PoultryMovement) => sum + (item.amount ?? 0), 0);
  const saleCount = movements.filter((item: PoultryMovement) => item.type === 'vente').reduce((sum: number, item: PoultryMovement) => sum + item.quantity, 0);
  const averageSalePrice = saleCount ? salesRevenue / saleCount : 0;
  const estimatedProfit = lot.revenue - (lot.purchase_total ?? 0) - (lot.expenses_total ?? 0);
  return <div className="p-4"><div className="flex items-center gap-3 mb-4"><button onClick={onBack} className="p-2 -ml-2 text-gray-500"><ArrowLeft size={24} /></button><div><h2 className="text-xl font-bold">{lot.name}</h2><p className="text-xs text-gray-500">{lot.kind === 'chair' ? 'Poulet de chair' : 'Poule pondeuse'} • {age} jour(s)</p></div></div><div className="grid grid-cols-2 gap-2 mb-4"><Metric label="Effectif initial" value={lot.initial_count} /><Metric label="Effectif actuel" value={lot.current_count} /><Metric label="Morts" value={lot.deaths} /><Metric label="Vendus" value={lot.sold} /><Metric label="Sorties" value={lot.exits} /><Metric label="Chiffre affaires" value={`${lot.revenue.toLocaleString('fr-FR')} F`} /><Metric label="Dépenses" value={`${(lot.expenses_total ?? 0).toLocaleString('fr-FR')} F`} /><Metric label="Prix moyen" value={`${Math.round(averageSalePrice).toLocaleString('fr-FR')} F`} /><Metric label="Bénéfice estimé" value={`${estimatedProfit.toLocaleString('fr-FR')} F`} /></div>{lot.kind === 'pondeuse' && <div className="grid grid-cols-2 gap-2 mb-4"><Metric label="Œufs aujourd'hui" value={producedSince(startOfDay)} /><Metric label="Œufs semaine" value={producedSince(startOfWeek)} /><Metric label="Œufs mois" value={producedSince(startOfMonth)} /><Metric label="Œufs cassés" value={lot.eggs_broken} /><Metric label="Œufs consommés" value={lot.eggs_consumed} /><Metric label="Œufs vendus" value={lot.eggs_sold} /><Metric label="Stock d'œufs" value={lot.egg_stock} /></div>}{error && <p className="mb-3 rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</p>}<div className="card space-y-3 mb-4"><h3 className="font-semibold">Ajouter une opération</h3><div className="grid grid-cols-2 gap-2"><select className="input" value={movement.type} onChange={e => setMovement({ ...movement, type: e.target.value })}>{Object.entries(movementLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><input className="input" type="date" value={movement.date} onChange={e => setMovement({ ...movement, date: e.target.value })} /></div><input className="input" type="number" min="1" placeholder="Quantité" value={movement.quantity} onChange={e => setMovement({ ...movement, quantity: e.target.value })} /><input className="input" placeholder="Motif" value={movement.reason} onChange={e => setMovement({ ...movement, reason: e.target.value })} />{movement.type === 'vente' && <div className="grid grid-cols-2 gap-2"><input className="input" type="number" min="1" placeholder="Prix unitaire" value={movement.unit_price} onChange={e => setMovement({ ...movement, unit_price: e.target.value })} /><input className="input" placeholder="Client" value={movement.buyer_name} onChange={e => setMovement({ ...movement, buyer_name: e.target.value })} /></div>}<textarea className="input" rows={2} placeholder="Commentaire" value={movement.comment} onChange={e => setMovement({ ...movement, comment: e.target.value })} /><button onClick={onMovement} className="btn-primary"><Save size={18} /> Enregistrer</button></div>{lot.kind === 'pondeuse' && <><div className="card space-y-3 mb-4"><h3 className="font-semibold">Production d'œufs</h3><div className="grid grid-cols-2 gap-2"><input className="input" type="date" value={production.date} onChange={e => setProduction({ ...production, date: e.target.value })} /><input className="input" type="number" min="0" placeholder="Produits" value={production.produced} onChange={e => setProduction({ ...production, produced: e.target.value })} /></div><div className="grid grid-cols-3 gap-2"><input className="input" type="number" min="0" placeholder="Cassés" value={production.broken} onChange={e => setProduction({ ...production, broken: e.target.value })} /><input className="input" type="number" min="0" placeholder="Consommés" value={production.consumed} onChange={e => setProduction({ ...production, consumed: e.target.value })} /><input className="input" type="number" min="0" placeholder="Vendus" value={production.sold} onChange={e => setProduction({ ...production, sold: e.target.value })} /></div><button onClick={onProduction} className="btn-primary"><Save size={18} /> Enregistrer la production</button><p className="text-sm text-gray-500">Production totale : {lot.eggs_produced} • Stock : <strong>{lot.egg_stock}</strong></p></div><div className="card space-y-3 mb-4"><h3 className="font-semibold">Vendre des œufs</h3><div className="grid grid-cols-2 gap-2"><select className="input" value={eggSale.unit} onChange={e => setEggSale({ ...eggSale, unit: e.target.value })}><option value="oeuf">Œuf</option><option value="plateau">Plateau</option><option value="carton">Carton</option></select><input className="input" type="date" value={eggSale.date} onChange={e => setEggSale({ ...eggSale, date: e.target.value })} /></div><div className="grid grid-cols-2 gap-2"><input className="input" type="number" min="1" placeholder="Quantité" value={eggSale.quantity} onChange={e => setEggSale({ ...eggSale, quantity: e.target.value })} /><input className="input" type="number" min="1" placeholder="Prix unitaire" value={eggSale.unit_price} onChange={e => setEggSale({ ...eggSale, unit_price: e.target.value })} /></div><input className="input" placeholder="Client" value={eggSale.buyer_name} onChange={e => setEggSale({ ...eggSale, buyer_name: e.target.value })} /><button onClick={onEggSale} className="btn-primary"><Save size={18} /> Vendre les œufs</button></div></>}<div className="card"><h3 className="font-semibold mb-3">Historique des mouvements</h3>{movements.length === 0 ? <p className="text-sm text-gray-400">Aucun mouvement</p> : movements.map((item: PoultryMovement) => <div key={item.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><span>{item.date} • {movementLabels[item.type]}</span><span>{item.quantity} • Stock {item.stock_after}{item.unit_price ? ` • ${item.amount?.toLocaleString('fr-FR')} F` : ''}</span></div>)}</div>{lot.kind === 'pondeuse' && <div className="card mt-3"><h3 className="font-semibold mb-3">Historique des productions</h3>{productions.slice(0, 10).map((item: EggProduction) => <div key={item.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><span>{item.date}</span><span>{item.produced} produits • stock {item.stock_after}</span></div>)}</div>}</div>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) { return <div className="card"><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold text-gray-800 dark:text-gray-100">{value}</p></div>; }
