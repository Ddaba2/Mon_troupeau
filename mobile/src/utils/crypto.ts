const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX = 'pbkdf2:';

// Hache un PIN avec PBKDF2 (résistant au brute-force sur 4 chiffres)
export async function hashPIN(pin: string, userSalt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(userSalt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  const hex = Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${PBKDF2_PREFIX}${hex}`;
}

// Vérifie le PIN face au hash PBKDF2 stocké.
// Retourne { valid: boolean } — la forme { newHash } d'une éventuelle migration
// legacy a été retirée : aucun hash pré-PBKDF2 ne peut exister dans une
// installation neuve de l'application.
export async function verifyPIN(
  pin: string,
  userSalt: string,
  storedHash: string,
): Promise<{ valid: boolean }> {
  const expected = await hashPIN(pin, userSalt);
  return { valid: expected === storedHash };
}

// Salt unique par utilisateur (id + date de création)
export function buildUserSalt(userId: number, createdAt: string): string {
  return `${userId}:${createdAt}`;
}
