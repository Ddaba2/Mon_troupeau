import { query, run, saveStore } from '../db/DatabaseService';
import { Expense } from '../types';

export async function getExpenses(): Promise<Expense[]> {
  return query<Expense>('SELECT * FROM expenses WHERE deleted_at IS NULL ORDER BY date DESC');
}

export async function getTrashedExpenses(): Promise<Expense[]> {
  return query<Expense>('SELECT * FROM expenses WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
}

export async function getExpensesByPeriod(from: string, to: string): Promise<Expense[]> {
  return query<Expense>(
    'SELECT * FROM expenses WHERE deleted_at IS NULL AND date >= ? AND date <= ? ORDER BY date DESC',
    [from, to],
  );
}

export async function getTotalExpenses(): Promise<number> {
  const rows = await query<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE deleted_at IS NULL',
  );
  return rows[0]?.total ?? 0;
}

export async function createExpense(e: Omit<Expense, 'id'>): Promise<number> {
  const { lastId } = await run(
    `INSERT INTO expenses (category, date, amount, description, payment_method, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [e.category, e.date, e.amount, e.description || null, e.payment_method, e.notes || null],
  );
  await saveStore();
  return lastId;
}

export async function updateExpense(id: number, e: Partial<Expense>): Promise<void> {
  const existing = await query<Expense>('SELECT * FROM expenses WHERE id = ?', [id]);
  const base = existing[0] ?? {} as Expense;
  await run(
    `UPDATE expenses SET category=?, date=?, amount=?, description=?, payment_method=?, notes=?, synced=0
     WHERE id=?`,
    [
      e.category       ?? base.category,
      e.date           ?? base.date,
      e.amount         ?? base.amount,
      e.description    ?? base.description    ?? null,
      e.payment_method ?? base.payment_method,
      e.notes          ?? base.notes          ?? null,
      id,
    ],
  );
  await saveStore();
}

export async function trashExpense(id: number): Promise<void> {
  await run(`UPDATE expenses SET deleted_at = datetime('now'), synced = 0 WHERE id = ?`, [id]);
  await saveStore();
}

export async function restoreExpense(id: number): Promise<void> {
  await run('UPDATE expenses SET deleted_at = NULL, synced = 0 WHERE id = ?', [id]);
  await saveStore();
}

export async function permanentlyDeleteExpense(id: number): Promise<void> {
  await run('DELETE FROM expenses WHERE id = ?', [id]);
  await saveStore();
}
