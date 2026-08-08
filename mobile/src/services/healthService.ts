import { query, run, saveStore } from '../db/DatabaseService';
import { HealthRecord } from '../types';

export async function getHealthRecords(): Promise<HealthRecord[]> {
  return query<HealthRecord>('SELECT * FROM health_records WHERE deleted_at IS NULL ORDER BY date DESC');
}

export async function getTrashedHealthRecords(): Promise<HealthRecord[]> {
  return query<HealthRecord>('SELECT * FROM health_records WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
}

export async function getUpcomingDue(): Promise<HealthRecord[]> {
  const inTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  return query<HealthRecord>(
    'SELECT * FROM health_records WHERE deleted_at IS NULL AND next_due IS NOT NULL AND next_due <= ? ORDER BY next_due ASC',
    [inTwoWeeks],
  );
}

export async function createHealthRecord(h: Omit<HealthRecord, 'id'>): Promise<number> {
  const { lastId } = await run(
    `INSERT INTO health_records (type, target_type, target_id, date, product, quantity, cost, next_due, recurrence_months, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [h.type, h.target_type || 'tous', h.target_id || null, h.date,
     h.product || null, h.quantity || null, h.cost ?? null, h.next_due || null,
     h.recurrence_months ?? null, h.notes || null],
  );
  await saveStore();
  return lastId;
}

export async function updateHealthRecord(id: number, h: Partial<HealthRecord>): Promise<void> {
  await run(
    `UPDATE health_records SET type=?, target_type=?, target_id=?, date=?, product=?, quantity=?, cost=?, next_due=?, recurrence_months=?, notes=?, synced=0
     WHERE id=?`,
    [h.type, h.target_type || 'tous', h.target_id || null, h.date, h.product || null,
     h.quantity || null, h.cost ?? null, h.next_due || null, h.recurrence_months ?? null, h.notes || null, id],
  );
  await saveStore();
}

// Fait avancer automatiquement les rappels récurrents dépassés vers la
// prochaine échéance future, plutôt que de les laisser en retard indéfiniment.
// Appelé au démarrage de l'app et à chaque chargement de la liste Santé.
export async function advanceOverdueRecurrences(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const overdue = await query<HealthRecord>(
    `SELECT * FROM health_records
     WHERE deleted_at IS NULL AND recurrence_months IS NOT NULL
       AND next_due IS NOT NULL AND next_due < ?`,
    [today],
  );
  for (const r of overdue) {
    if (!r.next_due || !r.recurrence_months) continue;
    const next = new Date(r.next_due);
    // Avance par paliers jusqu'à retomber sur une échéance future (couvre le
    // cas d'une app restée fermée plusieurs cycles).
    while (next.toISOString().split('T')[0] < today) {
      next.setMonth(next.getMonth() + r.recurrence_months);
    }
    await run(
      `UPDATE health_records SET next_due = ?, synced = 0 WHERE id = ?`,
      [next.toISOString().split('T')[0], r.id],
    );
  }
  if (overdue.length > 0) await saveStore();
}

export async function trashHealthRecord(id: number): Promise<void> {
  await run(`UPDATE health_records SET deleted_at = datetime('now'), synced = 0 WHERE id=?`, [id]);
  await saveStore();
}

export async function restoreHealthRecord(id: number): Promise<void> {
  await run('UPDATE health_records SET deleted_at = NULL, synced = 0 WHERE id=?', [id]);
  await saveStore();
}

export async function permanentlyDeleteHealthRecord(id: number): Promise<void> {
  await run('DELETE FROM health_records WHERE id=?', [id]);
  await saveStore();
}
