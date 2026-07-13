import { query, run, saveStore } from '../db/DatabaseService';
import { AppUser, Role } from '../types';
import { hashPIN, verifyPIN, buildUserSalt } from '../utils/crypto';

export async function getUsers(): Promise<AppUser[]> {
  return query<AppUser>('SELECT * FROM users ORDER BY role, name');
}

export async function getActiveUsers(): Promise<AppUser[]> {
  return query<AppUser>('SELECT * FROM users WHERE is_active = 1 ORDER BY role, name');
}

export async function getUserById(id: number): Promise<AppUser | null> {
  const rows = await query<AppUser>('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function createUser(name: string, role: Role, pin: string): Promise<AppUser> {
  const createdAt = new Date().toISOString();
  const { lastId } = await run(
    `INSERT INTO users (name, role, pin_hash, is_active, failed_attempts, created_at, updated_at)
     VALUES (?, ?, '', 1, 0, ?, ?)`,
    [name, role, createdAt, createdAt]
  );
  // Hash avec le vrai ID maintenant qu'on l'a
  const salt = buildUserSalt(lastId, createdAt);
  const pinHash = await hashPIN(pin, salt);
  await run('UPDATE users SET pin_hash = ? WHERE id = ?', [pinHash, lastId]);
  await saveStore();
  return (await getUserById(lastId))!;
}

export async function updateUser(
  id: number,
  name: string,
  role: Role,
  newPin?: string
): Promise<void> {
  const user = await getUserById(id);
  if (!user) throw new Error('Utilisateur introuvable');

  let pinHash = user.pin_hash;
  if (newPin) {
    const salt = buildUserSalt(id, user.created_at!);
    pinHash = await hashPIN(newPin, salt);
  }

  await run(
    `UPDATE users SET name = ?, role = ?, pin_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    [name, role, pinHash, id]
  );
  await saveStore();
}

export async function toggleUserActive(id: number, isActive: boolean): Promise<void> {
  await run('UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?', [isActive ? 1 : 0, id]);
  await saveStore();
}

export async function deleteUser(id: number): Promise<void> {
  await run('DELETE FROM users WHERE id = ?', [id]);
  await saveStore();
}

export async function authenticateUser(
  userId: number,
  pin: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const user = await getUserById(userId);
  if (!user) return { success: false, error: 'Utilisateur introuvable' };
  if (!user.is_active) return { success: false, error: 'Compte désactivé' };

  // Vérifier le blocage
  if (user.locked_until) {
    const lockTime = new Date(user.locked_until).getTime();
    if (Date.now() < lockTime) {
      const remainMin = Math.ceil((lockTime - Date.now()) / 60000);
      return { success: false, error: `Compte bloqué. Réessayez dans ${remainMin} min.` };
    }
    // Blocage expiré → réinitialiser
    await run('UPDATE users SET locked_until = NULL, failed_attempts = 0 WHERE id = ?', [userId]);
  }

  const salt = buildUserSalt(userId, user.created_at!);
  const { valid: ok } = await verifyPIN(pin, salt, user.pin_hash);

  if (!ok) {
    const attempts = (user.failed_attempts ?? 0) + 1;
    if (attempts >= 3) {
      const lockUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await run(
        'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?',
        [attempts, lockUntil, userId]
      );
      await saveStore();
      return { success: false, error: 'Trop de tentatives. Compte bloqué 5 min.' };
    }
    await run('UPDATE users SET failed_attempts = ? WHERE id = ?', [attempts, userId]);
    await saveStore();
    return { success: false, error: `PIN incorrect (${3 - attempts} essai(s) restant)` };
  }

  // Succès
  await run(
    `UPDATE users SET failed_attempts = 0, locked_until = NULL,
     last_login = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [userId]
  );
  await saveStore();
  return { success: true, user: { ...user, failed_attempts: 0, locked_until: undefined } };
}

// Déverrouille immédiatement un compte bloqué (réservé à l'administrateur)
export async function unlockUser(id: number): Promise<void> {
  await run(
    `UPDATE users SET locked_until = NULL, failed_attempts = 0, updated_at = datetime('now') WHERE id = ?`,
    [id],
  );
  await saveStore();
}

export async function countUsers(): Promise<number> {
  const rows = await query<{ count: number }>('SELECT COUNT(*) as count FROM users');
  return rows[0]?.count ?? 0;
}

// Paramètres de l'application
export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await run(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
  await saveStore();
}
