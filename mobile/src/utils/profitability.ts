import { Mouton, HealthRecord, Sale } from '../types';

export interface MoutonProfitability {
  mouton: Mouton;
  purchaseCost: number;
  healthCost: number;
  saleRevenue: number;
  totalCost: number;
  margin: number;
}

// Rentabilité d'un mouton = ventes qui lui sont directement liées, moins son
// prix d'achat éventuel et les soins qui lui ont été spécifiquement facturés.
// Les interventions « tout le troupeau » ne sont pas réparties par animal :
// ce serait arbitraire sans savoir combien de bêtes étaient présentes au moment
// de l'intervention, donc on ne compte que les coûts individuellement rattachés.
export function computeMoutonProfitability(
  mouton: Mouton,
  healthRecords: HealthRecord[],
  sales: Sale[],
): MoutonProfitability {
  const healthCost = healthRecords
    .filter(h => h.target_type === 'mouton' && h.target_id === mouton.id)
    .reduce((sum, h) => sum + (h.cost ?? 0), 0);

  const saleRevenue = sales
    .filter(s => s.target_type === 'mouton' && s.target_id === mouton.id)
    .reduce((sum, s) => sum + s.amount, 0);

  const purchaseCost = mouton.purchase_price ?? 0;
  const totalCost = purchaseCost + healthCost;

  return {
    mouton,
    purchaseCost,
    healthCost,
    saleRevenue,
    totalCost,
    margin: saleRevenue - totalCost,
  };
}
