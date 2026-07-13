import { Capacitor } from '@capacitor/core';
// Import Vite-managed : Vite sert ce fichier avec Content-Type: application/wasm
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

// ─── Interface commune aux deux backends ───────────────────────────────────────

interface DbBackend {
  query: <T>(sql: string, values?: unknown[]) => Promise<T[]>;
  run:   (sql: string, values?: unknown[]) => Promise<{ lastId: number; changes: number }>;
  save:  () => Promise<void>;
}

let backend: DbBackend | null = null;

// ─── Schéma SQL ───────────────────────────────────────────────────────────────

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employe',
    pin_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login TEXT,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS moutons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identification_number TEXT NOT NULL,
    name TEXT,
    photo TEXT,
    race TEXT,
    sex TEXT NOT NULL DEFAULT 'inconnu',
    birth_date TEXT,
    estimated_age_months INTEGER,
    color TEXT,
    origin TEXT NOT NULL DEFAULT 'nee_ferme',
    status TEXT NOT NULL DEFAULT 'vivant',
    sale_price REAL, sale_date TEXT, buyer_name TEXT,
    observations TEXT,
    synced INTEGER NOT NULL DEFAULT 0, server_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, target_type TEXT DEFAULT 'tous', target_id INTEGER,
    date TEXT NOT NULL, product TEXT, quantity TEXT, cost REAL, next_due TEXT, notes TEXT,
    synced INTEGER NOT NULL DEFAULT 0, server_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL DEFAULT 'mouton',
    target_id INTEGER,
    date TEXT NOT NULL, quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL, amount REAL NOT NULL,
    buyer_name TEXT, payment_method TEXT NOT NULL DEFAULT 'especes',
    notes TEXT,
    synced INTEGER NOT NULL DEFAULT 0, server_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL DEFAULT 'alimentation',
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    payment_method TEXT NOT NULL DEFAULT 'especes',
    notes TEXT,
    synced INTEGER NOT NULL DEFAULT 0, server_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

// Migrations appliquées aux deux backends (ne jamais réordonner, seulement ajouter)
const MIGRATIONS: string[] = [
  "ALTER TABLE moutons ADD COLUMN deleted_at TEXT",
  "ALTER TABLE health_records ADD COLUMN deleted_at TEXT",
  "ALTER TABLE sales ADD COLUMN deleted_at TEXT",
  "ALTER TABLE expenses ADD COLUMN deleted_at TEXT",
  "ALTER TABLE moutons ADD COLUMN purchase_price REAL",
  "ALTER TABLE health_records ADD COLUMN recurrence_months INTEGER",
];

// ─── Backend NAVIGATEUR : sql.js ──────────────────────────────────────────────

async function createBrowserBackend(): Promise<DbBackend> {
  const mod = await import('sql.js');
  // sql.js est un module CJS — on récupère la fonction d'init quelle que soit la forme
  const initSqlJs = (typeof mod.default === 'function' ? mod.default : mod) as any;

  // On indique à sql.js l'URL exacte du fichier .wasm géré par Vite
  const SQL = await initSqlJs({
    locateFile: (filename: string) =>
      filename.endsWith('.wasm') ? sqlWasmUrl : filename,
  });

  const STORAGE_KEY = 'mon_troupeau_mali_v1';

  let db: import('sql.js').Database;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    db = new SQL.Database(new Uint8Array(JSON.parse(saved)));
  } else {
    db = new SQL.Database();
  }
  for (const stmt of SCHEMA) db.run(stmt);
  // Migrations : ajout de colonnes si elles n'existent pas encore
  for (const m of MIGRATIONS) {
    try { db.run(m); } catch { /* colonne déjà présente */ }
  }

  const save = async () => {
    const data = db.export();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(data)));
  };

  const query = async <T>(sql: string, values: unknown[] = []): Promise<T[]> => {
    const stmt = db.prepare(sql);
    stmt.bind(values as any[]);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    stmt.free();
    return rows;
  };

  const run = async (sql: string, values: unknown[] = []) => {
    db.run(sql, values as any[]);
    const changes = db.getRowsModified();
    const idRows = db.exec('SELECT last_insert_rowid() as id');
    const lastId = (idRows[0]?.values[0]?.[0] as number) ?? 0;
    await save();
    return { lastId, changes };
  };

  return { query, run, save };
}

// ─── Backend ANDROID NATIF : @capacitor-community/sqlite ──────────────────────

async function createNativeBackend(): Promise<DbBackend> {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  const consistency = await sqlite.checkConnectionsConsistency();
  const isConn = (await sqlite.isConnection('mon_troupeau_mali', false)).result;

  let db: import('@capacitor-community/sqlite').SQLiteDBConnection;
  if (consistency.result && isConn) {
    db = await sqlite.retrieveConnection('mon_troupeau_mali', false);
  } else {
    db = await sqlite.createConnection('mon_troupeau_mali', false, 'no-encryption', 1, false);
  }
  await db.open();
  for (const stmt of SCHEMA) await db.execute(stmt);
  // Appliquer les mêmes migrations que le backend browser
  for (const m of MIGRATIONS) {
    try { await db.execute(m); } catch { /* colonne déjà présente */ }
  }

  const query = async <T>(sql: string, values: unknown[] = []): Promise<T[]> => {
    const result = await db.query(sql, values);
    return (result.values ?? []) as T[];
  };

  const run = async (sql: string, values: unknown[] = []) => {
    const result = await db.run(sql, values);
    return { lastId: result.changes?.lastId ?? 0, changes: result.changes?.changes ?? 0 };
  };

  return { query, run, save: async () => {} };
}

// ─── API publique ──────────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  backend = Capacitor.isNativePlatform()
    ? await createNativeBackend()
    : await createBrowserBackend();
}

function getBackend(): DbBackend {
  if (!backend) throw new Error('Base de données non initialisée');
  return backend;
}

export const query  = <T>(sql: string, values?: unknown[]) => getBackend().query<T>(sql, values);
export const run    = (sql: string, values?: unknown[])    => getBackend().run(sql, values);
export const saveStore = ()                                => getBackend().save();
