import { query, run, saveStore } from '../db/DatabaseService';

export interface SyncResult {
  synced: number;
  errors: string[];
}

const PUSH_TABLES = [
  { name: 'moutons',        endpoint: 'mobile/moutons' },
  { name: 'health_records', endpoint: 'mobile/health' },
  { name: 'sales',          endpoint: 'mobile/sales' },
  { name: 'expenses',       endpoint: 'mobile/expenses' },
];

// Tables avec clé unique locale pour la sync descendante
const PULL_TABLES = [
  { name: 'moutons',        endpoint: 'mobile/moutons' },
  { name: 'health_records', endpoint: 'mobile/health' },
  { name: 'sales',          endpoint: 'mobile/sales' },
  { name: 'expenses',       endpoint: 'mobile/expenses' },
];

// Champs référençant l'id local d'une autre table synchronisée. Le serveur ne
// connaît pas les ids locaux : il faut les traduire en server_id à l'envoi,
// et inversement à la réception (voir translateForeignKeysForPush/Pull).
interface FkRule {
  field: string;
  parentTable: string;
  when?: (row: Record<string, unknown>) => boolean;
}

const FK_RULES: Record<string, FkRule[]> = {
  health_records: [
    { field: 'target_id', parentTable: 'moutons', when: r => r.target_type === 'mouton' },
  ],
  sales: [
    { field: 'target_id', parentTable: 'moutons', when: r => r.target_type === 'mouton' },
  ],
};

// Local -> server_id, pour l'envoi. Renvoie null si un parent référencé n'a
// pas encore été synchronisé (la ligne sera réessayée au prochain sync).
async function translateForeignKeysForPush(
  tableName: string,
  row: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const rules = FK_RULES[tableName];
  if (!rules) return row;

  const translated = { ...row };
  for (const rule of rules) {
    if (rule.when && !rule.when(row)) continue;
    const localId = row[rule.field];
    if (localId === null || localId === undefined || localId === '') continue;

    const parentRows = await query<{ server_id: number | null }>(
      `SELECT server_id FROM ${rule.parentTable} WHERE id = ?`,
      [localId],
    );
    const serverId = parentRows[0]?.server_id;
    if (!serverId) return null;
    translated[rule.field] = serverId;
  }
  return translated;
}

// server_id -> local, à la réception. Renvoie null si le parent référencé n'a
// pas encore été importé localement (la ligne sera réessayée au prochain sync).
async function translateForeignKeysForPull(
  tableName: string,
  row: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const rules = FK_RULES[tableName];
  if (!rules) return row;

  const translated = { ...row };
  for (const rule of rules) {
    if (rule.when && !rule.when(row)) continue;
    const serverId = row[rule.field];
    if (serverId === null || serverId === undefined || serverId === '') continue;

    const localRows = await query<{ id: number }>(
      `SELECT id FROM ${rule.parentTable} WHERE server_id = ?`,
      [serverId],
    );
    const localId = localRows[0]?.id;
    if (!localId) return null;
    translated[rule.field] = localId;
  }
  return translated;
}

export function getSyncApiUrl(): string {
  return localStorage.getItem('sync_api_url') || '';
}

export function setSyncApiUrl(url: string): void {
  localStorage.setItem('sync_api_url', url);
}

export function getSyncToken(): string {
  return localStorage.getItem('sync_token') || '';
}

export function setSyncToken(token: string): void {
  localStorage.setItem('sync_token', token);
}

function getHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// --- PUSH ---
async function pushTable(
  tableName: string,
  endpoint: string,
  baseUrl: string,
  token: string,
): Promise<SyncResult> {
  const rows = await query<Record<string, unknown>>(`SELECT * FROM ${tableName} WHERE synced = 0`);
  let synced = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const translatedRow = await translateForeignKeysForPush(tableName, row);
      if (!translatedRow) continue; // parent pas encore synchronisé : réessayé au prochain sync

      const res = await fetch(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(translatedRow),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        await run(`UPDATE ${tableName} SET synced=1, server_id=? WHERE id=?`, [body.id ?? null, row.id]);
        synced++;
      } else {
        errors.push(`${tableName}#${row.id}: HTTP ${res.status}`);
      }
    } catch {
      errors.push(`${tableName}#${row.id}: hors ligne`);
    }
  }

  return { synced, errors };
}

