import { query, run, saveStore } from '../db/DatabaseService';
import { Mouton, Sale, HealthRecord, Expense, WeightRecord, PoultryLot, PoultryMovement, EggProduction, EggSale } from '../types';

export interface BackupData {
  moutons: Mouton[];
  sales: Sale[];
  health: HealthRecord[];
  expenses: Expense[];
  weights?: WeightRecord[];
  poultryLots?: PoultryLot[];
  poultryMovements?: PoultryMovement[];
  eggProductions?: EggProduction[];
  eggSales?: EggSale[];
}

export function isValidBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.moutons) && Array.isArray(d.sales) && Array.isArray(d.health) && Array.isArray(d.expenses);
}

const now = () => new Date().toISOString();

// Remplace intégralement les données du troupeau par celles d'une sauvegarde
// exportée précédemment (JSON). Les éléments dans la corbeille ne sont pas
// concernés par l'export/import : seules les données actives sont restaurées.
export async function exportBackupData(): Promise<BackupData> {
  const [moutons, sales, health, expenses, weights, poultryLots, poultryMovements, eggProductions, eggSales] = await Promise.all([
    query<Mouton>('SELECT * FROM moutons WHERE deleted_at IS NULL'),
    query<Sale>('SELECT * FROM sales WHERE deleted_at IS NULL'),
    query<HealthRecord>('SELECT * FROM health_records WHERE deleted_at IS NULL'),
    query<Expense>('SELECT * FROM expenses WHERE deleted_at IS NULL'),
    query<WeightRecord>('SELECT * FROM weight_records'),
    query<PoultryLot>('SELECT * FROM poultry_lots WHERE deleted_at IS NULL'),
    query<PoultryMovement>('SELECT * FROM poultry_movements WHERE deleted_at IS NULL'),
    query<EggProduction>('SELECT * FROM egg_productions WHERE deleted_at IS NULL'),
    query<EggSale>('SELECT * FROM egg_sales WHERE deleted_at IS NULL'),
  ]);
  return { moutons, sales, health, expenses, weights, poultryLots, poultryMovements, eggProductions, eggSales };
}

export async function restoreFromBackup(data: BackupData): Promise<{ moutons: number; sales: number; health: number; expenses: number; poultryLots: number }> {
  await run('DELETE FROM sales');
  await run('DELETE FROM health_records');
  await run('DELETE FROM expenses');
  await run('DELETE FROM moutons');
  await run('DELETE FROM weight_records');
  await run('DELETE FROM poultry_movements');
  await run('DELETE FROM egg_productions');
  await run('DELETE FROM egg_sales');
  await run('DELETE FROM poultry_lots');

  for (const m of data.moutons) {
    await run(
      `INSERT INTO moutons
       (id, identification_number, name, photo, species, race, sex, birth_date, estimated_age_months, color,
        origin, status, sale_price, sale_date, buyer_name, observations, poultry_kind, acquisition_date, weight_kg, synced, server_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.id ?? null, m.identification_number, m.name ?? null, m.photo ?? null, m.species ?? 'mouton', m.race ?? null, m.sex,
        m.birth_date ?? null, m.estimated_age_months ?? null, m.color ?? null,
        m.origin, m.status, m.sale_price ?? null, m.sale_date ?? null, m.buyer_name ?? null,
        m.observations ?? null, m.poultry_kind ?? null, m.acquisition_date ?? null, m.weight_kg ?? null,
        m.synced ?? 1, m.server_id ?? null, m.created_at ?? now(), m.updated_at ?? now(),
      ],
    );
  }

  for (const h of data.health) {
    await run(
      `INSERT INTO health_records
       (id, type, target_type, target_id, date, product, quantity, cost, next_due, notes, synced, server_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        h.id ?? null, h.type, h.target_type ?? 'tous', h.target_id ?? null, h.date,
        h.product ?? null, h.quantity ?? null, h.cost ?? null, h.next_due ?? null, h.notes ?? null,
        h.synced ?? 1, h.server_id ?? null, h.created_at ?? now(),
      ],
    );
  }

  for (const s of data.sales) {
    await run(
      `INSERT INTO sales
       (id, target_type, target_id, date, quantity, unit_price, amount, buyer_name, payment_method, notes, synced, server_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id ?? null, s.target_type, s.target_id ?? null, s.date, s.quantity, s.unit_price, s.amount,
        s.buyer_name ?? null, s.payment_method, s.notes ?? null, s.synced ?? 1, s.server_id ?? null, s.created_at ?? now(),
      ],
    );
  }

  for (const e of data.expenses) {
    await run(
      `INSERT INTO expenses
      (id, category, date, amount, description, payment_method, notes, target_type, target_id, synced, server_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id ?? null, e.category, e.date, e.amount, e.description ?? null, e.payment_method,
        e.notes ?? null, e.target_type ?? null, e.target_id ?? null, e.synced ?? 1, e.server_id ?? null, e.created_at ?? now(),
      ],
    );
  }

  for (const lot of data.poultryLots ?? []) {
    await run(`INSERT INTO poultry_lots (id, name, kind, entry_date, initial_count, origin, purchase_total, unit_purchase_cost, building, notes, status, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lot.id ?? null, lot.name, lot.kind, lot.entry_date, lot.initial_count, lot.origin ?? null, lot.purchase_total ?? null, lot.unit_purchase_cost ?? null, lot.building ?? null, lot.notes ?? null, lot.status, 1]);
  }
  for (const movement of data.poultryMovements ?? []) {
    await run(`INSERT INTO poultry_movements (id, lot_id, type, date, quantity, reason, comment, user_id, unit_price, amount, buyer_name, payment_method, stock_after, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [movement.id ?? null, movement.lot_id, movement.type, movement.date, movement.quantity, movement.reason ?? null, movement.comment ?? null, movement.user_id ?? null, movement.unit_price ?? null, movement.amount ?? null, movement.buyer_name ?? null, movement.payment_method ?? null, movement.stock_after ?? null, 1]);
  }
  for (const production of data.eggProductions ?? []) {
    await run(`INSERT INTO egg_productions (id, lot_id, date, produced, broken, consumed, sold, comment, stock_after, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [production.id ?? null, production.lot_id, production.date, production.produced, production.broken, production.consumed, production.sold, production.comment ?? null, production.stock_after ?? null, 1]);
  }
  for (const sale of data.eggSales ?? []) {
    await run(`INSERT INTO egg_sales (id, lot_id, date, unit, quantity, unit_price, amount, buyer_name, payment_method, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sale.id ?? null, sale.lot_id, sale.date, sale.unit, sale.quantity, sale.unit_price, sale.amount, sale.buyer_name ?? null, sale.payment_method ?? null, 1]);
  }
  for (const weight of data.weights ?? []) {
    await run(`INSERT INTO weight_records (id, mouton_id, date, weight_kg, notes, user_id, synced) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [weight.id ?? null, weight.mouton_id, weight.date, weight.weight_kg, weight.notes ?? null, weight.user_id ?? null, 1]);
  }

  await saveStore();
  return {
    moutons: data.moutons.length,
    sales: data.sales.length,
    health: data.health.length,
    expenses: data.expenses.length,
    poultryLots: data.poultryLots?.length ?? 0,
  };
}
