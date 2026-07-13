import { run, saveStore } from '../db/DatabaseService';
import { Mouton, Sale, HealthRecord, Expense } from '../types';

export interface BackupData {
  moutons: Mouton[];
  sales: Sale[];
  health: HealthRecord[];
  expenses: Expense[];
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
export async function restoreFromBackup(data: BackupData): Promise<{ moutons: number; sales: number; health: number; expenses: number }> {
  await run('DELETE FROM sales');
  await run('DELETE FROM health_records');
  await run('DELETE FROM expenses');
  await run('DELETE FROM moutons');

  for (const m of data.moutons) {
    await run(
      `INSERT INTO moutons
       (id, identification_number, name, photo, race, sex, birth_date, estimated_age_months, color,
        origin, status, sale_price, sale_date, buyer_name, observations, synced, server_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.id ?? null, m.identification_number, m.name ?? null, m.photo ?? null, m.race ?? null, m.sex,
        m.birth_date ?? null, m.estimated_age_months ?? null, m.color ?? null,
        m.origin, m.status, m.sale_price ?? null, m.sale_date ?? null, m.buyer_name ?? null,
        m.observations ?? null, m.synced ?? 1, m.server_id ?? null, m.created_at ?? now(), m.updated_at ?? now(),
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
       (id, category, date, amount, description, payment_method, notes, synced, server_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id ?? null, e.category, e.date, e.amount, e.description ?? null, e.payment_method,
        e.notes ?? null, e.synced ?? 1, e.server_id ?? null, e.created_at ?? now(),
      ],
    );
  }

  await saveStore();
  return {
    moutons: data.moutons.length,
    sales: data.sales.length,
    health: data.health.length,
    expenses: data.expenses.length,
  };
}
