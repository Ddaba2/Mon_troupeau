import { query, run, saveStore } from '../db/DatabaseService';
import { ActivityLog } from '../types';

export async function logActivity(
  userId: number | undefined,
  userName: string,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: string
): Promise<void> {
  try {
    await run(
      `INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId ?? null, userName, action, entityType ?? null, entityId ?? null, details ?? null]
    );
    await saveStore();
  } catch {
    // Ne jamais bloquer l'app pour une erreur de log
  }
}

export async function getActivityLog(limit = 100): Promise<ActivityLog[]> {
  return query<ActivityLog>(
    'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

export async function clearActivityLog(): Promise<void> {
  await run('DELETE FROM activity_log');
  await saveStore();
}