// --- PULL ---
async function pullTable(
  tableName: string,
  endpoint: string,
  baseUrl: string,
  token: string,
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0;
  const errors: string[] = [];

  try {
    const lastSync = localStorage.getItem(`last_pull_${tableName}`) ?? '1970-01-01T00:00:00Z';
    const url = `${baseUrl}/${endpoint}?since=${encodeURIComponent(lastSync)}`;
    const res = await fetch(url, { headers: getHeaders(token), signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      errors.push(`${tableName}: HTTP ${res.status}`);
      return { imported, errors };
    }

    const rows: Record<string, unknown>[] = await res.json();
    for (const row of rows) {
      try {
        const translatedRow = await translateForeignKeysForPull(tableName, row);
        if (!translatedRow) {
          errors.push(`${tableName} pull #${row.id}: parent non synchronisé localement`);
          continue;
        }

        // Upsert par server_id
        const existing = await query<{ id: number }>(
          `SELECT id FROM ${tableName} WHERE server_id = ?`,
          [row.id],
        );
        if (existing.length > 0) {
          const { id } = existing[0];
          const cols = Object.keys(translatedRow).filter(k => k !== 'id');
          const sets = cols.map(c => `${c} = ?`).join(', ');
          await run(
            `UPDATE ${tableName} SET ${sets}, synced=1 WHERE id=?`,
            [...cols.map(c => translatedRow[c]), id],
          );
        } else {
          const cols  = Object.keys(translatedRow).filter(k => k !== 'id');
          const places = cols.map(() => '?').join(', ');
          await run(
            `INSERT OR IGNORE INTO ${tableName} (${cols.join(', ')}, server_id, synced)
             VALUES (${places}, ?, 1)`,
            [...cols.map(c => translatedRow[c]), row.id],
          );
        }
        imported++;
      } catch {
        errors.push(`${tableName} pull #${row.id}: erreur d'insertion`);
      }
    }

    localStorage.setItem(`last_pull_${tableName}`, new Date().toISOString());
  } catch {
    errors.push(`${tableName}: hors ligne`);
  }

  return { imported, errors };
}

// --- API publique ---

export async function syncAll(): Promise<SyncResult> {
  const baseUrl = getSyncApiUrl();
  const token   = getSyncToken();
  if (!baseUrl) return { synced: 0, errors: ['URL du serveur non configurée'] };

  let totalSynced = 0;
  const allErrors: string[] = [];

  for (const { name, endpoint } of PUSH_TABLES) {
    const { synced, errors } = await pushTable(name, endpoint, baseUrl, token);
    totalSynced += synced;
    allErrors.push(...errors);
  }

  if (totalSynced > 0) await saveStore();
  return { synced: totalSynced, errors: allErrors };
}

export async function pullAll(): Promise<{ imported: number; errors: string[] }> {
  const baseUrl = getSyncApiUrl();
  const token   = getSyncToken();
  if (!baseUrl) return { imported: 0, errors: ['URL du serveur non configurée'] };

  let totalImported = 0;
  const allErrors: string[] = [];

  for (const { name, endpoint } of PULL_TABLES) {
    const { imported, errors } = await pullTable(name, endpoint, baseUrl, token);
    totalImported += imported;
    allErrors.push(...errors);
  }

  if (totalImported > 0) await saveStore();
  return { imported: totalImported, errors: allErrors };
}

export async function syncBidirectional(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
  const [pushResult, pullResult] = await Promise.all([syncAll(), pullAll()]);
  return {
    pushed: pushResult.synced,
    pulled: pullResult.imported,
    errors: [...pushResult.errors, ...pullResult.errors],
  };
}

export async function getPendingCount(): Promise<number> {
  let total = 0;
  for (const { name } of PUSH_TABLES) {
    const rows = await query<{ count: number }>(`SELECT COUNT(*) as count FROM ${name} WHERE synced = 0`);
    total += rows[0]?.count ?? 0;
  }
  return total;
}
