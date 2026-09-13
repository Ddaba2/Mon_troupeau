import { EggProduction, EggSale, PoultryLot, PoultryLotSummary, PoultryMovement } from '../types';
import { query, run, saveStore } from '../db/DatabaseService';
import { createSale } from './saleService';

const EGG_UNIT_SIZE = { oeuf: 1, plateau: 30, carton: 300 } as const;

const LOT_SUMMARY_SQL = `
  SELECT l.*,
    COALESCE((SELECT SUM(quantity) FROM poultry_movements WHERE lot_id = l.id AND type = 'mort' AND deleted_at IS NULL), 0) deaths,
    COALESCE((SELECT SUM(quantity) FROM poultry_movements WHERE lot_id = l.id AND type = 'vente' AND deleted_at IS NULL), 0) sold,
    COALESCE((SELECT SUM(quantity) FROM poultry_movements WHERE lot_id = l.id AND type = 'sortie' AND deleted_at IS NULL), 0) exits,
    l.initial_count
      + COALESCE((SELECT SUM(CASE WHEN type IN ('entree', 'correction') THEN quantity ELSE 0 END) FROM poultry_movements WHERE lot_id = l.id AND deleted_at IS NULL), 0)
      - COALESCE((SELECT SUM(CASE WHEN type IN ('mort', 'vente', 'sortie', 'transfert') THEN quantity ELSE 0 END) FROM poultry_movements WHERE lot_id = l.id AND deleted_at IS NULL), 0) current_count,
    COALESCE((SELECT SUM(produced) FROM egg_productions WHERE lot_id = l.id AND deleted_at IS NULL), 0) eggs_produced,
    COALESCE((SELECT SUM(broken) FROM egg_productions WHERE lot_id = l.id AND deleted_at IS NULL), 0) eggs_broken,
    COALESCE((SELECT SUM(consumed) FROM egg_productions WHERE lot_id = l.id AND deleted_at IS NULL), 0) eggs_consumed,
    COALESCE((SELECT SUM(sold) FROM egg_productions WHERE lot_id = l.id AND deleted_at IS NULL), 0)
      + COALESCE((SELECT SUM(quantity * CASE unit WHEN 'oeuf' THEN 1 WHEN 'plateau' THEN 30 WHEN 'carton' THEN 300 ELSE 1 END) FROM egg_sales WHERE lot_id = l.id AND deleted_at IS NULL), 0) eggs_sold,
    COALESCE((SELECT SUM(produced - broken - consumed - sold) FROM egg_productions WHERE lot_id = l.id AND deleted_at IS NULL), 0)
      - COALESCE((SELECT SUM(quantity * CASE unit WHEN 'oeuf' THEN 1 WHEN 'plateau' THEN 30 WHEN 'carton' THEN 300 ELSE 1 END) FROM egg_sales WHERE lot_id = l.id AND deleted_at IS NULL), 0) egg_stock,
    COALESCE((SELECT SUM(amount) FROM poultry_movements WHERE lot_id = l.id AND type = 'vente' AND deleted_at IS NULL), 0)
      + COALESCE((SELECT SUM(amount) FROM egg_sales WHERE lot_id = l.id AND deleted_at IS NULL), 0) revenue
    , COALESCE((SELECT SUM(amount) FROM expenses WHERE target_type = 'poultry_lot' AND target_id = l.id AND deleted_at IS NULL), 0) expenses_total
  FROM poultry_lots l
  WHERE l.deleted_at IS NULL`;

export async function getPoultryLots(): Promise<PoultryLotSummary[]> {
  return query<PoultryLotSummary>(`${LOT_SUMMARY_SQL} ORDER BY l.entry_date DESC, l.id DESC`);
}

export async function getPoultryLot(id: number): Promise<PoultryLotSummary | null> {
  const rows = await query<PoultryLotSummary>(`${LOT_SUMMARY_SQL} AND l.id = ?`, [id]);
  return rows[0] ?? null;
}

