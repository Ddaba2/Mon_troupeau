import { Mouton, Species } from '../types';

export const SPECIES_LABELS: Record<Species, string> = {
  mouton: 'Mouton',
  chevre: 'Chèvre',
  bovin: 'Bovin',
  volaille: 'Volaille',
  autre: 'Autre',
};

export const SPECIES_EMOJIS: Record<Species, string> = {
  mouton: '🐑',
  chevre: '🐐',
  bovin: '🐄',
  volaille: '🐔',
  autre: '🐾',
};

// Âge de maturité indicatif par espèce, utilisé pour distinguer adultes/jeunes
export const SPECIES_ADULT_THRESHOLD_MONTHS: Record<Species, number> = {
  mouton: 12,
  chevre: 12,
  bovin: 24,
  volaille: 6,
  autre: 12,
};

export function formatAnimalLabel(m: Mouton): string {
  const parts = [m.identification_number, m.name].filter(Boolean);
  return `${SPECIES_EMOJIS[m.species] ?? SPECIES_EMOJIS.autre} ${parts.join(' · ')}`;
}

// Icônes du journal d'activité, source unique (évite la duplication Dashboard/ActivityLog).
// Pour une entrée liée à un animal (entity_type 'mouton'), `details` porte l'espèce réelle.
const NON_ANIMAL_ICONS: Record<string, string> = {
  user: '👤', sale: '💰', health: '💊', expense: '💸', sync: '🔄',
};

export function getEntityIcon(entityType?: string, details?: string | null): string {
  if (entityType === 'mouton') {
    const sp = details as Species | undefined;
    return (sp && SPECIES_EMOJIS[sp]) || SPECIES_EMOJIS.mouton;
  }
  return NON_ANIMAL_ICONS[entityType ?? ''] ?? '📋';
}
