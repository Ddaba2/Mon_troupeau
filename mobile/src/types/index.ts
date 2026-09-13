export type Role = 'admin' | 'gerant' | 'employe';

export interface AppUser {
  id?: number;
  name: string;
  role: Role;
  pin_hash: string;
  is_active: number;
  last_login?: string;
  failed_attempts: number;
  locked_until?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityLog {
  id?: number;
  user_id?: number;
  user_name?: string;
  action: string;
  entity_type?: string;
  entity_id?: number;
  details?: string;
  created_at?: string;
}

export type Species = 'mouton' | 'chevre' | 'bovin' | 'volaille' | 'autre';
export type PoultryKind = 'reproducteur' | 'chair' | 'pondeuse';

export interface Mouton {
  id?: number;
  identification_number: string;
  name?: string;
  photo?: string;
  species: Species;
  poultry_kind?: PoultryKind;
  race?: string;
  sex: 'male' | 'femelle' | 'inconnu';
  birth_date?: string;
  acquisition_date?: string;
  weight_kg?: number;
  estimated_age_months?: number;
  color?: string;
  origin: 'nee_ferme' | 'achete';
  purchase_price?: number;
  status: 'vivant' | 'vendu' | 'decede';
  sale_price?: number;
  sale_date?: string;
  buyer_name?: string;
  observations?: string;
  synced?: number;
  server_id?: number;
  deleted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HealthRecord {
  id?: number;
  type: 'vaccination' | 'vermifuge' | 'injection' | 'vitamines' | 'consultation' | 'traitement' | 'autre';
  target_type?: 'mouton' | 'tous';
  target_id?: number;
  date: string;
  product?: string;
  quantity?: string;
  cost?: number;
  next_due?: string;
  recurrence_months?: number;
  notes?: string;
  synced?: number;
  server_id?: number;
  deleted_at?: string;
  created_at?: string;
}

export interface Sale {
  id?: number;
  target_type: 'mouton' | 'volaille' | 'oeuf' | 'fumier' | 'autre';
  target_id?: number;
  target_label?: string;
  date: string;
  quantity: number;
  unit_price: number;
  amount: number;
  buyer_name?: string;
  payment_method: 'especes' | 'cheque' | 'mobile_money' | 'virement' | 'credit' | 'autre';
  notes?: string;
  synced?: number;
  server_id?: number;
  deleted_at?: string;
  created_at?: string;
}

export type PoultryLotStatus = 'actif' | 'termine' | 'vendu' | 'archive';
export type PoultryMovementType = 'entree' | 'mort' | 'vente' | 'sortie' | 'transfert' | 'correction';
export type EggUnit = 'oeuf' | 'plateau' | 'carton';

export interface PoultryLot {
  id?: number;
  name: string;
  kind: 'chair' | 'pondeuse';
  entry_date: string;
  initial_count: number;
  origin?: string;
  purchase_total?: number;
  unit_purchase_cost?: number;
  building?: string;
  notes?: string;
  status: PoultryLotStatus;
  deleted_at?: string;
}

export interface PoultryLotSummary extends PoultryLot {
  deaths: number;
  sold: number;
  exits: number;
  current_count: number;
  eggs_produced: number;
  eggs_broken: number;
  eggs_consumed: number;
  eggs_sold: number;
  egg_stock: number;
  revenue: number;
  expenses_total?: number;
}

export interface PoultryMovement {
  id?: number;
  lot_id: number;
  type: PoultryMovementType;
  date: string;
  quantity: number;
  reason?: string;
  comment?: string;
  user_id?: number;
  unit_price?: number;
  amount?: number;
  buyer_name?: string;
  payment_method?: Sale['payment_method'];
  stock_after?: number;
}

export interface EggProduction {
  id?: number;
  lot_id: number;
  date: string;
  produced: number;
  broken: number;
  consumed: number;
  sold: number;
  comment?: string;
  stock_after?: number;
}

export interface EggSale {
  id?: number;
  lot_id: number;
  date: string;
  unit: EggUnit;
  quantity: number;
  unit_price: number;
  amount: number;
  buyer_name?: string;
  payment_method?: Sale['payment_method'];
}

export type ExpenseCategory =
  | 'achat_moutons'
  | 'alimentation'
  | 'medicaments'
  | 'transport'
  | 'main_oeuvre'
  | 'construction'
  | 'autre';

export interface Expense {
  id?: number;
  category: ExpenseCategory;
  date: string;
  amount: number;
  description?: string;
  payment_method: 'especes' | 'cheque' | 'mobile_money' | 'virement' | 'credit' | 'autre';
  notes?: string;
  target_type?: 'mouton' | 'poultry_lot';
  target_id?: number;
  synced?: number;
  server_id?: number;
  deleted_at?: string;
  created_at?: string;
}

export interface WeightRecord {
  id?: number;
  mouton_id: number;
  date: string;
  weight_kg: number;
  notes?: string;
  user_id?: number;
  created_at?: string;
}

export interface AppStats {
  totalMoutons: number;
  moutonsVivants: number;
  moutonsMales: number;
  moutonsFemelles: number;
  totalSales: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingSync: number;
}
