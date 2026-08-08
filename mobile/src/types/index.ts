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

export interface Mouton {
  id?: number;
  identification_number: string;
  name?: string;
  photo?: string;
  species: Species;
  race?: string;
  sex: 'male' | 'femelle' | 'inconnu';
  birth_date?: string;
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
  target_type: 'mouton' | 'fumier' | 'autre';
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
  synced?: number;
  server_id?: number;
  deleted_at?: string;
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
