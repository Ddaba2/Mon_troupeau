import { WeightRecord } from '../types';
import { query, run, saveStore } from '../db/DatabaseService';

export async function getWeightRecords(moutonId: number): Promise<WeightRecord[]> {
  return query<WeightRecord>(
    'SELECT * FROM weight_records WHERE mouton_id = ? ORDER BY date DESC, id DESC',
    [moutonId],
  );
}

export async function addWeightRecord(record: Omit<WeightRecord, 'id' | 'created_at'>): Promise<number> {
  if (!Number.isFinite(record.weight_kg) || record.weight_kg <= 0) {
    throw new Error('Le poids doit être supérieur à zéro');
  }
  const { lastId } = await run(
    `INSERT INTO weight_records (mouton_id, date, weight_kg, notes, user_id)
     VALUES (?, ?, ?, ?, ?)`,
    [record.mouton_id, record.date, record.weight_kg, record.notes || null, record.user_id ?? null],
  );
  await run('UPDATE moutons SET weight_kg = ?, updated_at = datetime(\'now\'), synced = 0 WHERE id = ?', [record.weight_kg, record.mouton_id]);
  await saveStore();
  return lastId;
}