export async function createPoultryLot(lot: Omit<PoultryLot, 'id' | 'unit_purchase_cost' | 'status'>): Promise<number> {
  if (!lot.name.trim() || lot.initial_count <= 0) throw new Error('Le nom et le nombre initial sont obligatoires');
  if (lot.purchase_total != null && lot.purchase_total < 0) throw new Error("Le prix d'achat ne peut pas être négatif");
  const unitCost = lot.purchase_total != null && lot.initial_count > 0 ? lot.purchase_total / lot.initial_count : null;
  const { lastId } = await run(
    `INSERT INTO poultry_lots (name, kind, entry_date, initial_count, origin, purchase_total, unit_purchase_cost, building, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [lot.name.trim(), lot.kind, lot.entry_date, lot.initial_count, lot.origin || null, lot.purchase_total ?? null, unitCost, lot.building || null, lot.notes || null],
  );
  await saveStore();
  return lastId;
}

export async function addPoultryMovement(movement: Omit<PoultryMovement, 'id' | 'amount' | 'stock_after'>): Promise<number> {
  if (!Number.isInteger(movement.quantity) || movement.quantity <= 0) throw new Error('La quantité doit être un entier positif');
  if (movement.type === 'vente' && (!movement.unit_price || movement.unit_price <= 0)) throw new Error('Le prix unitaire de vente est obligatoire');
  const lot = await getPoultryLot(movement.lot_id);
  if (!lot) throw new Error('Lot introuvable');
  const decreasesStock = ['mort', 'vente', 'sortie', 'transfert'].includes(movement.type);
  const stockAfter = lot.current_count + (decreasesStock ? -movement.quantity : movement.quantity);
  if (stockAfter < 0) throw new Error('La quantité dépasse l’effectif disponible');
  const amount = movement.type === 'vente' ? movement.quantity * (movement.unit_price ?? 0) : null;
  const result = await run(
    `INSERT INTO poultry_movements (lot_id, type, date, quantity, reason, comment, user_id, unit_price, amount, buyer_name, payment_method, stock_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [movement.lot_id, movement.type, movement.date, movement.quantity, movement.reason || null, movement.comment || null,
      movement.user_id ?? null, movement.unit_price ?? null, amount, movement.buyer_name || null, movement.payment_method || null, stockAfter],
  );
  if (movement.type === 'vente') {
    await createSale({
      target_type: 'volaille', target_id: movement.lot_id, date: movement.date, quantity: movement.quantity,
      unit_price: movement.unit_price ?? 0, buyer_name: movement.buyer_name, payment_method: movement.payment_method ?? 'especes',
      notes: movement.comment || 'Vente depuis un lot de volailles',
    });
  }
  if (stockAfter === 0 && lot.status === 'actif') await run(`UPDATE poultry_lots SET status = 'termine' WHERE id = ?`, [lot.id]);
  await saveStore();
  return result.lastId;
}

export async function addEggProduction(production: Omit<EggProduction, 'id' | 'stock_after'>): Promise<number> {
  for (const value of [production.produced, production.broken, production.consumed, production.sold]) {
    if (!Number.isInteger(value) || value < 0) throw new Error('Les quantités d’œufs ne peuvent pas être négatives');
  }
  if (production.broken + production.consumed + production.sold > production.produced) throw new Error('Les pertes, consommations et ventes dépassent la production');
  const lot = await getPoultryLot(production.lot_id);
  if (!lot || lot.kind !== 'pondeuse') throw new Error('Ce lot n’est pas un lot de pondeuses');
  const stockAfter = lot.egg_stock + production.produced - production.broken - production.consumed - production.sold;
  if (stockAfter < 0) throw new Error('Le stock d’œufs ne peut pas devenir négatif');
  const { lastId } = await run(
    `INSERT INTO egg_productions (lot_id, date, produced, broken, consumed, sold, comment, stock_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [production.lot_id, production.date, production.produced, production.broken, production.consumed, production.sold, production.comment || null, stockAfter],
  );
  await saveStore();
  return lastId;
}

export async function addEggSale(sale: Omit<EggSale, 'id' | 'amount'>): Promise<number> {
  if (!Number.isInteger(sale.quantity) || sale.quantity <= 0 || sale.unit_price <= 0) throw new Error('Quantité et prix unitaire doivent être positifs');
  const lot = await getPoultryLot(sale.lot_id);
  if (!lot || lot.kind !== 'pondeuse') throw new Error('Ce lot n’est pas un lot de pondeuses');
  const eggs = sale.quantity * EGG_UNIT_SIZE[sale.unit];
  if (eggs > lot.egg_stock) throw new Error('La vente dépasse le stock d’œufs disponible');
  const amount = sale.quantity * sale.unit_price;
  const { lastId } = await run(
    `INSERT INTO egg_sales (lot_id, date, unit, quantity, unit_price, amount, buyer_name, payment_method)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [sale.lot_id, sale.date, sale.unit, sale.quantity, sale.unit_price, amount, sale.buyer_name || null, sale.payment_method || null],
  );
  await createSale({
    target_type: 'oeuf', target_id: sale.lot_id, date: sale.date, quantity: sale.quantity,
    unit_price: sale.unit_price, buyer_name: sale.buyer_name, payment_method: sale.payment_method ?? 'especes',
    notes: `Vente de ${sale.unit}${sale.quantity > 1 ? 's' : ''}`,
  });
  await saveStore();
  return lastId;
}

export async function getPoultryMovements(lotId: number): Promise<PoultryMovement[]> {
  return query<PoultryMovement>('SELECT * FROM poultry_movements WHERE lot_id = ? AND deleted_at IS NULL ORDER BY date DESC, id DESC', [lotId]);
}

export async function getEggProductions(lotId: number): Promise<EggProduction[]> {
  return query<EggProduction>('SELECT * FROM egg_productions WHERE lot_id = ? AND deleted_at IS NULL ORDER BY date DESC, id DESC', [lotId]);
}
