import { query, run, saveStore } from '../db/DatabaseService';
import { Mouton } from '../types';

export async function getMoutons(): Promise<Mouton[]> {
  return query<Mouton>(
    `SELECT * FROM moutons WHERE deleted_at IS NULL
     ORDER BY CAST(identification_number AS INTEGER), identification_number`,
  );
}

export async function getMoutonById(id: number): Promise<Mouton | null> {
  const rows = await query<Mouton>('SELECT * FROM moutons WHERE id = ? AND deleted_at IS NULL', [id]);
  return rows[0] ?? null;
}

export async function getTrashedMoutons(): Promise<Mouton[]> {
  return query<Mouton>('SELECT * FROM moutons WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
}

// Ignore la corbeille — utilisé uniquement pour réafficher, dans un formulaire
// d'édition, le mouton référencé par un enregistrement existant même si ce
// mouton a depuis été mis à la corbeille.
export async function getMoutonByIdAny(id: number): Promise<Mouton | null> {
  const rows = await query<Mouton>('SELECT * FROM moutons WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function createMouton(m: Omit<Mouton, 'id'>): Promise<number> {
  const { lastId } = await run(
    `INSERT INTO moutons
     (identification_number, name, photo, species, race, sex, birth_date, estimated_age_months, color, origin, purchase_price, status, observations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      m.identification_number, m.name || null, m.photo || null, m.species, m.race || null, m.sex,
      m.birth_date || null, m.estimated_age_months ?? null, m.color || null,
      m.origin, m.purchase_price ?? null, m.status, m.observations || null,
    ],
  );
  await saveStore();
  return lastId;
}

export async function updateMouton(id: number, m: Partial<Mouton>): Promise<void> {
  const existing = await getMoutonById(id);
  const base = existing ?? {} as Mouton;
  await run(
    `UPDATE moutons SET identification_number=?, name=?, photo=?, species=?, race=?, sex=?, birth_date=?,
     estimated_age_months=?, color=?, origin=?, purchase_price=?, status=?, sale_price=?, sale_date=?, buyer_name=?,
     observations=?, updated_at=datetime('now'), synced=0
     WHERE id=?`,
    [
      m.identification_number ?? base.identification_number,
      m.name ?? base.name ?? null,
      m.photo ?? base.photo ?? null,
      m.species ?? base.species ?? 'mouton',
      m.race ?? base.race ?? null,
      m.sex ?? base.sex,
      m.birth_date ?? base.birth_date ?? null,
      m.estimated_age_months ?? base.estimated_age_months ?? null,
      m.color ?? base.color ?? null,
      m.origin ?? base.origin,
      m.purchase_price ?? base.purchase_price ?? null,
      m.status ?? base.status,
      m.sale_price ?? base.sale_price ?? null,
      m.sale_date ?? base.sale_date ?? null,
      m.buyer_name ?? base.buyer_name ?? null,
      m.observations ?? base.observations ?? null,
      id,
    ],
  );
  await saveStore();
}

// Déplace le mouton vers la corbeille (récupérable). Les ventes/soins liés
// restent inchangés : ils gardent leur valeur d'historique tant que le
// mouton n'est pas purgé définitivement.
export async function trashMouton(id: number): Promise<void> {
  await run(`UPDATE moutons SET deleted_at = datetime('now'), synced = 0 WHERE id = ?`, [id]);
  await saveStore();
}

export async function restoreMouton(id: number): Promise<void> {
  await run('UPDATE moutons SET deleted_at = NULL, synced = 0 WHERE id = ?', [id]);
  await saveStore();
}

// Suppression définitive et irréversible, avec les données liées (pas de FK en cascade dans le schéma)
export async function permanentlyDeleteMouton(id: number): Promise<void> {
  await run('DELETE FROM health_records WHERE target_type = ? AND target_id = ?', ['mouton', id]);
  await run('DELETE FROM sales WHERE target_type = ? AND target_id = ?', ['mouton', id]);
  await run('DELETE FROM moutons WHERE id=?', [id]);
  await saveStore();
}
