import { query, run, saveStore } from '../db/DatabaseService';
import { Sale } from '../types';

export async function getSales(): Promise<Sale[]> {
  return query<Sale>(
    `SELECT s.*, m.identification_number as target_label
     FROM sales s LEFT JOIN moutons m ON s.target_type = 'mouton' AND s.target_id = m.id
     WHERE s.deleted_at IS NULL
     ORDER BY s.date DESC`,
  );
}

export async function getTrashedSales(): Promise<Sale[]> {
  return query<Sale>(
    `SELECT s.*, m.identification_number as target_label
     FROM sales s LEFT JOIN moutons m ON s.target_type = 'mouton' AND s.target_id = m.id
     WHERE s.deleted_at IS NOT NULL
     ORDER BY s.deleted_at DESC`,
  );
}

export async function createSale(s: Omit<Sale, 'id' | 'amount'>): Promise<number> {
  const amount = s.quantity * s.unit_price;
  const { lastId } = await run(
    `INSERT INTO sales (target_type, target_id, date, quantity, unit_price, amount, buyer_name, payment_method, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.target_type, s.target_id ?? null, s.date, s.quantity, s.unit_price, amount,
     s.buyer_name || null, s.payment_method, s.notes || null],
  );
  // Marquer le mouton comme vendu si la vente lui est liée
  if (s.target_type === 'mouton' && s.target_id) {
    await run(
      `UPDATE moutons SET status = 'vendu', sale_price = ?, sale_date = ?, buyer_name = ?, synced = 0 WHERE id = ?`,
      [amount, s.date, s.buyer_name || null, s.target_id],
    );
  }
  await saveStore();
  return lastId;
}

export async function updateSale(id: number, s: Partial<Sale>): Promise<void> {
  // Récupérer les valeurs existantes pour éviter d'écraser les champs non fournis
  const existing = await query<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
  const base = existing[0] ?? {} as Sale;
  const quantity   = s.quantity   ?? base.quantity   ?? 0;
  const unit_price = s.unit_price ?? base.unit_price ?? 0;
  const amount = quantity * unit_price;
  const target_type = s.target_type ?? base.target_type;
  const target_id   = s.target_id   ?? base.target_id ?? null;
  const buyer_name  = s.buyer_name  ?? base.buyer_name ?? null;
  const date        = s.date        ?? base.date;
  await run(
    `UPDATE sales SET target_type=?, target_id=?, date=?, quantity=?, unit_price=?, amount=?,
     buyer_name=?, payment_method=?, notes=?, synced=0 WHERE id=?`,
    [
      target_type,
      target_id,
      date,
      quantity,
      unit_price,
      amount,
      buyer_name,
      s.payment_method ?? base.payment_method,
      s.notes          ?? base.notes        ?? null,
      id,
    ],
  );
  // Garder le mouton lié cohérent avec la vente (même logique qu'à la création)
  if (target_type === 'mouton' && target_id) {
    await run(
      `UPDATE moutons SET status = 'vendu', sale_price = ?, sale_date = ?, buyer_name = ?, synced = 0 WHERE id = ?`,
      [amount, date, buyer_name, target_id],
    );
  }
  await saveStore();
}

// Repasse le mouton en 'vivant' et efface le cache de vente, mais seulement s'il
// n'existe plus aucune autre vente active pour lui (cas rare de doublon de vente).
async function revertMoutonSaleStatus(targetId: number): Promise<void> {
  const remaining = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM sales WHERE target_type = 'mouton' AND target_id = ? AND deleted_at IS NULL`,
    [targetId],
  );
  if ((remaining[0]?.count ?? 0) === 0) {
    await run(
      `UPDATE moutons SET status = 'vivant', sale_price = NULL, sale_date = NULL, buyer_name = NULL, synced = 0 WHERE id = ?`,
      [targetId],
    );
  }
}

async function reapplyMoutonSaleStatus(sale: Sale): Promise<void> {
  if (sale.target_type !== 'mouton' || !sale.target_id) return;
  await run(
    `UPDATE moutons SET status = 'vendu', sale_price = ?, sale_date = ?, buyer_name = ?, synced = 0 WHERE id = ?`,
    [sale.amount, sale.date, sale.buyer_name ?? null, sale.target_id],
  );
}

export async function trashSale(id: number): Promise<void> {
  const rows = await query<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
  const sale = rows[0];
  await run(`UPDATE sales SET deleted_at = datetime('now'), synced = 0 WHERE id=?`, [id]);
  if (sale?.target_type === 'mouton' && sale.target_id) {
    await revertMoutonSaleStatus(sale.target_id);
  }
  await saveStore();
}

export async function restoreSale(id: number): Promise<void> {
  await run('UPDATE sales SET deleted_at = NULL, synced = 0 WHERE id=?', [id]);
  const rows = await query<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
  if (rows[0]) await reapplyMoutonSaleStatus(rows[0]);
  await saveStore();
}

export async function permanentlyDeleteSale(id: number): Promise<void> {
  const rows = await query<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
  const sale = rows[0];
  await run('DELETE FROM sales WHERE id=?', [id]);
  if (sale?.target_type === 'mouton' && sale.target_id) {
    await revertMoutonSaleStatus(sale.target_id);
  }
  await saveStore();
}
